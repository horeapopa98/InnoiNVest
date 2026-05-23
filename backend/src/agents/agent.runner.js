/**
 * AgentRunner — registry and orchestrator for all data extraction agents.
 *
 * Usage:
 *   agentRunner.run('inno_properties')   → run a single agent
 *   agentRunner.runAll()                 → run every registered agent in parallel
 *   agentRunner.getResult('inno_parks')  → last structured result
 *   agentRunner.getStatus()              → array of all agent health objects
 */

const {
  InnoPropertiesAgent,
  InnoListingsAgent,
  InnoIndustrialParksAgent,
  InnoAirportsAgent,
  InnoRailwayStationsAgent,
  InnoBorderCrossingsAgent,
} = require('./inno.agent');

class AgentRunner {
  constructor() {
    this._agents = new Map();

    // Register all known agents
    [
      new InnoPropertiesAgent(),
      new InnoListingsAgent(),
      new InnoIndustrialParksAgent(),
      new InnoAirportsAgent(),
      new InnoRailwayStationsAgent(),
      new InnoBorderCrossingsAgent(),
    ].forEach((a) => this._agents.set(a.id, a));
  }

  /**
   * Run a single agent by id. Returns its structured result.
   * @throws {Error} if agent id is unknown
   */
  async run(agentId) {
    const agent = this._agents.get(agentId);
    if (!agent) {
      const available = [...this._agents.keys()].join(', ');
      throw new Error(`Unknown agent "${agentId}". Available: ${available}`);
    }
    return agent.run();
  }

  /**
   * Run all agents in parallel. Returns a map of { agentId → result }.
   * Errors per agent are captured in the result's `error` field rather than thrown.
   */
  async runAll() {
    const entries = await Promise.all(
      [...this._agents.values()].map(async (agent) => {
        const result = await agent.run();
        return [agent.id, result ?? { error: agent.getStatus().error }];
      })
    );
    return Object.fromEntries(entries);
  }

  /**
   * Run all agents for a given category.
   * @param {string} category e.g. "real_estate" | "infrastructure"
   */
  async runCategory(category) {
    const matching = [...this._agents.values()].filter((a) => a.category === category);
    if (matching.length === 0) {
      throw new Error(`No agents registered for category "${category}"`);
    }
    const entries = await Promise.all(
      matching.map(async (agent) => {
        const result = await agent.run();
        return [agent.id, result ?? { error: agent.getStatus().error }];
      })
    );
    return Object.fromEntries(entries);
  }

  /**
   * Return the last cached result for an agent without re-fetching.
   */
  getResult(agentId) {
    const agent = this._agents.get(agentId);
    if (!agent) return null;
    return agent.getResult();
  }

  /**
   * Return status for all agents (or a single one).
   */
  getStatus(agentId) {
    if (agentId) {
      const agent = this._agents.get(agentId);
      return agent ? agent.getStatus() : null;
    }
    return [...this._agents.values()].map((a) => a.getStatus());
  }

  /** List all registered agent ids. */
  listAgents() {
    return [...this._agents.values()].map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      source: a.source,
    }));
  }
}

module.exports = new AgentRunner();
