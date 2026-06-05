module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define(
    'Report',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      topic: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      source_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Stable per-property key. When set, there is at most one report row per
      // property (upserted on regeneration). Null for ad-hoc/source reports.
      property_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      parameters: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      tableName: 'reports',
      underscored: true,
    }
  );

  return Report;
};
