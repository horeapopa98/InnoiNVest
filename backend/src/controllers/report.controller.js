const AppError = require('../errors/AppError');
const reportService = require('../services/report.service');
const { parseOptionalNumber } = require('../utils/queryParser');

async function listReports(req, res) {
  const reports = await reportService.list({
    sourceId: req.query.sourceId,
    limit: parseOptionalNumber(req.query.limit),
  });
  res.json(reports);
}

async function getReport(req, res) {
  const report = await reportService.getById(req.params.id);
  res.json(report);
}

async function createReport(req, res) {
  const { sourceId, parameters = {}, persist = true } = req.body;

  if (!sourceId) {
    throw new AppError('sourceId is required', 400);
  }

  const report = await reportService.generate(sourceId, parameters, { persist });
  res.status(201).json(report);
}

module.exports = {
  listReports,
  getReport,
  createReport,
};
