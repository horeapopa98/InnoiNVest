const { GoogleGenerativeAI } = require('@google/generative-ai');
const { TOOL_DEFINITIONS, executeTool } = require('./chat.tools');

const MAX_TOOL_RESULT_CHARS = 8000;
const MAX_TOOL_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are an investment research assistant for North-West Romania, specializing in infrastructure and real estate opportunities.

You have access to two live data sources:
1. **Infrastructure projects** (proinfrastructura.ro) — road and railway construction data across Romania: what is being built, progress percentages, builders, financing programs (EU funds, PNRR, state budget).
2. **INNO Investment Properties** (inno.ro) — 155+ curated land and property listings across 6 counties: Bihor (BH), Maramures (MM), Bistrita-Nasaud (BN), Satu Mare (SM), Cluj (CJ), Salaj (SJ). Includes geographic data via ArcGIS: exact coordinates, industrial parks, airports, railway stations, border crossings.

## Handling location mentions — CRITICAL RULE

When the user mentions ANY Romanian place — commune, city, village, or region — ALWAYS call generate_investment_report with location set to that place name. Never try to figure out coordinates yourself.

Examples of what to do:
- User: "Ce proprietati sunt in comuna Moldovenesti?" -> call generate_investment_report(location: "comuna Moldovenesti")
- User: "Show me investment near Alesد" -> call generate_investment_report(location: "Alesd")
- User: "Infrastructure in Bistrita" -> call generate_investment_report(location: "Bistrita")
- User: "Report for listing 467" -> call generate_investment_report(id: "467")
- User: "What is near Tetarom park?" -> call generate_investment_report(location: "Tetarom Cluj")

The tool geocodes the place, finds nearest INNO properties with exact map coordinates, and combines with ProInfrastructura transport data automatically.

## General rules
- Always use tools — never guess or fabricate data
- Properties: include area, county, acquisition method, price if available
- Infrastructure: include status, progress %, financing source, distance
- Respond in the same language the user writes in (Romanian or English)`;

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
