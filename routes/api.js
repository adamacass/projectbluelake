const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { encrypt, decrypt, hashSlug, generateSlug, hashIP } = require('../utils/crypto');
const { getPlanLimits } = require('../middleware/auth');

const router = express.Router();

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Rate limit exceeded. Try again later.' },
});

router.use(apiLimiter);

// API auth via Bearer token (email:password base64)
async function apiAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header. Use Bearer <base64(email:password)>' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [email, password] = decoded.split(':');

    if (!email || !password) {
      return res.status(401).json({ error: 'Invalid token format. Use base64(email:password)' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const limits = getPlanLimits(user.plan);
    if (!limits.apiAccess) {
      return res.status(403).json({ error: 'API access requires a Pro or Business plan.' });
    }

    req.apiUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Create a drop
router.post('/drops', apiAuth, async (req, res) => {
  try {
    const { content, password, expiry_hours, max_views, label } = req.body;
    const user = req.apiUser;
    const limits = getPlanLimits(user.plan);

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.length > limits.maxContentLength) {
      return res.status(400).json({ error: `Content exceeds maximum length (${limits.maxContentLength} chars)` });
    }

    let hasPassword = false;
    let passwordHash = null;
    if (password) {
      hasPassword = true;
      passwordHash = await bcrypt.hash(password, 10);
    }

    const expiryHours = Math.min(parseInt(expiry_hours) || 24, limits.maxExpiry);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const maxViewsVal = Math.min(Math.max(parseInt(max_views) || 1, 1), limits.maxViews);

    const slug = generateSlug();
    const slugHash = hashSlug(slug);
    const encrypted = encrypt(content, slug);

    await pool.query(
      `INSERT INTO drops (slug_hash, user_id, encrypted_content, iv, auth_tag, has_password, password_hash, max_views, expires_at, label, notify)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)`,
      [slugHash, user.id, encrypted.encrypted, encrypted.iv, encrypted.authTag, hasPassword, passwordHash, maxViewsVal, expiresAt, label || null]
    );

    const dropUrl = `${req.protocol}://${req.get('host')}/d/${slug}`;

    res.status(201).json({
      url: dropUrl,
      slug,
      expires_at: expiresAt.toISOString(),
      max_views: maxViewsVal,
      has_password: hasPassword,
    });

  } catch (err) {
    console.error('[API] Create drop error:', err);
    res.status(500).json({ error: 'Failed to create drop' });
  }
});

// Retrieve a drop
router.get('/drops/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.query;
    const slugHash = hashSlug(slug);

    const result = await pool.query('SELECT * FROM drops WHERE slug_hash = $1', [slugHash]);

    if (result.rows.length === 0 || result.rows[0].is_destroyed) {
      return res.status(404).json({ error: 'Drop not found or already destroyed' });
    }

    const drop = result.rows[0];

    if (drop.expires_at && new Date(drop.expires_at) < new Date()) {
      await pool.query('UPDATE drops SET is_destroyed = TRUE WHERE id = $1', [drop.id]);
      return res.status(404).json({ error: 'Drop has expired' });
    }

    if (drop.has_password) {
      if (!password) {
        return res.status(403).json({ error: 'This drop is password-protected. Provide ?password=yourpassword' });
      }
      const valid = await bcrypt.compare(password, drop.password_hash);
      if (!valid) {
        return res.status(403).json({ error: 'Incorrect password' });
      }
    }

    const content = decrypt(drop.encrypted_content, drop.iv, drop.auth_tag, slug);
    const newViews = drop.current_views + 1;
    const willDestroy = newViews >= drop.max_views;

    await pool.query(
      'UPDATE drops SET current_views = $1, is_destroyed = $2 WHERE id = $3',
      [newViews, willDestroy, drop.id]
    );

    await pool.query(
      'INSERT INTO drop_events (drop_id, event_type, ip_hash) VALUES ($1, $2, $3)',
      [drop.id, 'viewed', hashIP(req.ip)]
    );

    if (drop.notify && drop.user_id) {
      const dropLabel = drop.label || slug.slice(0, 8) + '...';
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [drop.user_id, `[API] Your drop "${dropLabel}" was viewed${willDestroy ? ' and destroyed' : ''}.`]
      );
    }

    res.json({
      content,
      destroyed: willDestroy,
      views_remaining: willDestroy ? 0 : drop.max_views - newViews,
    });

  } catch (err) {
    console.error('[API] View drop error:', err);
    res.status(500).json({ error: 'Failed to retrieve drop' });
  }
});

// List user's drops
router.get('/drops', apiAuth, async (req, res) => {
  try {
    const drops = await pool.query(
      `SELECT id, label, has_password, max_views, current_views, is_destroyed, expires_at, created_at
       FROM drops WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.apiUser.id]
    );

    res.json({ drops: drops.rows });
  } catch (err) {
    console.error('[API] List drops error:', err);
    res.status(500).json({ error: 'Failed to list drops' });
  }
});

// Delete a drop
router.delete('/drops/:id', apiAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE drops SET is_destroyed = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.apiUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drop not found' });
    }

    res.json({ success: true, message: 'Drop destroyed' });
  } catch (err) {
    console.error('[API] Delete drop error:', err);
    res.status(500).json({ error: 'Failed to delete drop' });
  }
});

module.exports = router;
