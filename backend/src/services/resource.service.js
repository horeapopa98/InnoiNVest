const { INFRASTRUCTURE_UTILITIES } = require('../constants/topics');
const connectorRegistry = require('../repositories/connectors/registry');

class ResourceService {
  listResources() {
    return {
      topic: INFRASTRUCTURE_UTILITIES,
      resources: connectorRegistry.listConnectors(),
    };
  }

  async getOverview(sourceId) {
    const connector = connectorRegistry.getConnector(sourceId);
    return connector.getOverview();
  }

  async searchProjects(sourceId, filters) {
    const connector = connectorRegistry.getConnector(sourceId);
    return connector.searchProjects(filters);
  }

  async getProject(sourceId, osmId) {
    const connector = connectorRegistry.getConnector(sourceId);
    return connector.getProject(osmId);
  }
}

module.exports = new ResourceService();
