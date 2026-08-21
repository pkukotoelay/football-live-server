const { logger } = require('./logger');

const WEAK_SECRETS = new Set([
  '',
  'change-me-admin-jwt-secret',
  'YOUR_ADMIN_JWT_SECRET',
  'YOUR_API_KEY',
  'admin123',
  'YOUR_ADMIN_PASSWORD',
  'password',
  'secret',
]);

/**
 * Fail fast on unsafe production settings. Dev/local remains permissive.
 */
function assertProductionEnv(env = process.env) {
  if (String(env.NODE_ENV || '').toLowerCase() !== 'production') return;

  const jwtSecret = String(env.ADMIN_JWT_SECRET || '').trim();
  if (!jwtSecret || WEAK_SECRETS.has(jwtSecret)) {
    throw new Error(
      'Production requires a strong ADMIN_JWT_SECRET (set in .env). Refusing to start with a default/placeholder.'
    );
  }

  const adminPassword = String(env.ADMIN_PASSWORD || '').trim();
  if (!adminPassword || WEAK_SECRETS.has(adminPassword)) {
    throw new Error(
      'Production requires a strong ADMIN_PASSWORD (set in .env). Refusing to start with a default/placeholder.'
    );
  }

  if (!env.GITHUB_TOKEN) {
    logger.warn('GITHUB_TOKEN missing — Flutter JSON will not upload to GitHub');
  }

  const apiKey = String(env.API_KEY || '').trim();
  if (!apiKey || WEAK_SECRETS.has(apiKey)) {
    throw new Error(
      'Production requires a strong API_KEY (set in .env). Refusing to start with a default/placeholder.'
    );
  }

  if (String(env.ENABLE_PUBLIC_JSON || '').toLowerCase() === 'true') {
    logger.warn(
      'ENABLE_PUBLIC_JSON=true — /flutter JSON is open on this host. Prefer GitHub raw URLs for the app and keep port 3000 off the public internet.'
    );
  }

  if (!env.PUPPETEER_EXECUTABLE_PATH) {
    logger.warn(
      'PUPPETEER_EXECUTABLE_PATH unset — install google-chrome-stable on EC2 (not snap Chromium)'
    );
  } else if (/\/snap\/bin\//i.test(env.PUPPETEER_EXECUTABLE_PATH)) {
    logger.warn(
      'PUPPETEER_EXECUTABLE_PATH is snap Chromium — PM2 cannot launch it (snap cgroup). Use /usr/bin/google-chrome-stable'
    );
  }
}

module.exports = { assertProductionEnv, WEAK_SECRETS };
