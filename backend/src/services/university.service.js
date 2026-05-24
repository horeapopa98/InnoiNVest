/**
 * University service
 *
 * Provides proximity-based lookups against the `universities` table.
 */

const db = require('../models');
const University = db.University;
const { haversineKm } = require('../utils/geo');

/**
 * Find all universities within radiusKm of (lat, lng).
 * Returns results sorted by distance ascending.
 */
async function findNearby(lat, lng, radiusKm = 100) {
  const all = await University.findAll({ raw: true });

  return all
    .map((u) => {
      const dist = haversineKm(lat, lng, u.lat, u.lng);
      return { ...u, distance_km: Math.round(dist * 10) / 10 };
    })
    .filter((u) => u.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

/**
 * Return all universities, optionally filtered by county code.
 */
async function findAll({ countyCode } = {}) {
  const where = countyCode ? { county_code: countyCode.toUpperCase() } : {};
  return University.findAll({ where, raw: true });
}

module.exports = { findNearby, findAll };
