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
const { trackPageViews } = require('./middleware/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://pagead2.googlesyndication.com", "https://www.googletagservices.com"],
      frameSrc: ["https://googleads.g.doubleclick.net", "https://pagead2.googlesyndication.com"],
      imgSrc: ["'self'", "data:", "https://pagead2.googlesyndication.com"],
      connectSrc: ["'self'", "https://pagead2.googlesyndication.com"],
    },
  },
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(cookieSession({
  name: 'nf_session',
  keys: [process.env.SESSION_SECRET || 'dev-secret-change-me'],
  maxAge: 30 * 24 * 60 * 60 * 1000,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
}));

app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.use(loadUser);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

app.use((req, res, next) => {
  res.locals.appName = 'NoteFlame';
  res.locals.appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  res.locals.currentPath = req.path;
  res.locals.adsenseId = process.env.GOOGLE_ADSENSE_ID || '';
  res.locals.isAdmin = req.session && req.session.isAdmin;
  next();
});

// Analytics
app.use(trackPageViews);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/sitemap'));
app.use('/', require('./routes/landing-pages'));
app.use('/', require('./routes/drops'));
app.use('/', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/api', require('./routes/api'));
app.use('/ghost-admin', require('./routes/admin'));

// 404
app.use((req, res) => {
  res.status(404).render('error', { title: '404', message: 'Nothing here.', code: 404 });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('[Error]', err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: process.env.NODE_ENV === 'production' ? 'Something broke.' : err.message,
    code: 500,
  });
});

// Cleanup expired drops every 5 min
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await pool.query(
      `UPDATE drops SET is_destroyed = TRUE WHERE is_destroyed = FALSE AND expires_at IS NOT NULL AND expires_at < NOW()`
    );
    if (result.rowCount > 0) console.log(`[Cleanup] Destroyed ${result.rowCount} expired drops`);
  } catch (err) { console.error('[Cleanup]', err.message); }
});

async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`[NoteFlame] Port ${PORT} | ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[NoteFlame] Failed to start:', err);
    process.exit(1);
  }
}

start();
