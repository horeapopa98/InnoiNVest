const connectorRegistry = require('../repositories/connectors/registry');
const { parseOptionalNumber } = require('../utils/queryParser');

function _parseBoolean(val) {
  if (val === undefined || val === null) return undefined;
  return val === 'true' || val === true;
}

async function getOverview(req, res) {
  const connector = connectorRegistry.getConnector('inno-proprietati');
  res.json(await connector.getOverview());
}

async function searchListings(req, res) {
  const {
    county,
    useCase,
    availability,
    query,
    intravilan,
  } = req.query;

  const filters = {
    county,
    useCase,
    availability,
    query,
    intravilan: _parseBoolean(intravilan),
    minAreaSqm: parseOptionalNumber(req.query.minAreaSqm),
    maxAreaSqm: parseOptionalNumber(req.query.maxAreaSqm),
    maxPricePerSqm: parseOptionalNumber(req.query.maxPricePerSqm),
    limit: parseOptionalNumber(req.query.limit) || 25,
  };

  const connector = connectorRegistry.getConnector('inno-proprietati');
  res.json(await connector.searchListings(filters));
}

async function generateReport(req, res) {
  const { groupBy = 'county' } = req.query;
  const connector = connectorRegistry.getConnector('inno-proprietati');
  res.json(await connector.generateReport({ groupBy }));
}

async function getGeoProperties(req, res) {
  const { county, landType, availability } = req.query;
  const filters = {
    county,
    landType,
    availability,
    minAreaHa: parseOptionalNumber(req.query.minAreaHa),
    maxAreaHa: parseOptionalNumber(req.query.maxAreaHa),
  };
  const connector = connectorRegistry.getConnector('inno-proprietati');
  res.json(await connector.getGeoProperties(filters));
}

async function getNearbyProperties(req, res) {
  const lat = parseOptionalNumber(req.query.lat);
  const lng = parseOptionalNumber(req.query.lng);
  const radius = parseOptionalNumber(req.query.radius) || 25;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  const connector = connectorRegistry.getConnector('inno-proprietati');
  res.json(await connector.getNearbyProperties(lat, lng, radius));
}

async function getInfrastructure(req, res) {
  const type = req.params.type || 'parks';
  const connector = connectorRegistry.getConnector('inno-proprietati');
  res.json(await connector.getInfrastructure(type));
}

module.exports = { getOverview, searchListings, generateReport, getGeoProperties, getNearbyProperties, getInfrastructure };
