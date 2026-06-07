const AppError = require('../errors/AppError');
const cache = require('../lib/cache');
const { TTL } = require('../constants/cache');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const ZOOM_BY_TYPE = {
  city: 11,
  town: 11,
  village: 12,
  county: 9,
  state: 8,
  country: 6,
};

// Romanian administrative prefixes Nominatim can't parse
const RO_ADMIN_PREFIX = /^(comuna|oraș|orașul|municipiul|municipiu|sat|satul|județ|județul|sector)\s+/i;

/**
 * Strip leading admin type prefix and return the bare place name.
 * "comuna Rus, Sălaj" → "Rus, Sălaj"
 */
function _stripAdminPrefix(name) {
  return name.trim().replace(RO_ADMIN_PREFIX, '');
}

/**
 * Build a list of query candidates to try against Nominatim in order.
 * First candidate = cleaned name; second = bare name before first comma
 * (handles "Viișoara, Cluj" → "Viișoara" as a last resort).
 */
function _queryCandidates(cityName) {
  const cleaned = _stripAdminPrefix(cityName);
  const candidates = [cleaned];
  const beforeComma = cleaned.split(',')[0].trim();
  if (beforeComma && beforeComma !== cleaned) candidates.push(beforeComma);
  return [...new Set(candidates)];
}

async function geocodeCity(cityName) {
  return cache.getOrSet(
    `geocode:${cityName.trim().toLowerCase()}`,
    TTL.GEOCODE,
    () => _geocodeCityLive(cityName)
  );
}

async function _nominatimSearch(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: 1,
    addressdetails: 1,
    countrycodes: 'ro',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': 'InnoiNVest/1.0 (infrastructure research tool)',
      'Accept-Language': 'ro,en',
    },
  });

  if (!response.ok) {
    throw new AppError(`Geocoding service unavailable: ${response.status}`, 503);
  }

  return response.json();
}

async function _geocodeCityLive(cityName) {
  const candidates = _queryCandidates(cityName);

  let results = [];
  for (const candidate of candidates) {
    results = await _nominatimSearch(candidate);
    if (results.length) break;
  }

  if (!results.length) {
    throw new AppError(`City not found: "${cityName}". Try a Romanian city name (e.g. Cluj-Napoca, Brașov, Timișoara).`, 404);
  }

  const place = results[0];
  const placeType = place.type || place.class || 'city';
  const zoom = ZOOM_BY_TYPE[placeType] ?? 11;

  return {
    name: place.display_name.split(',')[0].trim(),
    display_name: place.display_name,
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    zoom,
    place_type: placeType,
    osm_id: place.osm_id,
    bounding_box: place.boundingbox
      ? {
          north: parseFloat(place.boundingbox[1]),
          south: parseFloat(place.boundingbox[0]),
          east: parseFloat(place.boundingbox[3]),
          west: parseFloat(place.boundingbox[2]),
        }
      : null,
  };
}

module.exports = { geocodeCity };
