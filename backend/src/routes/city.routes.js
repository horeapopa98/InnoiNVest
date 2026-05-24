const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const cityController = require('../controllers/city.controller');

const router = express.Router();

router.get('/:cityName', asyncHandler(cityController.getCityOverview));
router.get('/:cityName/projects', asyncHandler(cityController.searchCityProjects));
router.get('/:cityName/report', asyncHandler(cityController.getCityReport));

module.exports = router;
