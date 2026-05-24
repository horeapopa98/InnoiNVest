/**
 * INNO Data Agents
 *
 * Five focused agents, one per data category available from inno.ro:
 *
 *   InnoPropertiesAgent        — ArcGIS land/property features (points layer)
 *   InnoListingsAgent          — HTML-scraped property listings
 *   InnoIndustrialParksAgent   — Industrial & Smart Specialisation Parks
 *   InnoAirportsAgent          — Airports in Nord-Vest
 *   InnoRailwayStationsAgent   — Railway stations
 *   InnoBorderCrossingsAgent   — Border crossing points
 *
 * Every agent normalises raw source data to a consistent, AI-friendly schema
 * and surfaces a `summary` block alongside the `items` array.
 */

const { BaseAgent } = require('./base.agent');
const connectorRegistry = require('../repositories/connectors/registry');

const SOURCE = 'https://inno.ro/investeste-in-nv/proprietati-imobiliare';

// ─── helpers ────────────────────────────────────────────────────────────────

function _connector() {
  return connectorRegistry.getConnector('inno-proprietati');
}

function _roundCoord(n) {
  return n != null ? Math.round(n * 100000) / 100000 : null;
}

function _parseCountyCode(raw) {
  const map = { bihor: 'BH', maramureș: 'MM', maramures: 'MM', 'bistrița-năsăud': 'BN',
    'bistrita-nasaud': 'BN', 'satu mare': 'SM', cluj: 'CJ', sălaj: 'SJ', salaj: 'SJ' };
  if (!raw) return null;
  return map[raw.toLowerCase()] || raw.toUpperCase().slice(0, 2);
}

// ─── 1. ArcGIS Property Features ───────────────────────────────────────────

class InnoPropertiesAgent extends BaseAgent {
  constructor() {
    super({
      id: 'inno_properties',
      name: 'INNO — Land & Property Features (ArcGIS)',
      category: 'real_estate',
      source: SOURCE,
    });
  }

  async _fetch() {
    const raw = await _connector().getGeoProperties();

    const items = raw.properties.map((p) => ({
      id: p.id,
      name: p.name || null,
      county: p.county || null,
      county_code: _parseCountyCode(p.county),
      uat: p.uat || null,
      land_book_number: p.land_book_number || null,
      acquisition_method: p.acquisition_method || null,
      land_type: p.land_type || null,
      current_destination: p.current_destination || null,
      area: {
        sqm: p.area_sqm ?? null,
        ha: p.area_ha ?? (p.area_sqm != null ? +(p.area_sqm / 10000).toFixed(4) : null),
      },
      building_footprint_sqm: p.building_footprint_sqm ?? null,
      large_freight_access: p.large_freight_access ?? null,
      coordinates: p.coordinates
        ? { lat: _roundCoord(p.coordinates.lat), lng: _roundCoord(p.coordinates.lng) }
        : null,
    }));

    const byCounty = _groupCount(items, (i) => i.county || 'Unknown');
    const byLandType = _groupCount(items, (i) => i.land_type || 'Unknown');
    const byMethod = _groupCount(items, (i) => i.acquisition_method || 'Unknown');
    const totalHa = items.reduce((s, i) => s + (i.area.ha || 0), 0);

    return {
      items,
      summary: {
        total: items.length,
        total_area_ha: +totalHa.toFixed(2),
        by_county: byCounty,
        by_land_type: byLandType,
        by_acquisition_method: byMethod,
        with_coordinates: items.filter((i) => i.coordinates).length,
      },
    };
  }
}

// ─── 2. HTML-scraped Listings ───────────────────────────────────────────────

class InnoListingsAgent extends BaseAgent {
  constructor() {
    super({
      id: 'inno_listings',
      name: 'INNO — Property Listings (HTML)',
      category: 'real_estate',
      source: SOURCE,
    });
  }

  async _fetch() {
    const raw = await _connector().searchListings({ limit: 500 });

    const items = raw.listings.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description || null,
      author: l.author || null,
      published_date: l.published_date || null,
      county: l.county
        ? { code: l.county.code, name: l.county.name, region: l.county.region }
        : null,
      city: l.location?.city || null,
      area_sqm: l.area_sqm ?? null,
      area_ha: l.area_sqm != null ? +(l.area_sqm / 10000).toFixed(4) : null,
      price_per_sqm_eur: l.price_per_sqm_eur ?? null,
      availability: Array.isArray(l.availability) ? l.availability : [],
      use_cases: Array.isArray(l.use_cases) ? l.use_cases : ['other'],
      utilities: Array.isArray(l.utilities) ? l.utilities : [],
      intravilan: l.intravilan ?? null,
      activity_type: l.activity_type || null,
      tags: Array.isArray(l.tags) ? l.tags : [],
      listing_url: l.listing_url || null,
    }));

    const byCounty = _groupCount(items, (i) => i.county?.name || 'Unknown');
    const byUseCase = {};
    items.forEach((i) => i.use_cases.forEach((uc) => { byUseCase[uc] = (byUseCase[uc] || 0) + 1; }));
    const byAvailability = {};
    items.forEach((i) => i.availability.forEach((av) => { byAvailability[av] = (byAvailability[av] || 0) + 1; }));
    const withPrice = items.filter((i) => i.price_per_sqm_eur != null).length;
    const totalArea = items.reduce((s, i) => s + (i.area_sqm || 0), 0);

    return {
      items,
      summary: {
        total: items.length,
        total_area_ha: +(totalArea / 10000).toFixed(2),
        with_price: withPrice,
        by_county: byCounty,
        by_use_case: byUseCase,
        by_availability: byAvailability,
      },
    };
  }
}

// ─── 3. Industrial & Smart Parks ───────────────────────────────────────────

class InnoIndustrialParksAgent extends BaseAgent {
  constructor() {
    super({
      id: 'inno_industrial_parks',
      name: 'INNO — Industrial & Smart Specialisation Parks',
      category: 'infrastructure',
      source: SOURCE,
    });
  }

  async _fetch() {
    const raw = await _connector().getInfrastructure('parks');

    // ArcGIS fields: OBJECTID, Denumire, Județ, Tip_parc
    const items = raw.features.map((f) => {
      const a = f.attributes;
      return {
        id: `inno-park-${a.OBJECTID}`,
        name: a.Denumire || null,
        county: a['Județ'] || null,
        county_code: _parseCountyCode(a['Județ']),
        park_type: a.Tip_parc || null,
        is_smart_specialisation: /smart/i.test(a.Tip_parc || ''),
        is_industrial: /industrial/i.test(a.Tip_parc || ''),
        coordinates: f.coordinates
          ? { lat: _roundCoord(f.coordinates.lat), lng: _roundCoord(f.coordinates.lng) }
          : null,
      };
    });

    return {
      items,
      summary: {
        total: items.length,
        smart_parks: items.filter((i) => i.is_smart_specialisation).length,
        industrial_parks: items.filter((i) => i.is_industrial).length,
        by_county: _groupCount(items, (i) => i.county || 'Unknown'),
        by_type: _groupCount(items, (i) => i.park_type || 'Unknown'),
      },
    };
  }
}

// ─── 4. Airports ────────────────────────────────────────────────────────────

class InnoAirportsAgent extends BaseAgent {
  constructor() {
    super({
      id: 'inno_airports',
      name: 'INNO — Airports Nord-Vest',
      category: 'infrastructure',
      source: SOURCE,
    });
  }

  async _fetch() {
    const raw = await _connector().getInfrastructure('airports');

    // ArcGIS fields: OBJECTID, Denumire, Județ
    const items = raw.features.map((f) => {
      const a = f.attributes;
      return {
        id: `inno-airport-${a.OBJECTID}`,
        name: a.Denumire || null,
        county: a['Județ'] || null,
        county_code: _parseCountyCode(a['Județ']),
        coordinates: f.coordinates
          ? { lat: _roundCoord(f.coordinates.lat), lng: _roundCoord(f.coordinates.lng) }
          : null,
      };
    });

    return {
      items,
      summary: {
        total: items.length,
        by_county: _groupCount(items, (i) => i.county || 'Unknown'),
      },
    };
  }
}

// ─── 5. Railway Stations ─────────────────────────────────────────────────────

const STATION_TYPE_MAP = { 1: 'station', 2: 'halt', 3: 'junction' };

class InnoRailwayStationsAgent extends BaseAgent {
  constructor() {
    super({
      id: 'inno_railway_stations',
      name: 'INNO — Railway Stations Nord-Vest',
      category: 'infrastructure',
      source: SOURCE,
    });
  }

  async _fetch() {
    const raw = await _connector().getInfrastructure('railway_stations');

    // ArcGIS fields: OBJECTID, Id, Tip, Denumire, Observatii, POP2009
    const items = raw.features.map((f) => {
      const a = f.attributes;
      return {
        id: `inno-rail-${a.OBJECTID}`,
        name: a.Denumire || null,
        station_type: STATION_TYPE_MAP[a.Tip] || `type_${a.Tip}`,
        notes: a.Observatii?.trim() || null,
        nearby_population_2009: a.POP2009 ?? null,
        coordinates: f.coordinates
          ? { lat: _roundCoord(f.coordinates.lat), lng: _roundCoord(f.coordinates.lng) }
          : null,
      };
    });

    return {
      items,
      summary: {
        total: items.length,
        by_station_type: _groupCount(items, (i) => i.station_type),
        with_population_data: items.filter((i) => i.nearby_population_2009 != null).length,
      },
    };
  }
}

// ─── 6. Border Crossings ─────────────────────────────────────────────────────

class InnoBorderCrossingsAgent extends BaseAgent {
  constructor() {
    super({
      id: 'inno_border_crossings',
      name: 'INNO — Border Crossings Nord-Vest',
      category: 'infrastructure',
      source: SOURCE,
    });
  }

  async _fetch() {
    const raw = await _connector().getInfrastructure('border_crossings');

    // ArcGIS fields: OBJECTID, Tip_trecere_frontiera, Localitate
    const items = raw.features.map((f) => {
      const a = f.attributes;
      const rawType = a.Tip_trecere_frontiera || '';
      const [mode, ...statusParts] = rawType.split(' - ');
      return {
        id: `inno-border-${a.OBJECTID}`,
        locality: a.Localitate || null,
        crossing_mode: mode?.trim() || null,          // "Feroviar", "Rutier", etc.
        operational_status: statusParts.join(' - ').trim() || null,
        is_operational: /operațional|operational/i.test(rawType),
        coordinates: f.coordinates
          ? { lat: _roundCoord(f.coordinates.lat), lng: _roundCoord(f.coordinates.lng) }
          : null,
      };
    });

    return {
      items,
      summary: {
        total: items.length,
        operational: items.filter((i) => i.is_operational).length,
        by_mode: _groupCount(items, (i) => i.crossing_mode || 'Unknown'),
      },
    };
  }
}

// ─── shared util ────────────────────────────────────────────────────────────

function _groupCount(arr, keyFn) {
  const result = {};
  for (const item of arr) {
    const k = keyFn(item);
    result[k] = (result[k] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort((a, b) => b[1] - a[1]));
}

// ─── exports ─────────────────────────────────────────────────────────────────

module.exports = {
  InnoPropertiesAgent,
  InnoListingsAgent,
  InnoIndustrialParksAgent,
  InnoAirportsAgent,
  InnoRailwayStationsAgent,
  InnoBorderCrossingsAgent,
};
