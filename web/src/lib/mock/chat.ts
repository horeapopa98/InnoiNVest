/**
 * Mocked agent response engine for the InnoiNVest chat. Classifies the
 * user's message into an intent, then composes a typed-block response
 * from real mock observations. Replace with an LLM call when the
 * backend wiring phase ships — the AssistantBlock union is the API
 * the renderer codes against.
 */

import { getKpi, KPIS, type Kpi, type KpiCategory } from "./kpis";
import { LOCATIONS, type Location } from "./locations";
import { getSeries, getObservation } from "./observations";
import { getSystemYear } from "@/lib/system-clock";

// ---------------------------------------------------------------------
// Block kinds the assistant can emit. The renderer in AssistantCard.tsx
// is the only consumer; keep them flat and serialisable so the chat
// history survives a localStorage round-trip.
// ---------------------------------------------------------------------

export type AssistantBlock =
  | { kind: "text"; text: string }
  | { kind: "sparkline"; locationSiruta: string; kpiCode: string; values: number[] }
  | {
      kind: "comparison";
      kpiCode: string;
      series: Array<{ locationSiruta: string; values: Array<{ year: number; value: number }> }>;
    }
  | { kind: "citation"; sources: Array<{ id: number; label: string }> }
  /** Hero number with delta vs region average + a small trend chart. */
  | {
      kind: "metricCard";
      locationSiruta: string;
      kpiCode: string;
      year: number;
      value: number;
      regionAvg: number | null;
      series: number[];
    }
  /** Top-N table with proportional value bars + medal indicators. */
  | {
      kind: "rankingTable";
      kpiCode: string;
      year: number;
      rows: Array<{ locationSiruta: string; value: number }>;
    }
  /** Multi-series line chart with axes and a legend. */
  | {
      kind: "lineChart";
      kpiCode: string;
      yearRange: [number, number];
      series: Array<{ locationSiruta: string; points: Array<{ year: number; value: number }> }>;
    }
  /** Hex cartogram of NW Romania counties, fill-encoded by value. */
  | {
      kind: "map";
      kpiCode: string;
      year: number;
      valuesByCounty: Record<string, number>;
    }
  /** Multi-KPI snapshot for a single location (mini-dossier). */
  | {
      kind: "scorecard";
      locationSiruta: string;
      year: number;
      tiles: Array<{
        kpiCode: string;
        value: number | null;
        delta: number | null;
        category: KpiCategory;
      }>;
    };

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

// ---------------------------------------------------------------------
// Intent classification
// ---------------------------------------------------------------------

type Intent =
  | { kind: "trend"; kpi: Kpi; location: Location }
  | { kind: "compare"; kpi: Kpi; locations: Location[] }
  | { kind: "lookup"; kpi: Kpi; location: Location }
  | { kind: "ranking"; kpi: Kpi }
  | { kind: "snapshot"; location: Location }
  | { kind: "recommendation"; sector: "tech" | "manufacturing" | "general" }
  | { kind: "dossier"; location: Location }
  | { kind: "fallback" };

const KPI_ALIAS_MAP: Record<string, string> = {
  population: "pop_total",
  "pop ": "pop_total",
  gdp: "gdp_per_capita",
  "gdp growth": "gdp_growth",
  inflation: "inflation_hicp",
  unemployment: "unemployment",
  employment: "employment_rate",
  wage: "wage_avg",
  wages: "wage_avg",
  salary: "wage_avg",
  education: "tertiary_attainment",
  university: "tertiary_attainment",
  students: "student_count",
  housing: "housing_price_m2",
  "real estate": "housing_price_m2",
  fiber: "fiber_coverage",
  broadband: "fiber_coverage",
  flood: "flood_risk_index",
  density: "pop_density",
};

function findKpi(text: string): Kpi | null {
  const haystack = text.toLowerCase();
  for (const [alias, code] of Object.entries(KPI_ALIAS_MAP)) {
    if (haystack.includes(alias)) return getKpi(code) ?? null;
  }
  for (const k of KPIS) {
    if (haystack.includes(k.nameEn.toLowerCase())) return k;
  }
  return null;
}

function findLocations(text: string): Location[] {
  const haystack = text.toLowerCase();
  // Prefer the MOST SPECIFIC match first: "Cluj-Napoca" beats "Cluj"
  // even though both are substrings. Otherwise the county shadows the
  // city for any query mentioning Cluj-Napoca.
  return LOCATIONS.filter((l) => haystack.includes(l.name.toLowerCase())).sort(
    (a, b) => b.name.length - a.name.length
  );
}

function classifyIntent(text: string): Intent {
  const haystack = text.toLowerCase();
  const kpi = findKpi(text);
  const locs = findLocations(text);

  // Recommendation: "where should I invest" / "best for tech" / etc.
  if (/where (should|to) (i )?invest|recommend|best (for|county|location)|most attractive|attractive for/.test(haystack)) {
    const sector = /tech|software|it|digital/.test(haystack)
      ? "tech"
      : /manufactur|industr|factor/.test(haystack)
        ? "manufacturing"
        : "general";
    return { kind: "recommendation", sector };
  }

  // Snapshot: "tell me about X" / "overview of X" / "profile of X" / "about X"
  if (
    /tell me about|overview of|profile of|snapshot of|brief on|^about /.test(haystack) ||
    (locs[0] && /what about|what's in|stats for/.test(haystack))
  ) {
    if (locs[0]) return { kind: "snapshot", location: locs[0] };
  }

  if (haystack.includes("dossier") || haystack.includes("full report")) {
    if (locs[0]) return { kind: "dossier", location: locs[0] };
  }
  if (kpi && locs.length >= 2 && /compare|vs|versus|against|between/.test(haystack)) {
    return { kind: "compare", kpi, locations: locs.slice(0, 4) };
  }
  if (kpi && /trend|over time|history|past|years|since|evolution/.test(haystack)) {
    if (locs[0]) return { kind: "trend", kpi, location: locs[0] };
  }
  if (kpi && /highest|lowest|top|best|worst|ranking|rank|which/.test(haystack)) {
    return { kind: "ranking", kpi };
  }
  if (kpi && locs[0]) return { kind: "lookup", kpi, location: locs[0] };
  return { kind: "fallback" };
}

// ---------------------------------------------------------------------
// Helpers shared by response builders
// ---------------------------------------------------------------------

function citeSources(kpis: Kpi[]): AssistantBlock {
  const unique = Array.from(new Map(kpis.map((k) => [k.source + k.code, k])).values());
  return {
    kind: "citation",
    sources: unique.map((k, i) => ({
      id: i + 1,
      label: `${k.source} — ${k.nameEn}`,
    })),
  };
}

/**
 * Average of an indicator across all eligible NW counties in a given
 * year. Used as the regional benchmark on metric cards. Returns null
 * if the indicator has no county-level observations.
 */
function regionAverage(kpiCode: string, year: number): number | null {
  const kpi = getKpi(kpiCode);
  if (!kpi) return null;
  const values: number[] = [];
  for (const l of LOCATIONS) {
    if (l.type !== "county") continue;
    const obs = getObservation(l.sirutaCode, kpiCode, year);
    if (obs) values.push(obs.value);
  }
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Counties only — used by map block (the cartogram has only counties). */
function countyValueMap(kpiCode: string, year: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of LOCATIONS) {
    if (l.type !== "county") continue;
    const obs = getObservation(l.sirutaCode, kpiCode, year);
    if (obs) out[l.sirutaCode] = obs.value;
  }
  return out;
}

// ---------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------

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
      text: `${intent.kpi.nameEn} in ${intent.location.name} went from ${first.toLocaleString("en-US")} ${intent.kpi.unit} in ${series[0].year} to ${last.toLocaleString("en-US")} ${intent.kpi.unit} in ${series[series.length - 1].year} — a ${change > 0 ? "+" : ""}${change.toFixed(1)}% change overall.`,
    },
    {
      kind: "lineChart",
      kpiCode: intent.kpi.code,
      yearRange: [series[0].year, series[series.length - 1].year],
      series: [
        {
          locationSiruta: intent.location.sirutaCode,
          points: series.map((o) => ({ year: o.year, value: o.value })),
        },
      ],
    },
    citeSources([intent.kpi]),
  ];
}

function compareResponse(intent: Extract<Intent, { kind: "compare" }>): AssistantBlock[] {
  const series = intent.locations.map((l) => ({
    locationSiruta: l.sirutaCode,
    points: getSeries(l.sirutaCode, intent.kpi.code).map((o) => ({ year: o.year, value: o.value })),
  }));
  if (series.every((s) => s.points.length === 0)) return fallbackResponse();
  const allYears = series.flatMap((s) => s.points.map((p) => p.year));
  const yearRange: [number, number] = [Math.min(...allYears), Math.max(...allYears)];
  const names = intent.locations.map((l) => l.name).join(" vs ");
  const latest = intent.locations
    .map((l) => {
      const v = series.find((s) => s.locationSiruta === l.sirutaCode)?.points.slice(-1)[0]?.value;
      return v !== undefined ? { name: l.name, value: v } : null;
    })
    .filter(Boolean) as { name: string; value: number }[];
  latest.sort((a, b) => b.value - a.value);
  const summary =
    latest.length > 0
      ? `Latest year leader: ${latest[0].name} at ${latest[0].value.toLocaleString("en-US")} ${intent.kpi.unit}. ${latest.length > 1 ? `Trailing: ${latest[latest.length - 1].name} at ${latest[latest.length - 1].value.toLocaleString("en-US")}.` : ""}`
      : "";
  return [
    { kind: "text", text: `Comparing ${intent.kpi.nameEn} across ${names}.` },
    { kind: "lineChart", kpiCode: intent.kpi.code, yearRange, series },
    summary ? { kind: "text", text: summary } : { kind: "text", text: "" },
    citeSources([intent.kpi]),
  ].filter((b) => !(b.kind === "text" && b.text === ""));
}

function lookupResponse(intent: Extract<Intent, { kind: "lookup" }>): AssistantBlock[] {
  const year = getSystemYear();
  const obs = getObservation(intent.location.sirutaCode, intent.kpi.code, year);
  if (!obs) return fallbackResponse();
  const series = getSeries(intent.location.sirutaCode, intent.kpi.code).map((o) => o.value);
  const regionAvg = regionAverage(intent.kpi.code, year);
  return [
    {
      kind: "text",
      text: `Here's ${intent.kpi.nameEn.toLowerCase()} for ${intent.location.name} in ${obs.year}.`,
    },
    {
      kind: "metricCard",
      locationSiruta: intent.location.sirutaCode,
      kpiCode: intent.kpi.code,
      year: obs.year,
      value: obs.value,
      regionAvg,
      series,
    },
    citeSources([intent.kpi]),
  ];
}

function rankingResponse(intent: Extract<Intent, { kind: "ranking" }>): AssistantBlock[] {
  const year = getSystemYear();
  const eligible = LOCATIONS.filter((l) => getObservation(l.sirutaCode, intent.kpi.code, year));
  const rows = eligible
    .map((l) => ({ locationSiruta: l.sirutaCode, value: getObservation(l.sirutaCode, intent.kpi.code, year)!.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  if (rows.length === 0) return fallbackResponse();
  const blocks: AssistantBlock[] = [
    { kind: "text", text: `Top ${rows.length} locations by ${intent.kpi.nameEn.toLowerCase()} in ${year}:` },
    { kind: "rankingTable", kpiCode: intent.kpi.code, year, rows },
  ];
  // Add a map when the KPI has county-level coverage
  const countyValues = countyValueMap(intent.kpi.code, year);
  if (Object.keys(countyValues).length > 0) {
    blocks.push({ kind: "map", kpiCode: intent.kpi.code, year, valuesByCounty: countyValues });
  }
  blocks.push(citeSources([intent.kpi]));
  return blocks;
}

/**
 * Snapshot intent — "tell me about Cluj". Composes a multi-KPI
 * scorecard + a map highlighting the location's county.
 */
function snapshotResponse(intent: Extract<Intent, { kind: "snapshot" }>): AssistantBlock[] {
  const year = getSystemYear();
  // Curate the 6 most useful KPIs across the categories for a one-glance scan.
  const featuredCodes = [
    "pop_total",
    "gdp_per_capita",
    "unemployment",
    "wage_avg",
    "tertiary_attainment",
    "housing_price_m2",
  ];
  const featuredKpis: Kpi[] = [];
  const tiles = featuredCodes
    .map((code) => {
      const kpi = getKpi(code);
      if (!kpi) return null;
      featuredKpis.push(kpi);
      const obs = getObservation(intent.location.sirutaCode, code, year);
      const prev = getObservation(intent.location.sirutaCode, code, year - 1);
      const value = obs?.value ?? null;
      const delta = value !== null && prev ? ((value - prev.value) / prev.value) * 100 : null;
      return { kpiCode: code, value, delta, category: kpi.category };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const blocks: AssistantBlock[] = [
    {
      kind: "text",
      text: `${intent.location.name} snapshot for ${year}. Here's how the six core indicators look:`,
    },
    { kind: "scorecard", locationSiruta: intent.location.sirutaCode, year, tiles },
  ];

  // If the location has a county, also render a contextual map highlighting it.
  const popMap = countyValueMap("pop_total", year);
  if (Object.keys(popMap).length > 0) {
    blocks.push({
      kind: "map",
      kpiCode: "pop_total",
      year,
      valuesByCounty: popMap,
    });
  }

  blocks.push({
    kind: "text",
    text: `Tap any tile to drill into the indicator. For a printable dossier, click "Use in report" below.`,
  });
  blocks.push(citeSources(featuredKpis));
  return blocks;
}

/**
 * Recommendation intent — "where should I invest in tech?".
 * Builds a simple composite score (sector-weighted) across counties,
 * shows the ranking + map.
 */
function recommendationResponse(
  intent: Extract<Intent, { kind: "recommendation" }>
): AssistantBlock[] {
  const year = getSystemYear();
  // Sector weighting: which KPIs matter and how much (sum = 1).
  const weights: Record<string, number> =
    intent.sector === "tech"
      ? {
          tertiary_attainment: 0.35,
          fiber_coverage: 0.25,
          employment_rate: 0.15,
          gdp_per_capita: 0.15,
          gdp_growth: 0.1,
        }
      : intent.sector === "manufacturing"
        ? {
            wage_avg: 0.3,
            employment_rate: 0.25,
            gdp_per_capita: 0.2,
            highway_access_km: 0.15, // lower is better — handled below
            unemployment: 0.1, // lower is better — handled below
          }
        : {
            gdp_per_capita: 0.3,
            gdp_growth: 0.2,
            employment_rate: 0.15,
            tertiary_attainment: 0.15,
            unemployment: 0.1, // lower is better
            fiber_coverage: 0.1,
          };

  // For each county, compute weighted normalised score.
  const counties = LOCATIONS.filter((l) => l.type === "county");
  // First gather min/max per KPI for normalisation.
  const kpiRange: Record<string, { min: number; max: number; lowerBetter: boolean }> = {};
  for (const code of Object.keys(weights)) {
    const values: number[] = [];
    for (const c of counties) {
      const o = getObservation(c.sirutaCode, code, year);
      if (o) values.push(o.value);
    }
    if (values.length === 0) continue;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const lowerBetter = code === "unemployment" || code === "highway_access_km" || code === "flood_risk_index";
    kpiRange[code] = { min, max, lowerBetter };
  }

  const scored = counties.map((c) => {
    let score = 0;
    let weightSum = 0;
    for (const [code, w] of Object.entries(weights)) {
      const range = kpiRange[code];
      if (!range) continue;
      const o = getObservation(c.sirutaCode, code, year);
      if (!o) continue;
      const norm = range.max === range.min ? 0.5 : (o.value - range.min) / (range.max - range.min);
      const adjusted = range.lowerBetter ? 1 - norm : norm;
      score += adjusted * w;
      weightSum += w;
    }
    return { locationSiruta: c.sirutaCode, value: weightSum === 0 ? 0 : (score / weightSum) * 100 };
  });
  scored.sort((a, b) => b.value - a.value);

  const sectorLabel =
    intent.sector === "tech"
      ? "tech investment"
      : intent.sector === "manufacturing"
        ? "manufacturing investment"
        : "general investment";

  const usedKpis = Object.keys(weights)
    .map((code) => getKpi(code))
    .filter((k): k is Kpi => k !== undefined);

  return [
    {
      kind: "text",
      text: `Composite score for ${sectorLabel} across NW Romania counties, ${year}. The score is normalised 0–100 across the chosen indicators (${usedKpis.map((k) => k.nameEn.toLowerCase()).join(", ")}).`,
    },
    { kind: "rankingTable", kpiCode: "composite_score", year, rows: scored },
    {
      kind: "map",
      kpiCode: "composite_score",
      year,
      valuesByCounty: Object.fromEntries(scored.map((s) => [s.locationSiruta, s.value])),
    },
    {
      kind: "text",
      text: `Leader: ${LOCATIONS.find((l) => l.sirutaCode === scored[0].locationSiruta)?.name} (${scored[0].value.toFixed(1)} / 100). Adjust the weights or sector to test other scenarios.`,
    },
    citeSources(usedKpis),
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
      text: "I can summarise trends, compare locations, rank by indicator, generate snapshot dossiers, or recommend where to invest. Try one of the capability cards on a new chat, or ask something like: \"Tell me about Cluj\", \"Where should I invest in tech?\", \"Which county has the highest GDP per capita?\".",
    },
  ];
}

// ---------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------

export function respondTo(text: string, history: Message[] = []): AssistantBlock[] {
  void history; // mock doesn't use multi-turn; signature matches future LLM call
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
    case "snapshot":
      return snapshotResponse(intent);
    case "recommendation":
      return recommendationResponse(intent);
    case "dossier":
      return dossierResponse(intent);
    case "fallback":
      return fallbackResponse();
  }
}

export function summarizeIntent(text: string): string {
  const intent = classifyIntent(text);
  switch (intent.kind) {
    case "trend":
      return `Analysing ${intent.kpi.nameEn.toLowerCase()} trend in ${intent.location.name}`;
    case "compare":
      return `Comparing ${intent.kpi.nameEn.toLowerCase()} across ${intent.locations.map((l) => l.name).join(", ")}`;
    case "lookup":
      return `Looking up ${intent.kpi.nameEn.toLowerCase()} for ${intent.location.name}`;
    case "ranking":
      return `Ranking locations by ${intent.kpi.nameEn.toLowerCase()}`;
    case "snapshot":
      return `Building snapshot for ${intent.location.name}`;
    case "recommendation":
      return `Scoring counties for ${intent.sector === "general" ? "investment" : `${intent.sector} investment`}`;
    case "dossier":
      return `Preparing a ${intent.location.name} dossier`;
    case "fallback":
      return "Searching the dataset";
  }
}

/**
 * Context-aware follow-ups. `blocks` is optional but recommended —
 * with it, ranking and recommendation responses can name the actual
 * top location instead of a vague "the top-ranked county", which
 * keeps the chip clickable through the intent classifier.
 */
export function followUpsFor(text: string, blocks?: AssistantBlock[]): string[] {
  const intent = classifyIntent(text);

  // Extract the top location from a ranking-table block if present.
  // Useful for ranking + recommendation responses.
  const rankingBlock = blocks?.find((b): b is Extract<AssistantBlock, { kind: "rankingTable" }> => b.kind === "rankingTable");
  const topLocName = rankingBlock?.rows[0]
    ? (LOCATIONS.find((l) => l.sirutaCode === rankingBlock.rows[0].locationSiruta)?.name ?? null)
    : null;

  switch (intent.kind) {
    case "trend":
      return [
        `Compare ${intent.kpi.nameEn} across counties`,
        `Tell me about ${intent.location.name}`,
        `Where should I invest based on ${intent.kpi.nameEn.toLowerCase()}?`,
      ];
    case "compare":
      return [
        `Which location has the highest ${intent.kpi.nameEn}?`,
        `Show the ${intent.kpi.nameEn} trend for ${intent.locations[0].name}`,
        `Tell me about ${intent.locations[0].name}`,
      ];
    case "lookup":
      return [
        `Show the ${intent.kpi.nameEn} trend in ${intent.location.name}`,
        `Compare ${intent.kpi.nameEn} between ${intent.location.name} and ${otherLocationName(intent.location.sirutaCode)}`,
        `Tell me about ${intent.location.name}`,
      ];
    case "ranking":
      return [
        topLocName ? `Tell me about ${topLocName}` : `Tell me about Cluj-Napoca`,
        topLocName
          ? `Show the ${intent.kpi.nameEn.toLowerCase()} trend in ${topLocName}`
          : `Show the ${intent.kpi.nameEn.toLowerCase()} trend in Cluj`,
        `Where should I invest based on ${intent.kpi.nameEn.toLowerCase()}?`,
      ];
    case "snapshot":
      return [
        `Compare ${intent.location.name} to other counties`,
        `Generate a ${intent.location.name} dossier`,
        `Where should I invest in tech?`,
      ];
    case "recommendation":
      return [
        topLocName ? `Tell me about ${topLocName}` : `Tell me about Cluj`,
        `Where should I invest in manufacturing?`,
        `Which county has the highest education attainment?`,
      ];
    case "dossier":
      return [
        `What's the unemployment rate in ${intent.location.name}?`,
        `Compare ${intent.location.name} to other counties`,
      ];
    case "fallback":
      return [];
  }
}

function otherLocationName(excludeCode: string): string {
  return LOCATIONS.find((l) => l.sirutaCode !== excludeCode)?.name ?? "another location";
}

/**
 * Render an assistant message back to plain text — used by the Copy
 * action. Non-text blocks become inline descriptors so the copied
 * output still makes sense in a notes app.
 */
export function messageToCopyText(blocks: AssistantBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.kind === "text") parts.push(b.text);
    else if (b.kind === "sparkline")
      parts.push(`[Trend chart for ${b.kpiCode} — ${b.values.join(", ")}]`);
    else if (b.kind === "comparison")
      parts.push(`[Comparison of ${b.kpiCode} across ${b.series.length} locations]`);
    else if (b.kind === "lineChart")
      parts.push(
        `[Line chart of ${b.kpiCode} ${b.yearRange[0]}–${b.yearRange[1]} for ${b.series.length} ${b.series.length === 1 ? "location" : "locations"}]`
      );
    else if (b.kind === "metricCard") {
      const kpi = getKpi(b.kpiCode);
      parts.push(
        `${kpi?.nameEn ?? b.kpiCode}: ${b.value.toLocaleString("en-US")} ${kpi?.unit ?? ""} (${b.year}). Region avg ${b.regionAvg !== null ? b.regionAvg.toFixed(1) : "n/a"}.`
      );
    } else if (b.kind === "rankingTable")
      parts.push(
        b.rows
          .map((r, i) => {
            const loc = LOCATIONS.find((l) => l.sirutaCode === r.locationSiruta);
            return `${i + 1}. ${loc?.name ?? r.locationSiruta} — ${r.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
          })
          .join("\n")
      );
    else if (b.kind === "map")
      parts.push(`[Map of ${b.kpiCode} across NW Romania counties, ${b.year}]`);
    else if (b.kind === "scorecard") {
      const loc = LOCATIONS.find((l) => l.sirutaCode === b.locationSiruta);
      parts.push(
        `Snapshot — ${loc?.name ?? b.locationSiruta} ${b.year}:\n` +
          b.tiles
            .map((t) => {
              const kpi = getKpi(t.kpiCode);
              return `· ${kpi?.nameEn ?? t.kpiCode}: ${t.value !== null ? t.value.toLocaleString("en-US") : "n/a"} ${kpi?.unit ?? ""}${t.delta !== null ? ` (${t.delta > 0 ? "+" : ""}${t.delta.toFixed(1)}% YoY)` : ""}`;
            })
            .join("\n")
      );
    } else if (b.kind === "citation")
      parts.push("Sources:\n" + b.sources.map((s, i) => `[${i + 1}] ${s.label}`).join("\n"));
  }
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------
// Empty-state capability cards
// ---------------------------------------------------------------------

export type CapabilityCard = {
  id: string;
  icon: "trending_up" | "compare" | "trophy" | "document" | "snapshot" | "recommend";
  title: string;
  description: string;
  example: string;
};

export const CAPABILITIES: readonly CapabilityCard[] = [
  {
    id: "snapshot",
    icon: "snapshot",
    title: "Location snapshot",
    description: "One-glance multi-indicator profile with map context.",
    example: "Tell me about Cluj-Napoca",
  },
  {
    id: "recommendation",
    icon: "recommend",
    title: "Where to invest",
    description: "Composite-score ranking across NW counties for your sector.",
    example: "Where should I invest in tech?",
  },
  {
    id: "ranking",
    icon: "trophy",
    title: "Rank by indicator",
    description: "Surface the leaders or laggards across the region.",
    example: "Which county has the highest GDP per capita?",
  },
  {
    id: "compare",
    icon: "compare",
    title: "Compare locations",
    description: "Side-by-side time-series across 2+ counties or cities.",
    example: "Compare GDP per capita in Cluj-Napoca vs Maramureș",
  },
  {
    id: "trend",
    icon: "trending_up",
    title: "Trend over time",
    description: "Multi-year evolution of any indicator for a location.",
    example: "Show me unemployment trends in Cluj county",
  },
  {
    id: "dossier",
    icon: "document",
    title: "Open in Report Builder",
    description: "Hand off the snapshot to a structured printable dossier.",
    example: "Generate a Florești dossier",
  },
];

/** Back-compat. */
export const SUGGESTED_PROMPTS: readonly string[] = CAPABILITIES.slice(0, 4).map((c) => c.example);
