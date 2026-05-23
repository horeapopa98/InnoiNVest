const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const agentController = require('../controllers/agent.controller');

const router = Router();

/** List all agents + status */
router.get('/', asyncHandler(agentController.listAgents));

/** Run all agents (or ?category=infrastructure) */
router.post('/run', asyncHandler(agentController.runAll));

/** Run a single agent */
router.post('/:id/run', asyncHandler(agentController.runOne));

/** Get cached result for a single agent */
router.get('/:id', asyncHandler(agentController.getResult));

module.exports = router;
