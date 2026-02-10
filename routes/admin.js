const express = require('express');
const { pool } = require('../db');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.redirect('/ghost-admin');
  }
  next();
}

// Admin login
router.get('/', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/ghost-admin/dashboard');
  res.render('admin/login', { title: 'Admin', error: null, layout: 'layout-admin' });
});

router.post('/', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.render('admin/login', {
      title: 'Admin', layout: 'layout-admin',
      error: 'ADMIN_PASSWORD not set in environment variables.',
    });
  }

  if (password !== adminPassword) {
    return res.render('admin/login', {
      title: 'Admin', layout: 'layout-admin',
      error: 'Wrong password.',
    });
  }

  req.session.isAdmin = true;
  res.redirect('/ghost-admin/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.isAdmin = false;
  res.redirect('/ghost-admin');
});

// Dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now - 7 * 86400000).toISOString();
    const monthStart = new Date(now - 30 * 86400000).toISOString();

    const [
      userCount, dropCount, subscriberCount,
      viewsToday, viewsWeek, viewsMonth, viewsTotal,
      topPages, topReferrers, topBrowsers,
      recentSignups, recentDrops, recentViews,
      marketingTasks, activeDrops, destroyedDrops,
      viewsByDay
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM drops'),
      pool.query('SELECT COUNT(*) FROM email_subscribers'),
      pool.query('SELECT COUNT(*) FROM page_views WHERE created_at >= $1', [todayStart]),
      pool.query('SELECT COUNT(*) FROM page_views WHERE created_at >= $1', [weekStart]),
      pool.query('SELECT COUNT(*) FROM page_views WHERE created_at >= $1', [monthStart]),
      pool.query('SELECT COUNT(*) FROM page_views'),
      pool.query(`SELECT path, COUNT(*) as views FROM page_views
                  WHERE created_at >= $1 GROUP BY path ORDER BY views DESC LIMIT 15`, [monthStart]),
      pool.query(`SELECT referrer, COUNT(*) as views FROM page_views
                  WHERE referrer IS NOT NULL AND created_at >= $1
                  GROUP BY referrer ORDER BY views DESC LIMIT 15`, [monthStart]),
      pool.query(`SELECT browser, COUNT(*) as views FROM page_views
                  WHERE browser IS NOT NULL AND created_at >= $1
                  GROUP BY browser ORDER BY views DESC LIMIT 10`, [monthStart]),
      pool.query('SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 20'),
      pool.query('SELECT id, codename, label, has_password, max_views, current_views, is_destroyed, created_at FROM drops ORDER BY created_at DESC LIMIT 20'),
      pool.query(`SELECT pv.path, pv.referrer, pv.browser, pv.os, pv.created_at
                  FROM page_views pv ORDER BY pv.created_at DESC LIMIT 30`),
      pool.query('SELECT * FROM marketing_tasks ORDER BY category, id'),
      pool.query('SELECT COUNT(*) FROM drops WHERE is_destroyed = FALSE'),
      pool.query('SELECT COUNT(*) FROM drops WHERE is_destroyed = TRUE'),
      pool.query(`SELECT DATE(created_at) as day, COUNT(*) as views
                  FROM page_views WHERE created_at >= $1
                  GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30`, [monthStart]),
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      layout: 'layout-admin',
      stats: {
        users: parseInt(userCount.rows[0].count),
        drops: parseInt(dropCount.rows[0].count),
        activeDrops: parseInt(activeDrops.rows[0].count),
        destroyedDrops: parseInt(destroyedDrops.rows[0].count),
        subscribers: parseInt(subscriberCount.rows[0].count),
        viewsToday: parseInt(viewsToday.rows[0].count),
        viewsWeek: parseInt(viewsWeek.rows[0].count),
        viewsMonth: parseInt(viewsMonth.rows[0].count),
        viewsTotal: parseInt(viewsTotal.rows[0].count),
      },
      topPages: topPages.rows,
      topReferrers: topReferrers.rows,
      topBrowsers: topBrowsers.rows,
      recentSignups: recentSignups.rows,
      recentDrops: recentDrops.rows,
      recentViews: recentViews.rows,
      marketingTasks: marketingTasks.rows,
      viewsByDay: viewsByDay.rows,
    });
  } catch (err) {
    console.error('[Admin] Dashboard error:', err);
    res.status(500).send('Dashboard error: ' + err.message);
  }
});

// Toggle marketing task
router.post('/tasks/:id/toggle', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE marketing_tasks SET is_done = NOT is_done WHERE id = $1',
      [req.params.id]
    );
  } catch (err) {
    console.error('[Admin] Task toggle error:', err);
  }
  res.redirect('/ghost-admin/dashboard#marketing');
});

// Export email subscribers as CSV
router.get('/export/subscribers', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT email, source, created_at FROM email_subscribers ORDER BY created_at DESC');
    let csv = 'email,source,signed_up\n';
    result.rows.forEach(r => {
      csv += `${r.email},${r.source},${r.created_at.toISOString()}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ghostdrop-subscribers.csv');
    res.send(csv);
  } catch (err) {
    console.error('[Admin] Export error:', err);
    res.status(500).send('Export failed');
  }
});

module.exports = router;
