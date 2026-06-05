const db = require('../models');

class ReportRepository {
  async create({ topic, sourceId, parameters, data }) {
    return db.Report.create({
      topic,
      source_id: sourceId,
      parameters,
      data,
    });
  }

  /**
   * Insert or update the single report row for a property. Keeps one canonical
   * report per `propertyId`; regenerating overwrites parameters + data.
   */
  async upsertByPropertyId({ propertyId, topic, sourceId, parameters, data }) {
    const [report] = await db.Report.upsert(
      {
        property_id: propertyId,
        topic,
        source_id: sourceId,
        parameters,
        data,
      },
      { conflictFields: ['property_id'] }
    );
    return report;
  }

  async findByPropertyId(propertyId) {
    return db.Report.findOne({ where: { property_id: propertyId } });
  }

  async findAll({ sourceId, limit = 50 } = {}) {
    const where = {};
    if (sourceId) where.source_id = sourceId;

    return db.Report.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      attributes: ['id', 'topic', 'source_id', 'parameters', 'created_at'],
    });
  }

  async findById(id) {
    return db.Report.findByPk(id);
  }
}

module.exports = new ReportRepository();
