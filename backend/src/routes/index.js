const express = require('express');
const resourceRoutes = require('./resource.routes');
const reportRoutes = require('./report.routes');
const cityRoutes = require('./city.routes');
const propertyRoutes = require('./property.routes');
const chatRoutes = require('./chat.routes');
const agentRoutes = require('./agent.routes');
const investmentReportRoutes = require('./investment-report.routes');

const router = express.Router();

router.use('/resources', resourceRoutes);
router.use('/reports', reportRoutes);
router.use('/cities', cityRoutes);
router.use('/properties', propertyRoutes);
router.use('/chat', chatRoutes);
router.use('/agents', agentRoutes);
router.use('/investment-report', investmentReportRoutes);

module.exports = router;
