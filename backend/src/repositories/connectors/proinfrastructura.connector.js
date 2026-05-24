const { parseStatus, classifyProject } = require('../../utils/statusParser');
const { featureInBounds, getFeatureCenter, boundsFromCenter } = require('../../utils/geo');

const PUM_API = 'https://pum.project-online.se';
const DATA_URL = `${PUM_API}/maps/data/data-sql-infra.geo.json`;
const LOT_LIMITS_URL = `${PUM_API}/maps/data/lot_limits.json`;
const SOURCE_PAGE = 'https://proinfrastructura.ro/proiecteinfrastructura.html';
const CACHE_TTL_MS = 60 * 60 * 1000;

class ProInfrastructuraConnector {
  constructor() {
    this.id = 'proinfrastructura';
    this.topic = 'Infrastructure & Utilities';
    this._projectsCache = null;
    this._lotLimitsCache = null;
    this._loadedAt = 0;
  }

  describe() {
    return {
      id: this.id,
      name: 'Pro Infrastructura (Romania)',
      topic: this.topic,
      sourceUrl: SOURCE_PAGE,
      dataApi: DATA_URL,
      description:
        'Romanian transport infrastructure map by Asociația Pro Infrastructura. ' +
        'Roads (highways, expressways) and railways with construction status, ' +
        'contractors, financing, permits, and progress history.',
      note:
        'This source covers transport infrastructure (roads & rail). Utilities ' +
        '(water, gas, electricity grids) are not present in this dataset — add ' +
        'additional connectors for those topics.',
    };
  }

  async _loadProjects(force = false) {
    const stale = Date.now() - this._loadedAt > CACHE_TTL_MS;
    if (!force && this._projectsCache && !stale) {
      return this._projectsCache;
    }

    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    this._projectsCache = await response.json();
    this._loadedAt = Date.now();
    return this._projectsCache;
  }

  async _loadLotLimits() {
    if (this._lotLimitsCache) return this._lotLimitsCache;

    const response = await fetch(LOT_LIMITS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch lot limits: ${response.status}`);
    }

    this._lotLimitsCache = await response.json();
    return this._lotLimitsCache;
  }

  _normalizeFeature(feature) {
    const properties = parseStatus({ ...feature.properties });
    const center = getFeatureCenter(feature);

    return {
      osm_id: properties.osm_id,
      osm_url: properties.osm_id
        ? `https://openstreetmap.org/way/${properties.osm_id}`
        : null,
      type: properties.highway ? 'road' : properties.railway ? 'railway' : 'unknown',
      name: properties.name || null,
      ref: properties.ref || null,
      highway: properties.highway || null,
      railway: properties.railway || null,
      construction: properties.construction || null,
      proposed: properties.proposed || null,
      bridge: properties.bridge || null,
      tunnel: properties.tunnel || null,
      category: classifyProject(feature.properties),
      permits: {
        AC: Boolean(properties.AC),
        AM: Boolean(properties.AM),
        PTE: Boolean(properties.PTE),
      },
      builder: properties.builder || null,
      winner: properties.winner || null,
      tender: properties.tender || null,
      financing: properties.financing || null,
      severance: properties.severance || null,
      progress_percent: properties.latestProgress ?? null,
      progress_history: properties.progress || null,
      progress_estimate: properties.progress_estimate || null,
      opening_date: properties.opening_date || null,
      start_date: properties.start_date || null,
      access: properties.access || null,
      access_note: properties.access_note || null,
      center,
      geometry_type: feature.geometry?.type || null,
    };
  }

  async getOverview() {
    const data = await this._loadProjects();
    const features = data.features || [];

    const stats = {
      total_segments: features.length,
      with_name: 0,
      with_ref: 0,
      roads: 0,
      railways: 0,
      with_builder: 0,
      with_financing: 0,
      with_progress: 0,
      with_tender: 0,
      permit_AC: 0,
      permit_AM: 0,
      permit_PTE: 0,
      highway_types: {},
      railway_types: {},
      financing_programs: {},
      top_builders: {},
      categories: {},
    };

    const extractableFields = new Set([
      'osm_id',
      'name',
      'ref',
      'highway',
      'railway',
      'construction',
      'proposed',
      'bridge',
      'tunnel',
      'status (parsed into AC/AM/PTE, builder, tender, financing, progress)',
      'start_date',
      'opening_date',
      'access',
      'access_note',
      'geometry (LineString coordinates)',
    ]);

    for (const feature of features) {
      const p = feature.properties;
      if (p.name) stats.with_name++;
      if (p.ref) stats.with_ref++;
      if (p.highway) stats.roads++;
      if (p.railway) stats.railways++;

      const parsed = parseStatus({ ...p });
      const category = classifyProject(p);
      stats.categories[category] = (stats.categories[category] || 0) + 1;

      if (parsed.builder) {
        stats.with_builder++;
        stats.top_builders[parsed.builder] = (stats.top_builders[parsed.builder] || 0) + 1;
      }
      if (parsed.financing) {
        stats.with_financing++;
        stats.financing_programs[parsed.financing] =
          (stats.financing_programs[parsed.financing] || 0) + 1;
      }
      if (parsed.latestProgress != null) stats.with_progress++;
      if (parsed.tender) stats.with_tender++;
      if (parsed.AC) stats.permit_AC++;
      if (parsed.AM) stats.permit_AM++;
      if (parsed.PTE) stats.permit_PTE++;

      if (p.highway) {
        stats.highway_types[p.highway] = (stats.highway_types[p.highway] || 0) + 1;
      }
      if (p.railway) {
        stats.railway_types[p.railway] = (stats.railway_types[p.railway] || 0) + 1;
      }
    }

    stats.top_builders = Object.fromEntries(
      Object.entries(stats.top_builders)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
    );
    stats.financing_programs = Object.fromEntries(
      Object.entries(stats.financing_programs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
    );

    const lotLimits = await this._loadLotLimits();

    return {
      source: this.describe(),
      dataset: {
        format: 'GeoJSON FeatureCollection',
        url: DATA_URL,
        size_note: '~16 MB, ~25k line segments',
        lot_limits_url: LOT_LIMITS_URL,
        lot_limits_count: lotLimits.features?.length || 0,
      },
      statistics: stats,
      extractable_fields: [...extractableFields],
      report_potential: {
        summary: [
          'Portfolio overview by road/rail type and construction stage',
          'Contractor market share (builder/winner fields)',
          'Financing program breakdown (PNRR, POIM, FEDR, etc.)',
          'Permit pipeline (AC / AM / PTE gaps)',
          'Construction progress tracking with historical snapshots',
          'Tender activity and severance/termination events',
          'Geographic filtering by map bounding box',
        ],
        limitations: [
          'Transport infrastructure only — no water/gas/electric utilities in this API',
          'Segments are OSM ways, not formal project records — one project may span many segments',
          'Progress dates in status string are historical snapshots, not always current',
          'No budget/cost amounts in the dataset',
        ],
      },
    };
  }

  async searchProjects(filters = {}) {
    const {
      query,
      type,
      highway,
      railway,
      category,
      builder,
      financing,
      hasProgress,
      minProgress,
      maxProgress,
      lat,
      lng,
      zoom,
      north,
      south,
      east,
      west,
      limit = 25,
    } = filters;

    const data = await this._loadProjects();
    let bounds = null;

    if (north != null && south != null && east != null && west != null) {
      bounds = { north, south, east, west };
    } else if (lat != null && lng != null) {
      bounds = boundsFromCenter(lat, lng, zoom ?? 8);
    }

    const q = query?.toLowerCase();
    const results = [];

    for (const feature of data.features) {
      if (bounds && !featureInBounds(feature, bounds)) continue;

      const normalized = this._normalizeFeature(feature);

      if (type === 'road' && normalized.type !== 'road') continue;
      if (type === 'railway' && normalized.type !== 'railway') continue;
      if (highway && normalized.highway !== highway) continue;
      if (railway && normalized.railway !== railway) continue;
      if (category && normalized.category !== category) continue;
      if (builder && normalized.builder !== builder) continue;
      if (financing && normalized.financing !== financing) continue;
      if (hasProgress && normalized.progress_percent == null) continue;
      if (minProgress != null && (normalized.progress_percent ?? -1) < minProgress) continue;
      if (maxProgress != null && (normalized.progress_percent ?? 101) > maxProgress) continue;

      if (q) {
        const haystack = [normalized.name, normalized.ref, normalized.builder, normalized.financing]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      results.push(normalized);
      if (results.length >= limit) break;
    }

    return {
      count: results.length,
      limit,
      filters_applied: {
        query,
        type,
        highway,
        railway,
        category,
        builder,
        financing,
        hasProgress,
        minProgress,
        maxProgress,
        bounds,
      },
      projects: results,
    };
  }

  async getProject(osmId) {
    const data = await this._loadProjects();
    const id = Number(osmId);
    const feature = data.features.find((f) => f.properties?.osm_id === id);

    if (!feature) {
      return { found: false, osm_id: id };
    }

    return {
      found: true,
      project: this._normalizeFeature(feature),
      raw_properties: feature.properties,
      geometry: feature.geometry,
    };
  }

  async generateReport(params = {}) {
    const { groupBy = 'category', lat, lng, zoom, north, south, east, west } = params;
    const data = await this._loadProjects();
    let bounds = null;

    if (north != null && south != null && east != null && west != null) {
      bounds = { north, south, east, west };
    } else if (lat != null && lng != null) {
      bounds = boundsFromCenter(lat, lng, zoom ?? 8);
    }

    const groups = {};
    const builders = {};
    const financing = {};
    let total = 0;

    for (const feature of data.features) {
      if (bounds && !featureInBounds(feature, bounds)) continue;

      total++;
      const normalized = this._normalizeFeature(feature);

      let key;
      switch (groupBy) {
        case 'builder':
          key = normalized.builder || 'Unknown';
          break;
        case 'financing':
          key = normalized.financing || 'Unknown';
          break;
        case 'highway':
          key = normalized.highway || normalized.railway || 'Unknown';
          break;
        case 'type':
          key = normalized.type;
          break;
        case 'category':
        default:
          key = normalized.category;
          break;
      }

      groups[key] = (groups[key] || 0) + 1;

      if (normalized.builder) {
        builders[normalized.builder] = (builders[normalized.builder] || 0) + 1;
      }
      if (normalized.financing) {
        financing[normalized.financing] = (financing[normalized.financing] || 0) + 1;
      }
    }

    const sortedGroups = Object.fromEntries(
      Object.entries(groups).sort((a, b) => b[1] - a[1])
    );

    return {
      topic: this.topic,
      source: SOURCE_PAGE,
      region: bounds
        ? { bounds, center: lat && lng ? { lat, lng, zoom } : null }
        : 'Romania (national)',
      total_segments: total,
      grouped_by: groupBy,
      breakdown: sortedGroups,
      top_builders: Object.fromEntries(
        Object.entries(builders).sort((a, b) => b[1] - a[1]).slice(0, 10)
      ),
      financing_mix: Object.fromEntries(
        Object.entries(financing).sort((a, b) => b[1] - a[1]).slice(0, 10)
      ),
      generated_at: new Date().toISOString(),
    };
  }
}

module.exports = { ProInfrastructuraConnector };
