const combinedReportService = require('../services/combined-report.service');
const AppError = require('../errors/AppError');

const investmentReportController = {
  async generate(req, res) {
    const { id, location, name, lat, lng, radiusKm, county, landType } = req.query;

    if (!id && !location && !name && (lat == null || lng == null) && !county && !landType) {
      throw new AppError(
        'Provide at least one of: id, location (place name), name, county, landType, or lat+lng',
        400
      );
    }

    const report = await combinedReportService.generateLocationReport({
      id: id || null,
      location: location || null,
      name: name || null,
      lat: lat != null ? parseFloat(lat) : undefined,
      lng: lng != null ? parseFloat(lng) : undefined,
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
      county: county || undefined,
      landType: landType || undefined,
    });

    res.json(report);
  },
};

module.exports = investmentReportController;
