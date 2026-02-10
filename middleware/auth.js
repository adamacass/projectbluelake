const { pool } = require('../db');

async function loadUser(req, res, next) {
  res.locals.user = null;
  res.locals.notifications = [];

  if (req.session && req.session.userId) {
    try {
      const result = await pool.query(
        'SELECT id, email, plan, created_at FROM users WHERE id = $1',
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

function requirePlan(minPlan) {
  const planLevels = { free: 0, pro: 1, business: 2 };

  return (req, res, next) => {
    if (!res.locals.user) {
      return res.redirect('/login');
    }
    const userLevel = planLevels[res.locals.user.plan] || 0;
    const requiredLevel = planLevels[minPlan] || 0;

    if (userLevel < requiredLevel) {
      return res.redirect('/pricing');
    }
    next();
  };
}

const PLAN_LIMITS = {
  free: { dropsPerDay: 5, maxContentLength: 10000, maxExpiry: 24, maxViews: 1, apiAccess: false, passwordProtect: false },
  pro: { dropsPerDay: 100, maxContentLength: 500000, maxExpiry: 720, maxViews: 100, apiAccess: true, passwordProtect: true },
  business: { dropsPerDay: 10000, maxContentLength: 5000000, maxExpiry: 2160, maxViews: 10000, apiAccess: true, passwordProtect: true },
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

module.exports = { loadUser, requireAuth, requirePlan, getPlanLimits };
