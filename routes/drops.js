const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const UAParser = require('ua-parser-js');
const { pool } = require('../db');
const { encrypt, decrypt, hashSlug, generateSlug, hashIP } = require('../utils/crypto');
const { generateCodename } = require('../utils/codenames');

const router = express.Router();

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: 'Too many drops created. Please try again later.',
});

router.get('/new', (req, res) => {
  res.render('create', { title: 'Create a Drop' });
});

router.post('/new', createLimiter, async (req, res) => {
  try {
    const { content, password, expiry, max_views, label, notify } = req.body;
    const user = res.locals.user;

    if (!content || content.trim().length === 0) {
      req.session.flash = { type: 'error', message: 'Content cannot be empty.' };
      return res.redirect('/new');
    }

    if (content.length > 500000) {
      req.session.flash = { type: 'error', message: 'Content too large (max 500KB).' };
      return res.redirect('/new');
    }

    let hasPassword = false;
    let passwordHash = null;
    if (password && password.trim().length > 0) {
      hasPassword = true;
      passwordHash = await bcrypt.hash(password, 10);
    }

    const expiryHours = Math.min(parseInt(expiry) || 24, 720);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const maxViews = Math.min(Math.max(parseInt(max_views) || 1, 1), 10000);

    const slug = generateSlug();
    const slugHash = hashSlug(slug);
    const { encrypted, iv, authTag } = encrypt(content, slug);
    const codename = generateCodename();

    await pool.query(
      `INSERT INTO drops (slug_hash, user_id, encrypted_content, iv, auth_tag, has_password, password_hash, max_views, expires_at, label, codename, notify)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [slugHash, user?.id || null, encrypted, iv, authTag, hasPassword, passwordHash, maxViews, expiresAt, label || null, codename, notify === 'on']
    );

    const dropUrl = `${res.locals.appUrl}/d/${slug}`;

    let qrDataUri = null;
    try {
      qrDataUri = await QRCode.toDataURL(dropUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#baff39', light: '#00000000' },
      });
    } catch (e) { /* non-critical */ }

    res.render('created', {
      title: 'Drop Created',
      dropUrl, slug, codename, expiresAt, maxViews, hasPassword, qrDataUri,
    });

  } catch (err) {
    console.error('[Drops] Create error:', err);
    req.session.flash = { type: 'error', message: 'Failed to create drop. Please try again.' };
    res.redirect('/new');
  }
});

function parseViewer(req) {
  const ua = new UAParser(req.headers['user-agent']);
  const browser = ua.getBrowser();
  const os = ua.getOS();
  const device = ua.getDevice();
  return {
    browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : 'Unknown',
    os: os.name ? `${os.name} ${os.version || ''}`.trim() : 'Unknown',
    deviceType: device.type || 'desktop',
  };
}

router.get('/d/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const slugHash = hashSlug(slug);
    const result = await pool.query('SELECT * FROM drops WHERE slug_hash = $1', [slugHash]);

    if (result.rows.length === 0) return res.render('destroyed', { title: 'Drop Not Found' });

    const drop = result.rows[0];
    if (drop.is_destroyed) return res.render('destroyed', { title: 'Drop Destroyed' });

    if (drop.expires_at && new Date(drop.expires_at) < new Date()) {
      await pool.query('UPDATE drops SET is_destroyed = TRUE WHERE id = $1', [drop.id]);
      return res.render('destroyed', { title: 'Drop Expired' });
    }

    if (drop.has_password) {
      return res.render('view-password', { title: 'Enter Password', slug, error: null });
    }

    const content = decrypt(drop.encrypted_content, drop.iv, drop.auth_tag, slug);
    const newViews = drop.current_views + 1;
    const willDestroy = newViews >= drop.max_views;

    await pool.query('UPDATE drops SET current_views = $1, is_destroyed = $2 WHERE id = $3', [newViews, willDestroy, drop.id]);

    const viewer = parseViewer(req);
    await pool.query(
      'INSERT INTO drop_events (drop_id, event_type, ip_hash, browser, os, device_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [drop.id, 'viewed', hashIP(req.ip), viewer.browser, viewer.os, viewer.deviceType]
    );

    if (drop.notify && drop.user_id) {
      const dropLabel = drop.codename || drop.label || slug.slice(0, 8) + '...';
      const msg = willDestroy
        ? `"${dropLabel}" viewed & destroyed [${viewer.browser} / ${viewer.os}]`
        : `"${dropLabel}" viewed (${newViews}/${drop.max_views}) [${viewer.browser} / ${viewer.os}]`;
      await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [drop.user_id, msg]);
    }

    res.render('view-drop', { title: 'Secret Drop', content, willDestroy, viewsRemaining: drop.max_views - newViews, codename: drop.codename });
  } catch (err) {
    console.error('[Drops] View error:', err);
    res.render('destroyed', { title: 'Drop Not Found' });
  }
});

router.post('/d/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;
    const slugHash = hashSlug(slug);
    const result = await pool.query('SELECT * FROM drops WHERE slug_hash = $1', [slugHash]);

    if (result.rows.length === 0 || result.rows[0].is_destroyed) {
      return res.render('destroyed', { title: 'Drop Destroyed' });
    }

    const drop = result.rows[0];
    const valid = await bcrypt.compare(password || '', drop.password_hash || '');
    if (!valid) return res.render('view-password', { title: 'Enter Password', slug, error: 'Wrong password.' });

    const content = decrypt(drop.encrypted_content, drop.iv, drop.auth_tag, slug);
    const newViews = drop.current_views + 1;
    const willDestroy = newViews >= drop.max_views;

    await pool.query('UPDATE drops SET current_views = $1, is_destroyed = $2 WHERE id = $3', [newViews, willDestroy, drop.id]);

    const viewer = parseViewer(req);
    await pool.query(
      'INSERT INTO drop_events (drop_id, event_type, ip_hash, browser, os, device_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [drop.id, 'viewed', hashIP(req.ip), viewer.browser, viewer.os, viewer.deviceType]
    );

    if (drop.notify && drop.user_id) {
      const dropLabel = drop.codename || drop.label || slug.slice(0, 8) + '...';
      const msg = willDestroy
        ? `"${dropLabel}" viewed & destroyed [${viewer.browser} / ${viewer.os}]`
        : `"${dropLabel}" viewed (${newViews}/${drop.max_views}) [${viewer.browser} / ${viewer.os}]`;
      await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [drop.user_id, msg]);
    }

    res.render('view-drop', { title: 'Secret Drop', content, willDestroy, viewsRemaining: drop.max_views - newViews, codename: drop.codename });
  } catch (err) {
    console.error('[Drops] Password view error:', err);
    res.render('destroyed', { title: 'Drop Not Found' });
  }
});

module.exports = router;
