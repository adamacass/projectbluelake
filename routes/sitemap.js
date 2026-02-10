const express = require('express');
const router = express.Router();

router.get('/sitemap.xml', (req, res) => {
  const baseUrl = res.locals.appUrl;
  const pages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/new', priority: '0.9', changefreq: 'monthly' },
    { loc: '/pricing', priority: '0.8', changefreq: 'monthly' },
    { loc: '/api-docs', priority: '0.7', changefreq: 'monthly' },
    { loc: '/use-cases/share-passwords-securely', priority: '0.8', changefreq: 'monthly' },
    { loc: '/use-cases/share-api-keys-safely', priority: '0.8', changefreq: 'monthly' },
    { loc: '/use-cases/secure-employee-onboarding', priority: '0.8', changefreq: 'monthly' },
    { loc: '/use-cases/hipaa-compliant-messaging', priority: '0.8', changefreq: 'monthly' },
    { loc: '/compare/privnote', priority: '0.7', changefreq: 'monthly' },
    { loc: '/compare/onetimesecret', priority: '0.7', changefreq: 'monthly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

module.exports = router;
