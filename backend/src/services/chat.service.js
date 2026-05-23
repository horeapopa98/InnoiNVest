const { GoogleGenerativeAI } = require('@google/generative-ai');
const { TOOL_DEFINITIONS, executeTool } = require('./chat.tools');

const MAX_TOOL_RESULT_CHARS = 8000;
const MAX_TOOL_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are an investment research assistant for North-West Romania, specializing in infrastructure and real estate opportunities.

You have access to two live data sources:
1. **Infrastructure projects** (proinfrastructura.ro) — road and railway construction data across Romania: what is being built, progress percentages, builders, financing programs (EU funds, PNRR, state budget).
2. **INNO Investment Properties** (inno.ro) — 155+ curated land and property listings across 6 counties: Bihor (BH), Maramureș (MM), Bistrița-Năsăud (BN), Satu Mare (SM), Cluj (CJ), Sălaj (SJ). Also includes geographic data via ArcGIS: exact coordinates, industrial parks, airports, railway stations, and border crossings.

Your role:
- Answer questions about investment opportunities, infrastructure development, and available land/properties in North-West Romania
- Use the available tools to fetch real, live data before answering
- When a user asks about a city or region, always call the relevant tools to get current data
- Present data clearly and concisely — use bullet points, short tables, or summaries as appropriate
- When reporting on properties, always include: area, county, acquisition method, and any price if available
- When reporting on infrastructure, always include: construction status, progress if available, and financing source
- If coordinates are needed (e.g. for "near X"), use your knowledge of Romanian city coordinates or call get_city_infrastructure first to get the location, then use find_nearby_properties
- Always respond in the same language the user writes in (Romanian or English)`;

function _truncateResult(data) {
  const json = JSON.stringify(data, null, 2);
  if (json.length <= MAX_TOOL_RESULT_CHARS) return json;
  const truncated = json.slice(0, MAX_TOOL_RESULT_CHARS);
  return truncated + `\n... [truncated — ${json.length - MAX_TOOL_RESULT_CHARS} chars omitted. Summarize from what is shown above.]`;
}

async function chat(message, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: TOOL_DEFINITIONS }],
  });

  // Build the contents array from history + new user message
  const contents = [
    ...history,
    { role: 'user', parts: [{ text: message }] },
  ];

  const toolsUsed = [];
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const result = await model.generateContent({ contents });
    const candidate = result.response.candidates[0];

    if (!candidate) {
      throw new Error('Gemini returned no candidates.');
    }

    // Add the model's response to the conversation
    contents.push({ role: 'model', parts: candidate.content.parts });

    // Check if there are function calls to execute
    const functionCalls = candidate.content.parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      // No more tool calls — extract the text response
      const text = candidate.content.parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join('');

      return {
        response: text,
        tools_used: toolsUsed,
        history: contents,
      };
    }

    // Execute all function calls in parallel and collect results
    const functionResponses = await Promise.all(
      functionCalls.map(async (part) => {
        const { name, args } = part.functionCall;
        toolsUsed.push(name);

        let output;
        try {
          const raw = await executeTool(name, args);
          output = _truncateResult(raw);
        } catch (err) {
          output = JSON.stringify({ error: err.message });
        }

        return {
          functionResponse: {
            name,
            response: { output },
          },
        };
      })
    );

    // Feed the results back to the model
    contents.push({ role: 'user', parts: functionResponses });
  }

  throw new Error('Chat exceeded maximum tool iteration limit.');
}

module.exports = { chat };
