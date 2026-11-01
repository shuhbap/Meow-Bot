'use strict';

/**
 * Meow-BOT entry point.
 * Loads config, starts the health server, loads plugins, connects to WhatsApp
 * and handles graceful shutdown. All logic lives in lib/.
 */
// Every date / time in the bot uses Indian time (IST), whatever the server's own timezone is.
process.env.TZ = 'Asia/Kolkata';

const config = require('./config');
const logger = require('./lib/utils/logger');
const { startServer } = require('./lib/helpers/server');
const { loadPlugins } = require('./lib/handlers/loader');
const { createClient } = require('./lib/helpers/client');
const { registerEvents } = require('./lib/events');
const { stopAutoBio } = require('./lib/functions/autobio');
const { stopUpdateWatcher } = require('./lib/functions/updateCheck');
const pollCore = require('./lib/pollCore');

// Baileys helpers for pollCore (tries both common package names)
let baileys;
try { baileys = require('@whiskeysockets/baileys'); }
catch { baileys = require('baileys'); }

let sock = null;
let server = null;
let restartTimer = null;
let shuttingDown = false;

function dispose(old) {
  if (!old) return;
  try { old.ev.removeAllListeners(); } catch { /* already gone */ }
  try { old.end(undefined); } catch { /* already closed */ }
}

async function connect() {
  dispose(sock);
  sock = await createClient();
  pollCore.init(sock, {
    getAggregateVotesInPollMessage: baileys.getAggregateVotesInPollMessage,
    BufferJSON: baileys.BufferJSON,
    jidNormalizedUser: baileys.jidNormalizedUser,
  });
  registerEvents(sock, { onRestart: scheduleRestart });
}

function scheduleRestart(delay = 3000) {
  if (shuttingDown || restartTimer) return;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    connect().catch((e) => {
      logger.error('Restart failed:', e.message);
      scheduleRestart(10000);
    });
  }, delay);
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down...`);
  clearTimeout(restartTimer);
  stopAutoBio();
  stopUpdateWatcher();
  dispose(sock);
  if (server) server.close();
  setTimeout(() => process.exit(0), 500).unref();
}

async function main() {
  const { errors, warnings } = config.validate();
  warnings.forEach((w) => logger.warn(w));

  server = startServer();
  loadPlugins();

  if (errors.length) {
    // An existing auth/ folder is allowed to start without SESSION_ID; the session loader decides.
    errors.forEach((e) => logger.warn(e));
  }
  await connect();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (e) => logger.error('Unhandled promise rejection:', e && e.message));

main().catch((e) => {
  logger.error('Fatal start error:', e.message);
  process.exit(1);
});
