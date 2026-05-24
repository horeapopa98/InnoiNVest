const cityService = require('./city.service');
const resourceService = require('./resource.service');
const connectorRegistry = require('../repositories/connectors/registry');
const combinedReportService = require('./combined-report.service');

// ─── Tool definitions (OpenAI function-calling format) ───────────────────────

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_city_infrastructure',
      description:
        'Get a full overview of infrastructure projects (roads, railways) in a Romanian city or region. ' +
        'Returns counts of actively-building, in-pipeline, and completed segments, plus top builders and financing programs.',
      parameters: {
        type: 'object',
        properties: {
          city_name: {
            type: 'string',
            description: 'City or region name in Romanian or English, e.g. "Cluj-Napoca", "Oradea", "Timișoara"',
          },
        },
        required: ['city_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_infrastructure_projects',
      description:
        'Search Romanian road and railway infrastructure projects with optional filters. ' +
        'Use this when you need specific project details, progress percentages, or want to filter by builder, financing source, or project type.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Free-text search in project names' },
          type: { type: 'string', description: 'Project type: "road" or "railway"' },
          category: { type: 'string', description: 'Category slug, e.g. "road_under_construction"' },
          builder: { type: 'string', description: 'Builder/contractor name' },
          financing: { type: 'string', description: 'Financing program, e.g. "PNRR", "EU Funds"' },
          min_progress: { type: 'number', description: 'Minimum construction progress (0-100)' },
          max_progress: { type: 'number', description: 'Maximum construction progress (0-100)' },
          lat: { type: 'number', description: 'Center latitude for geographic filter' },
          lng: { type: 'number', description: 'Center longitude for geographic filter' },
          zoom: { type: 'number', description: 'Zoom level (higher = smaller area), e.g. 10' },
          limit: { type: 'number', description: 'Max results to return (default 20)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_infrastructure_overview',
      description:
        'Get a high-level statistical overview of all Romanian infrastructure data: total segments, ' +
        'breakdown by construction category, top builders, financing mix.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_property_listings',
      description:
        'Search INNO investment property listings in North-West Romania (6 counties: Bihor BH, Maramureș MM, ' +
        'Bistrița-Năsăud BN, Satu Mare SM, Cluj CJ, Sălaj SJ). Returns land plots and buildings available ' +
        'for sale, rent, or concession.',
      parameters: {
        type: 'object',
        properties: {
          county: { type: 'string', description: 'County code: BH, MM, BN, SM, CJ, or SJ' },
          use_case: {
            type: 'string',
            description:
              'Use case: industrial, logistics, commercial, residential, agricultural, energy, educational, park, mixed, other',
          },
          availability: { type: 'string', description: 'Transaction type: sale, rent, or concession' },
          min_area_sqm: { type: 'number', description: 'Minimum area in square metres' },
          max_area_sqm: { type: 'number', description: 'Maximum area in square metres' },
          max_price_per_sqm: { type: 'number', description: 'Maximum price in €/m²' },
          intravilan: {
            type: 'boolean',
            description: 'true = inside city limits (intravilan), false = outside city limits (extravilan)',
          },
          query: { type: 'string', description: 'Free-text search in listing title and description' },
          limit: { type: 'number', description: 'Max results (default 25)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_property_overview',
      description:
        'Get a statistical overview of all INNO property listings: total count, total land area, ' +
        'breakdown by county, use-case, and transaction type.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_geo_properties',
      description:
        'Get INNO property listings with exact GPS coordinates (lat/lng) from the ArcGIS map layer. ' +
        'Use this when the user needs geographic or map data, or exact coordinates for properties.',
      parameters: {
        type: 'object',
        properties: {
          county: { type: 'string', description: 'County name, e.g. "Cluj" or "Bihor"' },
          min_area_ha: { type: 'number', description: 'Minimum area in hectares' },
          max_area_ha: { type: 'number', description: 'Maximum area in hectares' },
          land_type: { type: 'string', description: 'Land type, e.g. "Built-up" or "Agricultural"' },
          availability: { type: 'string', description: 'Acquisition method substring, e.g. "Sale" or "Concession"' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearby_properties',
      description:
        'Find INNO investment properties near a specific geographic point, sorted by distance. ' +
        'Use this when the user asks about properties near a city, a location, or specific coordinates.',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude (WGS84), e.g. 46.77 for Cluj-Napoca' },
          lng: { type: 'number', description: 'Longitude (WGS84), e.g. 23.59 for Cluj-Napoca' },
          radius_km: { type: 'number', description: 'Search radius in kilometres (default 25)' },
        },
        required: ['lat', 'lng'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_infrastructure_features',
      description:
        'Get infrastructure features from the INNO ArcGIS map: industrial parks, smart specialisation parks, ' +
        'airports, railway stations, or border crossing points in North-West Romania.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Feature type: "parks", "airports", "railway_stations", or "border_crossings"',
          },
        },
        required: ['type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_investment_report',
      description:
        'Generate a combined investment location report. Use this when the user mentions any Romanian place — ' +
        'a city, commune, village, or region (e.g. "comuna Moldovenești", "Aleșd", "zona Cluj"). ' +
        'Also works with INNO listing IDs. Merges INNO property data with ProInfrastructura transport ' +
        'infrastructure (roads, highways, railways under construction). Returns a connectivity score, ' +
        'nearby infrastructure, and a full transport analysis.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description:
              'Any Romanian place name the user mentions — commune, city, village, or region. ' +
              'E.g. "comuna Moldovenești", "Aleșd", "Bistrița", "zona industrială Cluj". ' +
              'The system geocodes it automatically and finds the nearest INNO properties. ' +
              'USE THIS when the user says a place name instead of an ID.',
          },
          id: {
            type: 'string',
            description:
              'INNO property/listing ID. Accepts: "467", "inno-467" (HTML listing), or ' +
              '"arcgis-inno-42" (ArcGIS property). Use only when the user explicitly references an ID.',
          },
          name: {
            type: 'string',
            description:
              'Property or park name (partial match). Searches across ALL types: land plots, industrial parks, ' +
              'smart parks, logistic parks, and HTML listings. E.g. "Tetarom", "BH_Tauteu", "Aleșd".',
          },
          county: { type: 'string', description: 'County name to filter properties, e.g. "Cluj", "Bihor", "Satu Mare".' },
          land_type: { type: 'string', description: 'Land type filter, e.g. "Built-up", "Urban", "Agricultural".' },
          lat: { type: 'number', description: 'Latitude (WGS84). Use with lng when no name/ID.' },
          lng: { type: 'number', description: 'Longitude (WGS84).' },
          radius_km: { type: 'number', description: 'Search radius in km (default 30).' },
        },
        required: [],
      },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(name, args = {}) {
  const inno = connectorRegistry.getConnector('inno-proprietati');

  switch (name) {
    case 'get_city_infrastructure':
      return cityService.getOverview(args.city_name);

    case 'search_infrastructure_projects':
      return resourceService.searchProjects('proinfrastructura', {
        query: args.query,
        type: args.type,
        category: args.category,
        builder: args.builder,
        financing: args.financing,
        minProgress: args.min_progress,
        maxProgress: args.max_progress,
        lat: args.lat,
        lng: args.lng,
        zoom: args.zoom,
        limit: args.limit || 20,
      });

    case 'get_infrastructure_overview':
      return resourceService.getOverview('proinfrastructura');

    case 'search_property_listings':
      return inno.searchListings({
        county: args.county,
        useCase: args.use_case,
        availability: args.availability,
        minAreaSqm: args.min_area_sqm,
        maxAreaSqm: args.max_area_sqm,
        maxPricePerSqm: args.max_price_per_sqm,
        intravilan: args.intravilan,
        query: args.query,
        limit: args.limit || 25,
      });

    case 'get_property_overview':
      return inno.getOverview();

    case 'get_geo_properties':
      return inno.getGeoProperties({
        county: args.county,
        minAreaHa: args.min_area_ha,
        maxAreaHa: args.max_area_ha,
        landType: args.land_type,
        availability: args.availability,
      });

    case 'find_nearby_properties':
      return inno.getNearbyProperties(args.lat, args.lng, args.radius_km || 25);

    case 'get_infrastructure_features':
      return inno.getInfrastructure(args.type);

    case 'generate_investment_report':
      return combinedReportService.generateLocationReport({
        id: args.id,
        location: args.location,
        name: args.name,
        county: args.county,
        landType: args.land_type,
        lat: args.lat,
        lng: args.lng,
        radiusKm: args.radius_km,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool };
