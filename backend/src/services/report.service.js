const AppError = require('../errors/AppError');
const connectorRegistry = require('../repositories/connectors/registry');
const reportRepository = require('../repositories/report.repository');

class ReportService {
  async generate(sourceId, parameters = {}, { persist = false } = {}) {
    const connector = connectorRegistry.getConnector(sourceId);
    const reportData = await connector.generateReport(parameters);

    if (!persist) {
      return reportData;
    }

    const report = await reportRepository.create({
      topic: reportData.topic,
      sourceId,
      parameters,
      data: reportData,
    });

    return {
      id: report.id,
      persisted: true,
      ...reportData,
    };
  }

  async list({ sourceId, limit } = {}) {
    return reportRepository.findAll({ sourceId, limit });
  }

  async getById(id) {
    const report = await reportRepository.findById(id);
    if (!report) {
      throw new AppError('Report not found', 404);
    }
    return report;
  }
}

module.exports = new ReportService();
