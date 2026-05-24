const agentRunner = require('../agents/agent.runner');
const AppError = require('../errors/AppError');

const agentController = {
  /** GET /api/agents — list all agents + their last-run status */
  listAgents(req, res) {
    const statuses = agentRunner.getStatus();
    res.json({
      agents: agentRunner.listAgents().map((meta) => {
        const status = statuses.find((s) => s.id === meta.id) || {};
        return { ...meta, ...status };
      }),
    });
  },

  /** POST /api/agents/run — run all agents (or a category) in parallel */
  async runAll(req, res) {
    const { category } = req.query;
    const results = category
      ? await agentRunner.runCategory(category)
      : await agentRunner.runAll();
    res.json({ ran_at: new Date().toISOString(), results });
  },

  /** POST /api/agents/:id/run — run a single agent */
  async runOne(req, res) {
    const { id } = req.params;
    const result = await agentRunner.run(id);
    if (!result) throw new AppError(`Agent "${id}" ran but returned no result`, 500);
    res.json(result);
  },

  /** GET /api/agents/:id — get last cached result (no re-fetch) */
  getResult(req, res) {
    const { id } = req.params;
    const result = agentRunner.getResult(id);
    const status = agentRunner.getStatus(id);
    if (!status) throw new AppError(`Unknown agent "${id}"`, 404);
    if (!result) {
      return res.status(202).json({
        message: `Agent "${id}" has not been run yet. POST /api/agents/${id}/run to trigger it.`,
        status,
      });
    }
    res.json(result);
  },
};

module.exports = agentController;
