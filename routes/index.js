const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Share Secrets That Self-Destruct' });
});

router.get('/pricing', (req, res) => {
  res.render('pricing', { title: 'Pricing' });
});

router.get('/security', (req, res) => {
  res.render('security', { title: 'Security' });
});

router.get('/api-docs', (req, res) => {
  res.render('api-docs', { title: 'API Documentation' });
});

// Email capture for newsletter / updates
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many subscribe attempts.',
});

router.post('/subscribe', subscribeLimiter, async (req, res) => {
  try {
    const { email, source } = req.body;

    if (!email || !email.includes('@')) {
      req.session.flash = { type: 'error', message: 'Please enter a valid email.' };
      return res.redirect('back');
    }

    await pool.query(
      'INSERT INTO email_subscribers (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
      [email.toLowerCase().trim(), source || 'landing']
    );

    req.session.flash = { type: 'success', message: 'You\'re on the list! We\'ll keep you posted.' };
    res.redirect('back');
  } catch (err) {
    console.error('[Subscribe] Error:', err.message);
    req.session.flash = { type: 'error', message: 'Something went wrong. Try again.' };
    res.redirect('back');
  }
});

module.exports = router;
