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
