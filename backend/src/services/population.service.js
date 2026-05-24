/**
 * Population lookup service
 *
 * Given a place name and optional county hint, finds the matching
 * locality in the population table using a tiered matching strategy.
 */

const { Op } = require('sequelize');

let Population;
function _model() {
  if (!Population) Population = require('../models').Population;
  return Population;
}

// Normalise for comparison: uppercase, strip diacritics
function _norm(str) {
  if (!str) return '';
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
    .trim();
}

// Romanian county name → DB county code
const COUNTY_NAME_MAP = {
  ALBA: 'ALBA', ARAD: 'ARAD', ARGES: 'ARGEȘ', ARGEȘ: 'ARGEȘ',
  BACAU: 'BACĂU', BACĂU: 'BACĂU', BIHOR: 'BIHOR',
  'BISTRITA-NASAUD': 'BISTRIȚA-NĂSĂUD', 'BISTRIȚA-NĂSĂUD': 'BISTRIȚA-NĂSĂUD',
  BOTOSANI: 'BOTOȘANI', BOTOȘANI: 'BOTOȘANI', BRAILA: 'BRĂILA', BRĂILA: 'BRĂILA',
  BRASOV: 'BRAȘOV', BRAȘOV: 'BRAȘOV', BUCURESTI: 'MUNICIPIUL BUCUREȘTI',
  BUCUREȘTI: 'MUNICIPIUL BUCUREȘTI', BUZAU: 'BUZĂU', BUZĂU: 'BUZĂU',
  'CARAS-SEVERIN': 'CARAȘ-SEVERIN', 'CARAȘ-SEVERIN': 'CARAȘ-SEVERIN',
  CALARASI: 'CĂLĂRAȘI', CĂLĂRAȘI: 'CĂLĂRAȘI', CLUJ: 'CLUJ',
  CONSTANTA: 'CONSTANȚA', CONSTANȚA: 'CONSTANȚA', COVASNA: 'COVASNA',
  DAMBOVITA: 'DÂMBOVIȚA', DÂMBOVIȚA: 'DÂMBOVIȚA', DOLJ: 'DOLJ',
  GALATI: 'GALAȚI', GALAȚI: 'GALAȚI', GIURGIU: 'GIURGIU', GORJ: 'GORJ',
  HARGHITA: 'HARGHITA', HUNEDOARA: 'HUNEDOARA', IALOMITA: 'IALOMIȚA', IALOMIȚA: 'IALOMIȚA',
  IASI: 'IAȘI', IAȘI: 'IAȘI', ILFOV: 'ILFOV', MARAMURES: 'MARAMUREȘ', MARAMUREȘ: 'MARAMUREȘ',
  MEHEDINTI: 'MEHEDINȚI', MEHEDINȚI: 'MEHEDINȚI', MURES: 'MUREȘ', MUREȘ: 'MUREȘ',
  NEAMT: 'NEAMȚ', NEAMȚ: 'NEAMȚ', OLT: 'OLT', PRAHOVA: 'PRAHOVA',
  'SATU MARE': 'SATU MARE', SALAJ: 'SĂLAJ', SĂLAJ: 'SĂLAJ',
  'SIBIU': 'SIBIU', SUCEAVA: 'SUCEAVA', TELEORMAN: 'TELEORMAN',
  TIMIS: 'TIMIȘ', TIMIȘ: 'TIMIȘ', TULCEA: 'TULCEA', VALCEA: 'VÂLCEA', VÂLCEA: 'VÂLCEA',
  VASLUI: 'VASLUI', VRANCEA: 'VRANCEA',
};

function _resolveCounty(hint) {
  if (!hint) return null;
  const upper = _norm(hint);
  return COUNTY_NAME_MAP[upper] || hint.toUpperCase();
}

/**
 * Look up population for a place name.
 *
 * @param {string} name     - place name, e.g. "Moldovenești", "Cluj-Napoca", "Aleșd"
 * @param {string} [county] - county hint to disambiguate (e.g. "CLUJ", "Bihor")
 * @returns {object|null}   - population record or null
 */
async function findByName(name, county) {
  if (!name) return null;
  const P = _model();
  const normName = _norm(name);
  const resolvedCounty = _resolveCounty(county);

  const countyWhere = resolvedCounty ? { county: resolvedCounty } : {};

  // 1. Exact match on normalised clean name (county-scoped first)
  if (resolvedCounty) {
    const exact = await P.findOne({
      where: {
        ...countyWhere,
        [Op.or]: [
          { locality_name_clean: { [Op.iLike]: name.trim() } },
          { locality_name_ascii: { [Op.iLike]: normName } },
        ],
      },
      raw: true,
    });
    if (exact) return _format(exact);
  }

  // 2. ILIKE match with county hint
  if (resolvedCounty) {
    const fuzzy = await P.findOne({
      where: {
        county: resolvedCounty,
        [Op.or]: [
          { locality_name_clean: { [Op.iLike]: `%${name.trim()}%` } },
          { locality_name_ascii: { [Op.iLike]: `%${normName}%` } },
        ],
      },
      order: [['population', 'DESC']],
      raw: true,
    });
    if (fuzzy) return _format(fuzzy);
  }

  // 3. Global ILIKE (no county) — return highest population match
  const global = await P.findOne({
    where: {
      [Op.or]: [
        { locality_name_clean: { [Op.iLike]: `%${name.trim()}%` } },
        { locality_name_ascii: { [Op.iLike]: `%${normName}%` } },
      ],
    },
    order: [['population', 'DESC']],
    raw: true,
  });
  if (global) return _format(global);

  // 4. Try stripping common prefixes from geocoded names
  //    e.g. "Comuna Moldovenești" → "Moldovenești"
  const stripped = name.replace(/^(municipiul|municipiu|orașul|oras|oraș|orasul|comuna|sat)\s+/i, '').trim();
  if (stripped !== name) return findByName(stripped, county);

  return null;
}

/**
 * Look up population using reverse geocoding response fields.
 * Nominatim /reverse returns address.city, address.town, address.village, address.county etc.
 */
async function findByNominatimAddress(address) {
  if (!address) return null;
  // Try city > town > village > suburb in order
  const place = address.city || address.town || address.village || address.suburb || address.county;
  const county = address.county || address.state;
  return findByName(place, county);
}

function _format(row) {
  return {
    locality: row.locality_name_clean,
    locality_full_name: row.locality_name,
    locality_type: row.locality_type,
    county: row.county,
    siruta_code: row.siruta_code,
    population: row.population,
    census_year: row.census_year,
  };
}

module.exports = { findByName, findByNominatimAddress };
