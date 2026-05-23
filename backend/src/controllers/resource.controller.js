const resourceService = require('../services/resource.service');
const { parseProjectSearchQuery } = require('../utils/queryParser');

async function listResources(req, res) {
  res.json(resourceService.listResources());
}

async function getOverview(req, res) {
  const overview = await resourceService.getOverview(req.params.sourceId);
  res.json(overview);
}

async function searchProjects(req, res) {
  const filters = parseProjectSearchQuery(req.query);
  const results = await resourceService.searchProjects(req.params.sourceId, filters);
  res.json(results);
}

async function getProject(req, res) {
  const project = await resourceService.getProject(req.params.sourceId, req.params.osmId);

  if (!project.found) {
    return res.status(404).json(project);
  }

  res.json(project);
}

module.exports = {
  listResources,
  getOverview,
  searchProjects,
  getProject,
};
