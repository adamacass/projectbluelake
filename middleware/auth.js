const { pool } = require('../db');

async function loadUser(req, res, next) {
  res.locals.user = null;
  res.locals.notifications = [];

  if (req.session && req.session.userId) {
    try {
      const result = await pool.query(
        'SELECT id, email, created_at FROM users WHERE id = $1',
        [req.session.userId]
      );
      if (result.rows.length > 0) {
        res.locals.user = result.rows[0];
        const notifs = await pool.query(
          'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT 10',
          [req.session.userId]
        );
        res.locals.notifications = notifs.rows;
      } else {
        req.session.userId = null;
      }
    } catch (err) {
      console.error('[Auth] Error loading user:', err.message);
    }
  }

  next();
}

function requireAuth(req, res, next) {
  if (!res.locals.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

module.exports = { loadUser, requireAuth };
