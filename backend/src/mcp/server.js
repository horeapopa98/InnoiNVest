require('dotenv').config();

const resourceService = require('../services/resource.service');
const reportService = require('../services/report.service');
const connectorRegistry = require('../repositories/connectors/registry');

async function startMcpServer() {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { z } = await import('zod');

  const server = new McpServer({
    name: 'innoinvest-backend',
    version: '1.0.0',
  });

  server.tool(
    'list_resources',
    'List all connected data sources available for report generation.',
    {},
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(resourceService.listResources(), null, 2) }],
    })
  );

  server.tool(
    'proinfra_get_overview',
    'Get a full overview of extractable data from proinfrastructura.ro.',
    {},
    async () => {
      const overview = await resourceService.getOverview('proinfrastructura');
      return {
        content: [{ type: 'text', text: JSON.stringify(overview, null, 2) }],
      };
    }
  );

  server.tool(
    'proinfra_search_projects',
    'Search Romanian infrastructure projects with filters.',
    {
      query: z.string().optional(),
      type: z.enum(['road', 'railway']).optional(),
      highway: z.string().optional(),
      railway: z.string().optional(),
      category: z.string().optional(),
      builder: z.string().optional(),
      financing: z.string().optional(),
      hasProgress: z.boolean().optional(),
      minProgress: z.number().optional(),
      maxProgress: z.number().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      zoom: z.number().optional(),
      north: z.number().optional(),
      south: z.number().optional(),
      east: z.number().optional(),
      west: z.number().optional(),
      limit: z.number().optional(),
    },
    async (args) => {
      const results = await resourceService.searchProjects('proinfrastructura', args);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  server.tool(
    'proinfra_get_project',
    'Get a single infrastructure segment by OpenStreetMap way ID.',
    { osm_id: z.number() },
    async ({ osm_id }) => {
      const project = await resourceService.getProject('proinfrastructura', osm_id);
      return {
        content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
      };
    }
  );

  server.tool(
    'generate_report',
    'Generate an infrastructure report from a data source. Optionally persists to the database.',
    {
      sourceId: z.string().describe('Data source id, e.g. proinfrastructura'),
      groupBy: z.enum(['category', 'builder', 'financing', 'highway', 'type']).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      zoom: z.number().optional(),
      north: z.number().optional(),
      south: z.number().optional(),
      east: z.number().optional(),
      west: z.number().optional(),
      persist: z.boolean().optional().describe('Save report to database (default true)'),
    },
    async ({ sourceId, persist = true, ...parameters }) => {
      const report = await reportService.generate(sourceId, parameters, { persist });
      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
      };
    }
  );

  server.tool(
    'list_reports',
    'List previously generated reports stored in the database.',
    {
      sourceId: z.string().optional(),
      limit: z.number().optional(),
    },
    async (args) => {
      const reports = await reportService.list(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      };
    }
  );

  // ─── INNO Real Estate tools ──────────────────────────────────────────────────

  server.tool(
    'inno_get_overview',
    'Get an overview of INNO real-estate / investment-property listings for North-West Romania. ' +
      'Covers 155+ curated land & property opportunities across Bihor, Maramureș, Bistrița-Năsăud, Satu Mare, Cluj, Sălaj.',
    {},
    async () => {
      const connector = connectorRegistry.getConnector('inno-proprietati');
      const overview = await connector.getOverview();
      return { content: [{ type: 'text', text: JSON.stringify(overview, null, 2) }] };
    }
  );

  server.tool(
    'inno_search_listings',
    'Search INNO real-estate listings with optional filters. Returns matching land/property opportunities in North-West Romania.',
    {
      county: z
        .enum(['BH', 'MM', 'BN', 'SM', 'CJ', 'SJ'])
        .optional()
        .describe('County code to filter by'),
      useCase: z
        .enum(['industrial', 'logistics', 'commercial', 'residential', 'agricultural', 'energy', 'educational', 'park', 'mixed', 'other'])
        .optional()
        .describe('Intended use case'),
      availability: z
        .enum(['sale', 'rent', 'concession'])
        .optional()
        .describe('Transaction type'),
      minAreaSqm: z.number().optional().describe('Minimum area in square metres'),
      maxAreaSqm: z.number().optional().describe('Maximum area in square metres'),
      maxPricePerSqm: z.number().optional().describe('Maximum price in €/sqm'),
      intravilan: z.boolean().optional().describe('Filter by intravilan (inside city limits) status'),
      query: z.string().optional().describe('Free-text search in title and description'),
      limit: z.number().optional().describe('Max number of results (default 25)'),
    },
    async (args) => {
      const connector = connectorRegistry.getConnector('inno-proprietati');
      const results = await connector.searchListings(args);
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    'inno_generate_report',
    'Generate a summary report of INNO real-estate listings grouped by a chosen dimension.',
    {
      groupBy: z
        .enum(['county', 'use_case', 'availability', 'author'])
        .optional()
        .describe('Dimension to group by (default: county)'),
    },
    async ({ groupBy = 'county' }) => {
      const connector = connectorRegistry.getConnector('inno-proprietati');
      const report = await connector.generateReport({ groupBy });
      return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
    }
  );

  server.tool(
    'inno_get_geo_properties',
    'Get INNO land/property listings with exact WGS84 coordinates from the ArcGIS map. ' +
      'Supports filtering by county, land type, acquisition method, and area range.',
    {
      county: z.string().optional().describe('County name, e.g. "Cluj" or "Bihor"'),
      minAreaHa: z.number().optional().describe('Minimum area in hectares'),
      maxAreaHa: z.number().optional().describe('Maximum area in hectares'),
      landType: z.string().optional().describe('Land type, e.g. "Built-up" or "Agricultural"'),
      availability: z.string().optional().describe('Acquisition method substring, e.g. "Sale"'),
    },
    async (args) => {
      const connector = connectorRegistry.getConnector('inno-proprietati');
      const result = await connector.getGeoProperties(args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'inno_find_nearby_properties',
    'Find INNO investment properties near a geographic point (lat/lng), sorted by distance.',
    {
      lat: z.number().describe('Latitude (WGS84)'),
      lng: z.number().describe('Longitude (WGS84)'),
      radiusKm: z.number().optional().describe('Search radius in km (default 25)'),
    },
    async ({ lat, lng, radiusKm = 25 }) => {
      const connector = connectorRegistry.getConnector('inno-proprietati');
      const result = await connector.getNearbyProperties(lat, lng, radiusKm);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'inno_get_infrastructure',
    'Get infrastructure features from the INNO ArcGIS map: industrial/smart parks, airports, railway stations, or border crossings.',
    {
      type: z
        .enum(['parks', 'airports', 'railway_stations', 'border_crossings'])
        .describe('Infrastructure type to retrieve'),
    },
    async ({ type }) => {
      const connector = connectorRegistry.getConnector('inno-proprietati');
      const result = await connector.getInfrastructure(type);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('InnoiNVest MCP server running (backend integrated)');
}

startMcpServer().catch((error) => {
  console.error('Fatal MCP error:', error);
  process.exit(1);
});
