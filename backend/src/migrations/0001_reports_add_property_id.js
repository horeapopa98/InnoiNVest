/**
 * Add property_id to reports table.
 *
 * Enables one canonical report row per property (upserted on regeneration).
 * Null is kept allowed so existing ad-hoc/source reports are unaffected.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('reports');

    if (!table.property_id) {
      await queryInterface.addColumn('reports', 'property_id', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // addIndex is idempotent when the index name already exists on Postgres.
    const indexes = await queryInterface.showIndex('reports');
    const already = indexes.some((i) => i.name === 'reports_property_id_unique');
    if (!already) {
      await queryInterface.addIndex('reports', ['property_id'], {
        unique: true,
        name: 'reports_property_id_unique',
      });
    }
  },
};
