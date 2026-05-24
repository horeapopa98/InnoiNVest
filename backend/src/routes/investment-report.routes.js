const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/investment-report.controller');

const router = Router();

router.get('/', asyncHandler(controller.generate));

module.exports = router;
