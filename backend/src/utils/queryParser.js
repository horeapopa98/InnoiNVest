function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseProjectSearchQuery(query) {
  return {
    query: query.query,
    type: query.type,
    highway: query.highway,
    railway: query.railway,
    category: query.category,
    builder: query.builder,
    financing: query.financing,
    hasProgress: query.hasProgress === 'true',
    minProgress: parseOptionalNumber(query.minProgress),
    maxProgress: parseOptionalNumber(query.maxProgress),
    lat: parseOptionalNumber(query.lat),
    lng: parseOptionalNumber(query.lng),
    zoom: parseOptionalNumber(query.zoom),
    north: parseOptionalNumber(query.north),
    south: parseOptionalNumber(query.south),
    east: parseOptionalNumber(query.east),
    west: parseOptionalNumber(query.west),
    limit: parseOptionalNumber(query.limit),
  };
}

module.exports = { parseProjectSearchQuery, parseOptionalNumber };
