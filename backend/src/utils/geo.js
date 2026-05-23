function flattenCoordinates(coordinates, depth = 0) {
  if (!coordinates) return [];
  if (depth >= 2 || typeof coordinates[0] === 'number') {
    return [coordinates];
  }
  return coordinates.flatMap((c) => flattenCoordinates(c, depth + 1));
}

function getFeatureCenter(feature) {
  const coords = flattenCoordinates(feature.geometry?.coordinates);
  if (!coords.length) return null;

  const sum = coords.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 }
  );

  return {
    lat: sum.lat / coords.length,
    lng: sum.lng / coords.length,
  };
}

function featureInBounds(feature, bounds) {
  const { north, south, east, west } = bounds;
  const coords = flattenCoordinates(feature.geometry?.coordinates);

  return coords.some(
    ([lng, lat]) => lat >= south && lat <= north && lng >= west && lng <= east
  );
}

function boundsFromCenter(lat, lng, zoom = 8) {
  const delta = 360 / Math.pow(2, zoom + 1);
  return {
    north: lat + delta,
    south: lat - delta,
    east: lng + delta * 1.5,
    west: lng - delta * 1.5,
  };
}

/**
 * Haversine distance in km between two WGS84 points.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  getFeatureCenter,
  flattenCoordinates,
  featureInBounds,
  boundsFromCenter,
  haversineKm,
};
