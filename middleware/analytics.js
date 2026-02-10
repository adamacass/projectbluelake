const UAParser = require('ua-parser-js');
const { pool } = require('../db');
const { hashIP } = require('../utils/crypto');

const SKIP_PATHS = ['/favicon.ico', '/robots.txt', '/sitemap.xml'];
const SKIP_PREFIXES = ['/css/', '/js/', '/api/', '/ghost-admin'];

function trackPageViews(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    if (SKIP_PATHS.includes(req.path)) return;
    if (SKIP_PREFIXES.some(p => req.path.startsWith(p))) return;
    if (req.method !== 'GET') return;

    const ua = new UAParser(req.headers['user-agent']);
    const browser = ua.getBrowser();
    const os = ua.getOS();
    const device = ua.getDevice();

    pool.query(
      `INSERT INTO page_views (path, referrer, utm_source, utm_medium, utm_campaign, browser, os, device_type, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.path,
        req.headers.referer || req.headers.referrer || null,
        req.query.utm_source || null,
        req.query.utm_medium || null,
        req.query.utm_campaign || null,
        browser.name ? `${browser.name} ${browser.version || ''}`.trim() : null,
        os.name ? `${os.name} ${os.version || ''}`.trim() : null,
        device.type || 'desktop',
        hashIP(req.ip),
      ]
    ).catch(() => {});
  });

  next();
}

module.exports = { trackPageViews };
