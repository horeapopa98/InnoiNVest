const { getClient, isReady } = require('../config/redis');

const PREFIX = 'innoinvest';

function _key(key) {
  return `${PREFIX}:${key}`;
}

/**
 * Read a JSON value from cache. Returns undefined on miss, on parse error, or
 * when Redis is unavailable (never throws — caching is best-effort).
 */
async function get(key) {
  if (!isReady()) return undefined;
  try {
    const raw = await getClient().get(_key(key));
    if (raw == null) return undefined;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`cache.get(${key}) failed:`, err.message);
    return undefined;
  }
}

/**
 * Write a JSON value with a TTL (seconds). No-op when Redis is unavailable.
 */
async function set(key, value, ttlSeconds) {
  if (!isReady()) return;
  try {
    const raw = JSON.stringify(value);
    if (ttlSeconds) {
      await getClient().set(_key(key), raw, 'EX', ttlSeconds);
    } else {
      await getClient().set(_key(key), raw);
    }
  } catch (err) {
    console.warn(`cache.set(${key}) failed:`, err.message);
  }
}

/**
 * Delete one or more keys. No-op when Redis is unavailable.
 */
async function del(...keys) {
  if (!isReady() || keys.length === 0) return;
  try {
    await getClient().del(...keys.map(_key));
  } catch (err) {
    console.warn(`cache.del(${keys.join(',')}) failed:`, err.message);
  }
}

/**
 * Cache-aside helper: return the cached value for `key`, or run `producer`,
 * cache its result for `ttlSeconds`, and return it. If Redis is down the
 * producer runs every time (no caching, but correct).
 *
 * `producer` results that are null/undefined are not cached.
 */
async function getOrSet(key, ttlSeconds, producer) {
  const cached = await get(key);
  if (cached !== undefined) return cached;

  const value = await producer();
  if (value !== undefined && value !== null) {
    await set(key, value, ttlSeconds);
  }
  return value;
}

module.exports = { get, set, del, getOrSet };
