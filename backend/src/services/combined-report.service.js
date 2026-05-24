/**
 * Combined Investment Report Service
 *
 * Merges INNO property/park data with ProInfrastructura transport
 * infrastructure to produce a single investment-grade location report.
 *
 * Flow:
 *   1. Resolve the target — INNO property ID, park name, or raw lat/lng
 *   2. Fetch INNO geo-properties + infrastructure near the target
 *   3. Fetch ProInfrastructura road/rail segments near the target
 *   4. Compute distances, score connectivity, assemble report
 */

const connectorRegistry = require('../repositories/connectors/registry');
const { haversineKm, boundsFromCenter } = require('../utils/geo');
const { geocodeCity } = require('../utils/geocoder');
const populationService = require('./population.service');

const DEFAULT_RADIUS_KM = 30;

// ─── helpers ────────────────────────────────────────────────────────────────

function _round(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function _bucketDistance(km) {
  if (km <= 5) return '0-5 km';
  if (km <= 10) return '5-10 km';
  if (km <= 20) return '10-20 km';
  return '20-30 km';
}

function _buildPropertyTarget(p) {
  return {
    type: 'property',
    id: p.id,
    name: p.name,
    county: p.county,
    uat: p.uat || null,
    land_type: p.land_type || null,
    current_destination: p.current_destination || null,
    acquisition_method: p.acquisition_method || null,
    area_sqm: p.area_sqm ?? null,
    area_ha: p.area_ha ?? null,
    building_footprint_sqm: p.building_footprint_sqm ?? null,
    large_freight_access: p.large_freight_access ?? null,
    land_book_number: p.land_book_number || null,
    coordinates: p.coordinates,
  };
}

/**
 * Resolve an ArcGIS property ID to exact map coordinates.
 */
async function _resolveArcgisProperty(inno, arcgisId) {
  const geo = await inno.getGeoProperties();
  const match = geo.properties.find((p) => p.id === arcgisId);
  if (!match) return null;
  return _buildPropertyTarget(match);
}

/**
 * Resolve an HTML listing to exact coordinates by cross-matching
 * county + area_sqm against the ArcGIS properties layer.
 * This maps the listing to the exact pin on the INNO map.
 */
async function _resolveListingWithExactCoords(inno, listingId) {
  const listings = await inno.searchListings({ limit: 500 });
  const listing = listings.listings.find((l) => l.id === listingId);
  if (!listing) return null;

  // Cross-match: same county + same area = same property on the map
  const countyName = listing.county?.name;
  const geo = await inno.getGeoProperties(countyName ? { county: countyName } : {});

  // 1st priority: exact area_sqm match within same county
  let arcgisMatch = listing.area_sqm
    ? geo.properties.find((p) => p.coordinates && p.area_sqm === listing.area_sqm)
    : null;

  // 2nd priority: city name match
  if (!arcgisMatch) {
    const cityLower = (listing.location?.city || '').toLowerCase().replace(/\s*\d+$/, '');
    if (cityLower) {
      arcgisMatch = geo.properties.find(
        (p) => p.coordinates && p.name && p.name.toLowerCase().includes(cityLower)
      );
    }
  }

  let lat, lng, coordSource;

  if (arcgisMatch) {
    lat = arcgisMatch.coordinates.lat;
    lng = arcgisMatch.coordinates.lng;
    coordSource = 'inno_map_pin';
  } else if (listing.location?.city || countyName) {
    const cityStr = listing.location?.city?.replace(/\s*\d+$/, '') || countyName;
    const geoResult = await geocodeCity(`${cityStr}, ${countyName || 'Romania'}`);
    lat = geoResult.lat;
    lng = geoResult.lng;
    coordSource = 'geocoded';
  }

  if (lat == null) return null;

  return {
    type: 'listing',
    id: listing.id,
    title: listing.title,
    description: listing.description,
    county: listing.county,
    city: listing.location?.city,
    area_sqm: listing.area_sqm,
    price_per_sqm_eur: listing.price_per_sqm_eur,
    availability: listing.availability,
    use_cases: listing.use_cases,
    utilities: listing.utilities,
    intravilan: listing.intravilan,
    activity_type: listing.activity_type,
    listing_url: listing.listing_url,
    arcgis_property: arcgisMatch
      ? { id: arcgisMatch.id, name: arcgisMatch.name, land_type: arcgisMatch.land_type }
      : null,
    coordinates: { lat, lng },
    coordinate_source: coordSource,
  };
}

/**
 * Resolve by free-text name across all INNO types.
 */
async function _resolveByName(inno, name, county, landType) {
  const q = name.toLowerCase();

  // ArcGIS properties
  const geo = await inno.getGeoProperties({ county, landType });
  const propMatch = geo.properties.find((p) => p.name && p.name.toLowerCase().includes(q));
  if (propMatch?.coordinates) return _buildPropertyTarget(propMatch);

  // Parks
  const parks = await inno.getInfrastructure('parks');
  const parkMatch = parks.features.find(
    (f) => (f.attributes?.Denumire || '').toLowerCase().includes(q)
  );
  if (parkMatch?.coordinates) {
    return {
      type: 'park',
      name: parkMatch.attributes.Denumire,
      county: parkMatch.attributes['Județ'],
      park_type: parkMatch.attributes.Tip_parc,
      coordinates: parkMatch.coordinates,
    };
  }

  // HTML listings — cross-match to ArcGIS for exact coords
  const listings = await inno.searchListings({ query: name, limit: 1 });
  if (listings.listings.length > 0) {
    return _resolveListingWithExactCoords(inno, listings.listings[0].id);
  }

  return null;
}

async function _reverseGeocode(lat, lng) {
  try {
    const params = new URLSearchParams({ lat, lon: lng, format: 'json', addressdetails: 1 });
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'User-Agent': 'InnoiNVest/1.0', 'Accept-Language': 'ro,en' },
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.address || null;
  } catch {
    return null;
  }
}

/**
 * Derive the best place name + county from the resolved target
 * and look it up in the population table.
 */
async function _lookupPopulation(target, locationQuery) {
  let placeName = null;
  let countyHint = null;

  if (target) {
    switch (target.type) {
      case 'location':
        // Geocoded place — use the original query (e.g. "comuna Moldovenești")
        placeName = locationQuery || target.queried_place;
        break;
      case 'listing':
        // Strip trailing number suffixes ("Alesd 2" → "Alesd")
        placeName = (target.city || target.county?.name || '').replace(/\s+\d+$/, '').trim();
        countyHint = target.county?.name;
        break;
      case 'property':
        // UAT is the administrative unit — best match
        placeName = target.uat || target.name;
        // UAT names often look like "ALEȘD" — strip county code prefix if present
        if (placeName) placeName = placeName.replace(/^[A-Z]{2}_/, '');
        countyHint = target.county;
        break;
      case 'park': {
        // Parks don't have a city — reverse-geocode the coordinates
        const parkCoords = target.coordinates;
        if (parkCoords) {
          const reverseResult = await _reverseGeocode(parkCoords.lat, parkCoords.lng);
          if (reverseResult) {
            placeName = reverseResult.city || reverseResult.town || reverseResult.village;
            countyHint = reverseResult.county;
          }
        }
        break;
      }
      default:
        return null;
    }
  }

  if (!placeName) return null;

  try {
    return await populationService.findByName(placeName, countyHint);
  } catch {
    return null;
  }
}

function _connectivityScore(nearby) {
  let score = 0;
  const reasons = [];

  const highways = nearby.transport.filter(
    (p) => p.highway === 'motorway' || p.highway === 'trunk'
  );
  const activeRoads = nearby.transport.filter(
    (p) => p.category?.includes('construction') && p.progress_percent != null
  );
  const completedRoads = nearby.transport.filter(
    (p) => p.category?.includes('circulation') || p.highway === 'motorway'
  );

  if (highways.some((h) => h.distance_km <= 5)) { score += 25; reasons.push('Highway/expressway within 5 km'); }
  else if (highways.some((h) => h.distance_km <= 15)) { score += 15; reasons.push('Highway/expressway within 15 km'); }

  if (completedRoads.length >= 3) { score += 15; reasons.push(`${completedRoads.length} completed road segments nearby`); }

  if (activeRoads.length > 0) { score += 10; reasons.push(`${activeRoads.length} road(s) under active construction`); }

  if (nearby.parks.some((p) => p.distance_km <= 10)) { score += 15; reasons.push('Industrial/smart park within 10 km'); }

  if (nearby.airports.some((a) => a.distance_km <= 30)) { score += 10; reasons.push('Airport within 30 km'); }

  if (nearby.railway_stations.some((r) => r.distance_km <= 10)) { score += 10; reasons.push('Railway station within 10 km'); }

  if (nearby.border_crossings.some((b) => b.distance_km <= 30)) { score += 5; reasons.push('Border crossing within 30 km'); }

  if (nearby.properties.length >= 3) { score += 10; reasons.push(`${nearby.properties.length} other investment properties nearby`); }

  return { score: Math.min(score, 100), reasons };
}

// ─── main service ───────────────────────────────────────────────────────────

async function generateLocationReport({ id, location, name, lat, lng, radiusKm = DEFAULT_RADIUS_KM, county, landType }) {
  const inno = connectorRegistry.getConnector('inno-proprietati');
  const proinfra = connectorRegistry.getConnector('proinfrastructura');

  // 1. Resolve target — single `id` works for any INNO identifier
  let target = null;

  // 1a. Free-text place name (commune, city, village) — geocode → find nearest INNO property
  if (location && !id) {
    const geoResult = await geocodeCity(location);
    lat = geoResult.lat;
    lng = geoResult.lng;

    // Find the closest INNO property to this location
    const nearby = await inno.getNearbyProperties(lat, lng, radiusKm);
    const closest = nearby.properties[0];

    target = {
      type: 'location',
      queried_place: location,
      geocoded_as: geoResult.display_name,
      coordinates: { lat, lng },
      nearest_inno_property: closest
        ? {
            id: closest.id,
            name: closest.name,
            county: closest.county,
            area_ha: closest.area_ha,
            acquisition_method: closest.acquisition_method,
            land_type: closest.land_type,
            distance_km: closest.distance_km,
          }
        : null,
    };
  }

  if (id) {
    // Normalise: accept "467", "inno-467", or "arcgis-inno-42"
    const rawId = String(id).trim();

    if (rawId.startsWith('arcgis-inno-')) {
      // Direct ArcGIS property lookup — exact map pin coordinates
      target = await _resolveArcgisProperty(inno, rawId);
    } else {
      // HTML listing: "inno-467" or just "467"
      const listingId = rawId.startsWith('inno-') ? rawId : `inno-${rawId}`;
      target = await _resolveListingWithExactCoords(inno, listingId);
    }

    if (!target) throw new Error(`INNO property/listing "${id}" not found`);
    lat = target.coordinates?.lat;
    lng = target.coordinates?.lng;
  }

  // Name-based search — properties, then parks, then listings
  if (!target && name) {
    target = await _resolveByName(inno, name, county, landType);
    if (target) { lat = target.coordinates?.lat; lng = target.coordinates?.lng; }
  }

  // Filter-based — county + landType
  if (!target && !lat && (county || landType)) {
    const geo = await inno.getGeoProperties({ county, landType });
    if (geo.properties.length > 0) {
      const first = geo.properties[0];
      lat = first.coordinates?.lat;
      lng = first.coordinates?.lng;
      target = _buildPropertyTarget(first);
      target.note = `First of ${geo.properties.length} matching properties. Add a name for precision.`;
    }
  }

  if (lat == null || lng == null) {
    throw new Error(
      'Could not resolve location. Provide: id (listing/property ID), location (place name like "comuna Moldovenești"), name, county, landType, or lat+lng.'
    );
  }

  if (!target) {
    target = { type: 'coordinates', coordinates: { lat, lng } };
  }

  // 2. Fetch nearby INNO data (properties + all infra types)
  const [nearbyProps, parks, airports, railStations, borderX] = await Promise.all([
    inno.getNearbyProperties(lat, lng, radiusKm),
    inno.getInfrastructure('parks'),
    inno.getInfrastructure('airports'),
    inno.getInfrastructure('railway_stations'),
    inno.getInfrastructure('border_crossings'),
  ]);

  const addDistance = (features) =>
    features
      .map((f) => {
        if (!f.coordinates) return null;
        const dist = haversineKm(lat, lng, f.coordinates.lat, f.coordinates.lng);
        if (dist > radiusKm) return null;
        return { ...f, distance_km: _round(dist) };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance_km - b.distance_km);

  const nearbyParks = addDistance(
    parks.features.map((f) => ({
      name: f.attributes.Denumire,
      county: f.attributes['Județ'],
      park_type: f.attributes.Tip_parc,
      coordinates: f.coordinates,
    }))
  );

  const nearbyAirports = addDistance(
    airports.features.map((f) => ({
      name: f.attributes.Denumire,
      county: f.attributes['Județ'],
      coordinates: f.coordinates,
    }))
  );

  const nearbyRailStations = addDistance(
    railStations.features.map((f) => ({
      name: f.attributes.Denumire,
      population: f.attributes.POP2009,
      coordinates: f.coordinates,
    }))
  );

  const nearbyBorderX = addDistance(
    borderX.features.map((f) => ({
      locality: f.attributes.Localitate,
      crossing_type: f.attributes.Tip_trecere_frontiera,
      coordinates: f.coordinates,
    }))
  );

  // 3. Fetch nearby ProInfrastructura transport projects
  const bounds = boundsFromCenter(lat, lng, 10); // zoom 10 ≈ ±0.18° ≈ ~20km
  const proResult = await proinfra.searchProjects({
    lat, lng, zoom: 10,
    north: bounds.north, south: bounds.south,
    east: bounds.east, west: bounds.west,
    limit: 500,
  });

  const nearbyTransport = proResult.projects
    .map((p) => {
      if (!p.center) return null;
      const dist = haversineKm(lat, lng, p.center.lat, p.center.lng);
      if (dist > radiusKm) return null;
      return {
        osm_id: p.osm_id,
        name: p.name || p.ref || null,
        type: p.type,
        highway: p.highway,
        railway: p.railway,
        category: p.category,
        builder: p.builder,
        financing: p.financing,
        progress_percent: p.progress_percent,
        distance_km: _round(dist),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance_km - b.distance_km);

  // 4. Build the combined report
  const nearby = {
    properties: nearbyProps.properties || [],
    parks: nearbyParks,
    airports: nearbyAirports,
    railway_stations: nearbyRailStations,
    border_crossings: nearbyBorderX,
    transport: nearbyTransport,
  };

  // Transport summary
  const transportSummary = {
    total_segments: nearbyTransport.length,
    roads: nearbyTransport.filter((t) => t.type === 'road').length,
    railways: nearbyTransport.filter((t) => t.type === 'railway').length,
    by_distance: {},
    by_category: {},
    active_construction: nearbyTransport.filter(
      (t) => t.category?.includes('construction') && t.progress_percent != null
    ).length,
    highways_expressways: nearbyTransport.filter(
      (t) => t.highway === 'motorway' || t.highway === 'trunk'
    ).length,
    closest_highway: nearbyTransport.find(
      (t) => t.highway === 'motorway' || t.highway === 'trunk'
    ) || null,
  };

  for (const t of nearbyTransport) {
    const bucket = _bucketDistance(t.distance_km);
    transportSummary.by_distance[bucket] = (transportSummary.by_distance[bucket] || 0) + 1;
    const cat = t.category || 'other';
    transportSummary.by_category[cat] = (transportSummary.by_category[cat] || 0) + 1;
  }

  const connectivity = _connectivityScore(nearby);

  // Population lookup — derive place name + county from target
  const locationPopulation = await _lookupPopulation(target, location);

  return {
    report_type: 'combined_investment_location',
    target,
    center: { lat, lng },
    radius_km: radiusKm,

    location_population: locationPopulation,

    connectivity_score: connectivity,

    property_context: {
      nearby_investment_properties: nearbyProps.count,
      closest_properties: nearbyProps.properties.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        county: p.county,
        area_ha: p.area_ha,
        acquisition_method: p.acquisition_method,
        distance_km: p.distance_km,
      })),
    },

    infrastructure: {
      industrial_parks: {
        count: nearbyParks.length,
        items: nearbyParks,
      },
      airports: {
        count: nearbyAirports.length,
        items: nearbyAirports,
      },
      railway_stations: {
        count: nearbyRailStations.length,
        closest_5: nearbyRailStations.slice(0, 5),
      },
      border_crossings: {
        count: nearbyBorderX.length,
        items: nearbyBorderX,
      },
    },

    transport: {
      summary: transportSummary,
      projects: nearbyTransport.slice(0, 30),
    },

    generated_at: new Date().toISOString(),
  };
}

module.exports = { generateLocationReport };
