/**
 * Mocked agent response engine. Classifies the user's message into one
 * of a small set of intents, then returns a 2–4 block response composed
 * from the real mock observations. Replace with a real LLM call when
 * the backend phase ships.
 */

import { getKpi, KPIS, type Kpi } from "./kpis";
import { LOCATIONS, type Location } from "./locations";
import { getSeries, getObservation } from "./observations";
import { getSystemYear } from "@/lib/system-clock";

export type AssistantBlock =
  | { kind: "text"; text: string }
  | { kind: "sparkline"; locationSiruta: string; kpiCode: string; values: number[] }
  | {
      kind: "comparison";
      kpiCode: string;
      series: Array<{ locationSiruta: string; values: Array<{ year: number; value: number }> }>;
    }
  | { kind: "citation"; sources: Array<{ id: number; label: string }> };

export type Message =
  | { id: string; role: "user"; text: string; timestamp: number }
  | { id: string; role: "assistant"; blocks: AssistantBlock[]; timestamp: number };

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

// --- Intent classification --------------------------------------------

type Intent =
  | { kind: "trend"; kpi: Kpi; location: Location }
  | { kind: "compare"; kpi: Kpi; locations: Location[] }
  | { kind: "lookup"; kpi: Kpi; location: Location }
  | { kind: "ranking"; kpi: Kpi }
  | { kind: "dossier"; location: Location }
  | { kind: "fallback" };

function findKpi(text: string): Kpi | null {
  const haystack = text.toLowerCase();
  const aliasMap: Record<string, string> = {
    population: "pop_total",
    "pop ": "pop_total",
    gdp: "gdp_per_capita",
    "gdp growth": "gdp_growth",
    inflation: "inflation_hicp",
    unemployment: "unemployment",
    employment: "employment_rate",
    wage: "wage_avg",
    wages: "wage_avg",
    education: "tertiary_attainment",
    students: "student_count",
    housing: "housing_price_m2",
    fiber: "fiber_coverage",
    flood: "flood_risk_index",
    density: "pop_density",
  };
  for (const [alias, code] of Object.entries(aliasMap)) {
    if (haystack.includes(alias)) return getKpi(code) ?? null;
  }
  for (const k of KPIS) {
    if (haystack.includes(k.nameEn.toLowerCase())) return k;
  }
  return null;
}

function findLocations(text: string): Location[] {
  const haystack = text.toLowerCase();
  return LOCATIONS.filter((l) => haystack.includes(l.name.toLowerCase()));
}

function classifyIntent(text: string): Intent {
  const haystack = text.toLowerCase();
  const kpi = findKpi(text);
  const locs = findLocations(text);

  if (haystack.includes("dossier") || haystack.includes("report")) {
    if (locs[0]) return { kind: "dossier", location: locs[0] };
  }
  if (kpi && locs.length >= 2 && /compare|vs|versus|against/.test(haystack)) {
    return { kind: "compare", kpi, locations: locs.slice(0, 4) };
  }
  if (kpi && /trend|over time|history|past|years/.test(haystack)) {
    if (locs[0]) return { kind: "trend", kpi, location: locs[0] };
  }
  if (kpi && /highest|lowest|top|best|worst|ranking|rank/.test(haystack)) {
    return { kind: "ranking", kpi };
  }
  if (kpi && locs[0]) return { kind: "lookup", kpi, location: locs[0] };
  return { kind: "fallback" };
}

// --- Response builders -------------------------------------------------

function citeSources(kpi: Kpi): AssistantBlock {
  return {
    kind: "citation",
    sources: [{ id: 1, label: `${kpi.source} — ${kpi.nameEn}` }],
  };
}

function trendResponse(intent: Extract<Intent, { kind: "trend" }>): AssistantBlock[] {
  const series = getSeries(intent.location.sirutaCode, intent.kpi.code);
  if (series.length === 0) return fallbackResponse();
  const values = series.map((o) => o.value);
  const first = values[0];
  const last = values[values.length - 1];
  const change = ((last - first) / first) * 100;
  return [
    {
      kind: "text",
      text: `${intent.kpi.nameEn} in ${intent.location.name} from ${series[0].year} to ${series[series.length - 1].year}: from ${first.toLocaleString("en-US")} to ${last.toLocaleString("en-US")} ${intent.kpi.unit} — a ${change > 0 ? "+" : ""}${change.toFixed(1)}% change overall.`,
    },
    { kind: "sparkline", locationSiruta: intent.location.sirutaCode, kpiCode: intent.kpi.code, values },
    citeSources(intent.kpi),
  ];
}

function compareResponse(intent: Extract<Intent, { kind: "compare" }>): AssistantBlock[] {
  const series = intent.locations.map((l) => ({
    locationSiruta: l.sirutaCode,
    values: getSeries(l.sirutaCode, intent.kpi.code).map((o) => ({ year: o.year, value: o.value })),
  }));
  if (series.every((s) => s.values.length === 0)) return fallbackResponse();
  const names = intent.locations.map((l) => l.name).join(" vs ");
  const summary = intent.locations
    .map((l) => {
      const latest = series.find((s) => s.locationSiruta === l.sirutaCode)?.values.slice(-1)[0];
      return latest ? `${l.name}: ${latest.value.toLocaleString("en-US")} ${intent.kpi.unit}` : null;
    })
    .filter(Boolean)
    .join(" · ");
  return [
    { kind: "text", text: `Comparing ${intent.kpi.nameEn} across ${names}.` },
    { kind: "comparison", kpiCode: intent.kpi.code, series },
    { kind: "text", text: summary },
    citeSources(intent.kpi),
  ];
}

function lookupResponse(intent: Extract<Intent, { kind: "lookup" }>): AssistantBlock[] {
  const year = getSystemYear();
  const obs = getObservation(intent.location.sirutaCode, intent.kpi.code, year);
  if (!obs) return fallbackResponse();
  return [
    {
      kind: "text",
      text: `${intent.kpi.nameEn} in ${intent.location.name} was ${obs.value.toLocaleString("en-US")} ${intent.kpi.unit} as of ${obs.year}.`,
    },
    citeSources(intent.kpi),
  ];
}

function rankingResponse(intent: Extract<Intent, { kind: "ranking" }>): AssistantBlock[] {
  const year = getSystemYear();
  const eligibleLocs = LOCATIONS.filter((l) => {
    const obs = getObservation(l.sirutaCode, intent.kpi.code, year);
    return obs !== undefined;
  });
  const ranked = eligibleLocs
    .map((l) => ({ loc: l, value: getObservation(l.sirutaCode, intent.kpi.code, year)!.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  return [
    { kind: "text", text: `Top 5 by ${intent.kpi.nameEn} (${year}):` },
    {
      kind: "text",
      text: ranked.map((r, i) => `${i + 1}. ${r.loc.name} — ${r.value.toLocaleString("en-US")} ${intent.kpi.unit}`).join("\n"),
    },
    citeSources(intent.kpi),
  ];
}

function dossierResponse(intent: Extract<Intent, { kind: "dossier" }>): AssistantBlock[] {
  return [
    {
      kind: "text",
      text: `To build a full dossier for ${intent.location.name}, open the Report Builder and select this location in the picker. The "Standard ADR Commune Dossier" template covers Demographics, Macro-Economy, Labor, Real Estate, and Risks.`,
    },
  ];
}

function fallbackResponse(): AssistantBlock[] {
  return [
    {
      kind: "text",
      text: "I can summarise trends, compare locations, look up specific values, or rank locations by an indicator. Try: 'Compare GDP per capita between Cluj and Bistrița' or 'What's unemployment in Maramureș?'",
    },
  ];
}

// --- Public entry point ------------------------------------------------

export function respondTo(text: string, history: Message[] = []): AssistantBlock[] {
  const intent = classifyIntent(text);
  switch (intent.kind) {
    case "trend":
      return trendResponse(intent);
    case "compare":
      return compareResponse(intent);
    case "lookup":
      return lookupResponse(intent);
    case "ranking":
      return rankingResponse(intent);
    case "dossier":
      return dossierResponse(intent);
    case "fallback":
      return fallbackResponse();
  }
}

export const SUGGESTED_PROMPTS: readonly string[] = [
  "Show me unemployment trends in Cluj",
  "Compare GDP per capita in Cluj-Napoca vs Maramureș",
  "Which commune has the highest GDP per capita?",
  "Generate a Florești dossier",
];
