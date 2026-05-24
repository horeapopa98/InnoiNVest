const cityService = require('../services/city.service');
const { parseProjectSearchQuery, parseOptionalNumber } = require('../utils/queryParser');

async function getCityOverview(req, res) {
  const overview = await cityService.getOverview(req.params.cityName);
  res.json(overview);
}

async function searchCityProjects(req, res) {
  const filters = parseProjectSearchQuery(req.query);
  const results = await cityService.searchProjects(req.params.cityName, filters);
  res.json(results);
}

async function getCityReport(req, res) {
  const parameters = {
    groupBy: req.query.groupBy || 'category',
  };

  const report = await cityService.generateReport(req.params.cityName, parameters);
  res.json(report);
}

module.exports = {
  getCityOverview,
  searchCityProjects,
  getCityReport,
};
