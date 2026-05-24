const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const db = { sequelize, Sequelize, DataTypes };

const modelsDir = __dirname;
const modelFiles = fs
  .readdirSync(modelsDir)
  .filter(
    (file) =>
      file !== 'index.js' && file.endsWith('.js') && !file.endsWith('.test.js')
  );

for (const file of modelFiles) {
  const model = require(path.join(modelsDir, file))(sequelize, DataTypes);
  db[model.name] = model;
}

for (const modelName of Object.keys(db)) {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
}

module.exports = db;
