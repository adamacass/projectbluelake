const express = require('express');
const router = express.Router();

// --- USE-CASE LANDING PAGES (SEO-targeted) ---

router.get('/use-cases/share-passwords-securely', (req, res) => {
  res.render('landing/share-passwords', {
    title: 'Share Passwords Securely',
    metaDescription: 'Stop sharing passwords over Slack and email. GhostDrop lets you share passwords with a self-destructing encrypted link that vanishes after being read.',
    metaKeywords: 'share password securely, send password safely, secure password sharing, encrypted password link, one-time password share',
  });
});

router.get('/use-cases/share-api-keys-safely', (req, res) => {
  res.render('landing/share-api-keys', {
    title: 'Share API Keys Safely',
    metaDescription: 'Share API keys, tokens, and credentials with your team without leaving them in Slack or email. AES-256 encrypted, self-destructing links.',
    metaKeywords: 'share api key securely, send api key safely, share credentials securely, share secret key, share access token',
  });
});

router.get('/use-cases/secure-employee-onboarding', (req, res) => {
  res.render('landing/secure-onboarding', {
    title: 'Secure Employee Onboarding',
    metaDescription: 'Send new employees their passwords, VPN credentials, and access tokens securely. Self-destructing links ensure no sensitive info lingers in email.',
    metaKeywords: 'secure onboarding, send employee credentials, share login securely, new hire password sharing, secure credential delivery',
  });
});

router.get('/use-cases/hipaa-compliant-messaging', (req, res) => {
  res.render('landing/hipaa-messaging', {
    title: 'HIPAA-Friendly Secure Messaging',
    metaDescription: 'Share sensitive patient data, medical records, and PHI with self-destructing encrypted links. No data stored after viewing.',
    metaKeywords: 'hipaa compliant messaging, share medical records securely, secure patient data sharing, encrypted healthcare messaging',
  });
});

// --- COMPARISON PAGES ---

router.get('/compare/privnote', (req, res) => {
  res.render('landing/compare-privnote', {
    title: 'GhostDrop vs PrivNote',
    metaDescription: 'Compare GhostDrop and PrivNote for self-destructing messages. See why teams choose GhostDrop for stronger encryption, API access, and password protection.',
    metaKeywords: 'privnote alternative, privnote vs ghostdrop, better than privnote, self-destructing message app, privnote comparison',
  });
});

router.get('/compare/onetimesecret', (req, res) => {
  res.render('landing/compare-onetimesecret', {
    title: 'GhostDrop vs One-Time Secret',
    metaDescription: 'Compare GhostDrop and One-Time Secret (onetimesecret.com). GhostDrop offers stronger encryption, modern UI, API access, and team features.',
    metaKeywords: 'one-time secret alternative, onetimesecret vs ghostdrop, onetimesecret alternative, self-destructing secret sharing',
  });
});

module.exports = router;
