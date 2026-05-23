const AppError = require('../../errors/AppError');
const { ProInfrastructuraConnector } = require('./proinfrastructura.connector');
const { InnoConnector } = require('./inno.connector');

const connectors = new Map();
let initialized = false;

function registerConnector(connector) {
  connectors.set(connector.id, connector);
}

function initConnectors() {
  if (initialized) return;
  registerConnector(new ProInfrastructuraConnector());
  registerConnector(new InnoConnector());
  initialized = true;
}

function getConnector(id) {
  initConnectors();

  const connector = connectors.get(id);
  if (!connector) {
    throw new AppError(
      `Unknown resource: ${id}. Available: ${[...connectors.keys()].join(', ')}`,
      404
    );
  }
  return connector;
}

function listConnectors() {
  initConnectors();
  return [...connectors.values()].map((connector) => connector.describe());
}

module.exports = {
  registerConnector,
  getConnector,
  listConnectors,
  initConnectors,
};
