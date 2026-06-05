/**
 * Mocked agent response engine for the InnoiNVest chat. Classifies the
 * user's message into an intent, then composes a typed-block response
 * from real mock observations. Replace with an LLM call when the
 * backend wiring phase ships — the AssistantBlock union is the API
 * the renderer codes against.
 */

import { getKpi, KPIS, type Kpi, type KpiCategory } from "./kpis";
import { LOCATIONS, type Location } from "./locations";
import { getSeries, getObservation, YEARS_AVAILABLE } from "./observations";
import { PARCELS, parcelsByType, parcelsInCounty, type ParcelType } from "./parcels";
import { getSystemYear } from "@/lib/system-clock";
import { type Sector } from "./composite";

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
  | {
      kind: "citation";
      sources: Array<{
        id: number;
        label: string;
        /** Optional deep-link into /data with filters pre-applied. */
        href?: string;
      }>;
    }
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
    }
  /**
   * Interactive composite-score recommendation. The renderer owns
   * the live weight sliders and re-runs the scoring on every change,
   * so this block carries only the initial state.
   */
  | {
      kind: "interactiveRecommendation";
      sector: Sector;
      year: number;
    }
  /** Real(-ish) NW Romania map showing investable parcels. */
  | {
      kind: "parcelMap";
      filterType: ParcelType | "all";
      parcelIds: string[];
    }
  /** Real-data location map from an investment report. */
  | {
      kind: "locationMap";
      lat: number;
      lng: number;
      label: string;
      radius_km: number;
      markers: Array<{
        lat: number;
        lng: number;
        name: string;
        type: "park" | "airport" | "railway" | "university" | "border";
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
  /**
   * Raw Gemini-format history returned by the backend after each turn.
   * Sent back on subsequent requests to maintain multi-turn context.
   * Opaque to the frontend — only the backend reads this.
   */
  geminiHistory?: unknown[];
};

// ---------------------------------------------------------------------
// Intent classification
// ---------------------------------------------------------------------

type Intent =
  | { kind: "trend"; kpi: Kpi; location: Location; year?: number }
  | { kind: "compare"; kpi: Kpi; locations: Location[] }
  | { kind: "lookup"; kpi: Kpi; location: Location; year?: number }
  | { kind: "ranking"; kpi: Kpi; year?: number }
  | { kind: "snapshot"; location: Location }
  | { kind: "recommendation"; sector: Sector }
  | { kind: "dossier"; location: Location }
  | { kind: "parcels"; type: ParcelType | "all"; location: Location | null }
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

/** Detect a 4-digit year in the supported range. */
function findYear(text: string): number | undefined {
  const match = text.match(/\b(20\d{2})\b/);
  if (!match) return undefined;
  const y = Number(match[1]);
  return YEARS_AVAILABLE.includes(y) ? y : undefined;
}

/**
 * Extract the most recent (location, kpi) context from prior messages.
 * Used to resolve referential queries like "what about Maramureș?" or
 * "show me 2024 instead" — they don't fully specify what they refer to.
 */
function lastContext(history: Message[]): { kpi: Kpi | null; location: Location | null } {
  let kpi: Kpi | null = null;
  let location: Location | null = null;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    if (!kpi) kpi = findKpi(m.text);
    if (!location) {
      const locs = findLocations(m.text);
      if (locs[0]) location = locs[0];
    }
    if (kpi && location) break;
  }
  return { kpi, location };
}

function findParcelType(text: string): ParcelType | "all" {
  const h = text.toLowerCase();
  if (/factor|manufactur|industrial site|industrial park/.test(h)) return "industrial";
  if (/tech park|innovation|software|it park/.test(h)) return "tech";
  if (/warehous|logistics|distribution/.test(h)) return "logistics";
  if (/agri|farm|food/.test(h)) return "agricultural";
  return "all";
}

function classifyIntent(text: string, history: Message[] = []): Intent {
  const haystack = text.toLowerCase();
  let kpi = findKpi(text);
  let locs = findLocations(text);
  const year = findYear(text);

  // Referential resolution — when the user doesn't repeat themselves.
  const ctx = lastContext(history);
  const isReferential =
    /^(what about|and|now|instead|then|how about|^show me)\b/.test(haystack) ||
    (kpi === null && locs.length === 0);
  if (isReferential) {
    if (!kpi && ctx.kpi) kpi = ctx.kpi;
    if (locs.length === 0 && ctx.location) locs = [ctx.location];
  }

  // Parcels intent — broad match: any factory/parcel/site/land question.
  if (
    /parcel|industrial site|industrial park|tech park|factory|where can i build|where to build|where (can|to|should)? ?i? ?(put|locate|set up)|available site|investable land|greenfield|brownfield|land for|plot for|site for/.test(haystack) ||
    /\b(industrial|tech|logistics|agricultural)\s+(parcels?|sites?|land|plots?)\b/.test(haystack)
  ) {
    return { kind: "parcels", type: findParcelType(text), location: locs[0] ?? null };
  }

  // Recommendation: "where should I invest" / "best for tech" / etc.
  if (/where (should|to) (i )?invest|recommend|best (for|county|location)|most attractive|attractive for/.test(haystack)) {
    const sector: Sector = /tech|software|it|digital/.test(haystack)
      ? "tech"
      : /manufactur|industr|factor/.test(haystack)
        ? "manufacturing"
        : "general";
    return { kind: "recommendation", sector };
  }

  // Snapshot
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
    if (locs[0]) return { kind: "trend", kpi, location: locs[0], year };
  }
  if (kpi && /highest|lowest|top|best|worst|ranking|rank|which/.test(haystack)) {
    return { kind: "ranking", kpi, year };
  }
  if (kpi && locs[0]) return { kind: "lookup", kpi, location: locs[0], year };
  return { kind: "fallback" };
}

// ---------------------------------------------------------------------
// Helpers shared by response builders
// ---------------------------------------------------------------------

/**
 * Build a citation block. If a context (location, year) is provided, each
 * source gets an href deep-linking to /data with filters pre-applied so
 * the analyst can verify the underlying observation in one click.
 */
function citeSources(
  kpis: Kpi[],
  ctx?: { location?: Location | null; year?: number | null }
): AssistantBlock {
  const unique = Array.from(new Map(kpis.map((k) => [k.source + k.code, k])).values());
  return {
    kind: "citation",
    sources: unique.map((k, i) => {
      const params = new URLSearchParams();
      if (ctx?.location) params.set("location", ctx.location.sirutaCode);
      if (ctx?.year !== undefined && ctx?.year !== null) params.set("year", String(ctx.year));
      params.set("search", k.nameEn);
      const href = `/data?${params.toString()}`;
      return {
        id: i + 1,
        label: `${k.source} — ${k.nameEn}`,
        href,
      };
    }),
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
  const blocks: AssistantBlock[] = [
    { kind: "text" as const, text: `Comparing ${intent.kpi.nameEn} across ${names}.` },
    { kind: "lineChart" as const, kpiCode: intent.kpi.code, yearRange, series },
    ...(summary ? [{ kind: "text" as const, text: summary }] : []),
    citeSources([intent.kpi]),
  ];
  return blocks.filter((b) => !(b.kind === "text" && b.text === ""));
}

function lookupResponse(intent: Extract<Intent, { kind: "lookup" }>): AssistantBlock[] {
  const year = intent.year ?? getSystemYear();
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
    citeSources([intent.kpi], { location: intent.location, year }),
  ];
}

function rankingResponse(intent: Extract<Intent, { kind: "ranking" }>): AssistantBlock[] {
  const year = intent.year ?? getSystemYear();
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
 * Recommendation intent — "where should I invest in tech?". Emits an
 * interactiveRecommendation block; the renderer owns the live weight
 * sliders + recomputed ranking + map + collapsible methodology.
 */
function recommendationResponse(
  intent: Extract<Intent, { kind: "recommendation" }>
): AssistantBlock[] {
  const year = getSystemYear();
  const sectorLabel =
    intent.sector === "tech"
      ? "tech"
      : intent.sector === "manufacturing"
        ? "manufacturing"
        : "general";
  return [
    {
      kind: "text",
      text: `Composite ${sectorLabel}-investment score across NW Romania's six counties for ${year}. Adjust the weights or switch sector to pressure-test the model — the ranking and map update live. Open the methodology drawer to see per-KPI scores.`,
    },
    { kind: "interactiveRecommendation", sector: intent.sector, year },
  ];
}

/**
 * Parcels intent — "where can I build a factory?" / "industrial sites
 * in Cluj". Lists matching parcels on a real-ish NW Romania map with
 * pin colour by type, then a top-5 by composite desirability score.
 */
function parcelsResponse(intent: Extract<Intent, { kind: "parcels" }>): AssistantBlock[] {
  // Resolve the visible parcel set
  let pool = intent.type === "all" ? [...PARCELS] : parcelsByType(intent.type);
  if (intent.location) {
    const countyCode = intent.location.type === "county"
      ? intent.location.sirutaCode
      : intent.location.countyCode;
    const inCounty = parcelsInCounty(countyCode).filter((p) => pool.some((q) => q.id === p.id));
    if (inCounty.length > 0) pool = inCounty;
  }
  if (pool.length === 0) {
    return [
      {
        kind: "text",
        text: `No parcels matched the filter. Try a broader query, e.g. "show me industrial parcels".`,
      },
    ];
  }
  const typeLabel = intent.type === "all" ? "investable" : intent.type;
  const locScope = intent.location
    ? intent.location.type === "county"
      ? ` in ${intent.location.name} county`
      : ` around ${intent.location.name}`
    : "";
  return [
    {
      kind: "text",
      text: `Found ${pool.length} ${typeLabel} ${pool.length === 1 ? "parcel" : "parcels"}${locScope}. Pin colour encodes type; pin size scales with parcel area. The composite score below weights availability, price, size, and infrastructure (highway / rail / utilities).`,
    },
    {
      kind: "parcelMap",
      filterType: intent.type,
      parcelIds: pool.map((p) => p.id),
    },
    {
      kind: "text",
      text: `Click any pin for full parcel details — exact area, price, infrastructure scoring, and a description of what's on the ground. Click "Use in report" to drop a parcel summary into a dossier.`,
    },
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
  // history is consumed for referential resolution ("what about
  // Maramureș?" inherits the previous query's KPI).
  const intent = classifyIntent(text, history);
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
    case "parcels":
      return parcelsResponse(intent);
    case "dossier":
      return dossierResponse(intent);
    case "fallback":
      return fallbackResponse();
  }
}

export function summarizeIntent(text: string, history: Message[] = []): string {
  const intent = classifyIntent(text, history);
  switch (intent.kind) {
    case "trend":
      return `Analysing ${intent.kpi.nameEn.toLowerCase()} trend in ${intent.location.name}`;
    case "compare":
      return `Comparing ${intent.kpi.nameEn.toLowerCase()} across ${intent.locations.map((l) => l.name).join(", ")}`;
    case "lookup":
      return `Looking up ${intent.kpi.nameEn.toLowerCase()} for ${intent.location.name}${intent.year ? ` in ${intent.year}` : ""}`;
    case "ranking":
      return `Ranking locations by ${intent.kpi.nameEn.toLowerCase()}`;
    case "snapshot":
      return `Building snapshot for ${intent.location.name}`;
    case "recommendation":
      return `Scoring counties for ${intent.sector === "general" ? "investment" : `${intent.sector} investment`}`;
    case "parcels":
      return `Mapping ${intent.type === "all" ? "investable" : intent.type} parcels${intent.location ? ` in ${intent.location.name}` : ""}`;
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
export function followUpsFor(
  text: string,
  blocks?: AssistantBlock[],
  history: Message[] = []
): string[] {
  const intent = classifyIntent(text, history);

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
        `Show me industrial parcels${topLocName ? ` in ${topLocName}` : ""}`,
        `Where should I invest in manufacturing?`,
      ];
    case "parcels":
      return [
        intent.location
          ? `Tell me about ${intent.location.name}`
          : `Where should I invest in manufacturing?`,
        intent.type === "tech"
          ? `Show me industrial parcels`
          : `Show me tech parks`,
        `Which county has the highest wage?`,
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
    } else if (b.kind === "interactiveRecommendation")
      parts.push(
        `[Interactive recommendation: ${b.sector} sector, ${b.year}. Adjust weights in the chat to refine.]`
      );
    else if (b.kind === "parcelMap")
      parts.push(
        `[Map of ${b.parcelIds.length} ${b.filterType === "all" ? "investable" : b.filterType} parcels — see chat for details]`
      );
    else if (b.kind === "citation")
      parts.push("Sources:\n" + b.sources.map((s, i) => `[${i + 1}] ${s.label}`).join("\n"));
    else if (b.kind === "locationMap")
      parts.push(`[Map: ${b.label} — ${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}]`);
  }
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------
// Empty-state capability cards
// ---------------------------------------------------------------------

export type CapabilityCard = {
  id: string;
  icon: "trending_up" | "compare" | "trophy" | "document" | "snapshot" | "recommend" | "parcels";
  title: string;
  description: string;
  example: string;
};

export const CAPABILITIES: readonly CapabilityCard[] = [
  {
    id: "recommendation",
    icon: "recommend",
    title: "Where to invest",
    description: "Tunable composite-score across NW counties for your sector.",
    example: "Where should I invest in tech?",
  },
  {
    id: "parcels",
    icon: "parcels",
    title: "Find a parcel",
    description: "Map of investable industrial, tech, and logistics sites.",
    example: "Where can I build a factory?",
  },
  {
    id: "snapshot",
    icon: "snapshot",
    title: "Location snapshot",
    description: "One-glance multi-indicator profile with map context.",
    example: "Tell me about Cluj-Napoca",
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
];

/** Back-compat. */
export const SUGGESTED_PROMPTS: readonly string[] = CAPABILITIES.slice(0, 4).map((c) => c.example);
