# Intelligence Platform Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/reports` (Report Builder with template library + regenerate-with-diff), `/data` (filterable long-format observations table), and `/chat` (mocked agent thread with ChatGPT-style history) as high-fidelity static UI in the InnoiNVest web frontend.

**Architecture:** All data flows through `web/src/lib/mock/*` so a follow-up phase can replace those modules with real API clients without touching component code. State persists via `localStorage` with an `innoinvest:` key prefix. `@dnd-kit` handles all drag and reorder. Charts are inline SVG components (no chart library). Routes are Next.js App Router server components except where DOM interaction forces `"use client"` (drag, chat input, filters, time-travel).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4, `@dnd-kit/core` + `@dnd-kit/sortable` (new), `lucide-react` (already installed). No new test framework added — frontend has no existing test setup; verification is via `npm run build` + visual screenshots against the running dev server, matching how prior phases were validated.

**Spec:** `docs/superpowers/specs/2026-05-23-intelligence-pages-design.md`

---

## File structure

```
web/
├── package.json                      # MODIFY: add @dnd-kit packages
└── src/
    ├── app/
    │   ├── chat/page.tsx             # CREATE
    │   ├── data/page.tsx             # CREATE
    │   └── reports/
    │       ├── page.tsx              # CREATE (Builder)
    │       └── [reportId]/page.tsx   # CREATE (read-only preview)
    ├── components/
    │   ├── charts/
    │   │   ├── Sparkline.tsx         # CREATE
    │   │   └── MiniBarChart.tsx      # CREATE
    │   ├── chat/
    │   │   ├── ConversationList.tsx  # CREATE
    │   │   ├── MessageThread.tsx     # CREATE
    │   │   ├── AssistantCard.tsx     # CREATE
    │   │   ├── MessageInput.tsx      # CREATE
    │   │   └── SuggestedPrompts.tsx  # CREATE
    │   ├── data/
    │   │   ├── DataFilters.tsx       # CREATE
    │   │   ├── DataTable.tsx         # CREATE
    │   │   ├── DataRowDrawer.tsx     # CREATE
    │   │   └── exportCsv.ts          # CREATE
    │   ├── reports/
    │   │   ├── TemplateLibrary.tsx   # CREATE
    │   │   ├── VariablesPicker.tsx   # CREATE
    │   │   ├── TemplateCanvas.tsx    # CREATE
    │   │   ├── SectionBlock.tsx      # CREATE
    │   │   ├── SlotDropZone.tsx      # CREATE
    │   │   ├── LocationPicker.tsx    # CREATE
    │   │   ├── GenerateOverlay.tsx   # CREATE
    │   │   ├── ReportPreview.tsx     # CREATE
    │   │   ├── DiffBadge.tsx         # CREATE
    │   │   └── SystemClock.tsx       # CREATE
    │   └── stitch/TopNav.tsx         # MODIFY: 4 nav items
    └── lib/
        ├── mock/
        │   ├── kpis.ts               # CREATE
        │   ├── locations.ts          # CREATE
        │   ├── observations.ts       # CREATE
        │   ├── templates.ts          # CREATE
        │   └── chat.ts               # CREATE
        ├── persistence/
        │   ├── keys.ts               # CREATE
        │   └── storage.ts            # CREATE
        └── system-clock.ts           # CREATE
```

Total: 28 new files, 2 modified.

---

## Wave 0 — Dependencies & route scaffolding

### Task 1: Install `@dnd-kit` packages

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Run install (from `web/`)**

```bash
cd web && npm install @dnd-kit/core@^6 @dnd-kit/sortable@^8 @dnd-kit/utilities@^3
```

Expected output: `added 3 packages` (or "up to date" if you re-run).

- [ ] **Step 2: Verify the additions in `package.json`**

`web/package.json` `dependencies` block should now include:

```json
"@dnd-kit/core": "^6.x.x",
"@dnd-kit/sortable": "^8.x.x",
"@dnd-kit/utilities": "^3.x.x",
```

- [ ] **Step 3: Build to confirm no breakage**

```bash
cd web && npm run build
```

Expected: existing routes still build, no new errors.

- [ ] **Step 4: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "build(web): add @dnd-kit for drag-and-drop in intelligence pages"
```

---

### Task 2: Scaffold the three new routes as empty placeholders

This lets us land the nav update without 404s. Bodies will be filled in subsequent tasks.

**Files:**
- Create: `web/src/app/reports/page.tsx`
- Create: `web/src/app/data/page.tsx`
- Create: `web/src/app/chat/page.tsx`

- [ ] **Step 1: Create `web/src/app/reports/page.tsx`**

```tsx
import { TopNav } from "@/components/stitch/TopNav";

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-margin-desktop py-12">
        <h1 className="font-headline-lg text-headline-lg">Report Builder</h1>
        <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
          Coming next: template library, drag-drop variables, generate.
        </p>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create `web/src/app/data/page.tsx`**

```tsx
import { TopNav } from "@/components/stitch/TopNav";

export default function DataPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-margin-desktop py-12">
        <h1 className="font-headline-lg text-headline-lg">Data Browser</h1>
        <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
          Coming next: filtered long-format table of all observations.
        </p>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create `web/src/app/chat/page.tsx`**

```tsx
import { TopNav } from "@/components/stitch/TopNav";

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-margin-desktop py-12">
        <h1 className="font-headline-lg text-headline-lg">Chat</h1>
        <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
          Coming next: ask anything about the data.
        </p>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Build to verify routes compile**

```bash
cd web && npm run build
```

Expected: 3 new routes in the route table, all static (`○`).

- [ ] **Step 5: Commit**

```bash
git add web/src/app/reports web/src/app/data web/src/app/chat
git commit -m "feat(web): scaffold /reports, /data, /chat routes"
```

---

### Task 3: Update TopNav to include the 3 new routes

**Files:**
- Modify: `web/src/components/stitch/TopNav.tsx` (the `DEFAULT_ITEMS` constant)

- [ ] **Step 1: Replace the `DEFAULT_ITEMS` const**

Find this block (around line 35):

```ts
const DEFAULT_ITEMS: TopNavItem[] = [
  { label: "Intelligence Hub", href: "/sectors" },
  { label: "Global Benchmarks", href: "/benchmarks" },
  { label: "Team Archive", href: "/archive" },
];
```

Replace with:

```ts
const DEFAULT_ITEMS: TopNavItem[] = [
  { label: "Workspace", href: "/sectors" },
  { label: "Reports", href: "/reports" },
  { label: "Data", href: "/data" },
  { label: "Chat", href: "/chat" },
];
```

- [ ] **Step 2: Build and verify nav renders**

```bash
cd web && npm run build && npm run dev
```

Visit `http://localhost:3000/sectors` (or whichever port is auto-assigned). Click each nav item — all four routes should load and the active state should highlight correctly.

- [ ] **Step 3: Stop dev server, commit**

```bash
git add web/src/components/stitch/TopNav.tsx
git commit -m "feat(web): expand TopNav to Workspace / Reports / Data / Chat"
```

---

## Wave 1 — Mock data layer

This wave produces the data foundation that all 3 pages depend on. No UI changes, no commits land user-visible behavior — but everything downstream needs it.

### Task 4: KPI catalog

**Files:**
- Create: `web/src/lib/mock/kpis.ts`

- [ ] **Step 1: Create `web/src/lib/mock/kpis.ts`**

```ts
/**
 * Mocked KPI catalog modeled after the Python backend's config/kpis.yaml.
 * Replace with a fetch from /api/kpis when wiring the backend.
 */

export type KpiCategory =
  | "Demographics"
  | "Macro-Economy"
  | "Labor Market"
  | "Real Estate"
  | "Infrastructure"
  | "Education"
  | "Risks";

export type KpiSource = "INS Tempo" | "Eurostat" | "World Bank";

export type Kpi = {
  code: string;
  nameEn: string;
  nameRo: string;
  unit: string;
  category: KpiCategory;
  source: KpiSource;
  /** Lower bound for the seeded PRNG values in observations.ts. */
  rangeMin: number;
  /** Upper bound. */
  rangeMax: number;
  /** Whether values trend up (growth) or are stable in the mock generator. */
  trendBias: "up" | "down" | "flat";
  /** Aggregation level — affects which locations can hold this KPI. */
  level: "commune" | "county" | "region";
};

export const KPIS: readonly Kpi[] = [
  // --- Demographics ---
  { code: "pop_total", nameEn: "Total population", nameRo: "Populația totală", unit: "persons", category: "Demographics", source: "INS Tempo", rangeMin: 5_000, rangeMax: 350_000, trendBias: "flat", level: "commune" },
  { code: "active_pop", nameEn: "Working-age population (15–64)", nameRo: "Populația activă (15–64)", unit: "persons", category: "Demographics", source: "INS Tempo", rangeMin: 3_000, rangeMax: 220_000, trendBias: "flat", level: "commune" },
  { code: "pop_density", nameEn: "Population density", nameRo: "Densitatea populației", unit: "persons/km²", category: "Demographics", source: "Eurostat", rangeMin: 45, rangeMax: 1_800, trendBias: "flat", level: "county" },
  { code: "net_migration", nameEn: "Net migration rate", nameRo: "Rata netă a migrației", unit: "‰", category: "Demographics", source: "INS Tempo", rangeMin: -8, rangeMax: 12, trendBias: "up", level: "commune" },
  // --- Macro-Economy ---
  { code: "gdp_per_capita", nameEn: "GDP per capita", nameRo: "PIB pe locuitor", unit: "EUR", category: "Macro-Economy", source: "Eurostat", rangeMin: 8_000, rangeMax: 35_000, trendBias: "up", level: "county" },
  { code: "gdp_growth", nameEn: "Real GDP growth", nameRo: "Creșterea reală a PIB", unit: "%", category: "Macro-Economy", source: "Eurostat", rangeMin: -2, rangeMax: 6, trendBias: "flat", level: "county" },
  { code: "inflation_hicp", nameEn: "Inflation (HICP)", nameRo: "Inflația (HICP)", unit: "%", category: "Macro-Economy", source: "Eurostat", rangeMin: 0.5, rangeMax: 14, trendBias: "down", level: "region" },
  { code: "gdp_total", nameEn: "GDP", nameRo: "PIB total", unit: "M EUR", category: "Macro-Economy", source: "Eurostat", rangeMin: 200, rangeMax: 9_500, trendBias: "up", level: "county" },
  // --- Labor Market ---
  { code: "unemployment", nameEn: "Unemployment rate", nameRo: "Rata șomajului", unit: "%", category: "Labor Market", source: "Eurostat", rangeMin: 2, rangeMax: 11, trendBias: "down", level: "county" },
  { code: "wage_avg", nameEn: "Average gross wage", nameRo: "Salariul brut mediu", unit: "RON", category: "Labor Market", source: "INS Tempo", rangeMin: 3_800, rangeMax: 9_400, trendBias: "up", level: "county" },
  { code: "employment_rate", nameEn: "Employment rate (15–64)", nameRo: "Rata ocupării (15–64)", unit: "%", category: "Labor Market", source: "Eurostat", rangeMin: 55, rangeMax: 78, trendBias: "up", level: "county" },
  { code: "youth_unemployment", nameEn: "Youth unemployment (15–24)", nameRo: "Șomaj tineri (15–24)", unit: "%", category: "Labor Market", source: "Eurostat", rangeMin: 5, rangeMax: 28, trendBias: "down", level: "county" },
  // --- Real Estate ---
  { code: "housing_price_m2", nameEn: "Avg. residential price", nameRo: "Preț mediu rezidențial", unit: "EUR/m²", category: "Real Estate", source: "INS Tempo", rangeMin: 700, rangeMax: 3_200, trendBias: "up", level: "commune" },
  { code: "permits_issued", nameEn: "Construction permits issued", nameRo: "Autorizații de construire", unit: "count", category: "Real Estate", source: "INS Tempo", rangeMin: 5, rangeMax: 1_400, trendBias: "up", level: "commune" },
  // --- Infrastructure ---
  { code: "fiber_coverage", nameEn: "Fibre broadband coverage", nameRo: "Acoperire fibră", unit: "% households", category: "Infrastructure", source: "Eurostat", rangeMin: 30, rangeMax: 98, trendBias: "up", level: "county" },
  { code: "highway_access_km", nameEn: "Distance to nearest highway", nameRo: "Distanță până la autostradă", unit: "km", category: "Infrastructure", source: "INS Tempo", rangeMin: 0, rangeMax: 120, trendBias: "down", level: "commune" },
  // --- Education ---
  { code: "tertiary_attainment", nameEn: "Tertiary education attainment (25–64)", nameRo: "Studii superioare (25–64)", unit: "%", category: "Education", source: "Eurostat", rangeMin: 8, rangeMax: 38, trendBias: "up", level: "county" },
  { code: "student_count", nameEn: "Tertiary students enrolled", nameRo: "Studenți înscriși", unit: "persons", category: "Education", source: "INS Tempo", rangeMin: 200, rangeMax: 75_000, trendBias: "up", level: "county" },
  // --- Risks ---
  { code: "flood_risk_index", nameEn: "Flood risk index", nameRo: "Indice risc inundații", unit: "0–100", category: "Risks", source: "Eurostat", rangeMin: 5, rangeMax: 75, trendBias: "flat", level: "commune" },
  { code: "seismic_zone", nameEn: "Seismic hazard zone", nameRo: "Zonă seismică", unit: "PGA g", category: "Risks", source: "Eurostat", rangeMin: 0.08, rangeMax: 0.32, trendBias: "flat", level: "region" },
];

/** Lookup helper — returns undefined if the code isn't in the catalog. */
export function getKpi(code: string): Kpi | undefined {
  return KPIS.find((k) => k.code === code);
}

/** Group KPIs by category in a deterministic order. */
export function kpisByCategory(): ReadonlyArray<{
  category: KpiCategory;
  items: readonly Kpi[];
}> {
  const order: KpiCategory[] = [
    "Demographics",
    "Macro-Economy",
    "Labor Market",
    "Real Estate",
    "Infrastructure",
    "Education",
    "Risks",
  ];
  return order
    .map((category) => ({
      category,
      items: KPIS.filter((k) => k.category === category),
    }))
    .filter((g) => g.items.length > 0);
}

/** Format a numeric value with the KPI's unit applied. Returns "—" for nullish. */
export function formatKpiValue(value: number | null | undefined, kpi: Kpi): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const isInt = Number.isInteger(value);
  const formatted = isInt
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${formatted} ${kpi.unit}`;
}
```

- [ ] **Step 2: Verify file parses (type-check via build)**

```bash
cd web && npm run build
```

Expected: build passes; no new routes added so no route-table change.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/mock/kpis.ts
git commit -m "feat(web): KPI catalog mock (~20 indicators, 7 categories)"
```

---

### Task 5: Locations

**Files:**
- Create: `web/src/lib/mock/locations.ts`

- [ ] **Step 1: Create `web/src/lib/mock/locations.ts`**

```ts
/**
 * Mock SIRUTA locations covering the 6 ADR Nord-Vest counties + 6
 * cities/communes. Populations are real-ish for demo plausibility but
 * not authoritative. Replace with a backend fetch when wired.
 */

export type LocationType = "commune" | "city" | "county";

export type Location = {
  sirutaCode: string;
  name: string;
  type: LocationType;
  /** SIRUTA code of the containing county (self for counties). */
  countyCode: string;
  countyName: string;
  populationApprox: number;
};

export const LOCATIONS: readonly Location[] = [
  // --- Counties (NUTS3) ---
  { sirutaCode: "54", name: "Bihor", type: "county", countyCode: "54", countyName: "Bihor", populationApprox: 562_000 },
  { sirutaCode: "63", name: "Bistrița-Năsăud", type: "county", countyCode: "63", countyName: "Bistrița-Năsăud", populationApprox: 285_000 },
  { sirutaCode: "120", name: "Cluj", type: "county", countyCode: "120", countyName: "Cluj", populationApprox: 691_000 },
  { sirutaCode: "275", name: "Maramureș", type: "county", countyCode: "275", countyName: "Maramureș", populationApprox: 460_000 },
  { sirutaCode: "393", name: "Satu Mare", type: "county", countyCode: "393", countyName: "Satu Mare", populationApprox: 332_000 },
  { sirutaCode: "402", name: "Sălaj", type: "county", countyCode: "402", countyName: "Sălaj", populationApprox: 213_000 },

  // --- Cities ---
  { sirutaCode: "55039", name: "Oradea", type: "city", countyCode: "54", countyName: "Bihor", populationApprox: 196_000 },
  { sirutaCode: "63956", name: "Bistrița", type: "city", countyCode: "63", countyName: "Bistrița-Năsăud", populationApprox: 75_000 },
  { sirutaCode: "54975", name: "Cluj-Napoca", type: "city", countyCode: "120", countyName: "Cluj", populationApprox: 286_000 },
  { sirutaCode: "106572", name: "Baia Mare", type: "city", countyCode: "275", countyName: "Maramureș", populationApprox: 108_000 },
  { sirutaCode: "136942", name: "Satu Mare", type: "city", countyCode: "393", countyName: "Satu Mare", populationApprox: 92_000 },
  { sirutaCode: "139029", name: "Zalău", type: "city", countyCode: "402", countyName: "Sălaj", populationApprox: 56_000 },

  // --- Communes (selected) ---
  { sirutaCode: "57706", name: "Florești", type: "commune", countyCode: "120", countyName: "Cluj", populationApprox: 52_000 },
];

export function getLocation(siruta: string): Location | undefined {
  return LOCATIONS.find((l) => l.sirutaCode === siruta);
}

export function locationsByCounty(): ReadonlyArray<{
  county: string;
  items: readonly Location[];
}> {
  const counties = Array.from(new Set(LOCATIONS.map((l) => l.countyName))).sort();
  return counties.map((county) => ({
    county,
    items: LOCATIONS.filter((l) => l.countyName === county).sort((a, b) => {
      const order = { county: 0, city: 1, commune: 2 } as const;
      if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
      return a.name.localeCompare(b.name);
    }),
  }));
}
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/mock/locations.ts
git commit -m "feat(web): mock SIRUTA locations (6 counties + 6 cities + Florești)"
```

---

### Task 6: Observations with seeded PRNG

This is the most important mock module — it generates the time series that every other page reads from. Determinism matters (same value every reload).

**Files:**
- Create: `web/src/lib/mock/observations.ts`

- [ ] **Step 1: Create `web/src/lib/mock/observations.ts`**

```ts
/**
 * Deterministically-generated time series for every (location, kpi)
 * pair that satisfies the KPI's aggregation level. Years 2018–2027 are
 * pre-computed so the time-travel control in /reports has data to land
 * on. PRNG is a deterministic xmur3 + mulberry32 pair seeded with a
 * stable string derived from (sirutaCode, kpiCode) — that gives stable
 * values across reloads and across browsers.
 */

import { KPIS, type Kpi } from "./kpis";
import { LOCATIONS, type Location } from "./locations";

export type Observation = {
  locationSiruta: string;
  kpiCode: string;
  year: number;
  value: number;
  /** ISO date the value was "fetched". Cosmetic. */
  fetchedAt: string;
};

const YEAR_FROM = 2018;
const YEAR_TO = 2027;

// --- PRNG --------------------------------------------------------------

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRng(seed: string): () => number {
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
}

// --- Eligibility -------------------------------------------------------

function isEligible(loc: Location, kpi: Kpi): boolean {
  if (kpi.level === "region") return true; // every location can show region-level KPIs
  if (kpi.level === "county") return loc.type === "county" || loc.type === "city" || loc.type === "commune";
  // commune-level: only commune & city
  return loc.type === "commune" || loc.type === "city";
}

// --- Series generator --------------------------------------------------

function generateSeries(loc: Location, kpi: Kpi): number[] {
  const rng = seededRng(`${loc.sirutaCode}|${kpi.code}`);
  // Anchor value somewhere in the KPI's range, biased by population for
  // count-style metrics so cities don't have communes' values.
  const isPopulationScaled = kpi.unit === "persons" || kpi.unit === "count";
  let anchor: number;
  if (isPopulationScaled) {
    const popFactor = loc.populationApprox / 50_000; // 1.0 ~= a mid-size city
    anchor = kpi.rangeMin + (kpi.rangeMax - kpi.rangeMin) * Math.min(1, popFactor * 0.4) * (0.7 + rng() * 0.3);
  } else {
    anchor = kpi.rangeMin + (kpi.rangeMax - kpi.rangeMin) * (0.3 + rng() * 0.5);
  }

  const years = YEAR_TO - YEAR_FROM + 1;
  const out: number[] = [];
  let value = anchor;
  for (let i = 0; i < years; i++) {
    const noise = (rng() - 0.5) * 0.06; // ±3% jitter
    const trend =
      kpi.trendBias === "up" ? 0.025 + rng() * 0.03 :
      kpi.trendBias === "down" ? -(0.015 + rng() * 0.02) :
      (rng() - 0.5) * 0.02;
    value = value * (1 + trend + noise);
    // clamp into range so we don't drift outside the rangeMin/rangeMax envelope
    value = Math.min(kpi.rangeMax, Math.max(kpi.rangeMin, value));
    out.push(Number(value.toFixed(value < 100 ? 2 : 0)));
  }
  return out;
}

// --- Build observation array -------------------------------------------

const RESULT: Observation[] = (() => {
  const rows: Observation[] = [];
  for (const loc of LOCATIONS) {
    for (const kpi of KPIS) {
      if (!isEligible(loc, kpi)) continue;
      const series = generateSeries(loc, kpi);
      for (let y = YEAR_FROM; y <= YEAR_TO; y++) {
        const value = series[y - YEAR_FROM];
        rows.push({
          locationSiruta: loc.sirutaCode,
          kpiCode: kpi.code,
          year: y,
          value,
          fetchedAt: `${y}-12-31`,
        });
      }
    }
  }
  return rows;
})();

export const OBSERVATIONS: readonly Observation[] = RESULT;

/** All observations for a single (location, kpi). Ordered by year asc. */
export function getSeries(siruta: string, kpiCode: string): Observation[] {
  return RESULT.filter((o) => o.locationSiruta === siruta && o.kpiCode === kpiCode);
}

/** Single observation for a (location, kpi, year). */
export function getObservation(
  siruta: string,
  kpiCode: string,
  year: number
): Observation | undefined {
  return RESULT.find(
    (o) => o.locationSiruta === siruta && o.kpiCode === kpiCode && o.year === year
  );
}

/** Year range covered. Useful for filter dropdowns and time-travel UI. */
export const YEARS_AVAILABLE: readonly number[] = Array.from(
  { length: YEAR_TO - YEAR_FROM + 1 },
  (_, i) => YEAR_FROM + i
);
```

- [ ] **Step 2: Sanity check via a quick eval in the running dev server**

Start dev if not running (`cd web && npm run dev`), open any page, then in the browser console:

```js
const obs = await import("/_next/static/chunks/...");  // won't work — observe via the file path instead
```

Instead, just verify via build:

```bash
cd web && npm run build
```

Expected: build passes (no compile errors).

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/mock/observations.ts
git commit -m "feat(web): deterministic observations PRNG (10y × 13 loc × 20 kpi)"
```

---

### Task 7: Persistence helpers

**Files:**
- Create: `web/src/lib/persistence/keys.ts`
- Create: `web/src/lib/persistence/storage.ts`

- [ ] **Step 1: Create `web/src/lib/persistence/keys.ts`**

```ts
/**
 * Centralised localStorage key names. All app keys MUST go through here
 * so we never collide with another app on the same origin and so a
 * future "reset everything" button can iterate this object.
 */

export const STORAGE_KEYS = {
  templates: "innoinvest:templates",
  reports: "innoinvest:reports",
  chats: "innoinvest:chats",
  activeChat: "innoinvest:active-chat",
  dataColumnOrder: "innoinvest:data-column-order",
  systemYear: "innoinvest:system-year",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
```

- [ ] **Step 2: Create `web/src/lib/persistence/storage.ts`**

```ts
/**
 * Typed wrapper over localStorage. Safe to call from server components
 * (returns the fallback) and from event handlers. JSON-encoded values
 * only — if a key needs raw strings, use localStorage directly.
 */

import { type StorageKey } from "./keys";

export function readStorage<T>(key: StorageKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: StorageKey, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / serialisation failure — silently drop. Persistence
    // is a nice-to-have for the demo, not load-bearing.
  }
}

export function clearStorage(key: StorageKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}
```

- [ ] **Step 3: Verify**

```bash
cd web && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/persistence
git commit -m "feat(web): typed localStorage wrapper with namespaced keys"
```

---

### Task 8: System clock (time-travel control)

**Files:**
- Create: `web/src/lib/system-clock.ts`

- [ ] **Step 1: Create `web/src/lib/system-clock.ts`**

```ts
/**
 * Demo "system year" that controls which observations are considered
 * current. Used by /reports to power the regenerate-with-fresh-data
 * workflow without a real backend.
 *
 * The default is 2024 (matches the seeded narrative); 2025–2027 are
 * available via the SystemClock UI. Persisted in localStorage so the
 * demo state survives reloads.
 */

import { readStorage, writeStorage } from "./persistence/storage";
import { STORAGE_KEYS } from "./persistence/keys";
import { YEARS_AVAILABLE } from "./mock/observations";

export const DEFAULT_SYSTEM_YEAR = 2024;

export function getSystemYear(): number {
  const stored = readStorage<number>(STORAGE_KEYS.systemYear, DEFAULT_SYSTEM_YEAR);
  if (YEARS_AVAILABLE.includes(stored)) return stored;
  return DEFAULT_SYSTEM_YEAR;
}

export function setSystemYear(year: number): void {
  if (!YEARS_AVAILABLE.includes(year)) return;
  writeStorage(STORAGE_KEYS.systemYear, year);
}

/** Years the user can jump to in the UI (current and future only). */
export function selectableYears(now: number = DEFAULT_SYSTEM_YEAR): number[] {
  return YEARS_AVAILABLE.filter((y) => y >= now);
}
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/system-clock.ts
git commit -m "feat(web): system-clock helper for demo time-travel"
```

---

## Wave 2 — Shared UI primitives

### Task 9: Sparkline chart

**Files:**
- Create: `web/src/components/charts/Sparkline.tsx`

- [ ] **Step 1: Create `web/src/components/charts/Sparkline.tsx`**

```tsx
/**
 * Lightweight inline-SVG sparkline. No chart library — values are small
 * (typically ≤10 points), styling needs to match brand tokens
 * (--color-primary, etc.), and we don't need axes or tooltips for the
 * report and chat usage.
 */

type Props = {
  values: readonly number[];
  width?: number;
  height?: number;
  /** Tailwind color class for the stroke (defaults to brand teal). */
  strokeClassName?: string;
  /** Tailwind color class for the area fill (defaults to faint primary). */
  fillClassName?: string;
  strokeWidth?: number;
  ariaLabel?: string;
};

export function Sparkline({
  values,
  width = 160,
  height = 40,
  strokeClassName = "stroke-primary",
  fillClassName = "fill-primary/15",
  strokeWidth = 1.5,
  ariaLabel,
}: Props) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          className="stroke-border-subtle"
          strokeWidth={1}
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : "true"}
    >
      <path d={areaPath} className={fillClassName} />
      <path
        d={linePath}
        className={strokeClassName}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/charts/Sparkline.tsx
git commit -m "feat(web): inline-SVG Sparkline component"
```

---

### Task 10: MiniBarChart

**Files:**
- Create: `web/src/components/charts/MiniBarChart.tsx`

- [ ] **Step 1: Create `web/src/components/charts/MiniBarChart.tsx`**

```tsx
/**
 * Small grouped bar chart — used in chat answers and in the report
 * builder's appendix comparison block. Renders 2–8 bars; for richer
 * charts later, swap to Recharts.
 */

type Bar = {
  label: string;
  value: number;
  /** Optional override of bar color tone. */
  tone?: "primary" | "secondary" | "muted" | "error";
};

type Props = {
  bars: readonly Bar[];
  width?: number;
  height?: number;
  ariaLabel?: string;
};

const TONE_CLASS: Record<NonNullable<Bar["tone"]>, string> = {
  primary: "fill-primary",
  secondary: "fill-secondary",
  muted: "fill-on-surface-variant/40",
  error: "fill-error",
};

export function MiniBarChart({
  bars,
  width = 320,
  height = 140,
  ariaLabel,
}: Props) {
  if (bars.length === 0) return null;
  const max = Math.max(...bars.map((b) => Math.abs(b.value)));
  const padTop = 18;
  const padBottom = 24;
  const padX = 8;
  const drawArea = height - padTop - padBottom;
  const barGap = 8;
  const barWidth = (width - padX * 2 - barGap * (bars.length - 1)) / bars.length;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      {bars.map((b, i) => {
        const h = max === 0 ? 0 : (Math.abs(b.value) / max) * drawArea;
        const x = padX + i * (barWidth + barGap);
        const y = padTop + (drawArea - h);
        const toneClass = TONE_CLASS[b.tone ?? "primary"];
        return (
          <g key={b.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={2}
              className={toneClass}
            />
            <text
              x={x + barWidth / 2}
              y={padTop - 4}
              textAnchor="middle"
              className="fill-on-surface text-[10px] font-semibold"
            >
              {b.value.toLocaleString("en-US", { maximumFractionDigits: 1 })}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              className="fill-on-surface-variant text-[10px]"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/charts/MiniBarChart.tsx
git commit -m "feat(web): inline-SVG MiniBarChart component"
```

---

## Wave 3 — Reports page

### Task 11: Templates mock + types

**Files:**
- Create: `web/src/lib/mock/templates.ts`

- [ ] **Step 1: Create `web/src/lib/mock/templates.ts`**

```ts
/**
 * Report template data model + the seeded "Standard ADR Commune
 * Dossier" template. User templates live in localStorage; the seeded
 * one ships in code (always available, can be cloned but not deleted).
 */

import { type KpiCategory } from "./kpis";

export type SectionKind =
  | "cover"
  | "executive_summary"
  | "demographics"
  | "macro_economy"
  | "labor_market"
  | "real_estate"
  | "risks"
  | "appendix";

export type SlotKind = "headline" | "chart" | "table" | "prose" | "location" | "date";

export type SectionSlot = {
  id: string;
  kind: SlotKind;
  label: string;
  /** Bound KPI code(s). Empty until the user drops a variable. */
  kpiCodes: string[];
  /** For category-constrained sections, which category accepts drops. */
  acceptsCategory?: KpiCategory;
};

export type SectionConfig = {
  id: string;
  kind: SectionKind;
  title: string;
  slots: SectionSlot[];
};

export type ReportTemplate = {
  id: string;
  name: string;
  /** Locale-tagged description. */
  description: string;
  /** "seed" = ships in code (read-only); "user" = saved by user. */
  origin: "seed" | "user";
  sections: SectionConfig[];
  createdAt: number;
  updatedAt: number;
};

/**
 * Factory for a fresh "Standard ADR Commune Dossier" template.
 * Used both as a seed and as the starting point for "+ New".
 */
export function createStandardTemplate(): ReportTemplate {
  const now = Date.now();
  return {
    id: "seed-standard-adr",
    origin: "seed",
    name: "Standard ADR Commune Dossier",
    description:
      "Baseline 8-section investment dossier covering demographics, macro-economy, labor, real estate, and risks.",
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: "cover",
        kind: "cover",
        title: "Cover",
        slots: [
          { id: "cover-loc", kind: "location", label: "Location", kpiCodes: [] },
          { id: "cover-date", kind: "date", label: "Date issued", kpiCodes: [] },
        ],
      },
      {
        id: "summary",
        kind: "executive_summary",
        title: "Executive Summary",
        slots: [
          { id: "summary-headline", kind: "headline", label: "Headline metric", kpiCodes: [] },
          { id: "summary-trend", kind: "chart", label: "Trend chart", kpiCodes: [] },
          { id: "summary-prose", kind: "prose", label: "Narrative", kpiCodes: [] },
        ],
      },
      {
        id: "demographics",
        kind: "demographics",
        title: "Demographics",
        slots: [
          { id: "demo-chart", kind: "chart", label: "Population trend", kpiCodes: [], acceptsCategory: "Demographics" },
          { id: "demo-table", kind: "table", label: "Demographic indicators", kpiCodes: [], acceptsCategory: "Demographics" },
        ],
      },
      {
        id: "macro",
        kind: "macro_economy",
        title: "Macro-Economy",
        slots: [
          { id: "macro-chart", kind: "chart", label: "GDP trend", kpiCodes: [], acceptsCategory: "Macro-Economy" },
          { id: "macro-table", kind: "table", label: "Macro indicators", kpiCodes: [], acceptsCategory: "Macro-Economy" },
        ],
      },
      {
        id: "labor",
        kind: "labor_market",
        title: "Labor Market",
        slots: [
          { id: "labor-chart", kind: "chart", label: "Employment trend", kpiCodes: [], acceptsCategory: "Labor Market" },
          { id: "labor-table", kind: "table", label: "Labor indicators", kpiCodes: [], acceptsCategory: "Labor Market" },
        ],
      },
      {
        id: "real-estate",
        kind: "real_estate",
        title: "Real Estate",
        slots: [
          { id: "re-chart", kind: "chart", label: "Price trend", kpiCodes: [], acceptsCategory: "Real Estate" },
          { id: "re-table", kind: "table", label: "Real estate indicators", kpiCodes: [], acceptsCategory: "Real Estate" },
        ],
      },
      {
        id: "risks",
        kind: "risks",
        title: "Risks",
        slots: [{ id: "risks-prose", kind: "prose", label: "Risk narrative", kpiCodes: [] }],
      },
      {
        id: "appendix",
        kind: "appendix",
        title: "Appendix",
        slots: [{ id: "appendix-table", kind: "table", label: "Full indicator table", kpiCodes: [] }],
      },
    ],
  };
}

export const SEED_TEMPLATES: readonly ReportTemplate[] = [createStandardTemplate()];

/** Generated reports — one per (templateId, locationId, generation event). */
export type GeneratedReport = {
  id: string;
  templateId: string;
  templateName: string;
  locationSiruta: string;
  locationName: string;
  generatedAt: number;
  /** Year the system was on when this was generated. */
  systemYear: number;
  /** Snapshot of {kpiCode: value} for the report's selected year. */
  snapshot: Record<string, number>;
  /** Previous report id this regenerated from (if any). */
  parentReportId?: string;
};
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/mock/templates.ts
git commit -m "feat(web): report template + generated-report types, seeded ADR template"
```

---

### Task 12: Reports page layout shell

**Files:**
- Modify: `web/src/app/reports/page.tsx` (replace placeholder with 3-column shell)

- [ ] **Step 1: Replace the entire file with the layout shell**

```tsx
"use client";

import { useState } from "react";
import { TopNav } from "@/components/stitch/TopNav";
import { TemplateLibrary } from "@/components/reports/TemplateLibrary";
import { TemplateCanvas } from "@/components/reports/TemplateCanvas";
import { VariablesPicker } from "@/components/reports/VariablesPicker";
import { SystemClock } from "@/components/reports/SystemClock";
import { createStandardTemplate, type ReportTemplate } from "@/lib/mock/templates";

export default function ReportsPage() {
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate>(
    createStandardTemplate()
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[16rem_1fr_18rem]">
        <aside className="hidden border-r border-border-subtle bg-surface lg:block">
          <TemplateLibrary
            activeId={activeTemplate.id}
            onSelect={setActiveTemplate}
          />
        </aside>
        <main className="min-w-0 overflow-y-auto bg-background px-6 py-8">
          <TemplateCanvas
            template={activeTemplate}
            onChange={setActiveTemplate}
          />
        </main>
        <aside className="hidden border-l border-border-subtle bg-surface lg:block">
          <VariablesPicker />
        </aside>
      </div>
      <SystemClock />
    </div>
  );
}
```

- [ ] **Step 2: Verify build (will fail until child components exist)**

```bash
cd web && npm run build
```

Expected: Compile error for missing imports. That's OK — the next tasks add them.

- [ ] **Step 3: Don't commit yet — wait until child components exist**

---

### Task 13: TemplateLibrary sidebar

**Files:**
- Create: `web/src/components/reports/TemplateLibrary.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  SEED_TEMPLATES,
  createStandardTemplate,
  type GeneratedReport,
  type ReportTemplate,
} from "@/lib/mock/templates";

type Props = {
  activeId: string;
  onSelect: (template: ReportTemplate) => void;
};

export function TemplateLibrary({ activeId, onSelect }: Props) {
  const [userTemplates, setUserTemplates] = useState<ReportTemplate[]>([]);
  const [recent, setRecent] = useState<GeneratedReport[]>([]);

  useEffect(() => {
    setUserTemplates(readStorage<ReportTemplate[]>(STORAGE_KEYS.templates, []));
    setRecent(readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []));
  }, []);

  function handleNew() {
    const seed = createStandardTemplate();
    const fresh: ReportTemplate = {
      ...seed,
      id: `user-${Date.now()}`,
      origin: "user",
      name: "Untitled template",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [...userTemplates, fresh];
    setUserTemplates(next);
    writeStorage(STORAGE_KEYS.templates, next);
    onSelect(fresh);
  }

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4" aria-label="Template library">
      <section>
        <h2 className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
          Mine
        </h2>
        <ul className="space-y-1">
          {userTemplates.length === 0 && (
            <li className="font-body-sm text-body-sm text-on-surface-variant/70">
              No saved templates yet.
            </li>
          )}
          {userTemplates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                aria-current={activeId === t.id ? "true" : undefined}
                className={
                  activeId === t.id
                    ? "font-body-sm text-body-sm w-full rounded bg-primary/10 px-3 py-2 text-left font-semibold text-primary-deep"
                    : "font-body-sm text-body-sm w-full rounded px-3 py-2 text-left text-on-surface transition-colors hover:bg-surface-muted"
                }
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleNew}
          className="font-label-md text-label-md mt-3 inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-1.5 text-on-surface-variant transition-colors hover:border-outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          <Plus size={14} /> New template
        </button>
      </section>

      <section>
        <h2 className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
          Shared
        </h2>
        <ul className="space-y-1">
          {SEED_TEMPLATES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                aria-current={activeId === t.id ? "true" : undefined}
                className={
                  activeId === t.id
                    ? "font-body-sm text-body-sm w-full rounded bg-primary/10 px-3 py-2 text-left font-semibold text-primary-deep"
                    : "font-body-sm text-body-sm w-full rounded px-3 py-2 text-left text-on-surface transition-colors hover:bg-surface-muted"
                }
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
          Recent generated
        </h2>
        <ul className="space-y-1">
          {recent.length === 0 && (
            <li className="font-body-sm text-body-sm text-on-surface-variant/70">
              No reports generated yet.
            </li>
          )}
          {recent.slice(0, 8).map((r) => (
            <li key={r.id}>
              <a
                href={`/reports/${r.id}`}
                className="font-body-sm text-body-sm block rounded px-3 py-2 text-on-surface transition-colors hover:bg-surface-muted"
              >
                <span className="block font-medium">{r.locationName}</span>
                <span className="text-xs text-on-surface-variant">
                  {new Date(r.generatedAt).toLocaleDateString()}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </nav>
  );
}
```

- [ ] **Step 2: Don't build yet — Canvas + Picker still missing**

---

### Task 14: VariablesPicker sidebar

**Files:**
- Create: `web/src/components/reports/VariablesPicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useMemo, useState } from "react";
import { GripVertical, Search } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { kpisByCategory, type Kpi } from "@/lib/mock/kpis";

function DraggableKpi({ kpi }: { kpi: Kpi }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `kpi:${kpi.code}`,
    data: { kind: "kpi", kpi },
  });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={
        isDragging
          ? "flex cursor-grabbing items-start gap-2 rounded border border-primary bg-primary/5 p-2 opacity-60"
          : "flex cursor-grab items-start gap-2 rounded border border-transparent p-2 transition-colors hover:border-border-subtle hover:bg-surface-muted"
      }
    >
      <GripVertical size={14} className="mt-0.5 shrink-0 text-on-surface-variant/60" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-body-sm text-body-sm truncate font-medium text-on-surface">{kpi.nameEn}</p>
        <p className="font-label-md text-label-md text-on-surface-variant">{kpi.unit}</p>
      </div>
    </li>
  );
}

export function VariablesPicker() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const all = kpisByCategory();
    if (q.length < 2) return all;
    const needle = q.toLowerCase();
    return all
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (k) =>
            k.nameEn.toLowerCase().includes(needle) ||
            k.nameRo.toLowerCase().includes(needle) ||
            k.code.toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <label className="flex items-center gap-2 rounded border border-border-subtle bg-surface-muted px-3 py-1.5 focus-within:border-primary">
        <Search size={14} className="text-on-surface-variant" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search variables…"
          className="font-body-sm w-full border-none bg-transparent text-sm focus:outline-none"
        />
      </label>

      <div className="mt-4 space-y-5">
        {groups.map((g) => (
          <section key={g.category} aria-labelledby={`grp-${g.category}`}>
            <h3
              id={`grp-${g.category}`}
              className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant"
            >
              {g.category}
            </h3>
            <ul className="space-y-1">
              {g.items.map((k) => (
                <DraggableKpi key={k.code} kpi={k} />
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant/70">
            No variables match &ldquo;{q}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Don't build yet — Canvas + DnD context still missing**

---

### Task 15: SlotDropZone + SectionBlock

**Files:**
- Create: `web/src/components/reports/SlotDropZone.tsx`
- Create: `web/src/components/reports/SectionBlock.tsx`

- [ ] **Step 1: Create `SlotDropZone.tsx`**

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { getKpi } from "@/lib/mock/kpis";
import { type SectionSlot } from "@/lib/mock/templates";

type Props = {
  slot: SectionSlot;
  onClear: () => void;
};

export function SlotDropZone({ slot, onClear }: Props) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot:${slot.id}`,
    data: { kind: "slot", slot },
  });

  // Determine whether the active drag is valid for this slot.
  const draggedKpi = active?.data.current?.kind === "kpi" ? active.data.current.kpi : null;
  const invalid =
    draggedKpi !== null &&
    slot.acceptsCategory !== undefined &&
    draggedKpi.category !== slot.acceptsCategory;
  const validHover = isOver && !invalid;
  const invalidHover = isOver && invalid;

  const filled = slot.kpiCodes.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={
        validHover
          ? "rounded border-2 border-dashed border-primary bg-primary/5 p-3 transition-colors"
          : invalidHover
            ? "rounded border-2 border-dashed border-error bg-error/5 p-3 transition-colors"
            : filled
              ? "rounded border border-border-subtle bg-surface-container-lowest p-3"
              : "rounded border-2 border-dashed border-border-subtle p-3 text-on-surface-variant"
      }
    >
      <div className="flex items-center justify-between">
        <p className="font-label-md text-label-md uppercase tracking-wider">
          {slot.label}
          {slot.acceptsCategory && (
            <span className="ml-2 normal-case tracking-normal text-on-surface-variant/70">
              · {slot.acceptsCategory}
            </span>
          )}
        </p>
        {filled && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-on-surface-variant hover:text-error"
            aria-label="Clear this slot"
          >
            Clear
          </button>
        )}
      </div>

      {filled ? (
        <ul className="mt-2 space-y-1">
          {slot.kpiCodes.map((code) => {
            const kpi = getKpi(code);
            return (
              <li
                key={code}
                className="font-body-sm text-body-sm flex items-baseline justify-between gap-3 text-on-surface"
              >
                <span className="font-medium">{kpi?.nameEn ?? code}</span>
                <span className="text-on-surface-variant">{kpi?.unit ?? ""}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-body-sm text-body-sm mt-2 flex items-center gap-2">
          <Plus size={14} aria-hidden="true" />
          Drop a variable here
        </p>
      )}

      {invalidHover && (
        <p className="font-label-md text-label-md mt-2 text-error">
          {`This slot accepts only ${slot.acceptsCategory} variables.`}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `SectionBlock.tsx`**

```tsx
"use client";

import { SlotDropZone } from "./SlotDropZone";
import { type SectionConfig } from "@/lib/mock/templates";

type Props = {
  section: SectionConfig;
  onClearSlot: (slotId: string) => void;
};

export function SectionBlock({ section, onClearSlot }: Props) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{section.title}</h2>
        <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {section.kind.replace("_", " ")}
        </span>
      </header>
      <div className="space-y-3">
        {section.slots.map((slot) => (
          <SlotDropZone key={slot.id} slot={slot} onClear={() => onClearSlot(slot.id)} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Don't build yet — Canvas still missing**

---

### Task 16: TemplateCanvas + drag-drop wiring

**Files:**
- Create: `web/src/components/reports/TemplateCanvas.tsx`

- [ ] **Step 1: Create the canvas with DnD context, drop handling, and a stub for Generate**

```tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SectionBlock } from "./SectionBlock";
import { LocationPicker } from "./LocationPicker";
import { GenerateOverlay } from "./GenerateOverlay";
import { ReportPreview } from "./ReportPreview";
import { type Kpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { writeStorage, readStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { getSystemYear } from "@/lib/system-clock";
import { getObservation } from "@/lib/mock/observations";
import {
  type GeneratedReport,
  type ReportTemplate,
} from "@/lib/mock/templates";

type Props = {
  template: ReportTemplate;
  onChange: (next: ReportTemplate) => void;
};

export function TemplateCanvas({ template, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const [locationSiruta, setLocationSiruta] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.data.current?.kind !== "kpi" || over.data.current?.kind !== "slot") return;

    const kpi: Kpi = active.data.current.kpi;
    const slotId: string = over.data.current.slot.id;

    // Validate category fit (defence in depth — SlotDropZone already shows red)
    const targetSlot = template.sections
      .flatMap((s) => s.slots)
      .find((s) => s.id === slotId);
    if (!targetSlot) return;
    if (targetSlot.acceptsCategory && targetSlot.acceptsCategory !== kpi.category) return;

    const next: ReportTemplate = {
      ...template,
      updatedAt: Date.now(),
      sections: template.sections.map((s) => ({
        ...s,
        slots: s.slots.map((slot) =>
          slot.id === slotId
            ? {
                ...slot,
                kpiCodes:
                  slot.kind === "table"
                    ? Array.from(new Set([...slot.kpiCodes, kpi.code])).slice(0, 4)
                    : [kpi.code],
              }
            : slot
        ),
      })),
    };
    onChange(next);
  }

  function handleClearSlot(slotId: string) {
    const next: ReportTemplate = {
      ...template,
      updatedAt: Date.now(),
      sections: template.sections.map((s) => ({
        ...s,
        slots: s.slots.map((slot) =>
          slot.id === slotId ? { ...slot, kpiCodes: [] } : slot
        ),
      })),
    };
    onChange(next);
  }

  function handleSaveTemplate() {
    if (template.origin !== "user") return;
    const all = readStorage<ReportTemplate[]>(STORAGE_KEYS.templates, []);
    const updated = all.some((t) => t.id === template.id)
      ? all.map((t) => (t.id === template.id ? template : t))
      : [...all, template];
    writeStorage(STORAGE_KEYS.templates, updated);
  }

  function handleGenerate() {
    if (!locationSiruta) {
      alert("Pick a location first.");
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      const loc = getLocation(locationSiruta)!;
      const systemYear = getSystemYear();
      const snapshot: Record<string, number> = {};
      for (const section of template.sections) {
        for (const slot of section.slots) {
          for (const code of slot.kpiCodes) {
            const obs = getObservation(loc.sirutaCode, code, systemYear);
            if (obs) snapshot[code] = obs.value;
          }
        }
      }
      const report: GeneratedReport = {
        id: `report-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        locationSiruta: loc.sirutaCode,
        locationName: loc.name,
        generatedAt: Date.now(),
        systemYear,
        snapshot,
      };
      const all = readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []);
      writeStorage(STORAGE_KEYS.reports, [report, ...all].slice(0, 50));
      setGeneratedReport(report);
      setGenerating(false);
    }, 800);
  }

  if (generatedReport) {
    return (
      <ReportPreview
        report={generatedReport}
        template={template}
        onBack={() => setGeneratedReport(null)}
      />
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="mx-auto max-w-[880px] space-y-6">
        <header className="flex items-baseline justify-between">
          <div>
            <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
              {template.origin === "user" ? "MY TEMPLATE" : "SHARED TEMPLATE"}
            </p>
            <h1 className="font-headline-lg text-headline-lg mt-1 text-on-surface">
              {template.name}
            </h1>
          </div>
          {template.origin === "user" && (
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="font-label-md text-label-md rounded border border-border-subtle px-3 py-1.5 transition-colors hover:border-primary"
            >
              Save template
            </button>
          )}
        </header>

        {template.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            onClearSlot={handleClearSlot}
          />
        ))}

        <footer className="sticky bottom-12 z-10 flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface p-3 shadow-sm">
          <LocationPicker value={locationSiruta} onChange={setLocationSiruta} />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="font-label-md text-label-md rounded bg-primary px-5 py-2 text-on-primary transition-colors hover:bg-primary-deep disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            {generating ? "Compiling…" : "Generate"}
          </button>
        </footer>
      </div>
      <GenerateOverlay visible={generating} />
    </DndContext>
  );
}
```

- [ ] **Step 2: Don't build yet — LocationPicker, GenerateOverlay, ReportPreview still missing**

---

### Task 17: LocationPicker

**Files:**
- Create: `web/src/components/reports/LocationPicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { MapPin } from "lucide-react";
import { locationsByCounty } from "@/lib/mock/locations";

type Props = {
  value: string;
  onChange: (siruta: string) => void;
};

export function LocationPicker({ value, onChange }: Props) {
  const groups = locationsByCounty();
  return (
    <label className="flex flex-1 items-center gap-2 rounded border border-border-subtle bg-surface-muted px-3 py-2 focus-within:border-primary">
      <MapPin size={16} className="text-on-surface-variant" />
      <span className="sr-only">Target location</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-body-sm w-full border-none bg-transparent text-on-surface focus:outline-none"
      >
        <option value="">Select a location…</option>
        {groups.map((g) => (
          <optgroup key={g.county} label={g.county}>
            {g.items.map((loc) => (
              <option key={loc.sirutaCode} value={loc.sirutaCode}>
                {loc.name} {loc.type !== "county" && `(${loc.type})`}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Don't build yet**

---

### Task 18: GenerateOverlay

**Files:**
- Create: `web/src/components/reports/GenerateOverlay.tsx`

- [ ] **Step 1: Create the overlay**

```tsx
"use client";

import { useEffect, useState } from "react";

const SOURCES = [
  "Eurostat regional accounts…",
  "INS Tempo POP107D…",
  "Eurostat labour force survey…",
  "INS Tempo CON113A…",
  "Eurostat HICP series…",
  "INS Tempo wage census…",
];

type Props = { visible: boolean };

export function GenerateOverlay({ visible }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SOURCES.length), 140);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur">
      <div className="rounded-lg border border-border-subtle bg-surface px-8 py-6 shadow-lg">
        <p className="font-headline-sm text-headline-sm mb-2 text-on-surface">Compiling sources…</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{SOURCES[idx]}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Don't build yet**

---

### Task 19: ReportPreview + DiffBadge

**Files:**
- Create: `web/src/components/reports/DiffBadge.tsx`
- Create: `web/src/components/reports/ReportPreview.tsx`

- [ ] **Step 1: Create `DiffBadge.tsx`**

```tsx
type Props = {
  previous: number | undefined;
  current: number;
};

export function DiffBadge({ previous, current }: Props) {
  if (previous === undefined || previous === current) return null;
  const delta = current - previous;
  const pct = (delta / previous) * 100;
  const isUp = delta > 0;
  return (
    <span
      className={
        isUp
          ? "font-label-md text-label-md ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-primary-deep"
          : "font-label-md text-label-md ml-2 rounded bg-error/10 px-1.5 py-0.5 text-error"
      }
    >
      {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
```

- [ ] **Step 2: Create `ReportPreview.tsx`**

```tsx
"use client";

import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { DiffBadge } from "./DiffBadge";
import { getKpi, formatKpiValue } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { getSeries, getObservation } from "@/lib/mock/observations";
import { getSystemYear } from "@/lib/system-clock";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  type GeneratedReport,
  type ReportTemplate,
} from "@/lib/mock/templates";

type Props = {
  report: GeneratedReport;
  template: ReportTemplate;
  onBack: () => void;
};

export function ReportPreview({ report, template, onBack }: Props) {
  const loc = getLocation(report.locationSiruta);
  const parent = report.parentReportId
    ? readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []).find(
        (r) => r.id === report.parentReportId
      )
    : null;

  function handleRegenerate() {
    const systemYear = getSystemYear();
    const snapshot: Record<string, number> = {};
    for (const section of template.sections) {
      for (const slot of section.slots) {
        for (const code of slot.kpiCodes) {
          const obs = getObservation(report.locationSiruta, code, systemYear);
          if (obs) snapshot[code] = obs.value;
        }
      }
    }
    const newReport: GeneratedReport = {
      id: `report-${Date.now()}`,
      templateId: report.templateId,
      templateName: report.templateName,
      locationSiruta: report.locationSiruta,
      locationName: report.locationName,
      generatedAt: Date.now(),
      systemYear,
      snapshot,
      parentReportId: report.id,
    };
    const all = readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []);
    writeStorage(STORAGE_KEYS.reports, [newReport, ...all].slice(0, 50));
    window.location.href = `/reports/${newReport.id}`;
  }

  return (
    <div className="mx-auto max-w-[880px]">
      <header className="mb-6 flex items-center justify-between border-b border-border-subtle pb-4">
        <button
          type="button"
          onClick={onBack}
          className="font-label-md text-label-md inline-flex items-center gap-1 text-on-surface-variant hover:text-primary-deep"
        >
          <ArrowLeft size={14} /> Back to builder
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-1.5 hover:border-primary"
          >
            <RotateCcw size={14} /> Regenerate
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="font-label-md text-label-md inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-on-primary hover:bg-primary-deep"
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </header>

      <article className="a4-page mx-auto border border-border-subtle bg-white p-12 shadow-xl">
        <header className="mb-12">
          <p className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
            {report.templateName}
          </p>
          <h1 className="font-display-lg text-display-lg mt-2 text-on-surface">
            {report.locationName}
          </h1>
          <p className="font-body-md text-body-md mt-3 text-on-surface-variant">
            {loc?.countyName} county ·{" "}
            {new Date(report.generatedAt).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {parent && (
              <>
                {" · "}
                <span className="text-primary-deep">
                  Regenerated from {new Date(parent.generatedAt).toLocaleDateString("en-GB")}
                </span>
              </>
            )}
          </p>
        </header>

        {template.sections
          .filter((s) => s.kind !== "cover")
          .map((section) => (
            <section key={section.id} className="mb-10">
              <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.slots.map((slot) => {
                  if (slot.kpiCodes.length === 0) {
                    return (
                      <p
                        key={slot.id}
                        className="font-body-sm text-body-sm italic text-on-surface-variant/70"
                      >
                        {slot.label} — not configured.
                      </p>
                    );
                  }
                  return slot.kpiCodes.map((code) => {
                    const kpi = getKpi(code);
                    if (!kpi) return null;
                    const value = report.snapshot[code];
                    const previousValue = parent?.snapshot[code];
                    const series = getSeries(report.locationSiruta, code).map((o) => o.value);

                    if (slot.kind === "chart") {
                      return (
                        <div key={`${slot.id}-${code}`}>
                          <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                            {kpi.nameEn}
                          </p>
                          <div className="mt-1 flex items-baseline gap-3">
                            <span className="font-headline-md text-headline-md text-on-surface">
                              {formatKpiValue(value, kpi)}
                            </span>
                            <DiffBadge previous={previousValue} current={value} />
                          </div>
                          <div className="mt-2">
                            <Sparkline values={series} width={520} height={64} />
                          </div>
                        </div>
                      );
                    }
                    if (slot.kind === "headline") {
                      return (
                        <div key={`${slot.id}-${code}`}>
                          <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                            {kpi.nameEn}
                          </p>
                          <p className="font-display-lg text-display-lg mt-1 text-on-surface">
                            {formatKpiValue(value, kpi)}
                            <DiffBadge previous={previousValue} current={value} />
                          </p>
                        </div>
                      );
                    }
                    if (slot.kind === "table") {
                      return (
                        <div
                          key={`${slot.id}-${code}`}
                          className="font-body-sm text-body-sm flex items-baseline justify-between border-b border-border-subtle py-2"
                        >
                          <span>{kpi.nameEn}</span>
                          <span className="font-medium">
                            {formatKpiValue(value, kpi)}
                            <DiffBadge previous={previousValue} current={value} />
                          </span>
                        </div>
                      );
                    }
                    if (slot.kind === "prose") {
                      const change =
                        previousValue !== undefined
                          ? ((value - previousValue) / previousValue) * 100
                          : null;
                      const trendWord =
                        change === null
                          ? "stands at"
                          : change > 0
                            ? "increased to"
                            : change < 0
                              ? "declined to"
                              : "remained at";
                      return (
                        <p
                          key={`${slot.id}-${code}`}
                          className="font-body-md text-body-md leading-relaxed text-on-surface"
                        >
                          {kpi.nameEn} {trendWord} {formatKpiValue(value, kpi)}{" "}
                          {change !== null && `(${change > 0 ? "+" : ""}${change.toFixed(1)}% vs prior report)`}
                          .
                        </p>
                      );
                    }
                    return null;
                  });
                })}
              </div>
            </section>
          ))}
      </article>
    </div>
  );
}
```

- [ ] **Step 3: Don't build yet — SystemClock still missing**

---

### Task 20: SystemClock footer

**Files:**
- Create: `web/src/components/reports/SystemClock.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  DEFAULT_SYSTEM_YEAR,
  getSystemYear,
  selectableYears,
  setSystemYear,
} from "@/lib/system-clock";

export function SystemClock() {
  const [year, setYear] = useState(DEFAULT_SYSTEM_YEAR);

  useEffect(() => {
    setYear(getSystemYear());
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value);
    setYear(next);
    setSystemYear(next);
  }

  return (
    <footer className="sticky bottom-0 z-30 flex h-10 items-center justify-end gap-3 border-t border-border-subtle bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <span className="font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-wider text-on-surface-variant">
        <Clock size={12} aria-hidden="true" /> System year
      </span>
      <select
        value={year}
        onChange={handleChange}
        className="font-label-md text-label-md rounded border border-border-subtle bg-surface px-2 py-0.5 text-on-surface focus:border-primary focus:outline-none"
        aria-label="System year"
      >
        {selectableYears(DEFAULT_SYSTEM_YEAR).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </footer>
  );
}
```

- [ ] **Step 2: Build — now everything for /reports compiles**

```bash
cd web && npm run build
```

Expected: build passes; `/reports` listed in the route table.

- [ ] **Step 3: Visual smoke-test**

```bash
cd web && npm run dev
```

Visit `http://localhost:<port>/reports`:
- 3-column layout renders.
- Drag a Demographics KPI from the right sidebar onto the Demographics > Population trend slot → the slot fills.
- Drag a Macro-Economy KPI onto Demographics → red outline + error tooltip; drop is rejected.
- Pick a location, click Generate → 800ms overlay, then a styled A4 preview appears.
- Click Regenerate → new report renders with the same look (no diff badges yet because the previous-value logic needs a `parentReportId` and `parent` exists).
- System year selector in the footer toggles between 2024–2027.

- [ ] **Step 4: Commit the whole `/reports` page in one go**

```bash
git add web/src/app/reports web/src/components/reports
git commit -m "feat(web): /reports page — builder, library, generate, regenerate, time-travel"
```

---

### Task 21: `/reports/[reportId]` route

**Files:**
- Create: `web/src/app/reports/[reportId]/page.tsx`

- [ ] **Step 1: Create the dynamic route**

```tsx
"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/stitch/TopNav";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { readStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  SEED_TEMPLATES,
  type GeneratedReport,
  type ReportTemplate,
} from "@/lib/mock/templates";

type Props = { params: Promise<{ reportId: string }> };

export default function GeneratedReportPage({ params }: Props) {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { reportId } = await params;
      const reports = readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []);
      const r = reports.find((x) => x.id === reportId);
      if (!r) {
        setLoaded(true);
        return;
      }
      const userTemplates = readStorage<ReportTemplate[]>(STORAGE_KEYS.templates, []);
      const t =
        userTemplates.find((x) => x.id === r.templateId) ??
        SEED_TEMPLATES.find((x) => x.id === r.templateId) ??
        SEED_TEMPLATES[0];
      setReport(r);
      setTemplate(t);
      setLoaded(true);
    })();
  }, [params]);

  if (loaded && !report) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="flex-1 px-6 py-8">
        {report && template && (
          <ReportPreview
            report={report}
            template={template}
            onBack={() => (window.location.href = "/reports")}
          />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
cd web && npm run build
```

Expected: `/reports/[reportId]` listed as a dynamic route.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/reports/[reportId]
git commit -m "feat(web): /reports/[reportId] read-only report preview"
```

---

## Wave 4 — Data page

### Task 22: DataFilters

**Files:**
- Create: `web/src/components/data/DataFilters.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useId } from "react";
import { Search, X } from "lucide-react";
import { LOCATIONS } from "@/lib/mock/locations";
import { YEARS_AVAILABLE } from "@/lib/mock/observations";

export type DataFilters = {
  search: string;
  locationCodes: string[];
  categories: string[];
  year: number | null;
};

const CATEGORIES = [
  "Demographics",
  "Macro-Economy",
  "Labor Market",
  "Real Estate",
  "Infrastructure",
  "Education",
  "Risks",
];

type Props = {
  value: DataFilters;
  onChange: (next: DataFilters) => void;
  resultCount: number;
};

export function DataFiltersBar({ value, onChange, resultCount }: Props) {
  const searchId = useId();
  return (
    <div className="sticky top-16 z-20 flex flex-wrap items-end gap-3 border-b border-border-subtle bg-background/95 py-4 backdrop-blur">
      <label className="flex flex-1 min-w-[14rem] items-center gap-2 rounded border border-border-subtle bg-surface px-3 py-2 focus-within:border-primary">
        <Search size={14} className="text-on-surface-variant" />
        <span className="sr-only">Search</span>
        <input
          id={searchId}
          type="search"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Search location or KPI…"
          className="font-body-sm w-full border-none bg-transparent text-sm focus:outline-none"
        />
      </label>

      <select
        multiple
        size={1}
        value={value.locationCodes}
        onChange={(e) => {
          const codes = Array.from(e.target.selectedOptions).map((o) => o.value);
          onChange({ ...value, locationCodes: codes });
        }}
        className="font-body-sm rounded border border-border-subtle bg-surface px-2 py-2 text-sm focus:border-primary focus:outline-none"
        aria-label="Filter by location"
      >
        <option value="">All locations</option>
        {LOCATIONS.map((l) => (
          <option key={l.sirutaCode} value={l.sirutaCode}>
            {l.name} ({l.type})
          </option>
        ))}
      </select>

      <select
        multiple
        size={1}
        value={value.categories}
        onChange={(e) => {
          const cats = Array.from(e.target.selectedOptions).map((o) => o.value);
          onChange({ ...value, categories: cats });
        }}
        className="font-body-sm rounded border border-border-subtle bg-surface px-2 py-2 text-sm focus:border-primary focus:outline-none"
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={value.year ?? ""}
        onChange={(e) =>
          onChange({ ...value, year: e.target.value ? Number(e.target.value) : null })
        }
        className="font-body-sm rounded border border-border-subtle bg-surface px-2 py-2 text-sm focus:border-primary focus:outline-none"
        aria-label="Filter by year"
      >
        <option value="">All years</option>
        {YEARS_AVAILABLE.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() =>
          onChange({ search: "", locationCodes: [], categories: [], year: null })
        }
        className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-2 text-on-surface-variant hover:border-error hover:text-error"
      >
        <X size={14} /> Reset
      </button>

      <span className="font-label-md text-label-md ml-auto text-on-surface-variant">
        {resultCount.toLocaleString("en-US")} rows
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Don't build yet — DataTable still missing**

---

### Task 23: exportCsv helper

**Files:**
- Create: `web/src/components/data/exportCsv.ts`

- [ ] **Step 1: Create the helper**

```ts
/**
 * Build a CSV string from a header row + a list of records and trigger
 * a browser download. Pure DOM, no server round-trip.
 */

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const escape = (v: string | number): string => {
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Don't build yet**

---

### Task 24: DataTable + sort logic

**Files:**
- Create: `web/src/components/data/DataTable.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { getKpi, formatKpiValue } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { type Observation } from "@/lib/mock/observations";

type SortCol = "location" | "county" | "kpi" | "category" | "year" | "value";

type Props = {
  rows: readonly Observation[];
  onRowClick: (o: Observation) => void;
};

function compareBy(col: SortCol, dir: 1 | -1) {
  return (a: Observation, b: Observation): number => {
    const ka = getKpi(a.kpiCode);
    const kb = getKpi(b.kpiCode);
    const la = getLocation(a.locationSiruta);
    const lb = getLocation(b.locationSiruta);
    let cmp = 0;
    switch (col) {
      case "location":
        cmp = (la?.name ?? "").localeCompare(lb?.name ?? "");
        break;
      case "county":
        cmp = (la?.countyName ?? "").localeCompare(lb?.countyName ?? "");
        break;
      case "kpi":
        cmp = (ka?.nameEn ?? "").localeCompare(kb?.nameEn ?? "");
        break;
      case "category":
        cmp = (ka?.category ?? "").localeCompare(kb?.category ?? "");
        break;
      case "year":
        cmp = a.year - b.year;
        break;
      case "value":
        cmp = a.value - b.value;
        break;
    }
    return cmp * dir;
  };
}

const COLS: Array<{ key: SortCol; label: string; align?: "right" }> = [
  { key: "location", label: "Location" },
  { key: "county", label: "County" },
  { key: "kpi", label: "KPI" },
  { key: "category", label: "Category" },
  { key: "year", label: "Year", align: "right" },
  { key: "value", label: "Value", align: "right" },
];

export function DataTable({ rows, onRowClick }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("location");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const sorted = useMemo(() => [...rows].sort(compareBy(sortCol, sortDir)), [rows, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortCol(col);
      setSortDir(1);
    }
  }

  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-[8.5rem] z-10 bg-background">
        <tr className="border-b border-border-subtle">
          {COLS.map((c) => (
            <th
              key={c.key}
              scope="col"
              className={
                c.align === "right"
                  ? "font-label-md text-label-md cursor-pointer p-3 text-right uppercase tracking-wider text-on-surface-variant hover:text-primary-deep"
                  : "font-label-md text-label-md cursor-pointer p-3 text-left uppercase tracking-wider text-on-surface-variant hover:text-primary-deep"
              }
              onClick={() => toggleSort(c.key)}
            >
              <span className="inline-flex items-center gap-1">
                {c.label}
                {sortCol === c.key && (sortDir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              </span>
            </th>
          ))}
          <th
            className="font-label-md text-label-md p-3 text-left uppercase tracking-wider text-on-surface-variant"
            scope="col"
          >
            Source
          </th>
        </tr>
      </thead>
      <tbody className="font-body-sm text-body-sm">
        {sorted.map((o) => {
          const kpi = getKpi(o.kpiCode);
          const loc = getLocation(o.locationSiruta);
          if (!kpi || !loc) return null;
          return (
            <tr
              key={`${o.locationSiruta}-${o.kpiCode}-${o.year}`}
              tabIndex={0}
              onClick={() => onRowClick(o)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRowClick(o);
              }}
              className="cursor-pointer border-b border-border-subtle/60 hover:bg-surface-muted focus:bg-surface-muted focus:outline-none"
            >
              <td className="p-3">{loc.name}</td>
              <td className="p-3 text-on-surface-variant">{loc.countyName}</td>
              <td className="p-3">{kpi.nameEn}</td>
              <td className="p-3 text-on-surface-variant">{kpi.category}</td>
              <td className="p-3 text-right">{o.year}</td>
              <td className="p-3 text-right font-medium">{formatKpiValue(o.value, kpi)}</td>
              <td className="p-3 text-on-surface-variant">{kpi.source}</td>
            </tr>
          );
        })}
        {sorted.length === 0 && (
          <tr>
            <td colSpan={COLS.length + 1} className="p-12 text-center text-on-surface-variant">
              No rows match the current filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Don't build yet — Drawer still missing**

---

### Task 25: DataRowDrawer

**Files:**
- Create: `web/src/components/data/DataRowDrawer.tsx`

- [ ] **Step 1: Create the drawer**

```tsx
"use client";

import { X } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { getKpi, formatKpiValue } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { getSeries, type Observation } from "@/lib/mock/observations";

type Props = {
  observation: Observation | null;
  onClose: () => void;
};

export function DataRowDrawer({ observation, onClose }: Props) {
  if (!observation) return null;
  const kpi = getKpi(observation.kpiCode);
  const loc = getLocation(observation.locationSiruta);
  if (!kpi || !loc) return null;

  const series = getSeries(observation.locationSiruta, observation.kpiCode);
  const values = series.map((o) => o.value);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-on-surface/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-[32rem] max-w-full flex-col overflow-y-auto border-l border-border-subtle bg-surface p-6 shadow-xl"
        role="dialog"
        aria-labelledby="drawer-title"
      >
        <header className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
              {kpi.category} · {kpi.source}
            </p>
            <h2 id="drawer-title" className="font-headline-md text-headline-md mt-1 text-on-surface">
              {kpi.nameEn}
            </h2>
            <p className="font-body-sm text-body-sm mt-1 text-on-surface-variant">
              {loc.name}, {loc.countyName} county
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X size={20} />
          </button>
        </header>

        <section className="mb-6">
          <p className="font-display-lg text-display-lg text-on-surface">
            {formatKpiValue(observation.value, kpi)}
          </p>
          <p className="font-body-sm text-body-sm mt-2 text-on-surface-variant">
            Year {observation.year} · Fetched {observation.fetchedAt}
          </p>
          <div className="mt-4">
            <Sparkline values={values} width={460} height={64} />
          </div>
        </section>

        <section className="mb-6">
          <h3 className="font-headline-sm text-headline-sm mb-2 text-on-surface">Last 5 years</h3>
          <table className="w-full text-sm">
            <tbody>
              {series.slice(-5).map((o) => (
                <tr key={o.year} className="border-b border-border-subtle/60">
                  <td className="py-2 text-on-surface-variant">{o.year}</td>
                  <td className="py-2 text-right font-medium">{formatKpiValue(o.value, kpi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-auto flex gap-2">
          <a
            href={`/reports?prefillKpi=${kpi.code}&prefillLocation=${loc.sirutaCode}`}
            className="font-label-md text-label-md flex-1 rounded bg-primary px-3 py-2 text-center text-on-primary hover:bg-primary-deep"
          >
            Use in report
          </a>
        </footer>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Don't build yet — wire the page**

---

### Task 26: Wire the `/data` page

**Files:**
- Modify: `web/src/app/data/page.tsx` (replace placeholder)

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { TopNav } from "@/components/stitch/TopNav";
import { DataFiltersBar, type DataFilters } from "@/components/data/DataFilters";
import { DataTable } from "@/components/data/DataTable";
import { DataRowDrawer } from "@/components/data/DataRowDrawer";
import { downloadCsv } from "@/components/data/exportCsv";
import { OBSERVATIONS, type Observation } from "@/lib/mock/observations";
import { getKpi, formatKpiValue } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";

const INITIAL_FILTERS: DataFilters = {
  search: "",
  locationCodes: [],
  categories: [],
  year: null,
};

export default function DataPage() {
  const [filters, setFilters] = useState<DataFilters>(INITIAL_FILTERS);
  const [active, setActive] = useState<Observation | null>(null);

  const rows = useMemo(() => {
    const needle = filters.search.toLowerCase();
    return OBSERVATIONS.filter((o) => {
      const kpi = getKpi(o.kpiCode);
      const loc = getLocation(o.locationSiruta);
      if (!kpi || !loc) return false;
      if (
        needle.length > 1 &&
        !kpi.nameEn.toLowerCase().includes(needle) &&
        !loc.name.toLowerCase().includes(needle) &&
        !loc.countyName.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (filters.locationCodes.length > 0 && !filters.locationCodes.includes(o.locationSiruta)) {
        return false;
      }
      if (filters.categories.length > 0 && !filters.categories.includes(kpi.category)) {
        return false;
      }
      if (filters.year !== null && o.year !== filters.year) return false;
      return true;
    });
  }, [filters]);

  function handleExport() {
    const headers = ["location", "county", "kpi", "category", "year", "value", "unit", "source"];
    const records = rows.map((o) => {
      const kpi = getKpi(o.kpiCode)!;
      const loc = getLocation(o.locationSiruta)!;
      return [loc.name, loc.countyName, kpi.nameEn, kpi.category, o.year, o.value, kpi.unit, kpi.source];
    });
    downloadCsv(`innoinvest-data-${new Date().toISOString().slice(0, 10)}.csv`, headers, records);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-margin-desktop py-8">
        <header className="mb-2">
          <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
            ALL INDICATORS · NORD-VEST ROMANIA
          </p>
          <h1 className="font-headline-lg text-headline-lg mt-1 text-on-surface">
            Data Browser
          </h1>
          <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
            Every observation the platform has, filterable and exportable.
          </p>
        </header>

        <DataFiltersBar value={filters} onChange={setFilters} resultCount={rows.length} />

        <DataTable rows={rows} onRowClick={setActive} />

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleExport}
            className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-2 hover:border-primary"
          >
            <Download size={14} /> Export CSV ({rows.length})
          </button>
        </div>

        <DataRowDrawer observation={active} onClose={() => setActive(null)} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
cd web && npm run build
```

- [ ] **Step 3: Visual smoke-test**

`npm run dev`, visit `/data`:
- Table renders with all ~800 rows.
- Filtering by location / category / year shrinks the table; row count updates.
- Sorting columns works in both directions.
- Clicking a row opens the drawer with sparkline + last-5-years table.
- "Export CSV" downloads a file.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/data web/src/components/data
git commit -m "feat(web): /data page — long-format table, filters, drawer, CSV export"
```

---

## Wave 5 — Chat page

### Task 27: Chat mock response engine

**Files:**
- Create: `web/src/lib/mock/chat.ts`

- [ ] **Step 1: Create the engine**

```ts
/**
 * Mocked agent response engine. Classifies the user's message into one
 * of a small set of intents, then returns a 2–4 block response composed
 * from the real mock observations. Replace with a real LLM call when
 * the backend phase ships.
 */

import { getKpi, KPIS, type Kpi } from "./kpis";
import { LOCATIONS, type Location } from "./locations";
import { getSeries, getObservation } from "./observations";

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
  const obs = getObservation(intent.location.sirutaCode, intent.kpi.code, 2024);
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
  const eligibleLocs = LOCATIONS.filter((l) => {
    const obs = getObservation(l.sirutaCode, intent.kpi.code, 2024);
    return obs !== undefined;
  });
  const ranked = eligibleLocs
    .map((l) => ({ loc: l, value: getObservation(l.sirutaCode, intent.kpi.code, 2024)!.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  return [
    { kind: "text", text: `Top 5 by ${intent.kpi.nameEn} (2024):` },
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

export function respondTo(text: string): AssistantBlock[] {
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
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/mock/chat.ts
git commit -m "feat(web): mock chat response engine + intent classifier"
```

---

### Task 28: SuggestedPrompts + MessageInput

**Files:**
- Create: `web/src/components/chat/SuggestedPrompts.tsx`
- Create: `web/src/components/chat/MessageInput.tsx`

- [ ] **Step 1: Create `SuggestedPrompts.tsx`**

```tsx
"use client";

import { SUGGESTED_PROMPTS } from "@/lib/mock/chat";

type Props = {
  onPick: (prompt: string) => void;
};

export function SuggestedPrompts({ onPick }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SUGGESTED_PROMPTS.map((p) => (
        <li key={p}>
          <button
            type="button"
            onClick={() => onPick(p)}
            className="font-body-sm text-body-sm w-full rounded border border-border-subtle bg-surface-container-lowest p-3 text-left transition-colors hover:border-primary hover:text-primary-deep"
          >
            {p}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Create `MessageInput.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

type Props = {
  disabled?: boolean;
  onSubmit: (text: string) => void;
};

export function MessageInput({ disabled, onSubmit }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function send() {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setText("");
    ref.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex items-end gap-2 rounded-lg border border-border-subtle bg-surface-container-lowest p-2 focus-within:border-primary"
    >
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        rows={1}
        placeholder="Ask anything about the data…"
        disabled={disabled}
        className="font-body-md max-h-48 min-h-[2.5rem] w-full resize-none border-none bg-transparent text-on-surface focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || text.trim().length === 0}
        aria-label="Send"
        className="rounded bg-primary p-2 text-on-primary transition-colors hover:bg-primary-deep disabled:opacity-40"
      >
        <ArrowUp size={16} />
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Don't build yet**

---

### Task 29: AssistantCard

**Files:**
- Create: `web/src/components/chat/AssistantCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Sparkline } from "@/components/charts/Sparkline";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { getKpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { type AssistantBlock } from "@/lib/mock/chat";

export function AssistantCard({ blocks }: { blocks: AssistantBlock[] }) {
  return (
    <article className="max-w-[80%] rounded-lg border border-border-subtle bg-surface-container-lowest p-4">
      <div className="space-y-4">
        {blocks.map((b, i) => {
          if (b.kind === "text") {
            return (
              <p key={i} className="font-body-md text-body-md whitespace-pre-line text-on-surface">
                {b.text}
              </p>
            );
          }
          if (b.kind === "sparkline") {
            const kpi = getKpi(b.kpiCode);
            const loc = getLocation(b.locationSiruta);
            return (
              <div key={i}>
                <p className="font-label-md text-label-md text-on-surface-variant">
                  {kpi?.nameEn} — {loc?.name}
                </p>
                <Sparkline values={b.values} width={420} height={56} />
              </div>
            );
          }
          if (b.kind === "comparison") {
            const kpi = getKpi(b.kpiCode);
            // Use the latest year per location for a bar chart.
            const bars = b.series.map((s) => {
              const loc = getLocation(s.locationSiruta);
              const latest = s.values[s.values.length - 1];
              return { label: loc?.name ?? s.locationSiruta, value: latest?.value ?? 0 };
            });
            return (
              <div key={i}>
                <p className="font-label-md text-label-md text-on-surface-variant">
                  {kpi?.nameEn}
                </p>
                <MiniBarChart bars={bars} width={420} height={140} />
              </div>
            );
          }
          if (b.kind === "citation") {
            return (
              <ol key={i} className="font-label-md text-label-md mt-2 list-decimal space-y-1 pl-5 text-on-surface-variant">
                {b.sources.map((s) => (
                  <li key={s.id}>{s.label}</li>
                ))}
              </ol>
            );
          }
          return null;
        })}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Don't build yet**

---

### Task 30: MessageThread

**Files:**
- Create: `web/src/components/chat/MessageThread.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { AssistantCard } from "./AssistantCard";
import { type Message } from "@/lib/mock/chat";

type Props = {
  messages: Message[];
  /** When true, the last assistant message is being streamed. */
  streaming?: boolean;
};

export function MessageThread({ messages, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  return (
    <div className="flex flex-col gap-4 py-6">
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="self-end max-w-[80%] rounded-lg bg-primary px-4 py-3 text-on-primary">
            <p className="font-body-md text-body-md whitespace-pre-line">{m.text}</p>
          </div>
        ) : (
          <AssistantCard key={m.id} blocks={m.blocks} />
        )
      )}
      {streaming && (
        <div className="font-label-md text-label-md text-on-surface-variant">Assistant is typing…</div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 2: Don't build yet**

---

### Task 31: ConversationList

**Files:**
- Create: `web/src/components/chat/ConversationList.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Plus } from "lucide-react";
import { type Conversation } from "@/lib/mock/chat";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
};

function bucketLabel(updatedAt: number, now: number): string {
  const days = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return "This week";
  return "Older";
}

export function ConversationList({ conversations, activeId, onSelect, onNew }: Props) {
  const now = Date.now();
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const buckets = sorted.reduce<Record<string, Conversation[]>>((acc, c) => {
    const k = bucketLabel(c.updatedAt, now);
    (acc[k] ??= []).push(c);
    return acc;
  }, {});

  return (
    <nav aria-label="Conversations" className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <button
        type="button"
        onClick={onNew}
        className="font-label-md text-label-md inline-flex items-center justify-center gap-1 rounded border border-border-subtle px-3 py-2 transition-colors hover:border-primary hover:text-primary-deep"
      >
        <Plus size={14} /> New chat
      </button>
      {["Today", "Yesterday", "This week", "Older"].map((label) => {
        const items = buckets[label];
        if (!items || items.length === 0) return null;
        return (
          <section key={label}>
            <h3 className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
              {label}
            </h3>
            <ul className="space-y-1">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={c.id === activeId ? "true" : undefined}
                    className={
                      c.id === activeId
                        ? "font-body-sm text-body-sm w-full truncate rounded bg-primary/10 px-3 py-2 text-left font-semibold text-primary-deep"
                        : "font-body-sm text-body-sm w-full truncate rounded px-3 py-2 text-left text-on-surface transition-colors hover:bg-surface-muted"
                    }
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Don't build yet**

---

### Task 32: Wire the `/chat` page

**Files:**
- Modify: `web/src/app/chat/page.tsx` (replace placeholder)

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/stitch/TopNav";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageThread } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { SuggestedPrompts } from "@/components/chat/SuggestedPrompts";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  respondTo,
  type Conversation,
  type Message,
} from "@/lib/mock/chat";

function blankConversation(): Conversation {
  const now = Date.now();
  return {
    id: `chat-${now}`,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    const stored = readStorage<Conversation[]>(STORAGE_KEYS.chats, []);
    if (stored.length === 0) {
      const fresh = blankConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(stored);
      setActiveId(readStorage<string>(STORAGE_KEYS.activeChat, stored[0].id));
    }
  }, []);

  const active = conversations.find((c) => c.id === activeId);

  function persist(next: Conversation[], nextActive: string | null) {
    setConversations(next);
    writeStorage(STORAGE_KEYS.chats, next);
    if (nextActive !== null) {
      setActiveId(nextActive);
      writeStorage(STORAGE_KEYS.activeChat, nextActive);
    }
  }

  function handleNew() {
    const fresh = blankConversation();
    persist([fresh, ...conversations], fresh.id);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    writeStorage(STORAGE_KEYS.activeChat, id);
  }

  function handleSend(text: string) {
    if (!active) return;
    const userMsg: Message = {
      id: `m-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    };
    const updatedTitle = active.messages.length === 0 ? text.slice(0, 60) : active.title;
    const withUser: Conversation = {
      ...active,
      title: updatedTitle,
      messages: [...active.messages, userMsg],
      updatedAt: Date.now(),
    };
    let next = conversations.map((c) => (c.id === active.id ? withUser : c));
    persist(next, active.id);

    setStreaming(true);
    setTimeout(() => {
      const blocks = respondTo(text);
      const assistantMsg: Message = {
        id: `m-${Date.now() + 1}`,
        role: "assistant",
        blocks,
        timestamp: Date.now() + 1,
      };
      const final: Conversation = {
        ...withUser,
        messages: [...withUser.messages, assistantMsg],
        updatedAt: Date.now() + 1,
      };
      next = next.map((c) => (c.id === active.id ? final : c));
      persist(next, active.id);
      setStreaming(false);
    }, 700);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden border-r border-border-subtle bg-surface lg:block">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={handleSelect}
            onNew={handleNew}
          />
        </aside>
        <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col px-6">
          {active && (
            <>
              <header className="border-b border-border-subtle py-4">
                <h1 className="font-headline-sm text-headline-sm truncate text-on-surface">
                  {active.title}
                </h1>
              </header>
              <div className="flex-1 overflow-y-auto">
                {active.messages.length === 0 ? (
                  <div className="mx-auto max-w-[640px] py-10">
                    <h2 className="font-headline-md text-headline-md mb-2 text-on-surface">
                      Ask anything about the data
                    </h2>
                    <p className="font-body-md text-body-md mb-6 text-on-surface-variant">
                      The assistant has access to ~800 observations across NW Romania.
                    </p>
                    <SuggestedPrompts onPick={handleSend} />
                  </div>
                ) : (
                  <MessageThread messages={active.messages} streaming={streaming} />
                )}
              </div>
              <div className="py-4">
                <MessageInput disabled={streaming} onSubmit={handleSend} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
cd web && npm run build
```

Expected: build passes; `/chat` listed in the route table.

- [ ] **Step 3: Visual smoke-test**

`npm run dev`, visit `/chat`:
- Empty state shows 4 suggested prompts.
- Click a prompt → user bubble appears, 700ms later an assistant card with text + sparkline/bar chart + citation.
- Send a custom message ("Compare unemployment in Cluj and Maramureș") → response includes a comparison bar chart.
- New chat button creates an empty thread; switching between conversations preserves their messages.
- Reload the page → conversations persist.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/chat web/src/components/chat
git commit -m "feat(web): /chat page — mocked agent with sidebar, streaming, persistence"
```

---

## Wave 6 — Final verification

### Task 33: Full build + screenshot verification

- [ ] **Step 1: Stop dev server, nuke cache, fresh build**

```bash
cd web && rm -rf .next && PATH=/Users/georgejucan/.nvm/versions/node/v22.14.0/bin:$PATH npm run build
```

Expected route table includes:

```
○ /                    redirect → /sectors
○ /sectors             (existing)
○ /sectors/macro       (existing)
○ /report-preview      (existing)
○ /reports             (NEW)
ƒ /reports/[reportId]  (NEW, dynamic)
○ /data                (NEW)
○ /chat                (NEW)
```

- [ ] **Step 2: Start dev server, screenshot each new page**

```bash
cd web && PATH=/Users/georgejucan/.nvm/versions/node/v22.14.0/bin:$PATH npm run dev
```

Visit each route in turn and capture a screenshot for the PR description / handover doc:
- `/reports` (with the standard template loaded, one Demographics KPI dropped)
- `/reports/[reportId]` (after one Generate cycle)
- `/data` (default filters)
- `/chat` (with a comparison response)

- [ ] **Step 3: Final commit if anything was touched**

```bash
git status
# If any tweaks were made during the smoke-test:
git add <files>
git commit -m "chore(web): smoke-test fixes for intelligence pages"
```

---

## Notes for the executor

- **No frontend tests** are introduced by this plan. The project has zero pre-existing frontend tests; rather than spinning up a test framework as a side-quest, validation is via TypeScript build + visual smoke-test in the dev server. If you want unit coverage for the pure helpers later (PRNG determinism, intent classifier, CSV escaping), add Vitest in a follow-up.
- **Cache-clobber gotcha:** `npm run build` overwrites `web/.next/` while `npm run dev` is also using it. Always stop dev before building, or build in a worktree.
- **`@dnd-kit` SSR caveat:** `useDraggable` / `useDroppable` only run on the client. Every component that uses them must be marked `"use client"`. The plan does this everywhere it matters.
- **Mocked data boundary:** Everything funnels through `web/src/lib/mock/*`. To wire a real backend later, replace those modules' exports with async equivalents and pull the components that use them into Suspense boundaries — no other code changes needed.

## Deferred from spec — intentionally out of scope for this plan

These are real spec items that did not get a task in this plan. They are polish on already-shipped surfaces and can be picked up in a follow-up without rework:

- **Spec §3.4 "amber replace-state" on already-filled slots.** Plan replaces silently. To add: track a third `hoverState: 'valid' | 'invalid' | 'replace'` and surface the prompt.
- **Spec §4.7 column reorder via dnd-kit on the data table.** Plan ships fixed column order. To add: wrap the `<thead>` row in `SortableContext` and persist order to `STORAGE_KEYS.dataColumnOrder` (the key is already reserved in Task 7).
- **Spec §5.3 streaming word-by-word animation with scroll-pause and Esc-cancel.** Plan ships a simple "Assistant is typing…" placeholder during the 700ms delay. To add: chunk the assistant text in `AssistantCard`, append on `setTimeout`, expose a cancel handle.
- **Spec §5.5 inline Copy / Export-to-report buttons on assistant messages.** Plan ships static cards. Add: hover-revealed action row on `<AssistantCard>` and a query param the Report Builder reads to pre-populate a prose section.
- **Spec §4.6 virtualization.** Plan uses naive rendering of ~800 rows. Add `react-window` if perf measurement shows jank.
- **Spec §5.6 "8 distinct response templates".** Plan ships 5 (trend, compare, lookup, ranking, dossier) plus fallback. The 3 additional templates would be: source-lookup ("where does this data come from"), help ("what can you do"), and methodology ("how is this calculated").

If any of these matter for the demo this plan supports, add a Wave 7 with the relevant tasks before starting execution.
