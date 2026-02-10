const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Share Secrets That Self-Destruct' });
});

router.get('/pricing', (req, res) => {
  res.render('pricing', { title: 'Pricing' });
});

router.get('/api-docs', (req, res) => {
  res.render('api-docs', { title: 'API Documentation' });
});

module.exports = router;
