require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');
const expressLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');
const { initDB, pool } = require('./db');
const { loadUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (Render uses reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://js.stripe.com"],
      frameSrc: ["https://js.stripe.com"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

// Stripe webhook needs raw body - mount BEFORE json/urlencoded parsers
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), require('./routes/webhooks'));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Session
app.use(cookieSession({
  name: 'gd_session',
  keys: [process.env.SESSION_SECRET || 'dev-secret-change-me'],
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
}));

// Flash message helper
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// Load user from session
app.use(loadUser);

// Template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Static files
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

// App-wide locals
app.use((req, res, next) => {
  res.locals.appName = 'GhostDrop';
  res.locals.appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  res.locals.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  res.locals.currentPath = req.path;
  next();
});

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});
app.use(globalLimiter);

// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/drops'));
app.use('/', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/api', require('./routes/api'));
app.use('/api', require('./routes/checkout'));

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    message: 'The page you are looking for does not exist.',
    code: 404,
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('[Error]', err.stack);
  res.status(500).render('error', {
    title: 'Something went wrong',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
    code: 500,
  });
});

// Scheduled cleanup: destroy expired drops every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await pool.query(
      `UPDATE drops SET is_destroyed = TRUE
       WHERE is_destroyed = FALSE AND expires_at IS NOT NULL AND expires_at < NOW()`
    );
    if (result.rowCount > 0) {
      console.log(`[Cleanup] Destroyed ${result.rowCount} expired drops`);
    }
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
  }
});

// Reset daily drop counters at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    await pool.query('UPDATE users SET drops_today = 0, drops_today_reset = CURRENT_DATE');
    console.log('[Cleanup] Reset daily drop counters');
  } catch (err) {
    console.error('[Cleanup] Error resetting counters:', err.message);
  }
});

// Start server
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`[GhostDrop] Running on port ${PORT}`);
      console.log(`[GhostDrop] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[GhostDrop] Failed to start:', err);
    process.exit(1);
  }
}

start();
