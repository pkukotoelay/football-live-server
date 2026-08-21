const express = require('express');
const path = require('path');
const { createApiRouter } = require('./routes/api');
const { createAdminRouter } = require('./admin/routes/adminRoutes');
const { logger } = require('./utils/logger');

function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
    let bucket = hits.get(ip);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      hits.set(ip, bucket);
    }
    bucket.count += 1;
    if (hits.size > 5000) hits.clear();
    if (bucket.count > max) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }
    return next();
  };
}

function createApp({ pipeline, cache, admin, env = process.env }) {
  const app = express();
  app.disable('x-powered-by');
  // Behind nginx/ALB set TRUST_PROXY=1 so req.ip / rate limits stay accurate.
  if (env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex');
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/admin/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 8 }));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 60 }));

  const apiKey = env.API_KEY || '';
  const publicJson = env.ENABLE_PUBLIC_JSON === 'true';

  function requireApiKey(req, res) {
    if (
      publicJson &&
      req.method === 'GET' &&
      (req.path === '/matches' ||
        req.path.startsWith('/flutter/') ||
        req.path === '/highlights' ||
        req.path === '/channels' ||
        req.path === '/tips')
    ) {
      return true;
    }
    if (!apiKey) return true;
    const header = req.header('x-api-key') || req.query.apiKey;
    if (header !== apiKey) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return false;
    }
    return true;
  }

  function sendDelivery(res, feed, fallback = null) {
    const data = cache.getDelivery(feed) ?? fallback;
    if (data == null) return res.status(404).json({ ok: false, error: 'No data' });
    return res.json(data);
  }

  // Admin web UI
  const adminPublic = path.resolve(process.cwd(), 'public/admin');
  app.use('/admin', express.static(adminPublic));
  app.get('/admin', (_req, res) => {
    res.sendFile(path.join(adminPublic, 'index.html'));
  });

  app.get('/', (_req, res) => {
    res.json({ ok: true, timezone: 'Asia/Yangon' });
  });

  // Flutter delivery aliases (same shapes as GitHub raw JSON)
  app.get('/flutter/mainlive.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    return sendDelivery(res, 'mainlive');
  });

  app.get('/flutter/matches.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    const delivery = cache.getDelivery('matches');
    if (delivery) return res.json(delivery);
    const data = cache.getCurrent();
    if (!data) return res.status(404).json({ ok: false, error: 'No data' });
    return res.json(data);
  });

  app.get('/flutter/highlight.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    return sendDelivery(res, 'highlight1', cache.getDelivery('highlight'));
  });

  app.get('/flutter/highlight1.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    return sendDelivery(res, 'highlight1', cache.getDelivery('highlight'));
  });

  app.get('/flutter/highlight2.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    return sendDelivery(res, 'highlight2');
  });

  app.get('/flutter/myanmartv.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    const delivery = cache.getDelivery('myanmartv');
    if (delivery) return res.json(delivery);
    const current = cache.getCurrent();
    if (!current?.channels) return res.status(404).json({ ok: false, error: 'No data' });
    return res.json(
      current.channels.map((c) => ({
        title: c.title,
        img: c.img || null,
        streamUrl: c.streamUrl || '',
      }))
    );
  });

  // Short aliases
  app.get('/flutter/channels.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    return sendDelivery(res, 'myanmartv');
  });

  app.get('/flutter/highlights.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    return sendDelivery(res, 'highlight');
  });

  app.get('/flutter/tips.json', (req, res) => {
    if (!publicJson && !requireApiKey(req, res)) return;
    return sendDelivery(res, 'tips');
  });

  app.use('/api', createApiRouter({ pipeline, cache, requireApiKey }));

  if (admin) {
    app.use('/api/admin', createAdminRouter(admin));
  }

  app.use((err, _req, res, _next) => {
    logger.error('Express error', { error: err.message });
    res.status(500).json({ ok: false, error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
