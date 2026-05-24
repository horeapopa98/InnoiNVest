module.exports = (sequelize, DataTypes) => {
  const Population = sequelize.define(
    'Population',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      county: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'County name in uppercase Romanian, e.g. ALBA, BIHOR',
      },
      siruta_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'SIRUTA administrative code — unique national identifier',
      },
      locality_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Full official name, e.g. MUNICIPIUL ALBA IULIA',
      },
      locality_name_clean: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Name without type prefix, e.g. ALBA IULIA',
      },
      locality_name_ascii: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Clean name with diacritics stripped for accent-insensitive search',
      },
      locality_type: {
        type: DataTypes.ENUM('municipality', 'town', 'commune'),
        allowNull: false,
        comment: 'municipality = MUNICIPIUL, town = ORAȘ, commune = rest',
      },
      population: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Resident population at 1 December 2021 (provisional)',
      },
      census_year: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 2021,
      },
    },
    {
      tableName: 'population',
      underscored: true,
      indexes: [
        { fields: ['siruta_code'], unique: true },
        { fields: ['county'] },
        { fields: ['locality_type'] },
        { fields: ['population'] },
        { fields: ['locality_name_clean'] },
        { fields: ['locality_name_ascii'] },
      ],
    }
  );

  return Population;
};
