/**
 * BaseAgent — all category extraction agents extend this.
 *
 * Lifecycle:
 *   agent.run()         → fetch + normalise → cache result
 *   agent.getResult()   → return last successful result (null if never run)
 *   agent.getStatus()   → metadata: last_run, record_count, running, error
 */
class BaseAgent {
  /**
   * @param {object} opts
   * @param {string} opts.id       Unique snake_case identifier, e.g. "inno_properties"
   * @param {string} opts.name     Human-readable name
   * @param {string} opts.category Top-level category, e.g. "real_estate", "infrastructure"
   * @param {string} opts.source   Source URL or identifier
   */
  constructor({ id, name, category, source }) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.source = source;

    this._result = null;
    this._lastRun = null;
    this._lastDurationMs = null;
    this._recordCount = null;
    this._error = null;
    this._running = false;
  }

  /**
   * Override in subclass. Must return an object with at least { items: Array }.
   */
  async _fetch() {
    throw new Error(`${this.constructor.name}._fetch() is not implemented`);
  }

  /**
   * Run the agent: fetch, normalise, cache.
   * Safe to call concurrently — subsequent calls while running wait for the first.
   */
  async run() {
    if (this._running) {
      // Wait for the in-flight run rather than starting a second one
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this._running) { clearInterval(check); resolve(); }
        }, 100);
      });
      return this._result;
    }

    this._running = true;
    const start = Date.now();

    try {
      const result = await this._fetch();
      this._result = {
        ...result,
        agent_id: this.id,
        category: this.category,
        source: this.source,
        extracted_at: new Date().toISOString(),
      };
      this._recordCount = Array.isArray(result.items) ? result.items.length : null;
      this._error = null;
    } catch (err) {
      this._error = err.message;
      // Keep stale result if available rather than wiping it
    } finally {
      this._lastRun = new Date().toISOString();
      this._lastDurationMs = Date.now() - start;
      this._running = false;
    }

    return this._result;
  }

  /** Return the last successful result, or null. */
  getResult() {
    return this._result;
  }

  /** Return agent health / metadata. */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      source: this.source,
      running: this._running,
      last_run: this._lastRun,
      last_duration_ms: this._lastDurationMs,
      record_count: this._recordCount,
      has_result: this._result !== null,
      error: this._error,
    };
  }
}

module.exports = { BaseAgent };
