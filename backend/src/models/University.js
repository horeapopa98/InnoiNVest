module.exports = (sequelize, DataTypes) => {
  const University = sequelize.define(
    'University',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(300),
        allowNull: false,
        comment: 'Full institution name, e.g. Universitatea Babeș-Bolyai (UBB)',
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'City where the institution is located',
      },
      county_code: {
        type: DataTypes.STRING(2),
        allowNull: false,
        comment: 'Two-letter county code, e.g. CJ, BH, MM',
      },
      county_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Full county name, e.g. Cluj, Bihor',
      },
      address: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: 'Street address if known',
      },
      lat: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        comment: 'WGS84 latitude',
      },
      lng: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        comment: 'WGS84 longitude',
      },
      website: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: 'Official website URL',
      },
      type: {
        type: DataTypes.ENUM('university', 'campus', 'extension'),
        allowNull: false,
        defaultValue: 'university',
        comment: 'university = main institution, campus = standalone campus, extension = satellite of another university',
      },
      parent_university: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: 'Parent institution name for campuses/extensions, NULL for main universities',
      },
    },
    {
      tableName: 'universities',
      underscored: true,
      indexes: [
        { fields: ['county_code'] },
        { fields: ['city'] },
        { fields: ['type'] },
        { fields: ['lat', 'lng'] },
      ],
    }
  );

  return University;
};
