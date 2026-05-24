const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const propertyController = require('../controllers/property.controller');

const router = express.Router();

router.get('/overview', asyncHandler(propertyController.getOverview));
router.get('/', asyncHandler(propertyController.searchListings));
router.get('/report', asyncHandler(propertyController.generateReport));
router.get('/geo', asyncHandler(propertyController.getGeoProperties));
router.get('/nearby', asyncHandler(propertyController.getNearbyProperties));
router.get('/infrastructure/:type', asyncHandler(propertyController.getInfrastructure));

module.exports = router;
