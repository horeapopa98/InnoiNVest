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

async function geocodeCity(cityName) {
  return cache.getOrSet(
    `geocode:${cityName.trim().toLowerCase()}`,
    TTL.GEOCODE,
    () => _geocodeCityLive(cityName)
  );
}

async function _geocodeCityLive(cityName) {
  const params = new URLSearchParams({
    q: cityName,
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

  const results = await response.json();

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
