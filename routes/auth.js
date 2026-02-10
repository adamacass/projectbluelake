const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please try again later.',
});

router.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Log In', error: null });
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', { title: 'Log In', error: 'Email and password are required.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    if (result.rows.length === 0) {
      return res.render('login', { title: 'Log In', error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.render('login', { title: 'Log In', error: 'Invalid email or password.' });
    }

    req.session.userId = user.id;
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);

  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.render('login', { title: 'Log In', error: 'An error occurred. Please try again.' });
  }
});

router.get('/register', (req, res) => {
  if (res.locals.user) return res.redirect('/dashboard');
  res.render('register', { title: 'Create Account', error: null });
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, password_confirm } = req.body;

    if (!email || !password) {
      return res.render('register', { title: 'Create Account', error: 'Email and password are required.' });
    }

    if (password.length < 8) {
      return res.render('register', { title: 'Create Account', error: 'Password must be at least 8 characters.' });
    }

    if (password !== password_confirm) {
      return res.render('register', { title: 'Create Account', error: 'Passwords do not match.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.render('register', { title: 'Create Account', error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email.toLowerCase().trim(), passwordHash]
    );

    req.session.userId = result.rows[0].id;
    req.session.flash = { type: 'success', message: 'Account created successfully!' };
    res.redirect('/dashboard');

  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.render('register', { title: 'Create Account', error: 'An error occurred. Please try again.' });
  }
});

router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

module.exports = router;
