/**
 * Minimal migration runner
 *
 * Tracks applied migrations in a `_migrations` table (created on first run).
 * Each migration file exports `{ up(queryInterface, Sequelize) }`. Files run
 * in alphabetical order; already-applied ones are skipped automatically.
 *
 * Usage:
 *   node src/migrations/runner.js          ← apply all pending
 *   node src/migrations/runner.js --list   ← show status without running
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { sequelize, Sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const MIGRATIONS_TABLE = '_migrations';
const MIGRATIONS_DIR = __dirname;

async function ensureTable(qi) {
  await qi.createTable(MIGRATIONS_TABLE, {
    name:       { type: Sequelize.STRING, primaryKey: true },
    applied_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  }, { ifNotExists: true });
}

async function appliedNames(qi) {
  const rows = await sequelize.query(
    `SELECT name FROM "${MIGRATIONS_TABLE}" ORDER BY name`,
    { type: QueryTypes.SELECT }
  );
  return new Set(rows.map((r) => r.name));
}

async function run() {
  const qi = sequelize.getQueryInterface();
  const listOnly = process.argv.includes('--list');

  await sequelize.authenticate();
  await ensureTable(qi);

  const applied = await appliedNames(qi);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.js$/.test(f))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  let pending = 0;
  for (const file of files) {
    const status = applied.has(file) ? '✓ applied' : '• pending';
    console.log(`  ${status}  ${file}`);
    if (!applied.has(file)) pending++;
  }

  if (listOnly || pending === 0) {
    if (pending === 0) console.log('\nAll migrations already applied.');
    process.exit(0);
  }

  console.log(`\nApplying ${pending} pending migration(s)...`);

  for (const file of files) {
    if (applied.has(file)) continue;

    console.log(`  → ${file}`);
    const migration = require(path.join(MIGRATIONS_DIR, file));
    await migration.up(qi, Sequelize);

    await sequelize.query(
      `INSERT INTO "${MIGRATIONS_TABLE}" (name, applied_at) VALUES (:name, NOW())`,
      { replacements: { name: file }, type: QueryTypes.INSERT }
    );
    console.log(`    done.`);
  }

  console.log('\nAll migrations applied.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
