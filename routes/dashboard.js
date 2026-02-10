const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const userId = res.locals.user.id;

    // Get user's drops
    const drops = await pool.query(
      `SELECT id, label, codename, has_password, max_views, current_views, is_destroyed, expires_at, notify, created_at
       FROM drops WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    // Get stats
    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE NOT is_destroyed) as active_drops,
         COUNT(*) FILTER (WHERE is_destroyed) as destroyed_drops,
         COALESCE(SUM(current_views), 0) as total_views
       FROM drops WHERE user_id = $1`,
      [userId]
    );

    res.render('dashboard', {
      title: 'Dashboard',
      drops: drops.rows,
      stats: stats.rows[0],
    });

  } catch (err) {
    console.error('[Dashboard] Error:', err);
    req.session.flash = { type: 'error', message: 'Failed to load dashboard.' };
    res.redirect('/');
  }
});

// Manually destroy a drop
router.post('/drops/:id/destroy', async (req, res) => {
  try {
    await pool.query(
      'UPDATE drops SET is_destroyed = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, res.locals.user.id]
    );
    req.session.flash = { type: 'success', message: 'Drop destroyed.' };
  } catch (err) {
    console.error('[Dashboard] Destroy error:', err);
    req.session.flash = { type: 'error', message: 'Failed to destroy drop.' };
  }
  res.redirect('/dashboard');
});

// Mark notification as read
router.post('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, res.locals.user.id]
    );
  } catch (err) {
    console.error('[Dashboard] Notification error:', err);
  }
  res.redirect('/dashboard');
});

// Mark all notifications as read
router.post('/notifications/read-all', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [res.locals.user.id]
    );
  } catch (err) {
    console.error('[Dashboard] Notification error:', err);
  }
  res.redirect('/dashboard');
});

module.exports = router;
