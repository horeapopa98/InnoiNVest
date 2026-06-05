/**
 * Backend API configuration.
 *
 * Set NEXT_PUBLIC_API_URL in .env.local to override the default.
 * Example: NEXT_PUBLIC_API_URL=https://api.innoinvest.ro
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * OpenAI-format message. The backend returns the full messages array
 * (minus the system prompt) after each turn so we can re-send it for
 * multi-turn context. We treat it as opaque — only the backend reads it.
 */
export type ChatHistoryItem = {
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: unknown[];
};

// Keep the old name as an alias so chat/page.tsx import doesn't break.
export type GeminiContent = ChatHistoryItem;

export type MapMarker = {
  lat: number;
  lng: number;
  name: string;
  type: "park" | "airport" | "railway" | "university" | "border";
};

export type MapData = {
  lat: number;
  lng: number;
  label: string;
  radius_km: number;
  markers: MapMarker[];
};

export type ChatRequest = {
  message: string;
  history?: ChatHistoryItem[];
};

export type ChatResponse = {
  response: string;
  tools_used: string[];
  map_data?: MapData | null;
  history: ChatHistoryItem[];
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
