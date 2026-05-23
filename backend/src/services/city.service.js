const { geocodeCity } = require('../utils/geocoder');
const connectorRegistry = require('../repositories/connectors/registry');

class CityService {
  async _resolveCity(cityName) {
    const location = await geocodeCity(cityName);
    const connector = connectorRegistry.getConnector('proinfrastructura');
    return { location, connector };
  }

  async getOverview(cityName) {
    const { location, connector } = await this._resolveCity(cityName);

    const bounds = location.bounding_box || this._boundsFromZoom(location.lat, location.lng, location.zoom);

    const [projects, report] = await Promise.all([
      connector.searchProjects({ ...bounds, limit: 9999 }),
      connector.generateReport({ ...bounds }),
    ]);

    const categories = report.breakdown;
    const activelyBuilding = (categories.road_under_construction_with_progress || 0) +
      (categories.road_under_construction || 0) +
      (categories.rail_under_construction || 0);

    const inPipeline = (categories.road_with_am_no_pt || 0) +
      (categories.road_with_pt_no_ac || 0) +
      (categories.road_unassigned_no_permits || 0) +
      (categories.road_assigned_missing_am || 0) +
      (categories.rail_proposed || 0);

    const completed = (categories.road_in_circulation || 0) +
      (categories.road_completed_no_access || 0) +
      (categories.rail_completed || 0);

    return {
      city: location,
      summary: {
        total_segments: report.total_segments,
        actively_building: activelyBuilding,
        in_pipeline: inPipeline,
        completed,
        other: report.total_segments - activelyBuilding - inPipeline - completed,
      },
      breakdown_by_category: report.breakdown,
      top_builders: report.top_builders,
      financing_mix: report.financing_mix,
      source: report.source,
      generated_at: report.generated_at,
    };
  }

  async searchProjects(cityName, filters = {}) {
    const { location, connector } = await this._resolveCity(cityName);

    const bounds = location.bounding_box || this._boundsFromZoom(location.lat, location.lng, location.zoom);

    const results = await connector.searchProjects({ ...bounds, ...filters });

    return {
      city: location,
      ...results,
    };
  }

  async generateReport(cityName, parameters = {}) {
    const { location, connector } = await this._resolveCity(cityName);

    const bounds = location.bounding_box || this._boundsFromZoom(location.lat, location.lng, location.zoom);

    const report = await connector.generateReport({ ...bounds, ...parameters });

    return {
      city: location,
      ...report,
    };
  }

  _boundsFromZoom(lat, lng, zoom) {
    const delta = 360 / Math.pow(2, zoom + 1);
    return {
      north: lat + delta,
      south: lat - delta,
      east: lng + delta * 1.5,
      west: lng - delta * 1.5,
    };
  }
}

module.exports = new CityService();
