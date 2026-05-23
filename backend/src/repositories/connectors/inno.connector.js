const { parse } = require('node-html-parser');

const SOURCE_URL = 'https://inno.ro/investeste-in-nv/proprietati-imobiliare';
const CACHE_TTL_MS = 60 * 60 * 1000;

// ArcGIS Feature Services powering the INNO map
const ARCGIS_BASE = 'https://services-eu1.arcgis.com/7AQeA6uMiYklvBFv/arcgis/rest/services';
const ARCGIS_FS = {
  PROPERTIES_POINTS: `${ARCGIS_BASE}/Terenuri_INNO_EN/FeatureServer/0`,
  PROPERTIES_POLYGONS: `${ARCGIS_BASE}/Terenuri_INNO_EN/FeatureServer/1`,
  INDUSTRIAL_PARKS: `${ARCGIS_BASE}/Imobile/FeatureServer/2`,
  AIRPORTS: `${ARCGIS_BASE}/Aeroporturi/FeatureServer/0`,
  RAILWAY_STATIONS: `${ARCGIS_BASE}/Imobile/FeatureServer/4`,
  RAILWAY_INFRA: `${ARCGIS_BASE}/Imobile/FeatureServer/6`,
  BORDER_CROSSINGS: `${ARCGIS_BASE}/Imobile/FeatureServer/3`,
  ROADS: `${ARCGIS_BASE}/Drumuri_Nord_Vest/FeatureServer/0`,
  ELECTRIC_GRID: `${ARCGIS_BASE}/Retea_Electrica/FeatureServer/2`,
};

async function _arcgisQuery(layerUrl, { where = '1=1', outFields = '*', limit = 2000, outSR = 4326, returnGeometry = true } = {}) {
  const params = new URLSearchParams({
    where,
    outFields,
    returnGeometry: String(returnGeometry),
    f: 'json',
    resultRecordCount: String(limit),
    outSR: String(outSR),
  });
  const r = await fetch(`${layerUrl}/query?${params}`, {
    headers: { 'User-Agent': 'InnoiNVest/1.0 (investment research tool)' },
  });
  if (!r.ok) throw new Error(`ArcGIS query failed: ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error(`ArcGIS error: ${data.error.message}`);
  return data.features || [];
}

const COUNTY_MAP = {
  BH: { code: 'BH', name: 'Bihor', region: 'Nord-Vest' },
  MM: { code: 'MM', name: 'Maramureș', region: 'Nord-Vest' },
  BN: { code: 'BN', name: 'Bistrița-Năsăud', region: 'Nord-Vest' },
  SM: { code: 'SM', name: 'Satu Mare', region: 'Nord-Vest' },
  CJ: { code: 'CJ', name: 'Cluj', region: 'Nord-Vest' },
  SJ: { code: 'SJ', name: 'Sălaj', region: 'Nord-Vest' },
};

const USE_CASE_KEYWORDS = {
  industrial: ['industrial', 'hală', 'hale', 'fabrică', 'depozit', 'depozitare', 'producție', 'incintă', 'carieră'],
  logistics: ['logistic', 'logistică', 'transport marfă', 'vehicule grele'],
  commercial: ['comercial', 'comerț', 'magazin', 'servicii'],
  residential: ['rezidențial', 'locuințe', 'apartamente', 'bloc'],
  agricultural: ['agricol', 'agricolă', 'pășune', 'arabil', 'sere', 'solarii'],
  energy: ['fotovoltaic', 'energie regenerabilă', 'panouri fotovoltaice', 'stație de pompare'],
  educational: ['educațional', 'școală', 'campus', 'grădiniță'],
  mixed: ['mixt', 'mixtă'],
  park: ['parc industrial', 'parc de specializare', 'parc inteligent'],
};

function _extractAreaSqm(text) {
  const patterns = [
    /(\d[\d.,]*)\s*hectare/i,
    /(\d[\d.,]*)\s*ha\b/i,
    /(\d[\d.,]*)\s*(?:mp|m²|m2)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(raw);
      if (isNaN(value)) continue;
      const isHa = /hectare|ha\b/i.test(match[0]);
      return Math.round(isHa ? value * 10000 : value);
    }
  }
  return null;
}

function _extractPricePerSqm(text) {
  const match = text.match(/(\d+(?:[,.]?\d+)?)\s*€\s*\/\s*mp/i);
  if (!match) return null;
  return parseFloat(match[1].replace(',', '.'));
}

function _extractAvailability(text) {
  const types = [];
  if (/v[aâ]nzare|de vânzare|spre vânzare/i.test(text)) types.push('sale');
  if (/[îi]nchiriere|[îi]nchiriat|spre [îi]nchiriere/i.test(text)) types.push('rent');
  if (/concesiune|concesionat/i.test(text)) types.push('concession');
  return types.length ? types : null;
}

function _extractUseCases(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const [useCase, keywords] of Object.entries(USE_CASE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      found.push(useCase);
    }
  }
  return found.length ? found : ['other'];
}

function _extractUtilities(text) {
  const lower = text.toLowerCase();
  const utils = [];
  if (/electricitate|energie electric[aă]|curent electric/i.test(lower)) utils.push('electricity');
  if (/gaz\b|gaz metan/i.test(lower)) utils.push('gas');
  if (/ap[aă]\b|ap[aă] potabil[aă]/i.test(lower)) utils.push('water');
  if (/canalizare/i.test(lower)) utils.push('sewage');
  if (/fibr[aă] optic[aă]|internet/i.test(lower)) utils.push('internet');
  if (/4G|5G|GSM/i.test(lower)) utils.push('mobile_signal');
  return utils;
}

function _extractCounty(tags, description) {
  for (const code of Object.keys(COUNTY_MAP)) {
    if (tags.some((t) => t.includes(code))) return COUNTY_MAP[code];
  }
  const countyNames = {
    bihor: 'BH', maramureș: 'MM', 'bistrita-nasaud': 'BN', 'bistrița-năsăud': 'BN',
    'satu mare': 'SM', cluj: 'CJ', sălaj: 'SJ', salaj: 'SJ',
  };
  const lower = description.toLowerCase();
  for (const [name, code] of Object.entries(countyNames)) {
    if (lower.includes(name)) return COUNTY_MAP[code];
  }
  return null;
}

function _extractLocation(title) {
  const match = title.match(/(?:în|in|–|-)\s+([^,]+),\s+(?:jud\.?\s+)?([A-Z][a-zăâîșț\-]+)/);
  if (match) {
    return { city: match[1].trim(), county_hint: match[2].trim() };
  }
  const simple = title.match(/(?:în|in)\s+([A-ZĂÂÎȘȚ][a-zăâîșț\-]+(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșț\-]+)?)/);
  if (simple) return { city: simple[1].trim(), county_hint: null };
  return null;
}

function _parseDate(dateStr) {
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6,
    iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12,
  };
  const m = dateStr.toLowerCase().match(/(\d+)\s+([a-z]+)\s+(\d{4})/);
  if (!m) return null;
  const month = months[m[2]];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

class InnoConnector {
  constructor() {
    this.id = 'inno-proprietati';
    this.topic = 'Real Estate & Investment Properties';
    this._cache = null;
    this._loadedAt = 0;
  }

  describe() {
    return {
      id: this.id,
      name: 'INNO – Proprietăți Imobiliare Nord-Vest',
      topic: this.topic,
      sourceUrl: SOURCE_URL,
      description:
        'Investment-grade land and property listings for the 6 counties of North-West Romania ' +
        '(Bihor, Maramureș, Bistrița-Năsăud, Satu Mare, Cluj, Sălaj). Curated by INNO / ADR Nord-Vest. ' +
        'Includes industrial land, Smart Specialisation Park plots, commercial buildings, and agricultural land.',
      coverage: Object.values(COUNTY_MAP).map((c) => `${c.name} (${c.code})`),
    };
  }

  async _loadListings(force = false) {
    const stale = Date.now() - this._loadedAt > CACHE_TTL_MS;
    if (!force && this._cache && !stale) return this._cache;

    const response = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': 'InnoiNVest/1.0 (investment research tool)' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch INNO listings: ${response.status}`);
    }

    const html = await response.text();
    this._cache = this._parseListings(html);
    this._loadedAt = Date.now();
    return this._cache;
  }

  _parseListings(html) {
    const root = parse(html);
    const listings = [];

    // Each listing is rendered as `.inno-card` — 1 card per property (tiles are duplicates for mobile)
    const cards = root.querySelectorAll('.inno-card');

    for (const card of cards) {
      const id = card.getAttribute('id');

      const author = card.querySelector('.inno-card-meta-author')?.text?.trim() || 'INNO';

      // Date is in the second .inno-card-meta-element span (first holds the author)
      const metaEls = card.querySelectorAll('.inno-card-meta-element');
      let dateRaw = null;
      for (const el of metaEls) {
        const t = el.text.trim();
        if (/\d{4}/.test(t)) { dateRaw = t; break; }
      }

      const titleAnchor = card.querySelector('.inno-card-body-title a');
      const title = titleAnchor?.text?.trim();
      if (!title) continue;

      const href = titleAnchor?.getAttribute('href') || '';
      const listingUrl = href ? `https://inno.ro${href}` : SOURCE_URL;

      const description = card.querySelector('.inno-card-body-content')?.text?.trim() || '';

      const tags = card
        .querySelectorAll('.inno-card-badge')
        .map((el) => el.text.trim().replace(/\s+/g, ' '))
        .filter(Boolean);

      // Activity type from card class: inno-card-activity-type_industry → 'industry'
      const activityClass = (card.getAttribute('class') || '')
        .split(' ')
        .find((c) => c.startsWith('inno-card-activity-type_'));
      const activityType = activityClass ? activityClass.replace('inno-card-activity-type_', '') : null;

      const county = _extractCounty(tags, description + ' ' + title);
      const location = _extractLocation(title);
      const areaSqm = _extractAreaSqm(title + ' ' + description);
      const pricePerSqm = _extractPricePerSqm(description);
      const availability = _extractAvailability(description);
      const useCases = _extractUseCases(title + ' ' + description);
      const utilities = _extractUtilities(description);
      const isIntravilan = /\bintravilan\b/i.test(description + ' ' + title);

      listings.push({
        id: id ? `inno-${id}` : `inno-${Buffer.from(title).toString('base64').slice(0, 12)}`,
        title,
        description,
        author,
        published_date: dateRaw ? _parseDate(dateRaw) : null,
        county,
        location,
        area_sqm: areaSqm,
        price_per_sqm_eur: pricePerSqm,
        availability,
        use_cases: useCases,
        utilities,
        intravilan: isIntravilan,
        activity_type: activityType,
        tags: [...new Set(tags)],
        listing_url: listingUrl,
        source_url: SOURCE_URL,
      });
    }

    return listings;
  }

  async getOverview() {
    const listings = await this._loadListings();

    const byCounty = {};
    const byUseCase = {};
    const byAvailability = {};
    let totalAreaSqm = 0;
    let withPrice = 0;

    for (const l of listings) {
      const c = l.county?.code || 'Unknown';
      byCounty[c] = (byCounty[c] || 0) + 1;

      for (const uc of l.use_cases) {
        byUseCase[uc] = (byUseCase[uc] || 0) + 1;
      }

      for (const av of l.availability || []) {
        byAvailability[av] = (byAvailability[av] || 0) + 1;
      }

      if (l.area_sqm) totalAreaSqm += l.area_sqm;
      if (l.price_per_sqm_eur) withPrice++;
    }

    return {
      source: this.describe(),
      total_listings: listings.length,
      total_area_sqm: totalAreaSqm,
      total_area_ha: +(totalAreaSqm / 10000).toFixed(2),
      by_county: Object.fromEntries(Object.entries(byCounty).sort((a, b) => b[1] - a[1])),
      by_use_case: Object.fromEntries(Object.entries(byUseCase).sort((a, b) => b[1] - a[1])),
      by_availability: byAvailability,
      listings_with_price: withPrice,
      extractable_fields: [
        'title', 'description', 'author', 'published_date',
        'county (BH/MM/BN/SM/CJ/SJ)', 'location (city)', 'area_sqm',
        'price_per_sqm_eur', 'availability (sale/rent/concession)',
        'use_cases (industrial/logistics/commercial/residential/agricultural/energy/park)',
        'utilities (electricity/gas/water/sewage/internet/mobile_signal)',
        'intravilan (boolean)',
      ],
      scraped_at: new Date().toISOString(),
    };
  }

  async searchListings(filters = {}) {
    const {
      county,
      useCase,
      availability,
      minAreaSqm,
      maxAreaSqm,
      maxPricePerSqm,
      query,
      intravilan,
      limit = 25,
    } = filters;

    const all = await this._loadListings();
    const q = query?.toLowerCase();
    const results = [];

    for (const l of all) {
      if (county && l.county?.code !== county.toUpperCase()) continue;
      if (useCase && !l.use_cases.includes(useCase)) continue;
      if (availability && !(l.availability || []).includes(availability)) continue;
      if (minAreaSqm != null && (l.area_sqm ?? 0) < minAreaSqm) continue;
      if (maxAreaSqm != null && (l.area_sqm ?? Infinity) > maxAreaSqm) continue;
      if (maxPricePerSqm != null && l.price_per_sqm_eur != null && l.price_per_sqm_eur > maxPricePerSqm) continue;
      if (intravilan != null && l.intravilan !== (intravilan === true || intravilan === 'true')) continue;

      if (q) {
        const hay = [l.title, l.description, l.county?.name, l.location?.city]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) continue;
      }

      results.push(l);
      if (results.length >= limit) break;
    }

    return {
      count: results.length,
      limit,
      filters_applied: filters,
      listings: results,
    };
  }

  async generateReport(params = {}) {
    const { groupBy = 'county' } = params;
    const all = await this._loadListings();

    const groups = {};
    let totalArea = 0;

    for (const l of all) {
      let key;
      switch (groupBy) {
        case 'use_case':
          for (const uc of l.use_cases) {
            groups[uc] = (groups[uc] || 0) + 1;
          }
          continue;
        case 'availability':
          for (const av of l.availability || ['unknown']) {
            groups[av] = (groups[av] || 0) + 1;
          }
          continue;
        case 'author':
          key = l.author || 'Unknown';
          break;
        case 'county':
        default:
          key = l.county ? `${l.county.name} (${l.county.code})` : 'Unknown';
          break;
      }
      groups[key] = (groups[key] || 0) + 1;
      if (l.area_sqm) totalArea += l.area_sqm;
    }

    return {
      topic: this.topic,
      source: SOURCE_URL,
      total_listings: all.length,
      total_area_sqm: totalArea,
      grouped_by: groupBy,
      breakdown: Object.fromEntries(Object.entries(groups).sort((a, b) => b[1] - a[1])),
      generated_at: new Date().toISOString(),
    };
  }

  // ─── ArcGIS Geo methods ─────────────────────────────────────────────────────

  /**
   * Load all property features from the ArcGIS Feature Service (points layer).
   * Returns features with WGS84 coordinates and full attribute data.
   */
  async getGeoProperties(filters = {}) {
    const { county, minAreaHa, maxAreaHa, landType, availability, bbox } = filters;

    const conditions = [];
    if (county) conditions.push(`County='${county.replace(/'/g, "''")}'`);
    if (minAreaHa != null) conditions.push(`Land_Area_ha>=${minAreaHa}`);
    if (maxAreaHa != null) conditions.push(`Land_Area_ha<=${maxAreaHa}`);
    if (landType) conditions.push(`Land_type='${landType.replace(/'/g, "''")}'`);
    if (availability) conditions.push(`Method_of_property_acquisition LIKE '%${availability}%'`);

    const where = conditions.length ? conditions.join(' AND ') : '1=1';

    const features = await _arcgisQuery(ARCGIS_FS.PROPERTIES_POINTS, { where });

    let results = features.map((f) => ({
      id: `arcgis-inno-${f.attributes.OBJECTID_1}`,
      name: f.attributes.Name_1 || f.attributes.Name,
      county: f.attributes.County,
      uat: f.attributes.UAT,
      land_book_number: f.attributes.Land_Book_Number,
      acquisition_method: f.attributes.Method_of_property_acquisition,
      area_sqm: f.attributes['Land_Area__m__'],
      area_ha: f.attributes.Land_Area_ha,
      building_footprint_sqm: f.attributes['Building_footprint__m__'],
      land_type: f.attributes.Land_type,
      current_destination: f.attributes.Current_destination,
      large_freight_access: f.attributes.Accessibility_for_Large_Freight === 'Yes',
      coordinates: f.geometry
        ? { lng: f.geometry.x, lat: f.geometry.y }
        : null,
    }));

    // Bounding box filter (applied after fetch since ArcGIS spatial queries need geometry)
    if (bbox) {
      const { north, south, east, west } = bbox;
      results = results.filter((r) => {
        const { lat, lng } = r.coordinates || {};
        return lat != null && lat >= south && lat <= north && lng >= west && lng <= east;
      });
    }

    return {
      source: 'arcgis',
      layer: 'Terenuri_INNO_EN — point features',
      count: results.length,
      filters_applied: filters,
      properties: results,
    };
  }

  /**
   * Get properties near a lat/lng point within a given radius (km).
   */
  async getNearbyProperties(lat, lng, radiusKm = 25) {
    const degLat = radiusKm / 111;
    const degLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const bbox = { north: lat + degLat, south: lat - degLat, east: lng + degLng, west: lng - degLng };

    const { properties } = await this.getGeoProperties({ bbox });

    const withDist = properties
      .map((p) => {
        const dlat = (p.coordinates.lat - lat) * 111;
        const dlng = (p.coordinates.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
        const distKm = Math.sqrt(dlat * dlat + dlng * dlng);
        return { ...p, distance_km: Math.round(distKm * 10) / 10 };
      })
      .filter((p) => p.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);

    return {
      center: { lat, lng },
      radius_km: radiusKm,
      count: withDist.length,
      properties: withDist,
    };
  }

  /**
   * Get infrastructure features: parks, airports, railway stations, border crossings.
   */
  async getInfrastructure(type = 'parks') {
    const layerMap = {
      parks: ARCGIS_FS.INDUSTRIAL_PARKS,
      airports: ARCGIS_FS.AIRPORTS,
      railway_stations: ARCGIS_FS.RAILWAY_STATIONS,
      border_crossings: ARCGIS_FS.BORDER_CROSSINGS,
    };

    const layerUrl = layerMap[type];
    if (!layerUrl) {
      throw new Error(`Unknown infrastructure type: ${type}. Options: ${Object.keys(layerMap).join(', ')}`);
    }

    const features = await _arcgisQuery(layerUrl, { outFields: '*', returnGeometry: true });

    return {
      type,
      count: features.length,
      features: features.map((f) => ({
        attributes: f.attributes,
        coordinates: f.geometry
          ? f.geometry.rings
            ? _polygonCentroid(f.geometry.rings[0])
            : { lng: f.geometry.x, lat: f.geometry.y }
          : null,
      })),
    };
  }
}

function _polygonCentroid(ring) {
  if (!ring || ring.length === 0) return null;
  const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return { lng: Math.round(lng * 10000) / 10000, lat: Math.round(lat * 10000) / 10000 };
}

module.exports = { InnoConnector };
