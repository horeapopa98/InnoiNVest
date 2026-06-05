const Redis = require('ioredis');

/**
 * Redis connection.
 *
 * Caching is treated as a best-effort optimisation: if REDIS_URL is unset or
 * the server is unreachable, the app keeps working — every cache call falls
 * back to the live producer. We therefore disable ioredis' auto-reconnect
 * storm and surface a single `ready`/`error` log instead of crashing.
 */

let client = null;
let ready = false;

if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, {
    lazyConnect: false,
    // Cap retries so a missing Redis doesn't spam reconnect attempts forever.
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
  });

  client.on('ready', () => {
    ready = true;
    console.log('Redis connection established.');
  });

  client.on('error', (err) => {
    if (ready) console.warn('Redis error:', err.message);
    ready = false;
  });

  client.on('end', () => {
    ready = false;
  });
} else {
  console.log('REDIS_URL not set — caching disabled (running without Redis).');
}

function getClient() {
  return client;
}

function isReady() {
  return Boolean(client) && ready;
}

module.exports = { getClient, isReady };
