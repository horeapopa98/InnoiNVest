/**
 * University seeder
 *
 * Geocodes the 9 NW Romania universities/campuses via Nominatim and inserts
 * them into the `universities` table.
 *
 * Usage:
 *   node src/seeders/university.seeder.js
 *   node src/seeders/university.seeder.js --force   ← truncates first
 */

require('dotenv').config();

const db = require('../models');
const University = db.University;
const { sequelize } = db;

// ─── static data ─────────────────────────────────────────────────────────────
// geocode_query is what we send to Nominatim; address is for display.

const UNIVERSITIES = [
  {
    name: 'Universitatea Babeș-Bolyai (UBB)',
    city: 'Cluj-Napoca',
    county_code: 'CJ',
    county_name: 'Cluj',
    address: 'Str. Mihail Kogălniceanu nr. 1, Cluj-Napoca',
    website: 'https://www.ubbcluj.ro',
    type: 'university',
    parent_university: null,
    geocode_query: 'Universitatea Babes-Bolyai Cluj-Napoca',
  },
  {
    name: 'UMF "Iuliu Hațieganu"',
    city: 'Cluj-Napoca',
    county_code: 'CJ',
    county_name: 'Cluj',
    address: 'Str. Victor Babeș nr. 8, Cluj-Napoca',
    website: 'https://umfcluj.ro',
    type: 'university',
    parent_university: null,
    geocode_query: 'Universitatea de Medicina si Farmacie Cluj-Napoca',
  },
  {
    name: 'Universitatea Tehnică din Cluj-Napoca (UTCN)',
    city: 'Cluj-Napoca',
    county_code: 'CJ',
    county_name: 'Cluj',
    address: 'Str. Memorandumului nr. 28, Cluj-Napoca',
    website: 'https://www.utcluj.ro',
    type: 'university',
    parent_university: null,
    geocode_query: 'Universitatea Tehnica Cluj-Napoca',
  },
  {
    name: 'Universitatea din Oradea',
    city: 'Oradea',
    county_code: 'BH',
    county_name: 'Bihor',
    address: 'Str. Universității nr. 1, Oradea',
    website: 'https://www.uoradea.ro',
    type: 'university',
    parent_university: null,
    geocode_query: 'Universitatea din Oradea Bihor',
  },
  {
    name: 'UTCN – Centrul Universitar Nord Baia Mare',
    city: 'Baia Mare',
    county_code: 'MM',
    county_name: 'Maramureș',
    address: 'Str. Victoriei nr. 76, Baia Mare',
    website: 'https://stiinte.utcluj.ro',
    type: 'campus',
    parent_university: 'Universitatea Tehnică din Cluj-Napoca (UTCN)',
    geocode_query: 'Universitatea Tehnica Cluj-Napoca Centrul Universitar Nord Baia Mare',
  },
  {
    name: 'UBB – Extensia Universitară Bistrița',
    city: 'Bistrița',
    county_code: 'BN',
    county_name: 'Bistrița-Năsăud',
    address: 'Bistrița',
    website: 'https://bistrita.extensii.ubbcluj.ro',
    type: 'extension',
    parent_university: 'Universitatea Babeș-Bolyai (UBB)',
    geocode_query: 'Extensia Universitara Bistrita UBB',
  },
  {
    name: 'UTCN – Extensia Universitară Bistrița',
    city: 'Bistrița',
    county_code: 'BN',
    county_name: 'Bistrița-Năsăud',
    address: 'Piața Centrală nr. 29, Bistrița',
    website: 'https://bistrita.utcluj.ro',
    type: 'extension',
    parent_university: 'Universitatea Tehnică din Cluj-Napoca (UTCN)',
    geocode_query: 'Piata Centrala 29 Bistrita Romania',
  },
  {
    name: 'UTCN – Extensia Universitară Satu Mare',
    city: 'Satu Mare',
    county_code: 'SM',
    county_name: 'Satu Mare',
    address: 'B-dul Lucian Blaga nr. 121, Satu Mare',
    website: 'https://satumare.utcluj.ro',
    type: 'extension',
    parent_university: 'Universitatea Tehnică din Cluj-Napoca (UTCN)',
    geocode_query: 'Bulevardul Lucian Blaga 121 Satu Mare Romania',
  },
  {
    name: 'UTCN – Extensia Universitară Zalău',
    city: 'Zalău',
    county_code: 'SJ',
    county_name: 'Sălaj',
    address: 'Zalău',
    website: 'https://www.utcluj.ro',
    type: 'extension',
    parent_university: 'Universitatea Tehnică din Cluj-Napoca (UTCN)',
    geocode_query: 'Zalau Salaj Romania',
  },
];

// ─── geocoding ───────────────────────────────────────────────────────────────

async function geocode(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: 1,
    addressdetails: 1,
    countrycodes: 'ro',
  });

  const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      'User-Agent': 'InnoiNVest/1.0 (university seeder)',
      'Accept-Language': 'ro,en',
    },
  });

  if (!r.ok) throw new Error(`Nominatim error ${r.status} for query: "${query}"`);
  const results = await r.json();
  if (!results.length) return null;

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    display_name: results[0].display_name,
  };
}

// Nominatim usage policy: max 1 request/second
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── main ────────────────────────────────────────────────────────────────────

// Known fallback coordinates (used if Nominatim returns no result)
const FALLBACK_COORDS = {
  'Universitatea Babeș-Bolyai (UBB)':             { lat: 46.7693, lng: 23.5897 },
  'UMF "Iuliu Hațieganu"':                         { lat: 46.7667, lng: 23.5864 },
  'Universitatea Tehnică din Cluj-Napoca (UTCN)':  { lat: 46.7726, lng: 23.6035 },
  'Universitatea din Oradea':                      { lat: 47.0467, lng: 21.9189 },
  'UTCN – Centrul Universitar Nord Baia Mare':     { lat: 47.6549, lng: 23.5788 },
  'UBB – Extensia Universitară Bistrița':          { lat: 47.1360, lng: 24.4966 },
  'UTCN – Extensia Universitară Bistrița':         { lat: 47.1360, lng: 24.4987 },
  'UTCN – Extensia Universitară Satu Mare':        { lat: 47.7953, lng: 22.8706 },
  'UTCN – Extensia Universitară Zalău':            { lat: 47.1889, lng: 23.0622 },
};

async function seed() {
  const force = process.argv.includes('--force');

  console.log('Connecting to database…');
  await sequelize.authenticate();

  await University.sync({ force });
  if (force) console.log('Table truncated (--force).');

  const existing = await University.count();
  if (existing > 0 && !force) {
    console.log(`Table already has ${existing} rows. Use --force to re-seed.`);
    await sequelize.close();
    return;
  }

  console.log(`\nGeocoding ${UNIVERSITIES.length} universities via Nominatim…`);

  const records = [];

  for (const u of UNIVERSITIES) {
    process.stdout.write(`  Geocoding: ${u.name} … `);

    let coords = null;
    try {
      coords = await geocode(u.geocode_query);
    } catch (e) {
      console.warn(`(geocoding failed: ${e.message})`);
    }

    if (!coords) {
      coords = FALLBACK_COORDS[u.name];
      if (coords) {
        process.stdout.write(`(using fallback coords) `);
      } else {
        console.warn(`No coordinates found — skipping`);
        continue;
      }
    }

    console.log(`→ ${coords.lat}, ${coords.lng}`);

    records.push({
      name:             u.name,
      city:             u.city,
      county_code:      u.county_code,
      county_name:      u.county_name,
      address:          u.address || null,
      lat:              coords.lat,
      lng:              coords.lng,
      website:          u.website || null,
      type:             u.type,
      parent_university: u.parent_university || null,
    });

    // Respect Nominatim's 1 req/s policy
    await sleep(1100);
  }

  console.log(`\nInserting ${records.length} universities…`);
  await University.bulkCreate(records, { ignoreDuplicates: true });

  const total = await University.count();
  console.log(`Done. ${total} universities in database.`);

  const all = await University.findAll({ raw: true });
  console.log('\nInserted rows:');
  all.forEach((u) => console.log(`  [${u.county_code}] ${u.name} — ${u.lat}, ${u.lng}`));

  await sequelize.close();
}

seed().catch((err) => {
  console.error('Seeder failed:', err.message);
  process.exit(1);
});
