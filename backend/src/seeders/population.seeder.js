/**
 * Population seeder
 *
 * Reads P15_-Populatia-rezidenta-*.xlsx from backend/data/ and imports
 * all ~3187 locality records into the `population` table.
 *
 * Usage:
 *   node src/seeders/population.seeder.js
 *   node src/seeders/population.seeder.js --force   ← truncates first
 */

require('dotenv').config();

const path = require('path');
const ExcelJS = require('exceljs');
const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

// Load Population model directly (models/index.js auto-syncs all models)
const db = require('../models');
const Population = db.Population;

// Path to the Excel file — lives in backend/data/
const EXCEL_FILE = 'P15_-Populatia-rezidenta-pe-municipii-orase-si-comune-la-1-decembrie-2021-rezultate-provizorii.xlsx';
const EXCEL_PATH = path.resolve(__dirname, '../../data', EXCEL_FILE);

// Verify file exists before proceeding (fall back to the old repo-root location)
const fs = require('fs');
let RESOLVED_EXCEL_PATH = EXCEL_PATH;
if (!fs.existsSync(RESOLVED_EXCEL_PATH)) {
  const legacyRoot = path.resolve(__dirname, '../../../', EXCEL_FILE);
  if (!fs.existsSync(legacyRoot)) {
    console.error('Excel file not found. Tried:\n ', EXCEL_PATH, '\n ', legacyRoot);
    process.exit(1);
  }
  RESOLVED_EXCEL_PATH = legacyRoot;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function _stripDiacritics(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _inferType(name) {
  if (!name) return 'commune';
  const upper = name.toUpperCase().trim();
  if (upper.startsWith('MUNICIPIUL ') || upper.startsWith('MUNICIPIU ')) return 'municipality';
  if (upper.startsWith('ORAȘ ') || upper.startsWith('ORASUL ') || upper.startsWith('ORAȘUL ')) return 'town';
  return 'commune';
}

function _cleanName(name, type) {
  if (!name) return '';
  let clean = name.trim();
  if (type === 'municipality') clean = clean.replace(/^MUNICIPIUL?\s+/i, '');
  // handles: ORAȘ, ORAȘUL, ORASUL, ORAŞ etc.
  if (type === 'town') clean = clean.replace(/^ORA[ȘSşŞ]U?L?\s+/i, '');
  return clean.trim();
}

// ─── main ────────────────────────────────────────────────────────────────────

async function seed() {
  const force = process.argv.includes('--force');

  console.log('Connecting to database…');
  await sequelize.authenticate();

  // Sync table (create if not exists; --force drops and recreates)
  await Population.sync({ force });
  if (force) console.log('Table truncated (--force).');

  // Skip if already populated
  const existing = await Population.count();
  if (existing > 0 && !force) {
    console.log(`Table already has ${existing} rows. Use --force to re-seed.`);
    await sequelize.close();
    return;
  }

  console.log(`Reading: ${RESOLVED_EXCEL_PATH}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(RESOLVED_EXCEL_PATH);

  const sheet = wb.worksheets[0];
  console.log(`Sheet: "${sheet.name}" — ${sheet.rowCount} rows`);

  const records = [];
  let skipped = 0;

  sheet.eachRow((row, rowNum) => {
    if (rowNum < 6) return; // skip title, headers, column letters

    const county   = String(row.values[2] || '').trim().toUpperCase();
    const siruta   = row.values[3];
    const rawName  = String(row.values[4] || '').trim();
    const pop      = row.values[5];

    // Skip Romania total, county totals, empty rows, and source notes
    if (!siruta || !pop || !county || county === 'ROMANIA') {
      skipped++;
      return;
    }

    const type  = _inferType(rawName);
    const clean = _cleanName(rawName, type);

    records.push({
      county,
      siruta_code:         Number(siruta),
      locality_name:       rawName.toUpperCase(),
      locality_name_clean: clean.toUpperCase(),
      locality_name_ascii: _stripDiacritics(clean).toUpperCase(),
      locality_type:       type,
      population:          Number(pop),
      census_year:         2021,
    });
  });

  console.log(`Parsed ${records.length} records (${skipped} rows skipped).`);
  console.log('Inserting into database in batches…');

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    await Population.bulkCreate(records.slice(i, i + BATCH), {
      ignoreDuplicates: true,
    });
    inserted += Math.min(BATCH, records.length - i);
    process.stdout.write(`  ${inserted}/${records.length}\r`);
  }

  console.log(`\nDone. ${inserted} rows inserted.`);

  // Quick sanity check
  const total = await Population.count();
  const byType = await Population.findAll({
    attributes: [
      'locality_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('population')), 'total_pop'],
    ],
    group: ['locality_type'],
    raw: true,
  });

  console.log(`\nTotal rows in table: ${total}`);
  console.log('Breakdown:');
  byType.forEach((r) => console.log(`  ${r.locality_type}: ${r.count} localities, ${Number(r.total_pop).toLocaleString()} people`));

  await sequelize.close();
}

seed().catch((err) => {
  console.error('Seeder failed:', err.message);
  process.exit(1);
});
