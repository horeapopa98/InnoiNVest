const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const reportController = require('../controllers/report.controller');

const router = express.Router();

router.get('/', asyncHandler(reportController.listReports));
router.get('/:id', asyncHandler(reportController.getReport));
router.post('/', asyncHandler(reportController.createReport));

module.exports = router;
