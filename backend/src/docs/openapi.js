module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'InnoiNVest API',
    version: '1.0.0',
    description:
      'API for exploring Romanian infrastructure data sources and generating reports. ' +
      'Data is fetched from external connectors (e.g. proinfrastructura.ro) and reports can be persisted to PostgreSQL.',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local development',
    },
  ],
  tags: [
    {
      name: 'Cities',
      description: 'Query infrastructure data by city name — auto-geocoded via OpenStreetMap',
    },
    {
      name: 'Resources',
      description: 'Browse connected data sources and search infrastructure projects',
    },
    {
      name: 'Properties',
      description: 'INNO real-estate & investment-property listings for North-West Romania (6 counties, 155+ listings)',
    },
    {
      name: 'Reports',
      description: 'Generate and retrieve aggregated infrastructure reports',
    },
    {
      name: 'Chat',
      description: 'AI assistant powered by Gemini — answers investment questions using live data from all connected sources',
    },
  ],
  paths: {
    '/api/chat': {
      post: {
        tags: ['Chat'],
        summary: 'Ask the AI investment assistant',
        description:
          'Sends a message to the Gemini-powered investment research assistant. ' +
          'The assistant automatically calls the relevant data tools (infrastructure projects, ' +
          'INNO property listings, geographic data) and returns a synthesized answer. ' +
          'Supports multi-turn conversation by passing the `history` array back on each request.\n\n' +
          '**Requires:** `GEMINI_API_KEY` environment variable (free at aistudio.google.com).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRequest' },
              examples: {
                cityQuery: {
                  summary: 'City infrastructure query',
                  value: { message: 'What infrastructure is being built in Cluj-Napoca?', history: [] },
                },
                propertySearch: {
                  summary: 'Property search',
                  value: { message: 'Find industrial land over 5 hectares available for concession in Bihor county', history: [] },
                },
                nearbySearch: {
                  summary: 'Nearby properties',
                  value: { message: 'What investment land is available within 30 km of Oradea?', history: [] },
                },
                reportGeneration: {
                  summary: 'Report generation',
                  value: { message: 'Generate a report of all available properties grouped by county', history: [] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'AI response with tool usage trace and updated conversation history',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatResponse' },
              },
            },
          },
          400: { description: 'Missing or invalid message field' },
          500: { description: 'Gemini API error or GEMINI_API_KEY not set' },
        },
      },
    },
    '/api/properties/overview': {
      get: {
        tags: ['Properties'],
        summary: 'INNO listings overview',
        description:
          'Returns aggregated statistics about all INNO real-estate listings: total count, ' +
          'total land area, breakdown by county, use-case, and transaction type.',
        responses: {
          200: {
            description: 'Overview of INNO property listings',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InnoOverview' },
              },
            },
          },
        },
      },
    },
    '/api/properties': {
      get: {
        tags: ['Properties'],
        summary: 'Search INNO property listings',
        description:
          'Filter investment-grade land and property opportunities. All filters are optional and combinable.',
        parameters: [
          { name: 'county', in: 'query', schema: { type: 'string', enum: ['BH', 'MM', 'BN', 'SM', 'CJ', 'SJ'] }, description: 'County code' },
          { name: 'useCase', in: 'query', schema: { type: 'string', enum: ['industrial', 'logistics', 'commercial', 'residential', 'agricultural', 'energy', 'educational', 'park', 'mixed', 'other'] } },
          { name: 'availability', in: 'query', schema: { type: 'string', enum: ['sale', 'rent', 'concession'] } },
          { name: 'minAreaSqm', in: 'query', schema: { type: 'number' }, description: 'Minimum area (m²)' },
          { name: 'maxAreaSqm', in: 'query', schema: { type: 'number' }, description: 'Maximum area (m²)' },
          { name: 'maxPricePerSqm', in: 'query', schema: { type: 'number' }, description: 'Max price (€/m²)' },
          { name: 'intravilan', in: 'query', schema: { type: 'boolean' }, description: 'Inside city limits?' },
          { name: 'query', in: 'query', schema: { type: 'string' }, description: 'Free-text search' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: {
          200: {
            description: 'Filtered property listings',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InnoSearchResult' },
              },
            },
          },
        },
      },
    },
    '/api/properties/report': {
      get: {
        tags: ['Properties'],
        summary: 'Generate a property listings report',
        description: 'Aggregate INNO listings by a chosen dimension for report generation.',
        parameters: [
          {
            name: 'groupBy',
            in: 'query',
            schema: { type: 'string', enum: ['county', 'use_case', 'availability', 'author'], default: 'county' },
          },
        ],
        responses: {
          200: {
            description: 'Property report',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InnoReport' },
              },
            },
          },
        },
      },
    },
    '/api/cities/{cityName}': {
      get: {
        tags: ['Cities'],
        summary: 'City infrastructure overview',
        description:
          'Geocodes the city name via OpenStreetMap Nominatim, then returns a full summary of all ' +
          'infrastructure segments in that city\'s area: how many are actively being built, in the ' +
          'permit pipeline, completed, and a breakdown by category, top builders, and financing programs.',
        parameters: [
          {
            name: 'cityName',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            examples: {
              Cluj: { value: 'Cluj-Napoca' },
              Brasov: { value: 'Brașov' },
              Timisoara: { value: 'Timișoara' },
              Bucuresti: { value: 'București' },
            },
          },
        ],
        responses: {
          200: {
            description: 'City infrastructure overview',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CityOverview' },
              },
            },
          },
          404: {
            description: 'City not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/cities/{cityName}/projects': {
      get: {
        tags: ['Cities'],
        summary: 'Search projects near a city',
        description:
          'Geocodes the city, then returns filtered infrastructure segments within the city bounds. ' +
          'All project filters (type, builder, financing, progress, etc.) apply on top of the city region.',
        parameters: [
          {
            name: 'cityName',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'Cluj-Napoca',
          },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['road', 'railway'] } },
          { name: 'category', in: 'query', schema: { type: 'string' }, example: 'road_under_construction_with_progress' },
          { name: 'builder', in: 'query', schema: { type: 'string' }, example: 'UMB' },
          { name: 'financing', in: 'query', schema: { type: 'string' }, example: 'PNRR' },
          { name: 'highway', in: 'query', schema: { type: 'string' }, example: 'motorway' },
          { name: 'hasProgress', in: 'query', schema: { type: 'boolean' } },
          { name: 'minProgress', in: 'query', schema: { type: 'number' } },
          { name: 'maxProgress', in: 'query', schema: { type: 'number' } },
          { name: 'query', in: 'query', schema: { type: 'string' }, description: 'Free text search on name/ref/builder' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: {
          200: {
            description: 'Filtered projects for the city',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CityProjectSearchResult' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/cities/{cityName}/report': {
      get: {
        tags: ['Cities'],
        summary: 'Aggregated report for a city',
        description:
          'Geocodes the city and generates an aggregated breakdown of infrastructure segments ' +
          'in that area, grouped by category, builder, financing, highway type, or road type.',
        parameters: [
          {
            name: 'cityName',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'Cluj-Napoca',
          },
          {
            name: 'groupBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['category', 'builder', 'financing', 'highway', 'type'],
              default: 'category',
            },
          },
        ],
        responses: {
          200: {
            description: 'City report',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CityReport' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/resources': {
      get: {
        tags: ['Resources'],
        summary: 'List data sources',
        description: 'Returns all registered external data connectors available for search and report generation.',
        responses: {
          200: {
            description: 'List of resources',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ResourceList' },
              },
            },
          },
        },
      },
    },
    '/api/resources/{sourceId}/overview': {
      get: {
        tags: ['Resources'],
        summary: 'Get source overview',
        description:
          'Returns statistics, extractable fields, and report potential for a data source. ' +
          'Fetches live data from the external API.',
        parameters: [
          {
            name: 'sourceId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'proinfrastructura' },
          },
        ],
        responses: {
          200: {
            description: 'Source overview',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SourceOverview' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/resources/{sourceId}/projects': {
      get: {
        tags: ['Resources'],
        summary: 'Search infrastructure projects',
        description:
          'Search and filter road/rail segments from the data source. ' +
          'Use lat/lng/zoom to filter by map region, or pass explicit bounding box coordinates.',
        parameters: [
          {
            name: 'sourceId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'proinfrastructura' },
          },
          { name: 'query', in: 'query', schema: { type: 'string' }, description: 'Search name, ref, builder, financing' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['road', 'railway'] } },
          { name: 'highway', in: 'query', schema: { type: 'string' }, description: 'e.g. motorway, trunk, construction, proposed' },
          { name: 'railway', in: 'query', schema: { type: 'string' }, description: 'e.g. rail, construction, proposed' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'e.g. road_under_construction_with_progress' },
          { name: 'builder', in: 'query', schema: { type: 'string' }, example: 'UMB' },
          { name: 'financing', in: 'query', schema: { type: 'string' }, example: 'PNRR' },
          { name: 'hasProgress', in: 'query', schema: { type: 'boolean' } },
          { name: 'minProgress', in: 'query', schema: { type: 'number' } },
          { name: 'maxProgress', in: 'query', schema: { type: 'number' } },
          { name: 'lat', in: 'query', schema: { type: 'number' }, example: 45.9187, description: 'Map center latitude' },
          { name: 'lng', in: 'query', schema: { type: 'number' }, example: 25.1312, description: 'Map center longitude' },
          { name: 'zoom', in: 'query', schema: { type: 'number', default: 8 }, description: 'Map zoom level for region filter' },
          { name: 'north', in: 'query', schema: { type: 'number' }, description: 'Bounding box north' },
          { name: 'south', in: 'query', schema: { type: 'number' }, description: 'Bounding box south' },
          { name: 'east', in: 'query', schema: { type: 'number' }, description: 'Bounding box east' },
          { name: 'west', in: 'query', schema: { type: 'number' }, description: 'Bounding box west' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: {
          200: {
            description: 'Search results',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectSearchResult' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/resources/{sourceId}/projects/{osmId}': {
      get: {
        tags: ['Resources'],
        summary: 'Get project by OSM ID',
        description: 'Returns full details for a single infrastructure segment, including raw properties and geometry.',
        parameters: [
          {
            name: 'sourceId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'proinfrastructura' },
          },
          {
            name: 'osmId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 1377166724 },
          },
        ],
        responses: {
          200: {
            description: 'Project details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectDetail' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/reports': {
      get: {
        tags: ['Reports'],
        summary: 'List saved reports',
        parameters: [
          { name: 'sourceId', in: 'query', schema: { type: 'string' }, example: 'proinfrastructura' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: {
            description: 'List of report summaries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ReportSummary' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Reports'],
        summary: 'Generate a report',
        description:
          'Aggregates infrastructure data from a source (by category, builder, financing, etc.) ' +
          'and optionally saves the result to the database.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateReportRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Generated report',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GeneratedReport' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/reports/{id}': {
      get: {
        tags: ['Reports'],
        summary: 'Get saved report by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Full report with data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SavedReport' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    responses: {
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      BadRequest: {
        description: 'Invalid request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      ResourceList: {
        type: 'object',
        properties: {
          topic: { type: 'string', example: 'Infrastructure & Utilities' },
          resources: {
            type: 'array',
            items: { $ref: '#/components/schemas/DataSource' },
          },
        },
      },
      DataSource: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'proinfrastructura' },
          name: { type: 'string', example: 'Pro Infrastructura (Romania)' },
          topic: { type: 'string' },
          sourceUrl: { type: 'string', format: 'uri' },
          dataApi: { type: 'string', format: 'uri' },
          description: { type: 'string' },
          note: { type: 'string' },
        },
      },
      SourceOverview: {
        type: 'object',
        properties: {
          source: { $ref: '#/components/schemas/DataSource' },
          dataset: { type: 'object' },
          statistics: { type: 'object' },
          extractable_fields: { type: 'array', items: { type: 'string' } },
          report_potential: { type: 'object' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          osm_id: { type: 'integer' },
          osm_url: { type: 'string', format: 'uri' },
          type: { type: 'string', enum: ['road', 'railway', 'unknown'] },
          name: { type: 'string', nullable: true },
          ref: { type: 'string', nullable: true },
          highway: { type: 'string', nullable: true },
          railway: { type: 'string', nullable: true },
          category: { type: 'string' },
          permits: {
            type: 'object',
            properties: {
              AC: { type: 'boolean' },
              AM: { type: 'boolean' },
              PTE: { type: 'boolean' },
            },
          },
          builder: { type: 'string', nullable: true },
          tender: { type: 'string', nullable: true },
          financing: { type: 'string', nullable: true },
          progress_percent: { type: 'number', nullable: true },
          center: {
            type: 'object',
            nullable: true,
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
        },
      },
      ProjectSearchResult: {
        type: 'object',
        properties: {
          count: { type: 'integer' },
          limit: { type: 'integer' },
          filters_applied: { type: 'object' },
          projects: {
            type: 'array',
            items: { $ref: '#/components/schemas/Project' },
          },
        },
      },
      ProjectDetail: {
        type: 'object',
        properties: {
          found: { type: 'boolean' },
          project: { $ref: '#/components/schemas/Project' },
          raw_properties: { type: 'object' },
          geometry: { type: 'object' },
        },
      },
      CreateReportRequest: {
        type: 'object',
        required: ['sourceId'],
        properties: {
          sourceId: { type: 'string', example: 'proinfrastructura' },
          persist: { type: 'boolean', default: true },
          parameters: {
            type: 'object',
            properties: {
              groupBy: {
                type: 'string',
                enum: ['category', 'builder', 'financing', 'highway', 'type'],
                default: 'category',
              },
              lat: { type: 'number', example: 45.9187 },
              lng: { type: 'number', example: 25.1312 },
              zoom: { type: 'number', example: 8 },
              north: { type: 'number' },
              south: { type: 'number' },
              east: { type: 'number' },
              west: { type: 'number' },
            },
          },
        },
      },
      GeneratedReport: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          persisted: { type: 'boolean' },
          topic: { type: 'string' },
          source: { type: 'string', format: 'uri' },
          region: { type: 'object' },
          total_segments: { type: 'integer' },
          grouped_by: { type: 'string' },
          breakdown: { type: 'object', additionalProperties: { type: 'integer' } },
          top_builders: { type: 'object', additionalProperties: { type: 'integer' } },
          financing_mix: { type: 'object', additionalProperties: { type: 'integer' } },
          generated_at: { type: 'string', format: 'date-time' },
        },
      },
      ReportSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          topic: { type: 'string' },
          source_id: { type: 'string' },
          parameters: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      SavedReport: {
        allOf: [
          { $ref: '#/components/schemas/ReportSummary' },
          {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/GeneratedReport' },
            },
          },
        ],
      },
      GeoLocation: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Cluj-Napoca' },
          display_name: { type: 'string' },
          lat: { type: 'number', example: 46.7712101 },
          lng: { type: 'number', example: 23.6236353 },
          zoom: { type: 'integer', example: 11 },
          place_type: { type: 'string', example: 'city' },
          bounding_box: {
            type: 'object',
            properties: {
              north: { type: 'number' },
              south: { type: 'number' },
              east: { type: 'number' },
              west: { type: 'number' },
            },
          },
        },
      },
      CitySummary: {
        type: 'object',
        properties: {
          total_segments: { type: 'integer' },
          actively_building: { type: 'integer', description: 'Under active construction (roads + rail)' },
          in_pipeline: { type: 'integer', description: 'Has permits but not yet started' },
          completed: { type: 'integer', description: 'In circulation or completed' },
          other: { type: 'integer' },
        },
      },
      CityOverview: {
        type: 'object',
        properties: {
          city: { $ref: '#/components/schemas/GeoLocation' },
          summary: { $ref: '#/components/schemas/CitySummary' },
          breakdown_by_category: {
            type: 'object',
            additionalProperties: { type: 'integer' },
          },
          top_builders: {
            type: 'object',
            additionalProperties: { type: 'integer' },
          },
          financing_mix: {
            type: 'object',
            additionalProperties: { type: 'integer' },
          },
          source: { type: 'string', format: 'uri' },
          generated_at: { type: 'string', format: 'date-time' },
        },
      },
      CityProjectSearchResult: {
        allOf: [
          { $ref: '#/components/schemas/ProjectSearchResult' },
          {
            type: 'object',
            properties: {
              city: { $ref: '#/components/schemas/GeoLocation' },
            },
          },
        ],
      },
      CityReport: {
        allOf: [
          { $ref: '#/components/schemas/GeneratedReport' },
          {
            type: 'object',
            properties: {
              city: { $ref: '#/components/schemas/GeoLocation' },
            },
          },
        ],
      },
      InnoListing: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'inno-603' },
          title: { type: 'string', example: '7391 mp, zonă industrială, în Salonta, jud Bihor' },
          description: { type: 'string' },
          author: { type: 'string', example: 'INNO Pathfinder' },
          published_date: { type: 'string', format: 'date', example: '2025-08-25' },
          county: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'BH' },
              name: { type: 'string', example: 'Bihor' },
              region: { type: 'string', example: 'Nord-Vest' },
            },
          },
          location: {
            type: 'object',
            properties: {
              city: { type: 'string', example: 'Salonta' },
              county_hint: { type: 'string' },
            },
          },
          area_sqm: { type: 'number', example: 7391 },
          price_per_sqm_eur: { type: 'number', nullable: true, example: 16 },
          availability: {
            type: 'array',
            items: { type: 'string', enum: ['sale', 'rent', 'concession'] },
            nullable: true,
          },
          use_cases: {
            type: 'array',
            items: { type: 'string' },
            example: ['industrial'],
          },
          utilities: {
            type: 'array',
            items: { type: 'string' },
            example: ['electricity', 'gas', 'water', 'internet'],
          },
          intravilan: { type: 'boolean' },
          activity_type: { type: 'string', nullable: true, example: 'industry' },
          tags: { type: 'array', items: { type: 'string' } },
          listing_url: { type: 'string', format: 'uri' },
          source_url: { type: 'string', format: 'uri' },
        },
      },
      InnoOverview: {
        type: 'object',
        properties: {
          source: { type: 'object' },
          total_listings: { type: 'integer', example: 155 },
          total_area_sqm: { type: 'number' },
          total_area_ha: { type: 'number', example: 1918.26 },
          by_county: { type: 'object', additionalProperties: { type: 'integer' } },
          by_use_case: { type: 'object', additionalProperties: { type: 'integer' } },
          by_availability: { type: 'object', additionalProperties: { type: 'integer' } },
          listings_with_price: { type: 'integer' },
          scraped_at: { type: 'string', format: 'date-time' },
        },
      },
      InnoSearchResult: {
        type: 'object',
        properties: {
          count: { type: 'integer' },
          limit: { type: 'integer' },
          filters_applied: { type: 'object' },
          listings: {
            type: 'array',
            items: { $ref: '#/components/schemas/InnoListing' },
          },
        },
      },
      InnoReport: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          source: { type: 'string', format: 'uri' },
          total_listings: { type: 'integer' },
          total_area_sqm: { type: 'number' },
          grouped_by: { type: 'string' },
          breakdown: { type: 'object', additionalProperties: { type: 'integer' } },
          generated_at: { type: 'string', format: 'date-time' },
        },
      },
      ChatRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            description: 'The user question or instruction',
            example: 'What industrial land is available near Cluj-Napoca within 30 km?',
          },
          history: {
            type: 'array',
            description:
              'Conversation history from the previous response. Omit or pass [] for the first turn. ' +
              'Pass the history returned by the previous response to continue the conversation.',
            items: { type: 'object' },
            default: [],
          },
        },
      },
      ChatResponse: {
        type: 'object',
        properties: {
          response: {
            type: 'string',
            description: 'The AI-generated answer, synthesized from live data tool results',
          },
          tools_used: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names of the data tools called to answer this question',
            example: ['find_nearby_properties', 'search_property_listings'],
          },
          history: {
            type: 'array',
            items: { type: 'object' },
            description: 'Updated conversation history — pass this back as history on the next request for multi-turn conversation',
          },
        },
      },
    },
  },
};
