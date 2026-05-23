const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const resourceController = require('../controllers/resource.controller');

const router = express.Router();

router.get('/', asyncHandler(resourceController.listResources));
router.get('/:sourceId/overview', asyncHandler(resourceController.getOverview));
router.get('/:sourceId/projects', asyncHandler(resourceController.searchProjects));
router.get('/:sourceId/projects/:osmId', asyncHandler(resourceController.getProject));

module.exports = router;
