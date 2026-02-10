const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { encrypt, decrypt, hashSlug, generateSlug, hashIP } = require('../utils/crypto');
const { getPlanLimits } = require('../middleware/auth');

const router = express.Router();

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Too many drops created. Please try again later.',
});

router.get('/new', (req, res) => {
  const plan = res.locals.user ? res.locals.user.plan : 'free';
  const limits = getPlanLimits(plan);
  res.render('create', { title: 'Create a Drop', limits, plan });
});

router.post('/new', createLimiter, async (req, res) => {
  try {
    const { content, password, expiry, max_views, label, notify } = req.body;
    const user = res.locals.user;
    const plan = user ? user.plan : 'free';
    const limits = getPlanLimits(plan);

    // Validate content
    if (!content || content.trim().length === 0) {
      req.session.flash = { type: 'error', message: 'Content cannot be empty.' };
      return res.redirect('/new');
    }

    if (content.length > limits.maxContentLength) {
      req.session.flash = { type: 'error', message: `Content exceeds maximum length (${Math.round(limits.maxContentLength / 1000)}KB).` };
      return res.redirect('/new');
    }

    // Check daily limit for logged-in users
    if (user) {
      const userRow = await pool.query('SELECT drops_today, drops_today_reset FROM users WHERE id = $1', [user.id]);
      const u = userRow.rows[0];

      // Reset counter if it's a new day
      const today = new Date().toISOString().split('T')[0];
      if (u.drops_today_reset?.toISOString().split('T')[0] !== today) {
        await pool.query('UPDATE users SET drops_today = 0, drops_today_reset = CURRENT_DATE WHERE id = $1', [user.id]);
        u.drops_today = 0;
      }

      if (u.drops_today >= limits.dropsPerDay) {
        req.session.flash = { type: 'error', message: `Daily drop limit reached (${limits.dropsPerDay}/day). Upgrade for more.` };
        return res.redirect('/new');
      }
    }

    // Password protection
    let hasPassword = false;
    let passwordHash = null;
    if (password && password.trim().length > 0) {
      if (!limits.passwordProtect && plan === 'free') {
        req.session.flash = { type: 'error', message: 'Password protection requires a Pro plan.' };
        return res.redirect('/new');
      }
      hasPassword = true;
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Expiry
    const expiryHours = Math.min(parseInt(expiry) || 24, limits.maxExpiry);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Max views
    const maxViews = Math.min(Math.max(parseInt(max_views) || 1, 1), limits.maxViews);

    // Generate slug and encrypt
    const slug = generateSlug();
    const slugHash = hashSlug(slug);
    const { encrypted, iv, authTag } = encrypt(content, slug);

    // Store drop
    await pool.query(
      `INSERT INTO drops (slug_hash, user_id, encrypted_content, iv, auth_tag, has_password, password_hash, max_views, expires_at, label, notify)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [slugHash, user?.id || null, encrypted, iv, authTag, hasPassword, passwordHash, maxViews, expiresAt, label || null, notify === 'on']
    );

    // Increment daily counter
    if (user) {
      await pool.query('UPDATE users SET drops_today = drops_today + 1 WHERE id = $1', [user.id]);
    }

    const dropUrl = `${res.locals.appUrl}/d/${slug}`;

    res.render('created', {
      title: 'Drop Created',
      dropUrl,
      slug,
      expiresAt,
      maxViews,
      hasPassword,
    });

  } catch (err) {
    console.error('[Drops] Create error:', err);
    req.session.flash = { type: 'error', message: 'Failed to create drop. Please try again.' };
    res.redirect('/new');
  }
});

// View drop - GET shows content or password prompt
router.get('/d/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const slugHash = hashSlug(slug);

    const result = await pool.query(
      'SELECT * FROM drops WHERE slug_hash = $1',
      [slugHash]
    );

    if (result.rows.length === 0) {
      return res.render('destroyed', { title: 'Drop Not Found' });
    }

    const drop = result.rows[0];

    // Check if destroyed
    if (drop.is_destroyed) {
      return res.render('destroyed', { title: 'Drop Destroyed' });
    }

    // Check expiry
    if (drop.expires_at && new Date(drop.expires_at) < new Date()) {
      await pool.query('UPDATE drops SET is_destroyed = TRUE WHERE id = $1', [drop.id]);
      return res.render('destroyed', { title: 'Drop Expired' });
    }

    // If password protected, show password prompt
    if (drop.has_password) {
      return res.render('view-password', {
        title: 'Enter Password',
        slug,
        error: null,
      });
    }

    // Decrypt and show content
    const content = decrypt(drop.encrypted_content, drop.iv, drop.auth_tag, slug);
    const newViews = drop.current_views + 1;
    const willDestroy = newViews >= drop.max_views;

    // Update view count and possibly destroy
    await pool.query(
      'UPDATE drops SET current_views = $1, is_destroyed = $2 WHERE id = $3',
      [newViews, willDestroy, drop.id]
    );

    // Log view event
    await pool.query(
      'INSERT INTO drop_events (drop_id, event_type, ip_hash) VALUES ($1, $2, $3)',
      [drop.id, 'viewed', hashIP(req.ip)]
    );

    // Notify creator if enabled
    if (drop.notify && drop.user_id) {
      const dropLabel = drop.label || slug.slice(0, 8) + '...';
      const msg = willDestroy
        ? `Your drop "${dropLabel}" was viewed and destroyed.`
        : `Your drop "${dropLabel}" was viewed (${newViews}/${drop.max_views}).`;
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [drop.user_id, msg]
      );
    }

    res.render('view-drop', {
      title: 'Secret Drop',
      content,
      willDestroy,
      viewsRemaining: drop.max_views - newViews,
    });

  } catch (err) {
    console.error('[Drops] View error:', err);
    res.render('destroyed', { title: 'Drop Not Found' });
  }
});

// View drop - POST handles password submission
router.post('/d/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;
    const slugHash = hashSlug(slug);

    const result = await pool.query(
      'SELECT * FROM drops WHERE slug_hash = $1',
      [slugHash]
    );

    if (result.rows.length === 0 || result.rows[0].is_destroyed) {
      return res.render('destroyed', { title: 'Drop Destroyed' });
    }

    const drop = result.rows[0];

    // Verify password
    const valid = await bcrypt.compare(password || '', drop.password_hash || '');
    if (!valid) {
      return res.render('view-password', {
        title: 'Enter Password',
        slug,
        error: 'Incorrect password. Try again.',
      });
    }

    // Decrypt and show
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
      const msg = willDestroy
        ? `Your drop "${dropLabel}" was viewed and destroyed.`
        : `Your drop "${dropLabel}" was viewed (${newViews}/${drop.max_views}).`;
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [drop.user_id, msg]
      );
    }

    res.render('view-drop', {
      title: 'Secret Drop',
      content,
      willDestroy,
      viewsRemaining: drop.max_views - newViews,
    });

  } catch (err) {
    console.error('[Drops] Password view error:', err);
    res.render('destroyed', { title: 'Drop Not Found' });
  }
});

module.exports = router;
