/**
 * Backend API configuration.
 *
 * Set NEXT_PUBLIC_API_URL in .env.local to override the default.
 * Example: NEXT_PUBLIC_API_URL=https://api.innoinvest.ro
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * GeminiContent is the raw history format the backend passes back
 * after each chat turn (Gemini SDK Content[]).
 * We treat it as opaque and re-send it verbatim on the next request.
 */
export type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>;
};

export type ChatRequest = {
  message: string;
  history?: GeminiContent[];
};

export type ChatResponse = {
  response: string;
  tools_used: string[];
  history: GeminiContent[];
};

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chat API error ${res.status}: ${body || res.statusText}`);
  }

  return res.json() as Promise<ChatResponse>;
}
