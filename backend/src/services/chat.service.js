const OpenAI = require('openai');
const { TOOL_DEFINITIONS, executeTool } = require('./chat.tools');

const MAX_TOOL_RESULT_CHARS = 8000;
const MAX_TOOL_ITERATIONS = 10;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

const SYSTEM_PROMPT = `You are an investment research assistant for North-West Romania, specializing in infrastructure and real estate opportunities.

You have access to two live data sources:
1. Infrastructure projects (proinfrastructura.ro) — road and railway construction data across Romania: what is being built, progress percentages, builders, financing programs (EU funds, PNRR, state budget).
2. INNO Investment Properties (inno.ro) — 155+ curated land and property listings across 6 counties: Bihor (BH), Maramures (MM), Bistrita-Nasaud (BN), Satu Mare (SM), Cluj (CJ), Salaj (SJ). Includes geographic data via ArcGIS: exact coordinates, industrial parks, airports, railway stations, border crossings.

HANDLING LOCATION MENTIONS — CRITICAL RULE:
When the user mentions ANY Romanian place — commune, city, village, or region — ALWAYS call generate_investment_report with location set to that place name. Never try to figure out coordinates yourself.

Examples:
- "Ce proprietati sunt in comuna Moldovenesti?" -> call generate_investment_report(location: "comuna Moldovenesti")
- "Show me investment near Alesd" -> call generate_investment_report(location: "Alesd")
- "Report for listing 467" -> call generate_investment_report(id: "467")

The tool geocodes the place, finds nearest INNO properties with exact map coordinates, and combines with ProInfrastructura transport data automatically.

FORMATTING RULES — CRITICAL:
- Write in plain prose. Do NOT use markdown headings (no ##, ###), bold markers (no **text**), or bullet dashes (no - item). Use natural paragraph breaks instead.
- Use numbered lists only when presenting ranked items (1. 2. 3.).
- Always use tools — never guess or fabricate data.
- Properties: include area, county, acquisition method, price if available.
- Infrastructure: include status, progress %, financing source, distance.
- Respond in the same language the user writes in (Romanian or English).`;

/**
 * Build map_data from the last generate_investment_report result.
 * Returns null if no report was generated or coordinates are missing.
 */
function _buildMapData(report) {
  if (!report || !report.center) return null;
  const { lat, lng } = report.center;
  if (lat == null || lng == null) return null;

  const label =
    report.target?.title ||
    report.target?.name ||
    report.target?.queried_place ||
    report.target?.city ||
    'Investment Location';

  const markers = [];

  // Industrial parks
  for (const item of report.infrastructure?.industrial_parks?.items ?? []) {
    if (item.coordinates) {
      markers.push({ lat: item.coordinates.lat, lng: item.coordinates.lng, name: item.name, type: 'park' });
    }
  }

  // Airports
  for (const item of report.infrastructure?.airports?.items ?? []) {
    if (item.coordinates) {
      markers.push({ lat: item.coordinates.lat, lng: item.coordinates.lng, name: item.name, type: 'airport' });
    }
  }

  // Railway stations (closest 5)
  for (const item of report.infrastructure?.railway_stations?.closest_5 ?? []) {
    if (item.coordinates) {
      markers.push({ lat: item.coordinates.lat, lng: item.coordinates.lng, name: item.name, type: 'railway' });
    }
  }

  // Universities
  for (const item of report.infrastructure?.universities?.items ?? []) {
    markers.push({ lat: item.lat, lng: item.lng, name: item.name, type: 'university' });
  }

  return { lat, lng, label, radius_km: report.radius_km ?? 30, markers };
}

function _truncateResult(data) {
  const json = JSON.stringify(data, null, 2);
  if (json.length <= MAX_TOOL_RESULT_CHARS) return json;
  const truncated = json.slice(0, MAX_TOOL_RESULT_CHARS);
  return truncated + `\n... [truncated — ${json.length - MAX_TOOL_RESULT_CHARS} chars omitted. Summarize from what is shown above.]`;
}

async function chat(message, history = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }

  const openai = new OpenAI({ apiKey });

  // Build messages array: system prompt + history + new user message.
  // History is the OpenAI messages array returned from the previous turn.
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];

  const toolsUsed = [];
  let iterations = 0;
  // Captures the last investment report result so we can build map_data.
  let lastReportResult = null;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('OpenAI returned no choices.');

    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    // No tool calls — we have the final text response.
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return {
        response: assistantMessage.content ?? '',
        tools_used: toolsUsed,
        map_data: _buildMapData(lastReportResult),
        // Return the full messages array (minus the system prompt) so the
        // frontend can send it back on the next turn for multi-turn context.
        history: messages.slice(1),
      };
    }

    // Execute all tool calls in parallel.
    const toolResults = await Promise.all(
      assistantMessage.tool_calls.map(async (toolCall) => {
        const { name, arguments: argsJson } = toolCall.function;
        toolsUsed.push(name);

        let output;
        let raw;
        try {
          const args = JSON.parse(argsJson);
          raw = await executeTool(name, args);
          // Capture the investment report result for map generation.
          if (name === 'generate_investment_report') lastReportResult = raw;
          output = _truncateResult(raw);
        } catch (err) {
          output = JSON.stringify({ error: err.message });
        }

        return {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: output,
        };
      })
    );

    // Feed all tool results back into the conversation.
    messages.push(...toolResults);
  }

  throw new Error('Chat exceeded maximum tool iteration limit.');
}

module.exports = { chat };
