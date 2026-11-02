/**
 * Meow-BOT — central configuration (single source of truth).
 *
 * Every setting is read from environment variables (or a local .env file you
 * create yourself). Existing variable names are unchanged. Secrets such as
 * SESSION_ID or tokens are never given defaults and are never printed.
 */
require('dotenv').config({ override: true });

const env = process.env;

const digitsList = (raw) =>
  String(raw || '')
    .split(',')
    .map((n) => n.replace(/\D/g, ''))
    .filter(Boolean);

const config = {
  /* ---------- Identity ---------- */
  BOT_NAME: env.BOT_NAME || 'Meow-BOT',
  BOT_OWNER: env.BOT_OWNER || env.OWNER_NAME || 'Shuhaib',
  BOT_URL: env.BOT_URL || 'https://github.com/shuhbap/Meow-Bot',
  OWNER_NUMBER: env.OWNER_NUMBER || env.SUDO || '',

  /* ---------- Alive message ---------- */
  ALIVE_NAME: env.ALIVE_NAME || env.BOT_NAME || 'Meow-BOT',
  ALIVE_OWNER: env.ALIVE_OWNER || env.BOT_OWNER || 'Shuhaib',
  ALIVE_MEDIA: env.ALIVE_MEDIA || '',

  /* ---------- Stickers ---------- */
  STICKER_PACK: env.STICKER_PACK || 'Meow-BOT',
  STICKER_AUTHOR: env.STICKER_AUTHOR || 'Meow-BOT',


  /* ---------- Runtime ---------- */
  PORT: Number(env.PORT) || 3000,
  START_MESSAGE: env.START_MESSAGE !== 'false',
  ENABLE_EVAL: env.ENABLE_EVAL === 'true',

  /* ---------- Access control ---------- */
  // Comma separated list of owner / sudo phone numbers (digits only).
  get SUDO() {
    return digitsList(env.SUDO || env.OWNER_NUMBER);
  },

  /* ---------- Live values (the owner can change these at runtime) ---------- */
  get PREFIX() {
    return (env.PREFIX ?? '.').trim() || '.';
  },
  get MODE() {
    return String(env.MODE || 'public').toLowerCase() === 'private' ? 'private' : 'public';
  }
};

/**
 * Validate the configuration. Returns { errors, warnings } and never prints
 * secret values — only the NAMES of missing settings.
 */
config.validate = function validate() {
  const errors = [];
  const warnings = [];

  if (!env.SESSION_ID) {
    errors.push('SESSION_ID is not set (needed unless an auth/ folder with creds.json already exists).');
  }
  if (!config.SUDO.length) {
    warnings.push('OWNER_NUMBER / SUDO is not set: owner-only commands will only work from the bot account itself.');
  }
  if (!['public', 'private'].includes(String(env.MODE || 'public').toLowerCase())) {
    warnings.push('MODE should be "public" or "private"; falling back to "public".');
  }
  return { errors, warnings };
};

module.exports = config;
