# Report Builder v2 — Investor Pitch Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `/reports` tile/slot template builder with a typed-slide deck editor that produces investor-pitch-style PDF decks modeled on the ADR Nord-Vest reference (29-page landscape), and wire the chat's **Use in report** button to actually append slides to the active deck.

**Architecture:** A `Deck` is an ordered list of discriminated-union `Slide` records (15 kinds). Each kind has a fixed `<XSlideRenderer>` (landscape A4, locked brand chrome) and a kind-specific edit form. A 3-column workspace (deck library / canvas / edit panel) drives everything from one `/reports` page. Persistence is `localStorage` under `innoinvest:decks`. Export is `window.print()` with a print stylesheet that strips chrome and forces A4 landscape page breaks.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4, `@dnd-kit/sortable` (already installed), `react-leaflet` 4 + Leaflet 1.9 (already installed, OSM/satellite tiles), `lucide-react` icons. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-05-24-report-builder-v2-pitch-deck.md`

---

## File Structure

### New files (~30)

```
frontend/src/lib/mock/decks.ts                                 # Deck/Slide types + seeded Florești deck + factories
frontend/src/lib/decks/deckMigration.ts                        # One-time localStorage migration
frontend/src/lib/decks/autoNarrative.ts                        # Templated paragraph generators
frontend/src/lib/decks/createSlideFromChat.ts                  # AssistantBlock[] → Slide
frontend/src/lib/decks/useActiveDeck.ts                        # Hook for chat bridge
frontend/src/lib/decks/__tests__/decks.test.ts                 # Factory tests
frontend/src/lib/decks/__tests__/autoNarrative.test.ts         # Narrative tests
frontend/src/lib/decks/__tests__/createSlideFromChat.test.ts   # Bridge tests
frontend/src/lib/decks/__tests__/deckMigration.test.ts         # Migration tests
frontend/src/components/reports/chrome/BrandFlag.tsx           # ADR Nord-Vest flag
frontend/src/components/reports/chrome/LogoStrip.tsx           # Logos
frontend/src/components/reports/chrome/PageNumber.tsx          # Bottom-right number
frontend/src/components/reports/chrome/SlideShell.tsx          # Aspect ratio + composed chrome wrapper
frontend/src/components/reports/chrome/deck-print.css          # @media print rules
frontend/src/components/reports/deck/DeckLibrary.tsx           # Left rail
frontend/src/components/reports/deck/DeckCanvas.tsx            # Centre
frontend/src/components/reports/deck/EditPanel.tsx             # Right rail
frontend/src/components/reports/deck/SlidePalette.tsx          # + Add slide popover
frontend/src/components/reports/deck/SlideThumbnail.tsx        # Sidebar preview
frontend/src/components/reports/deck/KpiPicker.tsx             # Chip list + autocomplete
frontend/src/components/reports/deck/ParcelPicker.tsx          # Parcel autocomplete
frontend/src/components/reports/deck/PhotoPicker.tsx           # 3×2 photo grid
frontend/src/components/reports/deck/EditableText.tsx          # contenteditable helper
frontend/src/components/reports/deck/renderers/CoverSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/SectionDividerSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/CountySnapshotSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/CitySnapshotSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/CommuneDetailSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/StrategicLocationSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/ParcelDetailSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/InfrastructureDividerSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/InfrastructurePageSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/StatInfographicSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/TrendSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/ComparisonSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/RecommendationSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/TextSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/ContactSlideRenderer.tsx
frontend/src/components/reports/deck/renderers/SlideRenderer.tsx  # discriminated-union switch
frontend/public/deck-photos/CREDITS.md                         # Attribution
frontend/public/deck-photos/*.jpg                              # 6 stock images
frontend/public/deck-photos/coats/*.svg                        # 6 county coat-of-arms placeholders
```

### Modified files (4)

```
frontend/src/app/globals.css                                   # Add --color-deck-* tokens
frontend/src/lib/persistence/keys.ts                           # Drop templates/reports, add decks/activeDeck
frontend/src/app/reports/page.tsx                              # Rewrite as 3-column workspace
frontend/src/app/reports/[reportId]/page.tsx                   # Rewrite as read-only print view
frontend/src/components/chat/AssistantCard.tsx                 # Wire Use-in-report button
```

### Deleted files (10)

```
frontend/src/components/reports/TemplateLibrary.tsx
frontend/src/components/reports/TemplateCanvas.tsx
frontend/src/components/reports/SectionBlock.tsx
frontend/src/components/reports/SlotDropZone.tsx
frontend/src/components/reports/VariablesPicker.tsx
frontend/src/components/reports/LocationPicker.tsx
frontend/src/components/reports/GenerateOverlay.tsx
frontend/src/components/reports/ReportPreview.tsx
frontend/src/components/reports/DiffBadge.tsx
frontend/src/lib/mock/templates.ts
```

`frontend/src/components/reports/SystemClock.tsx` stays (the editor still surfaces system year).

### Testing

Vitest is **not yet installed**. We add it as a dev-only dependency in Task 1 so the data/migration/bridge tasks can be TDD. UI renderer tasks rely on visual smoke in the dev server — they don't get unit tests (no value vs. cost).

---

## Wave 0 — Foundation (4 tasks)

Tokens, persistence keys, print CSS, and the test runner.

### Task 1: Install Vitest + add test script

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
cd web && npm install --save-dev vitest@^2 @vitest/ui jsdom
```

- [ ] **Step 2: Add test script to package.json**

In `frontend/package.json`, add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest config**

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

- [ ] **Step 4: Verify**

Run: `cd web && npm test`
Expected: PASS with "No test files found" or "0 tests" — runner works, nothing to run yet.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts
git commit -m "chore(reports): add vitest for deck builder TDD"
```

### Task 2: Add deck palette tokens to globals.css

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Add tokens inside the existing `@theme {}` block**

Append to `@theme {}` (after the `--text-label-md--letter-spacing` line, before the closing brace):

```css
  /* --- Deck palette (Investor Pitch — scoped to /reports renderers) --- */
  --color-deck-deep: #157777;
  --color-deck-bright: #1ea29a;
  --color-deck-accent: #f5a623;
  --color-deck-paper: #fafbfb;
  --color-deck-ink: #1a2322;
  --color-deck-muted: #6b7271;
```

- [ ] **Step 2: Add deck-only utility classes at the bottom of globals.css**

Append at end of file:

```css
/* =========================================================================
   Deck builder utilities — scoped to slide renderers under /reports.
   ========================================================================= */
.deck-underline::after {
  content: "";
  display: block;
  width: 80px;
  height: 2px;
  background: var(--color-deck-accent);
  margin-top: 8px;
}

.deck-eyebrow {
  font-family: var(--font-body-md);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-deck-bright);
}
```

- [ ] **Step 3: Verify in browser**

Run: `cd web && npm run dev`, then open http://localhost:3000 and inspect — confirm `--color-deck-deep` resolves to `#157777` in DevTools (any element).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(reports): add deck palette tokens + .deck-underline utility"
```

### Task 3: Update STORAGE_KEYS (drop templates/reports, add decks/activeDeck)

**Files:**
- Modify: `frontend/src/lib/persistence/keys.ts`

- [ ] **Step 1: Edit the keys object**

Replace the entire `STORAGE_KEYS` object with:

```ts
export const STORAGE_KEYS = {
  decks: "innoinvest:decks",
  activeDeck: "innoinvest:active-deck",
  chats: "innoinvest:chats",
  activeChat: "innoinvest:active-chat",
  dataColumnOrder: "innoinvest:data-column-order",
  systemYear: "innoinvest:system-year",
} as const;
```

(Removing `templates` and `reports`; the migration helper in Task 8 cleans the old localStorage keys.)

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: errors in `app/reports/page.tsx`, `components/reports/TemplateLibrary.tsx`, `TemplateCanvas.tsx`, `ReportPreview.tsx`, `app/reports/[reportId]/page.tsx` — those files will all be deleted/rewritten in later tasks. Note the count and continue.

- [ ] **Step 3: Do NOT commit yet**

The typecheck errors are expected interim state; commit happens at end of Wave 1 when the deletions land in the same diff.

### Task 4: Create print CSS

**Files:**
- Create: `frontend/src/components/reports/chrome/deck-print.css`

- [ ] **Step 1: Write the CSS file**

Create `frontend/src/components/reports/chrome/deck-print.css`:

```css
/* Print rules for /reports/[reportId] read-only deck view.
   Imported globally only inside that route via `import "./deck-print.css"`.
   No selectors should fire on screen — every rule is wrapped in @media print. */

@media print {
  @page {
    size: A4 landscape;
    margin: 0;
  }

  html, body {
    background: #fff !important;
  }

  /* Hide everything outside the deck root, including TopNav and toolbars. */
  body > *:not(.deck-print-root) {
    display: none !important;
  }

  .deck-print-root {
    background: #fff;
  }

  .deck-print-root > .deck-slide {
    page-break-after: always;
    break-after: page;
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
  }

  .deck-print-root > .deck-slide:last-child {
    page-break-after: auto;
  }

  /* Kill Leaflet zoom controls and transitions during print. */
  .leaflet-control-container,
  .leaflet-bar {
    display: none !important;
  }

  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
  }
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls frontend/src/components/reports/chrome/deck-print.css`
Expected: file listed.

- [ ] **Step 3: Do NOT commit yet**

CSS is imported by code that doesn't exist yet — commit lands with `[reportId]/page.tsx` in Wave 9.

---

## Wave 1 — Data model + seeded deck (3 tasks)

`Deck` and `Slide` types, the seeded Investor Pitch — Florești deck, and unit tests.

### Task 5: Define Slide / Deck types in lib/mock/decks.ts

**Files:**
- Create: `frontend/src/lib/mock/decks.ts`

- [ ] **Step 1: Write the types and shared helpers**

Create `frontend/src/lib/mock/decks.ts`:

```ts
/**
 * Deck data model. A Deck is an ordered list of typed Slides, each
 * carrying a discriminated `kind`. The renderer is a switch (slide.kind).
 *
 * Persisted under STORAGE_KEYS.decks as Deck[].
 */

import type { ParcelType } from "./parcels";
import type { Sector } from "./composite";

export type SlideId = string;
export type PhotoId =
  | "industrial-park-1"
  | "urban-cluj"
  | "commune-blocks"
  | "landscape-mountains"
  | "highway-aerial"
  | "satellite-default"
  | null;

type BaseSlide = {
  id: SlideId;
  /** Year the slide's data was derived for. The deck-level year drives new slides. */
  dataYear: number;
};

export type CoverSlide = BaseSlide & {
  kind: "cover";
  title: string;
  subtitle: string;
  preparedFor: string;
  dateIssued: string; // ISO date
  /** SIRUTA highlighted on the RO map; defaults to deck.locationSiruta. */
  highlightCounty: string | null;
};

export type SectionDividerSlide = BaseSlide & {
  kind: "section_divider";
  title: string;
  backgroundPhotoId: PhotoId;
};

export type CountySnapshotSlide = BaseSlide & {
  kind: "county_snapshot";
  eyebrow: string;
  headline: string;
  /** Optional auto-narrative; analyst can override or clear. */
  narrative: string | null;
  /** Tile KPIs, max 4. */
  kpiCodes: string[];
  /** SIRUTA of the county. */
  locationSiruta: string;
};

export type CitySnapshotSlide = BaseSlide & {
  kind: "city_snapshot";
  eyebrow: string;
  headline: string;
  /** 3 paragraphs of narrative. */
  paragraphs: string[];
  kpiCodes: string[];
  photoId: PhotoId;
  /** SIRUTA of the city. */
  locationSiruta: string;
};

export type CommuneDetailSlide = BaseSlide & {
  kind: "commune_detail";
  headline: string;
  paragraphs: string[];
  calloutText: string;
  heroPhotoId: PhotoId;
  /** SIRUTA of the commune. */
  locationSiruta: string;
};

export type StrategicLocationSlide = BaseSlide & {
  kind: "strategic_location";
  title: string;
  backgroundPhotoId: PhotoId;
};

export type ParcelDetailSlide = BaseSlide & {
  kind: "parcel_detail";
  title: string;
  /** Three short pill labels. */
  features: string[];
  /** Bulleted detail list. */
  keyFeatures: string[];
  indicatedPrice: string;
  parcelId: string;
};

export type InfrastructureDividerSlide = BaseSlide & {
  kind: "infrastructure_divider";
  title: string;
  backgroundPhotoId: PhotoId;
};

export type InfrastructurePageSlide = BaseSlide & {
  kind: "infrastructure_page";
  headline: string;
  /** Three (label, distance) pairs for the highlighted icons. */
  distances: Array<{ label: string; value: string }>;
  /** Centring point for the map (lat/lng). */
  parcelId: string;
};

export type StatInfographicSlide = BaseSlide & {
  kind: "stat_infographic";
  headline: string;
  /** Either "radial" (5-8 stats around a centre) or "panel" (3-5 stats + side panel rows). */
  layout: "radial" | "panel";
  stats: Array<{ value: string; label: string }>;
  /** Used only for `panel` layout. */
  sidePanelTitle: string;
  sidePanelRows: Array<{ label: string; value: string }>;
};

export type TrendSlide = BaseSlide & {
  kind: "trend";
  headline: string;
  commentary: string;
  kpiCode: string;
  locationSiruta: string;
  /** Inclusive year range pulled from observations. */
  yearRange: [number, number];
};

export type ComparisonSlide = BaseSlide & {
  kind: "comparison";
  headline: string;
  commentary: string;
  kpiCode: string;
  locationSirutas: string[];
  yearRange: [number, number];
};

export type RecommendationSlide = BaseSlide & {
  kind: "recommendation";
  headline: string;
  narrative: string;
  sector: Sector;
};

export type TextSlide = BaseSlide & {
  kind: "text";
  title: string;
  paragraphs: string[];
};

export type ContactSlide = BaseSlide & {
  kind: "contact";
  headline: string;
  contactRows: Array<{ label: string; value: string }>;
  ctaText: string;
};

export type Slide =
  | CoverSlide
  | SectionDividerSlide
  | CountySnapshotSlide
  | CitySnapshotSlide
  | CommuneDetailSlide
  | StrategicLocationSlide
  | ParcelDetailSlide
  | InfrastructureDividerSlide
  | InfrastructurePageSlide
  | StatInfographicSlide
  | TrendSlide
  | ComparisonSlide
  | RecommendationSlide
  | TextSlide
  | ContactSlide;

export type SlideKind = Slide["kind"];

export const SLIDE_KIND_LABELS: Record<SlideKind, string> = {
  cover: "Cover",
  section_divider: "Section divider",
  county_snapshot: "County snapshot",
  city_snapshot: "City snapshot",
  commune_detail: "Commune detail",
  strategic_location: "Strategic location",
  parcel_detail: "Parcel detail",
  infrastructure_divider: "Infrastructure divider",
  infrastructure_page: "Infrastructure page",
  stat_infographic: "Stat infographic",
  trend: "Trend",
  comparison: "Comparison",
  recommendation: "Recommendation",
  text: "Text",
  contact: "Contact",
};

export const SLIDE_PALETTE_GROUPS: ReadonlyArray<{
  label: string;
  kinds: SlideKind[];
}> = [
  { label: "Structure", kinds: ["cover", "section_divider", "contact"] },
  { label: "Snapshot", kinds: ["county_snapshot", "city_snapshot", "commune_detail"] },
  { label: "Location", kinds: ["parcel_detail", "strategic_location", "infrastructure_divider", "infrastructure_page"] },
  { label: "Data", kinds: ["stat_infographic", "trend", "comparison", "recommendation"] },
  { label: "Custom", kinds: ["text"] },
];

export type Deck = {
  id: string;
  title: string;
  templateOrigin: "investor-pitch" | "blank" | "user-saved";
  /** Primary location the deck is about. Drives data-bound elements + cover map. */
  locationSiruta: string | null;
  /** Year used to derive KPI values when a slide is added or regenerated. */
  systemYear: number;
  slides: Slide[];
  /** Whether the deck is shared (template, clone-only) or user-owned. */
  isShared: boolean;
  createdAt: number;
  updatedAt: number;
};

export type { ParcelType, Sector };
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: same set of pre-existing errors as Task 3 (no new errors from decks.ts).

- [ ] **Step 3: Do NOT commit yet** — factories land in Task 6 together.

### Task 6: Add slide factories + seeded Investor Pitch — Florești deck

**Files:**
- Modify: `frontend/src/lib/mock/decks.ts` (append)

- [ ] **Step 1: Append slide-factory helpers**

Append to `frontend/src/lib/mock/decks.ts`:

```ts
// ---------------------------------------------------------------------
// Slide factories — one per kind. Each produces a sensible default for
// the kind, given a (year, location?) context. Used by:
//   • the SlidePalette "+ Add slide" popover
//   • the seeded Florești deck below
//   • the chat → deck bridge (createSlideFromChat) as a fallback
// ---------------------------------------------------------------------

import { getLocation } from "./locations";

let _slideIdSeq = 0;
function nextSlideId(prefix: string): string {
  _slideIdSeq += 1;
  return `slide-${prefix}-${Date.now().toString(36)}-${_slideIdSeq}`;
}

export function makeCoverSlide(opts: {
  year: number;
  locationSiruta: string | null;
  title?: string;
  preparedFor?: string;
}): CoverSlide {
  const loc = opts.locationSiruta ? getLocation(opts.locationSiruta) : undefined;
  return {
    id: nextSlideId("cover"),
    kind: "cover",
    dataYear: opts.year,
    title: opts.title ?? (loc ? `${loc.name} — Investor Pitch` : "Investor Pitch"),
    subtitle: "Strategic location for regional investment",
    preparedFor: opts.preparedFor ?? "ADR Nord-Vest",
    dateIssued: new Date().toISOString().slice(0, 10),
    highlightCounty: loc?.countyCode ?? null,
  };
}

export function makeSectionDivider(title: string, year: number, photoId: PhotoId = "landscape-mountains"): SectionDividerSlide {
  return {
    id: nextSlideId("section"),
    kind: "section_divider",
    dataYear: year,
    title,
    backgroundPhotoId: photoId,
  };
}

export function makeCountySnapshot(opts: {
  year: number;
  countySiruta: string;
  kpiCodes?: string[];
}): CountySnapshotSlide {
  const loc = getLocation(opts.countySiruta);
  return {
    id: nextSlideId("county"),
    kind: "county_snapshot",
    dataYear: opts.year,
    eyebrow: "COUNTY SNAPSHOT",
    headline: loc?.name ?? "County",
    narrative: null,
    kpiCodes: opts.kpiCodes ?? ["pop_total", "gdp_per_capita", "wage_avg", "fiber_coverage"],
    locationSiruta: opts.countySiruta,
  };
}

export function makeCitySnapshot(opts: {
  year: number;
  citySiruta: string;
  photoId?: PhotoId;
}): CitySnapshotSlide {
  const loc = getLocation(opts.citySiruta);
  return {
    id: nextSlideId("city"),
    kind: "city_snapshot",
    dataYear: opts.year,
    eyebrow: "CITY HUB",
    headline: loc?.name ?? "City",
    paragraphs: [
      `${loc?.name ?? "The city"} anchors the regional economy with a deep tech and services ecosystem.`,
      "Tertiary education attainment and the multilingual workforce drive sustained foreign direct investment.",
      "Growing residential supply and modern infrastructure support continued in-migration.",
    ],
    kpiCodes: ["pop_total", "wage_avg", "tertiary_attainment", "gdp_per_capita"],
    photoId: opts.photoId ?? "urban-cluj",
    locationSiruta: opts.citySiruta,
  };
}

export function makeCommuneDetail(opts: {
  year: number;
  communeSiruta: string;
}): CommuneDetailSlide {
  const loc = getLocation(opts.communeSiruta);
  return {
    id: nextSlideId("commune"),
    kind: "commune_detail",
    dataYear: opts.year,
    headline: loc?.name ?? "Commune",
    paragraphs: [
      `${loc?.name ?? "The commune"} is the fastest-growing settlement in the metropolitan area.`,
      "Residential development is matched by new commercial and logistics floorspace.",
    ],
    calloutText: "Largest commune in Romania by population",
    heroPhotoId: "commune-blocks",
    locationSiruta: opts.communeSiruta,
  };
}

export function makeStrategicLocation(title: string, year: number): StrategicLocationSlide {
  return {
    id: nextSlideId("strategic"),
    kind: "strategic_location",
    dataYear: year,
    title,
    backgroundPhotoId: "industrial-park-1",
  };
}

export function makeParcelDetail(opts: {
  year: number;
  parcelId: string;
  title?: string;
}): ParcelDetailSlide {
  return {
    id: nextSlideId("parcel"),
    kind: "parcel_detail",
    dataYear: opts.year,
    title: opts.title ?? "Investable Site",
    features: ["Greenfield", "A3 motorway", "Utilities at gate"],
    keyFeatures: [
      "Direct rail siding active",
      "Gas, water, 20kV grid connections",
      "Strategic distance from Cluj-Napoca",
      "Multi-tenant ready",
    ],
    indicatedPrice: "Price on request",
    parcelId: opts.parcelId,
  };
}

export function makeInfrastructureDivider(year: number): InfrastructureDividerSlide {
  return {
    id: nextSlideId("infradiv"),
    kind: "infrastructure_divider",
    dataYear: year,
    title: "Infrastructure & Utilities",
    backgroundPhotoId: "highway-aerial",
  };
}

export function makeInfrastructurePage(opts: { year: number; parcelId: string }): InfrastructurePageSlide {
  return {
    id: nextSlideId("infra"),
    kind: "infrastructure_page",
    dataYear: opts.year,
    headline: "Infrastructure access",
    distances: [
      { label: "A3 motorway", value: "1 km" },
      { label: "Cluj-Napoca airport", value: "18 km" },
      { label: "Hungarian border", value: "165 km" },
    ],
    parcelId: opts.parcelId,
  };
}

export function makeStatInfographic(opts: {
  year: number;
  layout?: "radial" | "panel";
  headline?: string;
}): StatInfographicSlide {
  return {
    id: nextSlideId("stat"),
    kind: "stat_infographic",
    dataYear: opts.year,
    headline: opts.headline ?? "Key indicators",
    layout: opts.layout ?? "radial",
    stats: [
      { value: "286k", label: "Cluj-Napoca residents" },
      { value: "€17.4k", label: "GDP per capita" },
      { value: "8.4k", label: "Average gross wage RON" },
      { value: "32%", label: "Tertiary attainment" },
      { value: "92%", label: "Fibre coverage" },
    ],
    sidePanelTitle: "Overnight delivery to",
    sidePanelRows: [
      { label: "Budapest", value: "590 km" },
      { label: "Vienna", value: "770 km" },
      { label: "Bucharest", value: "450 km" },
      { label: "Sofia", value: "640 km" },
    ],
  };
}

export function makeTrend(opts: { year: number; kpiCode: string; locationSiruta: string }): TrendSlide {
  return {
    id: nextSlideId("trend"),
    kind: "trend",
    dataYear: opts.year,
    headline: "10-year trajectory",
    commentary: "Sustained growth aligned with the regional convergence story.",
    kpiCode: opts.kpiCode,
    locationSiruta: opts.locationSiruta,
    yearRange: [2018, opts.year],
  };
}

export function makeComparison(opts: {
  year: number;
  kpiCode: string;
  locationSirutas: string[];
}): ComparisonSlide {
  return {
    id: nextSlideId("compare"),
    kind: "comparison",
    dataYear: opts.year,
    headline: "Comparative view",
    commentary: "Cluj's lead on this metric has widened over the period.",
    kpiCode: opts.kpiCode,
    locationSirutas: opts.locationSirutas,
    yearRange: [2018, opts.year],
  };
}

export function makeRecommendation(opts: { year: number; sector: Sector }): RecommendationSlide {
  return {
    id: nextSlideId("reco"),
    kind: "recommendation",
    dataYear: opts.year,
    headline: "Where to invest",
    narrative: "Cluj retains the strongest composite score for the chosen sector, driven by talent and infrastructure.",
    sector: opts.sector,
  };
}

export function makeTextSlide(opts: { year: number; title?: string }): TextSlide {
  return {
    id: nextSlideId("text"),
    kind: "text",
    dataYear: opts.year,
    title: opts.title ?? "Section",
    paragraphs: ["Add narrative content here."],
  };
}

export function makeContactSlide(opts: { year: number }): ContactSlide {
  return {
    id: nextSlideId("contact"),
    kind: "contact",
    dataYear: opts.year,
    headline: "For more information",
    contactRows: [
      { label: "ADR Nord-Vest", value: "secretariat@nord-vest.ro" },
      { label: "Phone", value: "+40 264 431 550" },
      { label: "Website", value: "nord-vest.ro" },
    ],
    ctaText: "Contact us to schedule a site visit",
  };
}

// ---------------------------------------------------------------------
// Seeded Investor Pitch — Florești deck (17 slides) modeled on the
// reference ADR PDF.
// ---------------------------------------------------------------------

const CLUJ_COUNTY_SIRUTA = "120";
const CLUJ_NAPOCA_SIRUTA = "54975";
const FLORESTI_SIRUTA = "57706";
const BN_COUNTY_SIRUTA = "63";

export function makeInvestorPitchDeck(opts: { year: number }): Deck {
  const now = Date.now();
  const year = opts.year;
  const slides: Slide[] = [
    makeCoverSlide({ year, locationSiruta: FLORESTI_SIRUTA, title: "Florești — Investor Pitch", preparedFor: "ADR Nord-Vest" }),
    makeCountySnapshot({ year, countySiruta: CLUJ_COUNTY_SIRUTA }),
    makeCitySnapshot({ year, citySiruta: CLUJ_NAPOCA_SIRUTA, photoId: "urban-cluj" }),
    makeCommuneDetail({ year, communeSiruta: FLORESTI_SIRUTA }),
    makeStrategicLocation("Strategic Location", year),
    makeParcelDetail({ year, parcelId: "p-cluj-floresti", title: "200HA Florești, Cluj County" }),
    makeInfrastructureDivider(year),
    makeInfrastructurePage({ year, parcelId: "p-cluj-floresti" }),
    makeStatInfographic({ year, layout: "radial", headline: "Why Cluj" }),
    makeTrend({ year, kpiCode: "gdp_per_capita", locationSiruta: CLUJ_COUNTY_SIRUTA }),
    makeComparison({ year, kpiCode: "wage_avg", locationSirutas: [CLUJ_COUNTY_SIRUTA, BN_COUNTY_SIRUTA] }),
    makeRecommendation({ year, sector: "tech" }),
    makeSectionDivider("Workforce & Ecosystem", year, "urban-cluj"),
    makeStatInfographic({ year, layout: "panel", headline: "Overnight delivery from Cluj" }),
    makeStrategicLocation("Additional Sites", year),
    makeParcelDetail({ year, parcelId: "p-cluj-jucu", title: "Jucu Industrial Park" }),
    makeContactSlide({ year }),
  ];
  return {
    id: "deck-investor-pitch-floresti",
    title: "Investor Pitch — Florești",
    templateOrigin: "investor-pitch",
    locationSiruta: FLORESTI_SIRUTA,
    systemYear: year,
    slides,
    isShared: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Empty deck for "+ New deck" starting from blank — just a cover + a text slide. */
export function makeBlankDeck(opts: { year: number; title?: string }): Deck {
  const now = Date.now();
  return {
    id: `deck-${now.toString(36)}`,
    title: opts.title ?? "Untitled deck",
    templateOrigin: "blank",
    locationSiruta: null,
    systemYear: opts.year,
    slides: [
      makeCoverSlide({ year: opts.year, locationSiruta: null, title: opts.title ?? "Untitled deck" }),
      makeTextSlide({ year: opts.year, title: "Add a section title" }),
    ],
    isShared: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Returns a default slide for a given kind — used by the SlidePalette
 * "+ Add slide" popover so the analyst gets a sensible starting point.
 */
export function defaultSlideForKind(kind: SlideKind, ctx: { year: number; locationSiruta: string | null }): Slide {
  const year = ctx.year;
  const siruta = ctx.locationSiruta;
  switch (kind) {
    case "cover": return makeCoverSlide({ year, locationSiruta: siruta });
    case "section_divider": return makeSectionDivider("Section title", year);
    case "county_snapshot": return makeCountySnapshot({ year, countySiruta: siruta ?? CLUJ_COUNTY_SIRUTA });
    case "city_snapshot": return makeCitySnapshot({ year, citySiruta: siruta ?? CLUJ_NAPOCA_SIRUTA });
    case "commune_detail": return makeCommuneDetail({ year, communeSiruta: siruta ?? FLORESTI_SIRUTA });
    case "strategic_location": return makeStrategicLocation("Strategic location", year);
    case "parcel_detail": return makeParcelDetail({ year, parcelId: "p-cluj-floresti" });
    case "infrastructure_divider": return makeInfrastructureDivider(year);
    case "infrastructure_page": return makeInfrastructurePage({ year, parcelId: "p-cluj-floresti" });
    case "stat_infographic": return makeStatInfographic({ year });
    case "trend": return makeTrend({ year, kpiCode: "gdp_per_capita", locationSiruta: siruta ?? CLUJ_COUNTY_SIRUTA });
    case "comparison": return makeComparison({ year, kpiCode: "wage_avg", locationSirutas: [CLUJ_COUNTY_SIRUTA, BN_COUNTY_SIRUTA] });
    case "recommendation": return makeRecommendation({ year, sector: "tech" });
    case "text": return makeTextSlide({ year });
    case "contact": return makeContactSlide({ year });
  }
}

/** Stable label for a slide in the sidebar outline. */
export function slideOutlineLabel(slide: Slide): string {
  switch (slide.kind) {
    case "cover": return slide.title;
    case "section_divider":
    case "strategic_location":
    case "infrastructure_divider":
    case "parcel_detail": return slide.title;
    case "county_snapshot":
    case "city_snapshot": return slide.headline;
    case "commune_detail": return slide.headline;
    case "infrastructure_page": return slide.headline;
    case "stat_infographic": return slide.headline;
    case "trend":
    case "comparison":
    case "recommendation": return slide.headline;
    case "text": return slide.title;
    case "contact": return slide.headline;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: pre-existing errors only; no new errors in `decks.ts`.

- [ ] **Step 3: Do NOT commit yet** — tests land in Task 7 first.

### Task 7: Test slide factories + seeded deck integrity

**Files:**
- Create: `frontend/src/lib/decks/__tests__/decks.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/decks/__tests__/decks.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  makeInvestorPitchDeck,
  makeBlankDeck,
  defaultSlideForKind,
  slideOutlineLabel,
  SLIDE_PALETTE_GROUPS,
  type SlideKind,
} from "@/lib/mock/decks";

describe("makeInvestorPitchDeck", () => {
  it("produces exactly 17 slides modeled on the reference PDF", () => {
    const d = makeInvestorPitchDeck({ year: 2024 });
    expect(d.slides).toHaveLength(17);
  });

  it("starts with a cover and ends with a contact slide", () => {
    const d = makeInvestorPitchDeck({ year: 2024 });
    expect(d.slides[0].kind).toBe("cover");
    expect(d.slides[d.slides.length - 1].kind).toBe("contact");
  });

  it("every slide carries the seeded year as dataYear", () => {
    const d = makeInvestorPitchDeck({ year: 2024 });
    for (const s of d.slides) expect(s.dataYear).toBe(2024);
  });

  it("is marked as a shared template deck", () => {
    expect(makeInvestorPitchDeck({ year: 2024 }).isShared).toBe(true);
  });

  it("uses the Florești SIRUTA as the primary location", () => {
    expect(makeInvestorPitchDeck({ year: 2024 }).locationSiruta).toBe("57706");
  });
});

describe("makeBlankDeck", () => {
  it("contains 2 slides (cover + text)", () => {
    const d = makeBlankDeck({ year: 2024 });
    expect(d.slides).toHaveLength(2);
    expect(d.slides[0].kind).toBe("cover");
    expect(d.slides[1].kind).toBe("text");
  });

  it("is not shared", () => {
    expect(makeBlankDeck({ year: 2024 }).isShared).toBe(false);
  });
});

describe("defaultSlideForKind", () => {
  it("covers every kind in the SLIDE_PALETTE_GROUPS table", () => {
    const allKinds = SLIDE_PALETTE_GROUPS.flatMap((g) => g.kinds);
    expect(new Set(allKinds).size).toBe(15);
    for (const kind of allKinds as SlideKind[]) {
      const s = defaultSlideForKind(kind, { year: 2024, locationSiruta: "57706" });
      expect(s.kind).toBe(kind);
      expect(s.dataYear).toBe(2024);
    }
  });
});

describe("slideOutlineLabel", () => {
  it("returns a non-empty label for every kind", () => {
    const allKinds = SLIDE_PALETTE_GROUPS.flatMap((g) => g.kinds) as SlideKind[];
    for (const kind of allKinds) {
      const s = defaultSlideForKind(kind, { year: 2024, locationSiruta: "57706" });
      expect(slideOutlineLabel(s).length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `cd web && npm test -- decks.test.ts`
Expected: 8 tests pass.

- [ ] **Step 3: Commit Wave 1 in one diff**

```bash
git add frontend/src/lib/mock/decks.ts frontend/src/lib/decks/__tests__/decks.test.ts
git commit -m "feat(reports): deck data model + seeded Investor Pitch Florești"
```

---

## Wave 2 — Migration + cleanup (2 tasks)

Migrate localStorage, delete old report files. After Wave 2, the repo compiles again (no orphan imports).

### Task 8: Write deckMigration + tests, then delete old report files

**Files:**
- Create: `frontend/src/lib/decks/deckMigration.ts`
- Create: `frontend/src/lib/decks/__tests__/deckMigration.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/decks/__tests__/deckMigration.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { runDeckMigration } from "@/lib/decks/deckMigration";
import { STORAGE_KEYS } from "@/lib/persistence/keys";

describe("runDeckMigration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("seeds an Investor Pitch deck when no innoinvest:decks key is present", () => {
    runDeckMigration(2024);
    const raw = window.localStorage.getItem(STORAGE_KEYS.decks);
    expect(raw).not.toBeNull();
    const decks = JSON.parse(raw!);
    expect(decks).toHaveLength(1);
    expect(decks[0].templateOrigin).toBe("investor-pitch");
    expect(window.localStorage.getItem(STORAGE_KEYS.activeDeck)).toBe(decks[0].id);
  });

  it("is a no-op when innoinvest:decks already exists", () => {
    window.localStorage.setItem(STORAGE_KEYS.decks, JSON.stringify([{ id: "existing" }]));
    runDeckMigration(2024);
    const raw = window.localStorage.getItem(STORAGE_KEYS.decks);
    expect(JSON.parse(raw!)).toEqual([{ id: "existing" }]);
  });

  it("clears the legacy innoinvest:templates and innoinvest:reports keys on first run", () => {
    window.localStorage.setItem("innoinvest:templates", "[]");
    window.localStorage.setItem("innoinvest:reports", "[]");
    runDeckMigration(2024);
    expect(window.localStorage.getItem("innoinvest:templates")).toBeNull();
    expect(window.localStorage.getItem("innoinvest:reports")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- deckMigration.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the migration**

Create `frontend/src/lib/decks/deckMigration.ts`:

```ts
/**
 * One-time localStorage migration helper. Run once on /reports mount.
 *
 * Old schema (template + slot model) is incompatible with the new
 * typed-slide Deck model. There is no upgrade path — the demo restarts
 * cleanly with the seeded Investor Pitch deck.
 */

import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { makeInvestorPitchDeck, type Deck } from "@/lib/mock/decks";

const LEGACY_KEYS = ["innoinvest:templates", "innoinvest:reports"];

export function runDeckMigration(year: number): void {
  if (typeof window === "undefined") return;

  // No-op when the new schema is already present.
  if (window.localStorage.getItem(STORAGE_KEYS.decks) !== null) return;

  // Drop legacy keys (schemas are incompatible).
  for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);

  const seeded: Deck = makeInvestorPitchDeck({ year });
  window.localStorage.setItem(STORAGE_KEYS.decks, JSON.stringify([seeded]));
  window.localStorage.setItem(STORAGE_KEYS.activeDeck, seeded.id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- deckMigration.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Delete old report files + templates.ts**

```bash
cd web
rm src/components/reports/TemplateLibrary.tsx
rm src/components/reports/TemplateCanvas.tsx
rm src/components/reports/SectionBlock.tsx
rm src/components/reports/SlotDropZone.tsx
rm src/components/reports/VariablesPicker.tsx
rm src/components/reports/LocationPicker.tsx
rm src/components/reports/GenerateOverlay.tsx
rm src/components/reports/ReportPreview.tsx
rm src/components/reports/DiffBadge.tsx
rm src/lib/mock/templates.ts
```

- [ ] **Step 6: Replace `/reports/page.tsx` and `/reports/[reportId]/page.tsx` with stubs**

These will be properly rewritten in Wave 8 and 9. For now, install minimal stubs so the build compiles.

Overwrite `frontend/src/app/reports/page.tsx`:

```tsx
"use client";

import { TopNav } from "@/components/stitch/TopNav";

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="grid flex-1 place-items-center p-8 text-on-surface-variant">
        Deck editor — under construction
      </main>
    </div>
  );
}
```

Overwrite `frontend/src/app/reports/[reportId]/page.tsx`:

```tsx
"use client";

import { TopNav } from "@/components/stitch/TopNav";

export default function ReportPreviewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="grid flex-1 place-items-center p-8 text-on-surface-variant">
        Deck preview — under construction
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck + build**

Run: `cd web && npx tsc --noEmit && npm run build`
Expected: success.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(reports): remove template/slot builder, add deck migration helper"
```

---

## Wave 3 — Brand chrome (3 tasks)

Locked top-left flag, top-right logo strip, bottom-right page number, and a `SlideShell` wrapper that enforces landscape-A4 aspect and composes all three. Also lands photo placeholders.

### Task 9: BrandFlag, LogoStrip, PageNumber components

**Files:**
- Create: `frontend/src/components/reports/chrome/BrandFlag.tsx`
- Create: `frontend/src/components/reports/chrome/LogoStrip.tsx`
- Create: `frontend/src/components/reports/chrome/PageNumber.tsx`

- [ ] **Step 1: Create BrandFlag**

Create `frontend/src/components/reports/chrome/BrandFlag.tsx`:

```tsx
/**
 * ADR Nord-Vest flag — locked top-left of every slide. Clip-path forms
 * an arrow shape mirroring the reference PDF; size scales with the slide.
 */
export function BrandFlag() {
  return (
    <div
      aria-hidden="true"
      className="absolute left-0 top-0 z-10 flex h-[6.5%] w-[2.6%] flex-col items-center justify-start pt-[0.6%]"
      style={{
        background: "var(--color-deck-deep)",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%)",
      }}
    >
      <span
        className="rotate-0 text-center text-[6px] font-bold leading-[1.1] tracking-wide text-white"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        ADR NV
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create LogoStrip**

Create `frontend/src/components/reports/chrome/LogoStrip.tsx`:

```tsx
import { getLocation } from "@/lib/mock/locations";

type Props = {
  locationSiruta: string | null;
};

/**
 * Top-right logo strip: location coat-of-arms (placeholder SVG) +
 * INNO wordmark. Auto-selects coat based on the deck's county.
 */
export function LogoStrip({ locationSiruta }: Props) {
  const loc = locationSiruta ? getLocation(locationSiruta) : undefined;
  const countyCode = loc?.countyCode ?? "default";
  const coatHref = `/deck-photos/coats/${countyCode}.svg`;
  return (
    <div className="absolute right-[3%] top-[2.5%] z-10 flex items-center gap-3">
      {/* Coat-of-arms — falls back to default when the file is missing. */}
      <img
        src={coatHref}
        alt=""
        className="h-10 w-auto"
        onError={(e) => {
          const t = e.currentTarget;
          if (!t.dataset.fallback) {
            t.dataset.fallback = "1";
            t.src = "/deck-photos/coats/default.svg";
          }
        }}
      />
      <div className="flex flex-col items-end leading-none">
        <span className="text-[10px] font-semibold tracking-wide text-[var(--color-deck-deep)]">
          INNO
        </span>
        <span className="text-[8px] tracking-wider text-[var(--color-deck-muted)]">
          NORD-VEST
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create PageNumber**

Create `frontend/src/components/reports/chrome/PageNumber.tsx`:

```tsx
type Props = { page: number; total: number };

export function PageNumber({ page, total }: Props) {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-[2%] right-[2.5%] z-10 text-[10px] tabular-nums text-[var(--color-deck-muted)]"
    >
      {page.toString().padStart(2, "0")} / {total.toString().padStart(2, "0")}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Do NOT commit yet** — SlideShell + photos land in Task 10.

### Task 10: SlideShell wrapper + stock photo placeholders

**Files:**
- Create: `frontend/src/components/reports/chrome/SlideShell.tsx`
- Create: `frontend/public/deck-photos/CREDITS.md`
- Create: `frontend/public/deck-photos/coats/default.svg`
- Create: 5 more placeholder coat SVGs (`54`, `63`, `120`, `275`, `393`, `402`)
- Create: 6 placeholder photo files

- [ ] **Step 1: Write SlideShell**

Create `frontend/src/components/reports/chrome/SlideShell.tsx`:

```tsx
import type { ReactNode } from "react";
import { BrandFlag } from "./BrandFlag";
import { LogoStrip } from "./LogoStrip";
import { PageNumber } from "./PageNumber";

type Props = {
  children: ReactNode;
  /** SIRUTA used by the LogoStrip's coat picker. */
  locationSiruta: string | null;
  /** 1-indexed page number; pass null to hide. */
  page: number | null;
  total: number;
  /** Optional extra root class — e.g. background override for divider slides. */
  className?: string;
  /** When true, omit the chrome (used by Cover which has its own treatment). */
  bare?: boolean;
};

/**
 * The locked, landscape-A4 frame every slide is rendered inside.
 *
 * Aspect ratio: 1.414 : 1 (A4 landscape). The parent decides the WIDTH;
 * the shell sets the height via aspect-ratio. Tied to `.deck-slide` so
 * the print stylesheet can target it.
 */
export function SlideShell({ children, locationSiruta, page, total, className = "", bare = false }: Props) {
  return (
    <article
      className={
        "deck-slide relative overflow-hidden bg-[var(--color-deck-paper)] text-[var(--color-deck-ink)] shadow-sm ring-1 ring-black/5 " +
        className
      }
      style={{ aspectRatio: "1.414 / 1" }}
    >
      {!bare && (
        <>
          <BrandFlag />
          <LogoStrip locationSiruta={locationSiruta} />
          {page !== null && <PageNumber page={page} total={total} />}
        </>
      )}
      <div className="relative z-0 h-full w-full">{children}</div>
    </article>
  );
}
```

- [ ] **Step 2: Create coat-of-arms placeholders**

Create `frontend/public/deck-photos/coats/default.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <rect width="40" height="40" rx="4" fill="#157777"/>
  <text x="20" y="25" text-anchor="middle" font-family="serif" font-size="14" font-weight="700" fill="#fff">NW</text>
</svg>
```

Repeat with the same template (only changing the label text) for each county SIRUTA file:

| Filename | Label |
| --- | --- |
| `54.svg` | BH |
| `63.svg` | BN |
| `120.svg` | CJ |
| `275.svg` | MM |
| `393.svg` | SM |
| `402.svg` | SJ |

For each, create the SVG with the label substituted into the `<text>` element.

- [ ] **Step 3: Create photo placeholders**

These ship as ~1KB SVG placeholders for v1; the spec calls for real JPEGs but the planning level locks the *interface* — swap real photos in later. Each placeholder:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a3a"/>
      <stop offset="100%" stop-color="#0b1f1f"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <text x="800" y="470" text-anchor="middle" font-family="sans-serif" font-size="44" fill="rgba(255,255,255,.4)">PLACEHOLDER LABEL</text>
</svg>
```

Create one SVG per filename, replacing "PLACEHOLDER LABEL" with the photo's stub label:

| Filename | Label |
| --- | --- |
| `industrial-park-1.svg` | INDUSTRIAL PARK |
| `urban-cluj.svg` | CLUJ-NAPOCA |
| `commune-blocks.svg` | RESIDENTIAL |
| `landscape-mountains.svg` | NW LANDSCAPE |
| `highway-aerial.svg` | A3 MOTORWAY |
| `satellite-default.svg` | SATELLITE |

Each file goes in `frontend/public/deck-photos/<name>.svg`.

- [ ] **Step 4: Create CREDITS.md**

Create `frontend/public/deck-photos/CREDITS.md`:

```markdown
# Deck photo credits

For v1 of the deck builder, the 6 background images shipped under this
directory are placeholder SVGs. When swapping in real JPEGs, source from a
free-commercial-use library (Unsplash / Pexels), keep filenames stable,
and record attributions here.

- industrial-park-1.svg — placeholder
- urban-cluj.svg — placeholder
- commune-blocks.svg — placeholder
- landscape-mountains.svg — placeholder
- highway-aerial.svg — placeholder
- satellite-default.svg — placeholder
```

Note: the spec specifies `.jpg`, but placeholders are `.svg`. The renderer maps `PhotoId` → URL via a helper that picks the right extension once real photos are added. Create that helper now:

- [ ] **Step 5: Add photo URL helper to decks.ts**

Append to `frontend/src/lib/mock/decks.ts`:

```ts
/** Resolve a PhotoId to a public URL. Returns null for `null` PhotoId. */
export function photoUrl(id: PhotoId): string | null {
  if (id === null) return null;
  return `/deck-photos/${id}.svg`;
}
```

- [ ] **Step 6: Verify assets are served**

Run `cd web && npm run dev`, then in a browser open `http://localhost:3000/deck-photos/industrial-park-1.svg` and `http://localhost:3000/deck-photos/coats/120.svg`. Both should render the placeholder graphics.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/reports/chrome frontend/public/deck-photos frontend/src/lib/mock/decks.ts
git commit -m "feat(reports): brand chrome (flag/logo/page) + SlideShell + photo placeholders"
```

### Task 11: SlideRenderer skeleton (discriminated-union switch)

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/SlideRenderer.tsx`

- [ ] **Step 1: Write the skeleton**

Create `frontend/src/components/reports/deck/renderers/SlideRenderer.tsx`:

```tsx
import { SlideShell } from "@/components/reports/chrome/SlideShell";
import type { Deck, Slide } from "@/lib/mock/decks";

type Props = {
  slide: Slide;
  /** 1-indexed page number; null hides the page number (cover/contact). */
  page: number | null;
  total: number;
  deck: Deck;
  /** When true, render in fixed read-only mode (no contenteditable). */
  readOnly: boolean;
  /** Called with a patched slide when an editable field commits. */
  onChange?: (patch: Partial<Slide>) => void;
};

/**
 * Discriminated-union switch. Each kind delegates to its own renderer.
 * Renderers are added in Waves 4-6; until then the default branch shows
 * a clear placeholder so the editor scaffolding can be exercised early.
 */
export function SlideRenderer({ slide, page, total, deck, readOnly, onChange }: Props) {
  return (
    <SlideShell
      locationSiruta={deck.locationSiruta}
      page={slide.kind === "cover" || slide.kind === "contact" ? null : page}
      total={total}
      bare={slide.kind === "cover"}
    >
      <div className="grid h-full place-items-center text-[var(--color-deck-muted)]">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider">{slide.kind}</p>
          <p className="text-sm">Renderer pending</p>
        </div>
      </div>
    </SlideShell>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/deck/renderers/SlideRenderer.tsx
git commit -m "feat(reports): SlideRenderer skeleton with kind-dispatch placeholder"
```

---

## Wave 4 — Auto-narrative + simple renderers (4 tasks)

The 5 simplest slide kinds (no charts, no maps).

### Task 12: autoNarrative.ts + tests

**Files:**
- Create: `frontend/src/lib/decks/autoNarrative.ts`
- Create: `frontend/src/lib/decks/__tests__/autoNarrative.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/decks/__tests__/autoNarrative.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { countyNarrative, cityNarrative, communeCallout } from "@/lib/decks/autoNarrative";

describe("autoNarrative", () => {
  it("countyNarrative returns a non-empty string mentioning the location name", () => {
    const out = countyNarrative({ siruta: "120", year: 2024 });
    expect(out.length).toBeGreaterThan(20);
    expect(out).toMatch(/Cluj/);
  });

  it("cityNarrative returns three paragraphs", () => {
    const paragraphs = cityNarrative({ siruta: "54975", year: 2024 });
    expect(paragraphs).toHaveLength(3);
    paragraphs.forEach((p) => expect(p.length).toBeGreaterThan(10));
  });

  it("communeCallout cites the commune name", () => {
    const out = communeCallout({ siruta: "57706", year: 2024 });
    expect(out).toMatch(/Florești/);
  });

  it("returns sensible fallbacks for unknown SIRUTA", () => {
    expect(countyNarrative({ siruta: "999999", year: 2024 })).toMatch(/region/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- autoNarrative.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the helpers**

Create `frontend/src/lib/decks/autoNarrative.ts`:

```ts
/**
 * Templated paragraph generators that synthesise narrative copy from
 * the deterministic observations + locations data. No LLM — pure
 * string templating with KPI lookups so output is stable across renders.
 */

import { getLocation } from "@/lib/mock/locations";
import { getObservation } from "@/lib/mock/observations";
import { formatKpiValue, getKpi } from "@/lib/mock/kpis";

function formattedKpi(siruta: string, kpiCode: string, year: number): string {
  const kpi = getKpi(kpiCode);
  if (!kpi) return "—";
  const o = getObservation(siruta, kpiCode, year);
  return formatKpiValue(o?.value, kpi);
}

export function countyNarrative({ siruta, year }: { siruta: string; year: number }): string {
  const loc = getLocation(siruta);
  if (!loc) return "Nord-Vest region snapshot for the selected year.";
  const pop = formattedKpi(siruta, "pop_total", year);
  const gdp = formattedKpi(siruta, "gdp_per_capita", year);
  const wage = formattedKpi(siruta, "wage_avg", year);
  return `${loc.name} County is home to ${pop}, with GDP per capita at ${gdp} and an average gross wage of ${wage}. The county anchors the Nord-Vest region's tech, manufacturing and logistics economy.`;
}

export function cityNarrative({ siruta, year }: { siruta: string; year: number }): string[] {
  const loc = getLocation(siruta);
  if (!loc) return ["City snapshot.", "Workforce snapshot.", "Infrastructure snapshot."];
  const pop = formattedKpi(siruta, "pop_total", year);
  const tert = formattedKpi(siruta, "tertiary_attainment", year);
  const fibre = formattedKpi(siruta, "fiber_coverage", year);
  return [
    `${loc.name} is the urban anchor of ${loc.countyName} County, with ${pop} residents and a growing tech & services ecosystem.`,
    `Tertiary education attainment of ${tert} provides a deep, multilingual talent pool that has attracted sustained foreign direct investment.`,
    `Modern infrastructure — including ${fibre} fibre broadband coverage — supports the city's continued growth.`,
  ];
}

export function communeCallout({ siruta, year }: { siruta: string; year: number }): string {
  const loc = getLocation(siruta);
  if (!loc) return "Fastest-growing commune in the region.";
  const pop = formattedKpi(siruta, "pop_total", year);
  return `${loc.name} hosts ${pop} — among the largest communes in Romania.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- autoNarrative.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/decks/autoNarrative.ts frontend/src/lib/decks/__tests__/autoNarrative.test.ts
git commit -m "feat(reports): templated auto-narrative for snapshot slides"
```

### Task 13: TextSlideRenderer + ContactSlideRenderer

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/TextSlideRenderer.tsx`
- Create: `frontend/src/components/reports/deck/renderers/ContactSlideRenderer.tsx`
- Modify: `frontend/src/components/reports/deck/renderers/SlideRenderer.tsx` (wire 2 kinds)

- [ ] **Step 1: Write TextSlideRenderer**

Create `frontend/src/components/reports/deck/renderers/TextSlideRenderer.tsx`:

```tsx
import type { TextSlide } from "@/lib/mock/decks";

type Props = { slide: TextSlide };

export function TextSlideRenderer({ slide }: Props) {
  return (
    <div className="flex h-full flex-col gap-6 px-[8%] py-[8%]">
      <h1 className="deck-underline text-4xl font-bold tracking-tight text-[var(--color-deck-deep)]">
        {slide.title}
      </h1>
      <div className="flex flex-col gap-4 text-[16px] leading-relaxed text-[var(--color-deck-ink)]">
        {slide.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write ContactSlideRenderer**

Create `frontend/src/components/reports/deck/renderers/ContactSlideRenderer.tsx`:

```tsx
import type { ContactSlide } from "@/lib/mock/decks";

type Props = { slide: ContactSlide };

export function ContactSlideRenderer({ slide }: Props) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-8 px-[8%] py-[8%] text-center text-white"
      style={{ background: "var(--color-deck-deep)" }}
    >
      <p className="deck-eyebrow text-[var(--color-deck-accent)]">Contact</p>
      <h1 className="text-5xl font-bold tracking-tight">{slide.headline}</h1>
      <dl className="grid grid-cols-1 gap-2 text-[15px]">
        {slide.contactRows.map((r, i) => (
          <div key={i} className="flex items-center justify-center gap-3">
            <dt className="text-white/60">{r.label}</dt>
            <dd className="font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[14px] text-[var(--color-deck-accent)]">{slide.ctaText}</p>
    </div>
  );
}
```

- [ ] **Step 3: Wire both into SlideRenderer**

Edit `frontend/src/components/reports/deck/renderers/SlideRenderer.tsx`. Add imports near the top:

```tsx
import { TextSlideRenderer } from "./TextSlideRenderer";
import { ContactSlideRenderer } from "./ContactSlideRenderer";
```

Replace the placeholder `<div className="grid h-full place-items-center …">` body with a switch:

```tsx
function renderBody(): React.ReactNode {
  switch (slide.kind) {
    case "text":
      return <TextSlideRenderer slide={slide} />;
    case "contact":
      return <ContactSlideRenderer slide={slide} />;
    default:
      return (
        <div className="grid h-full place-items-center text-[var(--color-deck-muted)]">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider">{slide.kind}</p>
            <p className="text-sm">Renderer pending</p>
          </div>
        </div>
      );
  }
}
```

Then render `{renderBody()}` inside the `SlideShell`. Add `import type * as React from "react";` if not already imported.

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): TextSlide + ContactSlide renderers"
```

### Task 14: Divider renderers (SectionDivider, StrategicLocation, InfrastructureDivider)

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/SectionDividerSlideRenderer.tsx`
- Create: `frontend/src/components/reports/deck/renderers/StrategicLocationSlideRenderer.tsx`
- Create: `frontend/src/components/reports/deck/renderers/InfrastructureDividerSlideRenderer.tsx`
- Modify: `SlideRenderer.tsx` (wire 3 kinds)

- [ ] **Step 1: All three are structurally identical — write a shared inner**

Create `frontend/src/components/reports/deck/renderers/SectionDividerSlideRenderer.tsx`:

```tsx
import { photoUrl, type SectionDividerSlide } from "@/lib/mock/decks";

type Props = { slide: SectionDividerSlide };

export function SectionDividerSlideRenderer({ slide }: Props) {
  return <DividerInner title={slide.title} photoId={slide.backgroundPhotoId} eyebrow="Section" />;
}

export function DividerInner({
  title,
  photoId,
  eyebrow,
}: {
  title: string;
  photoId: ReturnType<typeof photoUrl> extends infer T ? T : never;
  eyebrow: string;
}) {
  const bg = photoUrl(photoId as Parameters<typeof photoUrl>[0]);
  return (
    <div className="relative flex h-full items-center justify-center">
      {bg && (
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="relative z-10 max-w-[70%] text-center text-white">
        <p className="deck-eyebrow text-[var(--color-deck-accent)]">{eyebrow}</p>
        <h1 className="mt-3 text-6xl font-bold uppercase tracking-tight">{title}</h1>
        <div className="mx-auto mt-5 h-[3px] w-24 bg-[var(--color-deck-accent)]" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the other two as thin wrappers**

Create `frontend/src/components/reports/deck/renderers/StrategicLocationSlideRenderer.tsx`:

```tsx
import type { StrategicLocationSlide } from "@/lib/mock/decks";
import { DividerInner } from "./SectionDividerSlideRenderer";

export function StrategicLocationSlideRenderer({ slide }: { slide: StrategicLocationSlide }) {
  return <DividerInner title={slide.title} photoId={slide.backgroundPhotoId} eyebrow="Strategic location" />;
}
```

Create `frontend/src/components/reports/deck/renderers/InfrastructureDividerSlideRenderer.tsx`:

```tsx
import type { InfrastructureDividerSlide } from "@/lib/mock/decks";
import { DividerInner } from "./SectionDividerSlideRenderer";

export function InfrastructureDividerSlideRenderer({ slide }: { slide: InfrastructureDividerSlide }) {
  return <DividerInner title={slide.title} photoId={slide.backgroundPhotoId} eyebrow="Infrastructure" />;
}
```

- [ ] **Step 3: Wire into SlideRenderer**

In `SlideRenderer.tsx`, add imports and switch cases:

```tsx
import { SectionDividerSlideRenderer } from "./SectionDividerSlideRenderer";
import { StrategicLocationSlideRenderer } from "./StrategicLocationSlideRenderer";
import { InfrastructureDividerSlideRenderer } from "./InfrastructureDividerSlideRenderer";
```

And in the switch:

```tsx
case "section_divider": return <SectionDividerSlideRenderer slide={slide} />;
case "strategic_location": return <StrategicLocationSlideRenderer slide={slide} />;
case "infrastructure_divider": return <InfrastructureDividerSlideRenderer slide={slide} />;
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): section/strategic/infrastructure divider renderers"
```

### Task 15: CoverSlideRenderer (RO map with county highlight)

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/CoverSlideRenderer.tsx`
- Modify: `SlideRenderer.tsx` (wire `cover`)

- [ ] **Step 1: Write the renderer**

Create `frontend/src/components/reports/deck/renderers/CoverSlideRenderer.tsx`:

```tsx
import type { CoverSlide } from "@/lib/mock/decks";
import { NW_COUNTIES_GEO } from "@/lib/mock/nw-counties-geo";

type Props = { slide: CoverSlide };

/**
 * Cover layout: deep teal hero band on the left with title + meta,
 * cream right column carrying an inline-SVG RO map (NW counties
 * only — the same outline used by MapBlock). The deck's county is
 * highlighted in the accent orange.
 */
export function CoverSlideRenderer({ slide }: Props) {
  // Compute the bounding box of the NW counties so the SVG can fit-to-content.
  const allCoords: number[][] = NW_COUNTIES_GEO.features.flatMap((f) =>
    f.geometry.coordinates.flat()
  );
  const xs = allCoords.map((c) => c[0]);
  const ys = allCoords.map((c) => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  const PAD = 0.2;
  const viewBox = `${minX - PAD} ${-(maxY + PAD)} ${w + 2 * PAD} ${h + 2 * PAD}`;

  function pathFor(coords: number[][]): string {
    return (
      coords
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0]} ${-pt[1]}`)
        .join(" ") + " Z"
    );
  }

  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr]">
      <div
        className="flex flex-col justify-between p-[6%] text-white"
        style={{ background: "var(--color-deck-deep)" }}
      >
        <div>
          <p className="deck-eyebrow text-[var(--color-deck-accent)]">{slide.preparedFor}</p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight">{slide.title}</h1>
          <p className="mt-3 text-[18px] text-white/80">{slide.subtitle}</p>
        </div>
        <div className="text-[12px] text-white/60">{slide.dateIssued}</div>
      </div>
      <div className="grid place-items-center bg-[var(--color-deck-paper)] p-[6%]">
        <svg viewBox={viewBox} className="h-full w-full max-h-[70%] max-w-[80%]">
          {NW_COUNTIES_GEO.features.map((f) => {
            const isActive =
              slide.highlightCounty !== null &&
              (f.properties as { siruta?: string }).siruta === slide.highlightCounty;
            return (
              <path
                key={(f.properties as { siruta?: string }).siruta ?? f.id}
                d={pathFor(f.geometry.coordinates[0])}
                fill={isActive ? "var(--color-deck-accent)" : "#d8e3e2"}
                stroke="#fff"
                strokeWidth={0.02}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify NW_COUNTIES_GEO export shape**

Run: `grep -n "NW_COUNTIES_GEO\|features\|coordinates\|siruta\|properties" frontend/src/lib/mock/nw-counties-geo.ts | head -20`
Expected: confirm the export is `NW_COUNTIES_GEO` with `.features[i].geometry.coordinates[0]` (Polygon outer ring) and `properties.siruta`. If a sibling key is used (e.g. `code` instead of `siruta`), update the renderer to match.

- [ ] **Step 3: Wire into SlideRenderer**

In `SlideRenderer.tsx`:

```tsx
import { CoverSlideRenderer } from "./CoverSlideRenderer";
// in switch:
case "cover": return <CoverSlideRenderer slide={slide} />;
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): CoverSlide renderer with NW counties RO map"
```

---

## Wave 5 — Snapshot renderers (3 tasks)

The data-bound headline slides: county / city / commune.

### Task 16: CountySnapshotSlideRenderer

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/CountySnapshotSlideRenderer.tsx`
- Modify: `SlideRenderer.tsx`

- [ ] **Step 1: Write the renderer**

Create `frontend/src/components/reports/deck/renderers/CountySnapshotSlideRenderer.tsx`:

```tsx
import { formatKpiValue, getKpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { getObservation, getSeries } from "@/lib/mock/observations";
import { Sparkline } from "@/components/charts/Sparkline";
import type { CountySnapshotSlide } from "@/lib/mock/decks";

type Props = { slide: CountySnapshotSlide };

export function CountySnapshotSlideRenderer({ slide }: Props) {
  const loc = getLocation(slide.locationSiruta);
  const tiles = slide.kpiCodes.slice(0, 4).map((code) => {
    const kpi = getKpi(code);
    const o = kpi ? getObservation(slide.locationSiruta, code, slide.dataYear) : undefined;
    return {
      code,
      label: kpi?.nameEn ?? code,
      value: kpi ? formatKpiValue(o?.value, kpi) : "—",
    };
  });
  const sparkValues = slide.kpiCodes.slice(0, 4).map((code) =>
    getSeries(slide.locationSiruta, code).map((o) => o.value)
  );
  return (
    <div className="flex h-full flex-col gap-6 px-[7%] py-[7%]">
      <div>
        <p className="deck-eyebrow">{slide.eyebrow}</p>
        <h1 className="deck-underline mt-2 text-4xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
        <p className="mt-1 text-[12px] text-[var(--color-deck-muted)]">
          {loc?.countyName ?? ""} · {slide.dataYear}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div
            key={t.code}
            className="rounded-md border border-[var(--color-deck-deep)]/15 bg-white p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-deck-muted)]">
              {t.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-deck-deep)]">{t.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-4 gap-4">
        {sparkValues.map((vals, i) => (
          <div key={i} className="rounded bg-white/60 p-2">
            <Sparkline values={vals} width={180} height={36} />
          </div>
        ))}
      </div>
      {slide.narrative && (
        <p className="text-[14px] leading-relaxed text-[var(--color-deck-ink)]/80">{slide.narrative}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into SlideRenderer**

In `SlideRenderer.tsx`:

```tsx
import { CountySnapshotSlideRenderer } from "./CountySnapshotSlideRenderer";
// in switch:
case "county_snapshot": return <CountySnapshotSlideRenderer slide={slide} />;
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): CountySnapshot renderer"
```

### Task 17: CitySnapshotSlideRenderer

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/CitySnapshotSlideRenderer.tsx`
- Modify: `SlideRenderer.tsx`

- [ ] **Step 1: Write the renderer**

Create `frontend/src/components/reports/deck/renderers/CitySnapshotSlideRenderer.tsx`:

```tsx
import { formatKpiValue, getKpi } from "@/lib/mock/kpis";
import { getObservation } from "@/lib/mock/observations";
import { photoUrl, type CitySnapshotSlide } from "@/lib/mock/decks";

type Props = { slide: CitySnapshotSlide };

export function CitySnapshotSlideRenderer({ slide }: Props) {
  const photo = photoUrl(slide.photoId);
  const tiles = slide.kpiCodes.slice(0, 4).map((code) => {
    const kpi = getKpi(code);
    const o = kpi ? getObservation(slide.locationSiruta, code, slide.dataYear) : undefined;
    return {
      code,
      label: kpi?.nameEn ?? code,
      value: kpi ? formatKpiValue(o?.value, kpi) : "—",
    };
  });
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-5 p-[6%]">
        <div>
          <p className="deck-eyebrow">{slide.eyebrow}</p>
          <h1 className="deck-underline mt-2 text-4xl font-bold tracking-tight text-[var(--color-deck-deep)]">
            {slide.headline}
          </h1>
        </div>
        <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--color-deck-ink)]">
          {slide.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <div key={t.code} className="rounded border border-[var(--color-deck-deep)]/15 bg-white p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-deck-muted)]">
                {t.label}
              </p>
              <p className="mt-1 text-xl font-bold text-[var(--color-deck-deep)]">{t.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div
          className="absolute inset-x-0 bottom-0 h-[40%]"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.5), transparent)" }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire + typecheck + commit**

In `SlideRenderer.tsx`:

```tsx
import { CitySnapshotSlideRenderer } from "./CitySnapshotSlideRenderer";
// in switch:
case "city_snapshot": return <CitySnapshotSlideRenderer slide={slide} />;
```

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): CitySnapshot renderer"
```

### Task 18: CommuneDetailSlideRenderer

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/CommuneDetailSlideRenderer.tsx`
- Modify: `SlideRenderer.tsx`

- [ ] **Step 1: Write the renderer**

Create `frontend/src/components/reports/deck/renderers/CommuneDetailSlideRenderer.tsx`:

```tsx
import { photoUrl, type CommuneDetailSlide } from "@/lib/mock/decks";

type Props = { slide: CommuneDetailSlide };

export function CommuneDetailSlideRenderer({ slide }: Props) {
  const photo = photoUrl(slide.heroPhotoId);
  return (
    <div className="grid h-full grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between p-[7%]">
        <div>
          <p className="deck-eyebrow">Commune</p>
          <h1 className="deck-underline mt-2 text-4xl font-bold tracking-tight text-[var(--color-deck-deep)]">
            {slide.headline}
          </h1>
          <div className="mt-5 flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--color-deck-ink)]">
            {slide.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <div
          className="mt-6 rounded border-l-4 border-[var(--color-deck-accent)] bg-white p-4 text-[14px] font-semibold text-[var(--color-deck-deep)]"
        >
          {slide.calloutText}
        </div>
      </div>
      <div className="relative">
        {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire + typecheck + commit**

In `SlideRenderer.tsx`:

```tsx
import { CommuneDetailSlideRenderer } from "./CommuneDetailSlideRenderer";
// in switch:
case "commune_detail": return <CommuneDetailSlideRenderer slide={slide} />;
```

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): CommuneDetail renderer"
```

---

## Wave 6 — Data renderers (4 tasks)

Charts, composite scores, infographics.

### Task 19: StatInfographicSlideRenderer (radial + panel)

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/StatInfographicSlideRenderer.tsx`
- Modify: `SlideRenderer.tsx`

- [ ] **Step 1: Write the renderer**

Create `frontend/src/components/reports/deck/renderers/StatInfographicSlideRenderer.tsx`:

```tsx
import type { StatInfographicSlide } from "@/lib/mock/decks";

type Props = { slide: StatInfographicSlide };

export function StatInfographicSlideRenderer({ slide }: Props) {
  if (slide.layout === "radial") return <RadialLayout slide={slide} />;
  return <PanelLayout slide={slide} />;
}

function RadialLayout({ slide }: Props) {
  const items = slide.stats.slice(0, 8);
  const N = items.length;
  const RX = 32;
  const RY = 30;
  const centre = { x: 50, y: 50 };
  return (
    <div className="flex h-full flex-col gap-4 px-[6%] py-[6%]">
      <h1 className="deck-underline text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
        {slide.headline}
      </h1>
      <div className="relative grid flex-1 place-items-center">
        <svg viewBox="0 0 100 100" className="h-full w-full max-h-[85%] max-w-[85%]">
          <circle cx={centre.x} cy={centre.y} r={4} fill="var(--color-deck-accent)" />
          {items.map((_, i) => {
            const a = (i / N) * Math.PI * 2 - Math.PI / 2;
            const x = centre.x + Math.cos(a) * RX;
            const y = centre.y + Math.sin(a) * RY;
            return (
              <line
                key={i}
                x1={centre.x}
                y1={centre.y}
                x2={x}
                y2={y}
                stroke="var(--color-deck-deep)"
                strokeWidth={0.2}
                strokeDasharray="0.6 0.6"
                opacity={0.4}
              />
            );
          })}
        </svg>
        {items.map((s, i) => {
          const a = (i / N) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(a) * RX;
          const y = 50 + Math.sin(a) * RY;
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <p className="whitespace-nowrap text-2xl font-bold text-[var(--color-deck-deep)]">{s.value}</p>
              <p className="mt-0.5 max-w-[120px] text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelLayout({ slide }: Props) {
  return (
    <div className="grid h-full grid-cols-[1.4fr_1fr] gap-6 px-[6%] py-[6%]">
      <div className="flex flex-col gap-4">
        <h1 className="deck-underline text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
        <div className="grid grid-cols-2 gap-4">
          {slide.stats.map((s, i) => (
            <div key={i} className="rounded bg-white p-4 ring-1 ring-[var(--color-deck-deep)]/15">
              <p className="text-3xl font-bold text-[var(--color-deck-deep)]">{s.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
      <aside
        className="flex flex-col gap-3 rounded p-5 text-white"
        style={{ background: "var(--color-deck-deep)" }}
      >
        <p className="deck-eyebrow text-[var(--color-deck-accent)]">{slide.sidePanelTitle}</p>
        <ul className="flex flex-col divide-y divide-white/10">
          {slide.sidePanelRows.map((r, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-[14px]">
              <span>{r.label}</span>
              <span className="font-bold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Wire + commit**

In `SlideRenderer.tsx`:

```tsx
import { StatInfographicSlideRenderer } from "./StatInfographicSlideRenderer";
// in switch:
case "stat_infographic": return <StatInfographicSlideRenderer slide={slide} />;
```

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): StatInfographic renderer (radial + panel layouts)"
```

### Task 20: TrendSlideRenderer + ComparisonSlideRenderer (shared inline chart)

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/TrendSlideRenderer.tsx`
- Create: `frontend/src/components/reports/deck/renderers/ComparisonSlideRenderer.tsx`
- Create: `frontend/src/components/reports/deck/renderers/DeckLineChart.tsx` (shared inline SVG)
- Modify: `SlideRenderer.tsx`

- [ ] **Step 1: Write shared DeckLineChart**

Create `frontend/src/components/reports/deck/renderers/DeckLineChart.tsx`:

```tsx
import { getLocation } from "@/lib/mock/locations";

export type DeckLineSeries = {
  locationSiruta: string;
  points: Array<{ year: number; value: number }>;
};

type Props = {
  series: DeckLineSeries[];
  yearRange: [number, number];
  width?: number;
  height?: number;
  unit?: string;
};

const SERIES_COLORS = ["#157777", "#f5a623", "#1ea29a", "#3f51b5", "#de0b24"];

export function DeckLineChart({ series, yearRange, width = 800, height = 320, unit }: Props) {
  const [yFrom, yTo] = yearRange;
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const vMin = Math.min(...allValues);
  const vMax = Math.max(...allValues);
  const padX = 60;
  const padY = 40;
  const W = width;
  const H = height;
  const xOf = (year: number) =>
    padX + ((year - yFrom) / Math.max(1, yTo - yFrom)) * (W - padX * 2);
  const yOf = (v: number) =>
    H - padY - ((v - vMin) / Math.max(1e-9, vMax - vMin)) * (H - padY * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* axes */}
      <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#cbd5d4" strokeWidth={1} />
      <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="#cbd5d4" strokeWidth={1} />
      {/* y ticks */}
      {[0, 0.5, 1].map((t) => {
        const v = vMin + (vMax - vMin) * t;
        const y = yOf(v);
        return (
          <g key={t}>
            <line x1={padX - 4} y1={y} x2={padX} y2={y} stroke="#cbd5d4" />
            <text x={padX - 8} y={y + 3} fontSize={10} textAnchor="end" fill="#6b7271">
              {v.toFixed(0)}
            </text>
          </g>
        );
      })}
      {/* x ticks */}
      {Array.from({ length: yTo - yFrom + 1 }).map((_, i) => {
        const year = yFrom + i;
        const x = xOf(year);
        return (
          <g key={year}>
            <line x1={x} y1={H - padY} x2={x} y2={H - padY + 4} stroke="#cbd5d4" />
            <text x={x} y={H - padY + 16} fontSize={10} textAnchor="middle" fill="#6b7271">
              {year}
            </text>
          </g>
        );
      })}
      {/* series */}
      {series.map((s, idx) => {
        const colour = SERIES_COLORS[idx % SERIES_COLORS.length];
        const d = s.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p.year)} ${yOf(p.value)}`)
          .join(" ");
        return (
          <g key={s.locationSiruta}>
            <path d={d} fill="none" stroke={colour} strokeWidth={2.5} strokeLinejoin="round" />
            {s.points.map((p) => (
              <circle key={p.year} cx={xOf(p.year)} cy={yOf(p.value)} r={3} fill={colour} />
            ))}
          </g>
        );
      })}
      {/* legend */}
      <g transform={`translate(${padX}, ${padY - 24})`}>
        {series.map((s, idx) => {
          const loc = getLocation(s.locationSiruta);
          return (
            <g key={s.locationSiruta} transform={`translate(${idx * 140}, 0)`}>
              <rect width={10} height={10} fill={SERIES_COLORS[idx % SERIES_COLORS.length]} />
              <text x={16} y={9} fontSize={11} fill="#1a2322">
                {loc?.name ?? s.locationSiruta} {unit ? `(${unit})` : ""}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Write TrendSlideRenderer**

Create `frontend/src/components/reports/deck/renderers/TrendSlideRenderer.tsx`:

```tsx
import { getKpi } from "@/lib/mock/kpis";
import { getSeries } from "@/lib/mock/observations";
import { getLocation } from "@/lib/mock/locations";
import { DeckLineChart } from "./DeckLineChart";
import type { TrendSlide } from "@/lib/mock/decks";

export function TrendSlideRenderer({ slide }: { slide: TrendSlide }) {
  const kpi = getKpi(slide.kpiCode);
  const loc = getLocation(slide.locationSiruta);
  const series = [
    {
      locationSiruta: slide.locationSiruta,
      points: getSeries(slide.locationSiruta, slide.kpiCode)
        .filter((o) => o.year >= slide.yearRange[0] && o.year <= slide.yearRange[1])
        .map((o) => ({ year: o.year, value: o.value })),
    },
  ];
  return (
    <div className="flex h-full flex-col gap-4 px-[6%] py-[6%]">
      <div>
        <p className="deck-eyebrow">
          {kpi?.nameEn ?? slide.kpiCode} · {loc?.name ?? slide.locationSiruta}
        </p>
        <h1 className="deck-underline mt-2 text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
      </div>
      <div className="flex-1">
        <DeckLineChart series={series} yearRange={slide.yearRange} unit={kpi?.unit} />
      </div>
      <p className="text-[14px] leading-relaxed text-[var(--color-deck-ink)]/80">{slide.commentary}</p>
    </div>
  );
}
```

- [ ] **Step 3: Write ComparisonSlideRenderer**

Create `frontend/src/components/reports/deck/renderers/ComparisonSlideRenderer.tsx`:

```tsx
import { getKpi } from "@/lib/mock/kpis";
import { getSeries } from "@/lib/mock/observations";
import { DeckLineChart, type DeckLineSeries } from "./DeckLineChart";
import type { ComparisonSlide } from "@/lib/mock/decks";

export function ComparisonSlideRenderer({ slide }: { slide: ComparisonSlide }) {
  const kpi = getKpi(slide.kpiCode);
  const series: DeckLineSeries[] = slide.locationSirutas.map((siruta) => ({
    locationSiruta: siruta,
    points: getSeries(siruta, slide.kpiCode)
      .filter((o) => o.year >= slide.yearRange[0] && o.year <= slide.yearRange[1])
      .map((o) => ({ year: o.year, value: o.value })),
  }));
  return (
    <div className="flex h-full flex-col gap-4 px-[6%] py-[6%]">
      <div>
        <p className="deck-eyebrow">{kpi?.nameEn ?? slide.kpiCode}</p>
        <h1 className="deck-underline mt-2 text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
      </div>
      <div className="flex-1">
        <DeckLineChart series={series} yearRange={slide.yearRange} unit={kpi?.unit} />
      </div>
      <p className="text-[14px] leading-relaxed text-[var(--color-deck-ink)]/80">{slide.commentary}</p>
    </div>
  );
}
```

- [ ] **Step 4: Wire + commit**

In `SlideRenderer.tsx`:

```tsx
import { TrendSlideRenderer } from "./TrendSlideRenderer";
import { ComparisonSlideRenderer } from "./ComparisonSlideRenderer";
// in switch:
case "trend": return <TrendSlideRenderer slide={slide} />;
case "comparison": return <ComparisonSlideRenderer slide={slide} />;
```

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): Trend + Comparison renderers with shared inline chart"
```

### Task 21: RecommendationSlideRenderer (composite + RO map)

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/RecommendationSlideRenderer.tsx`
- Modify: `SlideRenderer.tsx`

- [ ] **Step 1: Write the renderer**

Create `frontend/src/components/reports/deck/renderers/RecommendationSlideRenderer.tsx`:

```tsx
import { computeComposite, DEFAULT_WEIGHTS } from "@/lib/mock/composite";
import { getLocation } from "@/lib/mock/locations";
import { NW_COUNTIES_GEO } from "@/lib/mock/nw-counties-geo";
import type { RecommendationSlide } from "@/lib/mock/decks";

type Props = { slide: RecommendationSlide };

export function RecommendationSlideRenderer({ slide }: Props) {
  const scored = computeComposite(DEFAULT_WEIGHTS[slide.sector], slide.dataYear).slice(0, 6);
  const valueBySiruta = new Map(scored.map((s) => [s.locationSiruta, s.value]));

  // Bounds for the inline RO map
  const allCoords: number[][] = NW_COUNTIES_GEO.features.flatMap((f) =>
    f.geometry.coordinates.flat()
  );
  const xs = allCoords.map((c) => c[0]);
  const ys = allCoords.map((c) => c[1]);
  const viewBox = `${Math.min(...xs) - 0.1} ${-(Math.max(...ys) + 0.1)} ${Math.max(...xs) - Math.min(...xs) + 0.2} ${Math.max(...ys) - Math.min(...ys) + 0.2}`;

  function pathFor(coords: number[][]): string {
    return coords.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0]} ${-pt[1]}`).join(" ") + " Z";
  }
  function fillFor(siruta?: string): string {
    if (!siruta) return "#e2e7e7";
    const v = valueBySiruta.get(siruta);
    if (v === undefined) return "#e2e7e7";
    const t = v / 100;
    const r = Math.round(244 - 244 * t + 21 * t);
    const g = Math.round(245 - 245 * t + 119 * t);
    const b = Math.round(239 - 239 * t + 119 * t);
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] gap-6 px-[6%] py-[6%]">
      <div className="flex flex-col gap-4">
        <p className="deck-eyebrow">Recommendation · {slide.sector.toUpperCase()}</p>
        <h1 className="deck-underline text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
        <div className="overflow-hidden rounded border border-[var(--color-deck-deep)]/15 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--color-deck-deep)]/5">
              <tr>
                <th className="py-2 pl-3 text-left text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                  Rank
                </th>
                <th className="py-2 text-left text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                  County
                </th>
                <th className="py-2 pr-3 text-right text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {scored.map((s, i) => {
                const loc = getLocation(s.locationSiruta);
                return (
                  <tr key={s.locationSiruta} className="border-t border-[var(--color-deck-deep)]/10">
                    <td className="py-2 pl-3 text-[var(--color-deck-muted)]">{i + 1}</td>
                    <td className="py-2 font-medium text-[var(--color-deck-deep)]">{loc?.name ?? s.locationSiruta}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-bold text-[var(--color-deck-deep)]">
                      {s.value.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[14px] leading-relaxed text-[var(--color-deck-ink)]/80">{slide.narrative}</p>
      </div>
      <div className="grid place-items-center bg-white p-4">
        <svg viewBox={viewBox} className="h-full w-full max-h-[90%]">
          {NW_COUNTIES_GEO.features.map((f) => {
            const siruta = (f.properties as { siruta?: string }).siruta;
            return (
              <path
                key={siruta}
                d={pathFor(f.geometry.coordinates[0])}
                fill={fillFor(siruta)}
                stroke="#fff"
                strokeWidth={0.02}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire + commit**

In `SlideRenderer.tsx`:

```tsx
import { RecommendationSlideRenderer } from "./RecommendationSlideRenderer";
// in switch:
case "recommendation": return <RecommendationSlideRenderer slide={slide} />;
```

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): Recommendation renderer with composite + RO choropleth"
```

---

## Wave 7 — Map renderers (2 tasks)

Two Leaflet-backed renderers — must use `next/dynamic` with `ssr: false`.

### Task 22: ParcelDetailSlideRenderer

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/ParcelDetailSlideRenderer.tsx`
- Create: `frontend/src/components/reports/deck/renderers/ParcelDetailMap.tsx` (Leaflet client-only)
- Modify: `SlideRenderer.tsx`

- [ ] **Step 1: Write the Leaflet inner**

Create `frontend/src/components/reports/deck/renderers/ParcelDetailMap.tsx`:

```tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getParcel } from "@/lib/mock/parcels";

type Props = { parcelId: string };

const icon = L.divIcon({
  className: "",
  html: '<div style="background:#f5a623;border:2px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 1px 2px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function ParcelDetailMap({ parcelId }: Props) {
  const p = getParcel(parcelId);
  if (!p) return null;
  return (
    <MapContainer
      center={[p.lat, p.lng]}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
      />
      <Marker position={[p.lat, p.lng]} icon={icon}>
        <Popup>{p.name}</Popup>
      </Marker>
    </MapContainer>
  );
}
```

- [ ] **Step 2: Write the slide renderer**

Create `frontend/src/components/reports/deck/renderers/ParcelDetailSlideRenderer.tsx`:

```tsx
import dynamic from "next/dynamic";
import { getParcel } from "@/lib/mock/parcels";
import { getLocation } from "@/lib/mock/locations";
import type { ParcelDetailSlide } from "@/lib/mock/decks";

const MapFallback = () => (
  <div className="grid h-full place-items-center bg-[var(--color-deck-muted)]/10 text-[12px] text-[var(--color-deck-muted)]">
    Loading map…
  </div>
);
const ParcelDetailMap = dynamic(
  () => import("./ParcelDetailMap").then((m) => m.ParcelDetailMap),
  { ssr: false, loading: MapFallback }
);

export function ParcelDetailSlideRenderer({ slide }: { slide: ParcelDetailSlide }) {
  const p = getParcel(slide.parcelId);
  const loc = p ? getLocation(p.nearestSiruta) : undefined;
  return (
    <div className="grid h-full grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-4 p-[5%]">
        <p className="deck-eyebrow">
          {loc?.name ?? ""} · {p?.areaHa ?? "—"} ha
        </p>
        <h1 className="deck-underline text-3xl font-bold uppercase tracking-tight text-[var(--color-deck-deep)]">
          {slide.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          {slide.features.map((f) => (
            <span
              key={f}
              className="rounded-full bg-[var(--color-deck-deep)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white"
            >
              {f}
            </span>
          ))}
        </div>
        <ul className="mt-2 flex flex-col gap-2 text-[13px] text-[var(--color-deck-ink)]/90">
          {slide.keyFeatures.map((kf, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-deck-accent)]" />
              <span>{kf}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto rounded border border-[var(--color-deck-deep)]/15 bg-white p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
            Indicated price
          </p>
          <p className="text-lg font-bold text-[var(--color-deck-deep)]">{slide.indicatedPrice}</p>
        </div>
      </div>
      <div className="relative">
        <ParcelDetailMap parcelId={slide.parcelId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire + commit**

In `SlideRenderer.tsx`:

```tsx
import { ParcelDetailSlideRenderer } from "./ParcelDetailSlideRenderer";
// in switch:
case "parcel_detail": return <ParcelDetailSlideRenderer slide={slide} />;
```

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): ParcelDetail renderer with satellite tiles"
```

### Task 23: InfrastructurePageSlideRenderer

**Files:**
- Create: `frontend/src/components/reports/deck/renderers/InfrastructurePageSlideRenderer.tsx`
- Create: `frontend/src/components/reports/deck/renderers/InfrastructureMap.tsx` (Leaflet client-only)
- Modify: `SlideRenderer.tsx`

- [ ] **Step 1: Write the Leaflet inner**

Create `frontend/src/components/reports/deck/renderers/InfrastructureMap.tsx`:

```tsx
"use client";

import { MapContainer, TileLayer, Marker, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getParcel } from "@/lib/mock/parcels";

type Props = { parcelId: string };

const parcelIcon = L.divIcon({
  className: "",
  html: '<div style="background:#157777;border:2px solid #fff;border-radius:50%;width:16px;height:16px;box-shadow:0 1px 2px rgba(0,0,0,.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function InfrastructureMap({ parcelId }: Props) {
  const p = getParcel(parcelId);
  if (!p) return null;
  return (
    <MapContainer
      center={[p.lat, p.lng]}
      zoom={9}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={18} />
      <Marker position={[p.lat, p.lng]} icon={parcelIcon}>
        <Popup>{p.name}</Popup>
      </Marker>
      <CircleMarker
        center={[p.lat, p.lng]}
        radius={50}
        pathOptions={{ color: "#f5a623", weight: 2, fill: false }}
      />
    </MapContainer>
  );
}
```

- [ ] **Step 2: Write the slide renderer**

Create `frontend/src/components/reports/deck/renderers/InfrastructurePageSlideRenderer.tsx`:

```tsx
import dynamic from "next/dynamic";
import { Plane, Truck, Globe2 } from "lucide-react";
import type { InfrastructurePageSlide } from "@/lib/mock/decks";

const MapFallback = () => (
  <div className="grid h-full place-items-center bg-[var(--color-deck-muted)]/10 text-[12px] text-[var(--color-deck-muted)]">
    Loading map…
  </div>
);
const InfrastructureMap = dynamic(
  () => import("./InfrastructureMap").then((m) => m.InfrastructureMap),
  { ssr: false, loading: MapFallback }
);

const ICONS = [Truck, Plane, Globe2];

export function InfrastructurePageSlideRenderer({ slide }: { slide: InfrastructurePageSlide }) {
  return (
    <div className="grid h-full grid-cols-[1fr_1.2fr] gap-5 p-[5%]">
      <div className="flex flex-col gap-5">
        <p className="deck-eyebrow">Infrastructure</p>
        <h1 className="deck-underline text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
        <ul className="flex flex-col gap-4">
          {slide.distances.map((d, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <li
                key={i}
                className="flex items-center gap-4 rounded border border-[var(--color-deck-deep)]/15 bg-white p-4"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-white"
                  style={{ background: "var(--color-deck-deep)" }}
                >
                  <Icon size={22} />
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                    {d.label}
                  </span>
                  <span className="text-2xl font-bold text-[var(--color-deck-deep)]">{d.value}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="relative overflow-hidden rounded border border-[var(--color-deck-deep)]/15">
        <InfrastructureMap parcelId={slide.parcelId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire + commit**

In `SlideRenderer.tsx`:

```tsx
import { InfrastructurePageSlideRenderer } from "./InfrastructurePageSlideRenderer";
// in switch:
case "infrastructure_page": return <InfrastructurePageSlideRenderer slide={slide} />;
```

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/renderers
git commit -m "feat(reports): InfrastructurePage renderer with OSM road map"
```

---

## Wave 8 — Editor primitives (4 tasks)

Reusable form components shared by the edit panel.

### Task 24: EditableText (contenteditable wrapper)

**Files:**
- Create: `frontend/src/components/reports/deck/EditableText.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/reports/deck/EditableText.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Tag to render. Defaults to span. Use "h1"/"p"/etc. to inherit slide typography. */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** When true, the field is locked (read-only mode of the preview). */
  readOnly?: boolean;
  /** Optional placeholder shown when value is empty. */
  placeholder?: string;
};

/**
 * Single-line contenteditable with explicit commit semantics:
 *   • Edit happens in DOM (uncontrolled while focused)
 *   • Blur or Enter commits → onChange
 *   • Escape cancels → revert to last committed value
 *   • External value changes while NOT focused → render the new value
 */
export function EditableText({
  value,
  onChange,
  as = "span",
  className = "",
  readOnly = false,
  placeholder,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [focused, setFocused] = useState(false);
  const Tag = as as keyof React.JSX.IntrinsicElements;

  useEffect(() => {
    // Re-sync the DOM when the prop changes and we're not editing.
    if (!focused && ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value, focused]);

  function handleBlur() {
    setFocused(false);
    const next = ref.current?.innerText ?? "";
    if (next !== value) onChange(next);
  }

  function handleKey(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (ref.current) ref.current.innerText = value;
      (e.target as HTMLElement).blur();
    }
  }

  return (
    // @ts-expect-error - dynamic Tag binding doesn't carry the ref prop name through
    <Tag
      ref={ref as never}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKey}
      className={
        (readOnly ? "" : "outline-none focus:rounded-sm focus:ring-2 focus:ring-[var(--color-deck-bright)] hover:underline hover:decoration-dashed hover:underline-offset-4 ") +
        className
      }
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/EditableText.tsx
git commit -m "feat(reports): EditableText contenteditable wrapper"
```

### Task 25: KpiPicker + ParcelPicker

**Files:**
- Create: `frontend/src/components/reports/deck/KpiPicker.tsx`
- Create: `frontend/src/components/reports/deck/ParcelPicker.tsx`

- [ ] **Step 1: Write KpiPicker**

Create `frontend/src/components/reports/deck/KpiPicker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { KPIS, getKpi } from "@/lib/mock/kpis";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  /** Optional cap on number of selected KPIs. */
  max?: number;
};

export function KpiPicker({ selected, onChange, max = 8 }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = KPIS.filter((k) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      k.nameEn.toLowerCase().includes(q) ||
      k.nameRo.toLowerCase().includes(q) ||
      k.code.toLowerCase().includes(q)
    );
  }).filter((k) => !selected.includes(k.code));

  function add(code: string) {
    if (selected.length >= max) return;
    onChange([...selected, code]);
    setQuery("");
    setOpen(false);
  }
  function remove(code: string) {
    onChange(selected.filter((c) => c !== code));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((code) => {
          const k = getKpi(code);
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
            >
              {k?.nameEn ?? code}
              <button
                type="button"
                onClick={() => remove(code)}
                className="text-on-surface-variant hover:text-error"
                aria-label={`Remove ${k?.nameEn ?? code}`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
      </div>
      {selected.length < max && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 rounded border border-dashed border-border-subtle px-2 py-1 text-xs text-on-surface-variant hover:border-primary hover:text-primary-deep"
          >
            <Plus size={12} /> Add KPI
          </button>
          {open && (
            <div className="absolute left-0 z-30 mt-1 max-h-60 w-72 overflow-y-auto rounded border border-border-subtle bg-surface-container-lowest shadow-lg">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                autoFocus
                className="w-full border-b border-border-subtle bg-transparent px-2 py-1.5 text-xs outline-none"
              />
              <ul>
                {matches.slice(0, 20).map((k) => (
                  <li key={k.code}>
                    <button
                      type="button"
                      onClick={() => add(k.code)}
                      className="block w-full px-2 py-1.5 text-left text-xs hover:bg-surface-container"
                    >
                      <span className="font-medium">{k.nameEn}</span>
                      <span className="ml-1 text-on-surface-variant">· {k.category}</span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-2 py-2 text-xs text-on-surface-variant">No matches.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write ParcelPicker**

Create `frontend/src/components/reports/deck/ParcelPicker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { PARCELS, getParcel } from "@/lib/mock/parcels";
import { getLocation } from "@/lib/mock/locations";

type Props = {
  selected: string;
  onChange: (id: string) => void;
};

export function ParcelPicker({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const current = getParcel(selected);
  const matches = PARCELS.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  }).slice(0, 12);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-on-surface-variant">
        Current: <span className="font-medium text-on-surface">{current?.name ?? "—"}</span>
      </p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter parcels…"
        className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
      />
      <ul className="max-h-48 overflow-y-auto rounded border border-border-subtle">
        {matches.map((p) => {
          const loc = getLocation(p.nearestSiruta);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onChange(p.id)}
                className={
                  "block w-full px-2 py-1.5 text-left text-xs hover:bg-surface-container " +
                  (p.id === selected ? "bg-surface-container font-semibold" : "")
                }
              >
                {p.name}
                <span className="ml-1 text-on-surface-variant">
                  · {loc?.name ?? p.nearestSiruta} · {p.areaHa} ha
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/KpiPicker.tsx frontend/src/components/reports/deck/ParcelPicker.tsx
git commit -m "feat(reports): KpiPicker + ParcelPicker for edit panel"
```

### Task 26: PhotoPicker + SlideThumbnail

**Files:**
- Create: `frontend/src/components/reports/deck/PhotoPicker.tsx`
- Create: `frontend/src/components/reports/deck/SlideThumbnail.tsx`

- [ ] **Step 1: Write PhotoPicker**

Create `frontend/src/components/reports/deck/PhotoPicker.tsx`:

```tsx
"use client";

import { photoUrl, type PhotoId } from "@/lib/mock/decks";

const OPTIONS: Array<{ id: Exclude<PhotoId, null>; label: string }> = [
  { id: "industrial-park-1", label: "Industrial park" },
  { id: "urban-cluj", label: "Cluj urban" },
  { id: "commune-blocks", label: "Residential" },
  { id: "landscape-mountains", label: "Landscape" },
  { id: "highway-aerial", label: "Highway" },
  { id: "satellite-default", label: "Satellite" },
];

type Props = {
  selected: PhotoId;
  onChange: (id: PhotoId) => void;
};

export function PhotoPicker({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={
          "grid aspect-video place-items-center rounded border text-[10px] uppercase tracking-wider transition-colors " +
          (selected === null
            ? "border-primary bg-primary/10 text-primary-deep"
            : "border-border-subtle bg-surface text-on-surface-variant hover:border-primary")
        }
      >
        No photo
      </button>
      {OPTIONS.map((opt) => {
        const url = photoUrl(opt.id)!;
        const active = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={
              "relative aspect-video overflow-hidden rounded border transition-colors " +
              (active ? "border-primary ring-2 ring-primary/30" : "border-border-subtle hover:border-primary")
            }
          >
            <img src={url} alt={opt.label} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-[9px] uppercase tracking-wider text-white">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write SlideThumbnail**

Create `frontend/src/components/reports/deck/SlideThumbnail.tsx`:

```tsx
import { SLIDE_KIND_LABELS, slideOutlineLabel, type Slide } from "@/lib/mock/decks";

type Props = {
  slide: Slide;
  index: number;
  active: boolean;
  onSelect: () => void;
};

export function SlideThumbnail({ slide, index, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full items-start gap-2 rounded border px-2 py-2 text-left transition-colors " +
        (active
          ? "border-primary bg-primary/5"
          : "border-transparent hover:border-border-subtle hover:bg-surface-container")
      }
    >
      <span className="mt-0.5 inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-surface-container text-[10px] font-bold text-on-surface-variant">
        {index + 1}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[12px] font-semibold text-on-surface">
          {slideOutlineLabel(slide) || SLIDE_KIND_LABELS[slide.kind]}
        </span>
        <span className="truncate text-[10px] uppercase tracking-wider text-on-surface-variant">
          {SLIDE_KIND_LABELS[slide.kind]}
        </span>
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/PhotoPicker.tsx frontend/src/components/reports/deck/SlideThumbnail.tsx
git commit -m "feat(reports): PhotoPicker + SlideThumbnail"
```

### Task 27: SlidePalette (+ Add slide popover)

**Files:**
- Create: `frontend/src/components/reports/deck/SlidePalette.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/reports/deck/SlidePalette.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  SLIDE_KIND_LABELS,
  SLIDE_PALETTE_GROUPS,
  type SlideKind,
} from "@/lib/mock/decks";

type Props = {
  onPick: (kind: SlideKind) => void;
};

export function SlidePalette({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex w-full items-center justify-center gap-1 rounded border border-dashed border-border-subtle px-2 py-2 text-xs text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
      >
        <Plus size={14} /> Add slide
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-96 overflow-y-auto rounded border border-border-subtle bg-surface-container-lowest p-2 shadow-lg">
          {SLIDE_PALETTE_GROUPS.map((g) => (
            <div key={g.label} className="mb-2 last:mb-0">
              <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                {g.label}
              </p>
              <ul className="flex flex-col">
                {g.kinds.map((k) => (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(k);
                        setOpen(false);
                      }}
                      className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-container"
                    >
                      {SLIDE_KIND_LABELS[k]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/SlidePalette.tsx
git commit -m "feat(reports): SlidePalette popover grouped by category"
```

---

## Wave 9 — Editor pages (4 tasks)

The 3-column workspace that ties everything together.

### Task 28: DeckLibrary (left rail with reorder)

**Files:**
- Create: `frontend/src/components/reports/deck/DeckLibrary.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/reports/deck/DeckLibrary.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Copy, Trash2 } from "lucide-react";
import {
  defaultSlideForKind,
  makeBlankDeck,
  makeInvestorPitchDeck,
  slideOutlineLabel,
  SLIDE_KIND_LABELS,
  type Deck,
  type Slide,
  type SlideKind,
} from "@/lib/mock/decks";
import { SlideThumbnail } from "./SlideThumbnail";
import { SlidePalette } from "./SlidePalette";

type Props = {
  decks: Deck[];
  activeDeckId: string;
  activeSlideId: string | null;
  onSelectDeck: (id: string) => void;
  onSelectSlide: (id: string) => void;
  onChangeDeck: (deck: Deck) => void;
  onCreateDeck: (deck: Deck) => void;
};

export function DeckLibrary({
  decks,
  activeDeckId,
  activeSlideId,
  onSelectDeck,
  onSelectSlide,
  onChangeDeck,
  onCreateDeck,
}: Props) {
  const active = decks.find((d) => d.id === activeDeckId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!active || !e.over || e.active.id === e.over.id) return;
    const ids = active.slides.map((s) => s.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    onChangeDeck({ ...active, slides: arrayMove(active.slides, from, to), updatedAt: Date.now() });
  }

  function addSlide(kind: SlideKind) {
    if (!active) return;
    const ns = defaultSlideForKind(kind, { year: active.systemYear, locationSiruta: active.locationSiruta });
    const after = active.slides.findIndex((s) => s.id === activeSlideId);
    const slides = [...active.slides];
    const insertAt = after >= 0 ? after + 1 : slides.length;
    slides.splice(insertAt, 0, ns);
    onChangeDeck({ ...active, slides, updatedAt: Date.now() });
    onSelectSlide(ns.id);
  }
  function duplicateSlide(id: string) {
    if (!active) return;
    const idx = active.slides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const dup = { ...active.slides[idx], id: `${id}-copy-${Date.now().toString(36)}` };
    const slides = [...active.slides];
    slides.splice(idx + 1, 0, dup);
    onChangeDeck({ ...active, slides, updatedAt: Date.now() });
    onSelectSlide(dup.id);
  }
  function deleteSlide(id: string) {
    if (!active || active.slides.length <= 1) return;
    const slides = active.slides.filter((s) => s.id !== id);
    onChangeDeck({ ...active, slides, updatedAt: Date.now() });
    if (id === activeSlideId) onSelectSlide(slides[0]?.id ?? "");
  }
  function newDeck() {
    const cloneFrom = decks.find((d) => d.templateOrigin === "investor-pitch");
    const mine = decks.filter((d) => !d.isShared).length;
    const ns = cloneFrom
      ? { ...makeInvestorPitchDeck({ year: cloneFrom.systemYear }), id: `deck-${Date.now().toString(36)}`, isShared: false, title: `Investor Pitch ${mine + 1}` }
      : makeBlankDeck({ year: new Date().getFullYear() });
    onCreateDeck(ns);
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <section>
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Decks
        </p>
        <ul className="mt-1 flex flex-col">
          {decks.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelectDeck(d.id)}
                className={
                  "block w-full rounded px-2 py-1.5 text-left text-xs " +
                  (d.id === activeDeckId
                    ? "bg-primary/10 font-semibold text-primary-deep"
                    : "hover:bg-surface-container")
                }
              >
                {d.title}
                {d.isShared && (
                  <span className="ml-1 text-[9px] uppercase tracking-wider text-on-surface-variant">
                    shared
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={newDeck}
          className="mt-1 inline-flex w-full items-center gap-1 rounded border border-dashed border-border-subtle px-2 py-1.5 text-xs text-on-surface-variant hover:border-primary hover:text-primary-deep"
        >
          <Plus size={12} /> New deck
        </button>
      </section>

      <hr className="border-border-subtle" />

      <section className="flex min-h-0 flex-1 flex-col">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Slides
        </p>
        {active && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={active.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
                {active.slides.map((slide, i) => (
                  <SortableRow
                    key={slide.id}
                    slide={slide}
                    index={i}
                    active={slide.id === activeSlideId}
                    onSelect={() => onSelectSlide(slide.id)}
                    onDuplicate={() => duplicateSlide(slide.id)}
                    onDelete={() => deleteSlide(slide.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <div className="mt-2">
          <SlidePalette onPick={addSlide} />
        </div>
      </section>
    </div>
  );
}

function SortableRow({
  slide,
  index,
  active,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const [showMenu, setShowMenu] = useState(false);
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group relative flex items-start gap-1"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      <button
        type="button"
        className="mt-2 cursor-grab text-on-surface-variant/50 hover:text-on-surface"
        aria-label={`Reorder ${slideOutlineLabel(slide) || SLIDE_KIND_LABELS[slide.kind]}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </button>
      <div className="min-w-0 flex-1">
        <SlideThumbnail slide={slide} index={index} active={active} onSelect={onSelect} />
      </div>
      {showMenu && (
        <div
          onMouseLeave={() => setShowMenu(false)}
          className="absolute right-0 top-6 z-30 flex flex-col rounded border border-border-subtle bg-surface-container-lowest text-xs shadow-lg"
        >
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-surface-container"
            onClick={() => {
              setShowMenu(false);
              onDuplicate();
            }}
          >
            <Copy size={12} /> Duplicate
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1.5 text-error hover:bg-surface-container"
            onClick={() => {
              setShowMenu(false);
              onDelete();
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/DeckLibrary.tsx
git commit -m "feat(reports): DeckLibrary with dnd reorder + new-deck + context menu"
```

### Task 29: DeckCanvas (renderer + sticky toolbar)

**Files:**
- Create: `frontend/src/components/reports/deck/DeckCanvas.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/reports/deck/DeckCanvas.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { SlideRenderer } from "./renderers/SlideRenderer";
import type { Deck, Slide } from "@/lib/mock/decks";

type Props = {
  deck: Deck;
  slide: Slide;
  onChangeDeck: (deck: Deck) => void;
  onSelectSlide: (id: string) => void;
  onRequestRename: () => void;
};

export function DeckCanvas({ deck, slide, onChangeDeck, onSelectSlide, onRequestRename }: Props) {
  const router = useRouter();
  const idx = deck.slides.findIndex((s) => s.id === slide.id);
  const total = deck.slides.length;

  function patchSlide(patch: Partial<Slide>) {
    onChangeDeck({
      ...deck,
      updatedAt: Date.now(),
      slides: deck.slides.map((s) => (s.id === slide.id ? ({ ...s, ...patch } as Slide) : s)),
    });
  }

  function prev() {
    if (idx > 0) onSelectSlide(deck.slides[idx - 1].id);
  }
  function next() {
    if (idx < total - 1) onSelectSlide(deck.slides[idx + 1].id);
  }

  function copyShareUrl() {
    const url = `${window.location.origin}/reports/${deck.id}`;
    navigator.clipboard.writeText(url).catch(() => undefined);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border-subtle bg-surface px-5 py-2">
        <button
          type="button"
          onClick={onRequestRename}
          className="rounded px-1 py-0.5 text-sm font-semibold hover:bg-surface-container"
        >
          {deck.title}
        </button>
        <span className="text-on-surface-variant">·</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-deep">
          {deck.locationSiruta ? `Location: ${deck.locationSiruta}` : "No location"}
        </span>
        <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
          {deck.systemYear}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/reports/${deck.id}`)}
            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs hover:border-primary hover:text-primary-deep"
          >
            <Download size={12} /> PDF
          </button>
          <button
            type="button"
            onClick={copyShareUrl}
            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs hover:border-primary hover:text-primary-deep"
          >
            <Share2 size={12} /> Share
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-background p-6">
        <div className="w-full max-w-[1100px]">
          <SlideRenderer
            slide={slide}
            deck={deck}
            page={idx + 1}
            total={total}
            readOnly={false}
            onChange={patchSlide}
          />
        </div>
      </div>

      {/* Footer status */}
      <footer className="flex items-center justify-between border-t border-border-subtle bg-surface px-5 py-2 text-xs text-on-surface-variant">
        <span>
          Slide {idx + 1} of {total} · {slide.kind}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={idx === 0}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-surface-container disabled:opacity-40"
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <button
            type="button"
            onClick={next}
            disabled={idx === total - 1}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-surface-container disabled:opacity-40"
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/DeckCanvas.tsx
git commit -m "feat(reports): DeckCanvas + sticky toolbar with prev/next + share"
```

### Task 30: EditPanel (kind-specific forms)

**Files:**
- Create: `frontend/src/components/reports/deck/EditPanel.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/reports/deck/EditPanel.tsx`:

```tsx
"use client";

import { defaultSlideForKind, SLIDE_KIND_LABELS, type Deck, type Slide } from "@/lib/mock/decks";
import { KpiPicker } from "./KpiPicker";
import { ParcelPicker } from "./ParcelPicker";
import { PhotoPicker } from "./PhotoPicker";
import {
  countyNarrative,
  cityNarrative,
  communeCallout,
} from "@/lib/decks/autoNarrative";

type Props = {
  deck: Deck;
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
  onResetToDefaults: () => void;
};

export function EditPanel({ deck, slide, onChange, onResetToDefaults }: Props) {
  return (
    <aside className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          {SLIDE_KIND_LABELS[slide.kind]}
        </p>
        <button
          type="button"
          onClick={onResetToDefaults}
          className="text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-primary-deep"
        >
          Reset
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        <Body deck={deck} slide={slide} onChange={onChange} />
      </div>
    </aside>
  );
}

function Body({ deck, slide, onChange }: { deck: Deck; slide: Slide; onChange: (p: Partial<Slide>) => void }) {
  switch (slide.kind) {
    case "cover":
      return (
        <Form>
          <Text label="Title" value={slide.title} onChange={(v) => onChange({ title: v } as Partial<Slide>)} />
          <Text label="Subtitle" value={slide.subtitle} onChange={(v) => onChange({ subtitle: v } as Partial<Slide>)} />
          <Text label="Prepared for" value={slide.preparedFor} onChange={(v) => onChange({ preparedFor: v } as Partial<Slide>)} />
          <Text label="Date issued" value={slide.dateIssued} onChange={(v) => onChange({ dateIssued: v } as Partial<Slide>)} />
        </Form>
      );
    case "section_divider":
    case "strategic_location":
    case "infrastructure_divider":
      return (
        <Form>
          <Text label="Title" value={slide.title} onChange={(v) => onChange({ title: v } as Partial<Slide>)} />
          <Field label="Background photo">
            <PhotoPicker
              selected={slide.backgroundPhotoId}
              onChange={(id) => onChange({ backgroundPhotoId: id } as Partial<Slide>)}
            />
          </Field>
        </Form>
      );
    case "county_snapshot":
      return (
        <Form>
          <Text label="Eyebrow" value={slide.eyebrow} onChange={(v) => onChange({ eyebrow: v } as Partial<Slide>)} />
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="KPI tiles (max 4)">
            <KpiPicker
              selected={slide.kpiCodes}
              onChange={(codes) => onChange({ kpiCodes: codes } as Partial<Slide>)}
              max={4}
            />
          </Field>
          <NarrativeBlock
            current={slide.narrative}
            onChange={(v) => onChange({ narrative: v } as Partial<Slide>)}
            generate={() => countyNarrative({ siruta: slide.locationSiruta, year: slide.dataYear })}
          />
        </Form>
      );
    case "city_snapshot":
      return (
        <Form>
          <Text label="Eyebrow" value={slide.eyebrow} onChange={(v) => onChange({ eyebrow: v } as Partial<Slide>)} />
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="KPI tiles (max 4)">
            <KpiPicker
              selected={slide.kpiCodes}
              onChange={(codes) => onChange({ kpiCodes: codes } as Partial<Slide>)}
              max={4}
            />
          </Field>
          <Field label="Photo">
            <PhotoPicker
              selected={slide.photoId}
              onChange={(id) => onChange({ photoId: id } as Partial<Slide>)}
            />
          </Field>
          <ParagraphsBlock
            paragraphs={slide.paragraphs}
            onChange={(ps) => onChange({ paragraphs: ps } as Partial<Slide>)}
            generate={() => cityNarrative({ siruta: slide.locationSiruta, year: slide.dataYear })}
          />
        </Form>
      );
    case "commune_detail":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="Photo">
            <PhotoPicker
              selected={slide.heroPhotoId}
              onChange={(id) => onChange({ heroPhotoId: id } as Partial<Slide>)}
            />
          </Field>
          <ParagraphsBlock
            paragraphs={slide.paragraphs}
            onChange={(ps) => onChange({ paragraphs: ps } as Partial<Slide>)}
            generate={() => [communeCallout({ siruta: slide.locationSiruta, year: slide.dataYear })]}
          />
          <Text label="Callout" value={slide.calloutText} onChange={(v) => onChange({ calloutText: v } as Partial<Slide>)} />
        </Form>
      );
    case "parcel_detail":
      return (
        <Form>
          <Text label="Title" value={slide.title} onChange={(v) => onChange({ title: v } as Partial<Slide>)} />
          <Field label="Parcel">
            <ParcelPicker selected={slide.parcelId} onChange={(id) => onChange({ parcelId: id } as Partial<Slide>)} />
          </Field>
          <ListBlock
            label="Features (3 pills)"
            items={slide.features}
            onChange={(items) => onChange({ features: items } as Partial<Slide>)}
            max={3}
          />
          <ListBlock
            label="Key features (bullets)"
            items={slide.keyFeatures}
            onChange={(items) => onChange({ keyFeatures: items } as Partial<Slide>)}
            max={8}
          />
          <Text label="Indicated price" value={slide.indicatedPrice} onChange={(v) => onChange({ indicatedPrice: v } as Partial<Slide>)} />
        </Form>
      );
    case "infrastructure_page":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="Parcel (map centre)">
            <ParcelPicker selected={slide.parcelId} onChange={(id) => onChange({ parcelId: id } as Partial<Slide>)} />
          </Field>
          <Field label="Distances">
            <div className="flex flex-col gap-2">
              {slide.distances.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px] gap-2">
                  <input
                    value={d.label}
                    onChange={(e) => {
                      const next = [...slide.distances];
                      next[i] = { ...d, label: e.target.value };
                      onChange({ distances: next } as Partial<Slide>);
                    }}
                    className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
                  />
                  <input
                    value={d.value}
                    onChange={(e) => {
                      const next = [...slide.distances];
                      next[i] = { ...d, value: e.target.value };
                      onChange({ distances: next } as Partial<Slide>);
                    }}
                    className="rounded border border-border-subtle bg-surface px-2 py-1 text-right text-xs"
                  />
                </div>
              ))}
            </div>
          </Field>
        </Form>
      );
    case "stat_infographic":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="Layout">
            <div className="flex gap-1">
              {(["radial", "panel"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onChange({ layout: l } as Partial<Slide>)}
                  className={
                    "rounded border px-2 py-1 text-xs " +
                    (slide.layout === l ? "border-primary bg-primary/10 text-primary-deep" : "border-border-subtle")
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <StatsBlock stats={slide.stats} onChange={(stats) => onChange({ stats } as Partial<Slide>)} max={8} />
        </Form>
      );
    case "trend":
    case "comparison":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Text label="Commentary" value={slide.commentary} onChange={(v) => onChange({ commentary: v } as Partial<Slide>)} multiline />
        </Form>
      );
    case "recommendation":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="Sector">
            <div className="flex gap-1">
              {(["tech", "manufacturing", "general"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ sector: s } as Partial<Slide>)}
                  className={
                    "rounded border px-2 py-1 text-xs " +
                    (slide.sector === s ? "border-primary bg-primary/10 text-primary-deep" : "border-border-subtle")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Text label="Narrative" value={slide.narrative} onChange={(v) => onChange({ narrative: v } as Partial<Slide>)} multiline />
        </Form>
      );
    case "text":
      return (
        <Form>
          <Text label="Title" value={slide.title} onChange={(v) => onChange({ title: v } as Partial<Slide>)} />
          <ParagraphsBlock
            paragraphs={slide.paragraphs}
            onChange={(ps) => onChange({ paragraphs: ps } as Partial<Slide>)}
          />
        </Form>
      );
    case "contact":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Text label="CTA" value={slide.ctaText} onChange={(v) => onChange({ ctaText: v } as Partial<Slide>)} />
        </Form>
      );
  }
}

function Form({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
        />
      )}
    </Field>
  );
}

function ParagraphsBlock({
  paragraphs,
  onChange,
  generate,
}: {
  paragraphs: string[];
  onChange: (ps: string[]) => void;
  generate?: () => string[];
}) {
  return (
    <Field label="Paragraphs">
      <div className="flex flex-col gap-2">
        {paragraphs.map((p, i) => (
          <textarea
            key={i}
            value={p}
            onChange={(e) => {
              const next = [...paragraphs];
              next[i] = e.target.value;
              onChange(next);
            }}
            rows={2}
            className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
          />
        ))}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange([...paragraphs, ""])}
            className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] hover:border-primary"
          >
            + Paragraph
          </button>
          {paragraphs.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(paragraphs.slice(0, -1))}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] text-on-surface-variant hover:text-error hover:border-error"
            >
              − Last
            </button>
          )}
          {generate && (
            <button
              type="button"
              onClick={() => onChange(generate())}
              className="ml-auto rounded border border-border-subtle px-2 py-1 text-[11px] hover:border-primary hover:text-primary-deep"
            >
              Auto-fill
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

function NarrativeBlock({
  current,
  onChange,
  generate,
}: {
  current: string | null;
  onChange: (v: string | null) => void;
  generate: () => string;
}) {
  return (
    <Field label="Narrative">
      <textarea
        value={current ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        rows={3}
        placeholder="Optional narrative…"
        className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
      />
      <button
        type="button"
        onClick={() => onChange(generate())}
        className="self-start rounded border border-border-subtle px-2 py-1 text-[11px] hover:border-primary hover:text-primary-deep"
      >
        Auto-fill from data
      </button>
    </Field>
  );
}

function ListBlock({
  label,
  items,
  onChange,
  max,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  max: number;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-col gap-1">
        {items.map((item, i) => (
          <input
            key={i}
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
          />
        ))}
        <div className="flex gap-1">
          {items.length < max && (
            <button
              type="button"
              onClick={() => onChange([...items, ""])}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] hover:border-primary"
            >
              + Item
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => onChange(items.slice(0, -1))}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] text-on-surface-variant hover:text-error hover:border-error"
            >
              − Last
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

function StatsBlock({
  stats,
  onChange,
  max,
}: {
  stats: Array<{ value: string; label: string }>;
  onChange: (next: Array<{ value: string; label: string }>) => void;
  max: number;
}) {
  return (
    <Field label="Stats">
      <div className="flex flex-col gap-2">
        {stats.map((s, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr] gap-2">
            <input
              value={s.value}
              onChange={(e) => {
                const next = [...stats];
                next[i] = { ...s, value: e.target.value };
                onChange(next);
              }}
              className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
            />
            <input
              value={s.label}
              onChange={(e) => {
                const next = [...stats];
                next[i] = { ...s, label: e.target.value };
                onChange(next);
              }}
              className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
            />
          </div>
        ))}
        <div className="flex gap-1">
          {stats.length < max && (
            <button
              type="button"
              onClick={() => onChange([...stats, { value: "", label: "" }])}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] hover:border-primary"
            >
              + Stat
            </button>
          )}
          {stats.length > 0 && (
            <button
              type="button"
              onClick={() => onChange(stats.slice(0, -1))}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] text-on-surface-variant hover:text-error hover:border-error"
            >
              − Last
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd web && npx tsc --noEmit
git add frontend/src/components/reports/deck/EditPanel.tsx
git commit -m "feat(reports): EditPanel with kind-specific forms"
```

### Task 31: Rewrite /reports page as 3-column workspace

**Files:**
- Modify: `frontend/src/app/reports/page.tsx`

- [ ] **Step 1: Replace the stub with the full editor**

Overwrite `frontend/src/app/reports/page.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/stitch/TopNav";
import { DeckLibrary } from "@/components/reports/deck/DeckLibrary";
import { DeckCanvas } from "@/components/reports/deck/DeckCanvas";
import { EditPanel } from "@/components/reports/deck/EditPanel";
import { SystemClock } from "@/components/reports/SystemClock";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { runDeckMigration } from "@/lib/decks/deckMigration";
import {
  defaultSlideForKind,
  type Deck,
  type Slide,
} from "@/lib/mock/decks";

export default function ReportsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const slideParam = search.get("slide");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string>("");
  const [activeSlideId, setActiveSlideId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (and run migration if needed).
  useEffect(() => {
    const year = readStorage<number>(STORAGE_KEYS.systemYear, new Date().getFullYear());
    runDeckMigration(year);
    const stored = readStorage<Deck[]>(STORAGE_KEYS.decks, []);
    const activeId = readStorage<string>(STORAGE_KEYS.activeDeck, stored[0]?.id ?? "");
    setDecks(stored);
    setActiveDeckId(activeId);
    const startSlide = slideParam ?? stored.find((d) => d.id === activeId)?.slides[0]?.id ?? "";
    setActiveSlideId(startSlide);
    setHydrated(true);
    // We intentionally only run this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist deck changes after hydration.
  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.decks, decks);
  }, [decks, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.activeDeck, activeDeckId);
  }, [activeDeckId, hydrated]);

  // Keep `?slide=` in sync with the selected slide.
  useEffect(() => {
    if (!hydrated || !activeSlideId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("slide") !== activeSlideId) {
      url.searchParams.set("slide", activeSlideId);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
    }
  }, [activeSlideId, hydrated, router]);

  const activeDeck = useMemo(() => decks.find((d) => d.id === activeDeckId), [decks, activeDeckId]);
  const activeSlide = useMemo(
    () => activeDeck?.slides.find((s) => s.id === activeSlideId) ?? activeDeck?.slides[0],
    [activeDeck, activeSlideId]
  );

  function updateDeck(next: Deck) {
    setDecks((cur) => cur.map((d) => (d.id === next.id ? next : d)));
  }
  function createDeck(deck: Deck) {
    setDecks((cur) => [...cur, deck]);
    setActiveDeckId(deck.id);
    setActiveSlideId(deck.slides[0]?.id ?? "");
  }
  function patchSlide(patch: Partial<Slide>) {
    if (!activeDeck || !activeSlide) return;
    updateDeck({
      ...activeDeck,
      updatedAt: Date.now(),
      slides: activeDeck.slides.map((s) =>
        s.id === activeSlide.id ? ({ ...s, ...patch } as Slide) : s
      ),
    });
  }
  function resetSlideToDefaults() {
    if (!activeDeck || !activeSlide) return;
    const ns = defaultSlideForKind(activeSlide.kind, {
      year: activeDeck.systemYear,
      locationSiruta: activeDeck.locationSiruta,
    });
    patchSlide({ ...ns, id: activeSlide.id } as Partial<Slide>);
  }
  function renameActiveDeck() {
    if (!activeDeck) return;
    const next = window.prompt("Deck title", activeDeck.title);
    if (next && next.trim().length > 0) updateDeck({ ...activeDeck, title: next.trim(), updatedAt: Date.now() });
  }

  if (!hydrated || !activeDeck || !activeSlide) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-on-surface">
        <TopNav />
        <main className="grid flex-1 place-items-center text-on-surface-variant">Loading deck…</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[16rem_1fr_18rem]">
        <aside className="hidden border-r border-border-subtle bg-surface lg:block">
          <DeckLibrary
            decks={decks}
            activeDeckId={activeDeckId}
            activeSlideId={activeSlideId}
            onSelectDeck={(id) => {
              setActiveDeckId(id);
              setActiveSlideId(decks.find((d) => d.id === id)?.slides[0]?.id ?? "");
            }}
            onSelectSlide={setActiveSlideId}
            onChangeDeck={updateDeck}
            onCreateDeck={createDeck}
          />
        </aside>
        <main className="min-w-0 overflow-hidden bg-background">
          <DeckCanvas
            deck={activeDeck}
            slide={activeSlide}
            onChangeDeck={updateDeck}
            onSelectSlide={setActiveSlideId}
            onRequestRename={renameActiveDeck}
          />
        </main>
        <aside className="hidden border-l border-border-subtle bg-surface lg:block">
          <EditPanel
            deck={activeDeck}
            slide={activeSlide}
            onChange={patchSlide}
            onResetToDefaults={resetSlideToDefaults}
          />
        </aside>
      </div>
      <SystemClock />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + dev smoke**

```bash
cd web && npx tsc --noEmit
rm -rf .next  # clear stale cache if dev was running with old page
npm run dev
```

Open `http://localhost:3000/reports`. Expected:
- 3-column layout renders.
- The seeded "Investor Pitch — Florești" deck appears with 17 slides.
- Clicking a slide updates the canvas.
- Editing the cover title in the right panel updates the canvas.
- `+ Add slide` works and selects the new slide.
- Reordering via drag works.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/reports/page.tsx
git commit -m "feat(reports): wire 3-column deck editor in /reports"
```

---

## Wave 10 — Read-only preview + chat bridge (3 tasks)

The `[reportId]` print view, the `AssistantBlock[] → Slide` mapper, and wiring the AssistantCard button.

### Task 32: /reports/[reportId] read-only print view

**Files:**
- Modify: `frontend/src/app/reports/[reportId]/page.tsx`

- [ ] **Step 1: Replace the stub**

Overwrite `frontend/src/app/reports/[reportId]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { readStorage } from "@/lib/persistence/storage";
import { SlideRenderer } from "@/components/reports/deck/renderers/SlideRenderer";
import type { Deck } from "@/lib/mock/decks";
import "@/components/reports/chrome/deck-print.css";

export default function DeckPreviewPage() {
  const params = useParams<{ reportId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const decks = readStorage<Deck[]>(STORAGE_KEYS.decks, []);
    setDeck(decks.find((d) => d.id === params.reportId) ?? null);
    setHydrated(true);
  }, [params.reportId]);

  if (!hydrated) return <div className="p-8 text-on-surface-variant">Loading…</div>;
  if (!deck) return <div className="p-8 text-on-surface-variant">Deck not found.</div>;

  return (
    <>
      {/* Floating print bar — hidden in print via deck-print.css */}
      <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-surface-container px-4 py-2 shadow ring-1 ring-border-subtle no-print">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface hover:text-primary-deep"
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <main className="deck-print-root mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-12">
        {deck.slides.map((slide, i) => (
          <SlideRenderer
            key={slide.id}
            slide={slide}
            deck={deck}
            page={i + 1}
            total={deck.slides.length}
            readOnly
          />
        ))}
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
cd web && npm run dev
```

Visit `http://localhost:3000/reports/deck-investor-pitch-floresti`. Expected: all 17 slides render top-to-bottom. Hit ⌘P / Ctrl-P → browser shows 17 landscape A4 pages with no TopNav / print bar.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/reports/[reportId]/page.tsx
git commit -m "feat(reports): read-only deck preview with print-to-PDF"
```

### Task 33: createSlideFromChat + tests

**Files:**
- Create: `frontend/src/lib/decks/createSlideFromChat.ts`
- Create: `frontend/src/lib/decks/__tests__/createSlideFromChat.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/decks/__tests__/createSlideFromChat.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slideFromAssistantBlocks } from "@/lib/decks/createSlideFromChat";
import type { AssistantBlock } from "@/lib/mock/chat";

const ctx = { activeDeckLocation: "57706", activeDeckYear: 2024 };

describe("slideFromAssistantBlocks", () => {
  it("maps scorecard for a county into a county_snapshot slide", () => {
    const blocks: AssistantBlock[] = [
      { kind: "scorecard", locationSiruta: "120", year: 2024, tiles: [] },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("county_snapshot");
  });

  it("maps scorecard for a city into a city_snapshot slide", () => {
    const blocks: AssistantBlock[] = [
      { kind: "scorecard", locationSiruta: "54975", year: 2024, tiles: [] },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("city_snapshot");
  });

  it("maps a single-series lineChart to a trend slide", () => {
    const blocks: AssistantBlock[] = [
      {
        kind: "lineChart",
        kpiCode: "gdp_per_capita",
        yearRange: [2018, 2024],
        series: [{ locationSiruta: "120", points: [{ year: 2018, value: 1 }] }],
      },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("trend");
  });

  it("maps a multi-series lineChart to a comparison slide", () => {
    const blocks: AssistantBlock[] = [
      {
        kind: "lineChart",
        kpiCode: "wage_avg",
        yearRange: [2018, 2024],
        series: [
          { locationSiruta: "120", points: [] },
          { locationSiruta: "63", points: [] },
        ],
      },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("comparison");
  });

  it("maps metricCard to a stat_infographic slide", () => {
    const blocks: AssistantBlock[] = [
      {
        kind: "metricCard",
        locationSiruta: "120",
        kpiCode: "gdp_per_capita",
        year: 2024,
        value: 17000,
        regionAvg: null,
        series: [],
      },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("stat_infographic");
  });

  it("maps parcelMap to a parcel_detail slide using the first parcel id", () => {
    const blocks: AssistantBlock[] = [
      { kind: "parcelMap", filterType: "all", parcelIds: ["p-cluj-floresti", "p-cluj-jucu"] },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("parcel_detail");
    if (s.kind === "parcel_detail") expect(s.parcelId).toBe("p-cluj-floresti");
  });

  it("maps interactiveRecommendation to a recommendation slide preserving sector", () => {
    const blocks: AssistantBlock[] = [
      { kind: "interactiveRecommendation", sector: "manufacturing", year: 2024 },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("recommendation");
    if (s.kind === "recommendation") expect(s.sector).toBe("manufacturing");
  });

  it("falls back to a text slide when no recognised block is present", () => {
    const blocks: AssistantBlock[] = [{ kind: "text", text: "Hello world" }];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("text");
    if (s.kind === "text") expect(s.paragraphs.join("\n")).toContain("Hello world");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- createSlideFromChat.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the mapper**

Create `frontend/src/lib/decks/createSlideFromChat.ts`:

```ts
import type { AssistantBlock } from "@/lib/mock/chat";
import { getLocation } from "@/lib/mock/locations";
import {
  makeCitySnapshot,
  makeCountySnapshot,
  makeCommuneDetail,
  makeTrend,
  makeComparison,
  makeStatInfographic,
  makeParcelDetail,
  makeRecommendation,
  makeTextSlide,
  type Slide,
} from "@/lib/mock/decks";

type Ctx = { activeDeckLocation: string | null; activeDeckYear: number };

/**
 * Map an assistant message's blocks to a single deck Slide. Order of
 * precedence: pick the most "primary" block in the message
 * (interactive recommendation > parcelMap > scorecard > lineChart >
 * metricCard > map > text). The block list is small (~5), so a linear
 * scan is fine.
 */
export function slideFromAssistantBlocks(blocks: AssistantBlock[], ctx: Ctx): Slide {
  const year = ctx.activeDeckYear;

  const reco = blocks.find((b) => b.kind === "interactiveRecommendation");
  if (reco && reco.kind === "interactiveRecommendation") {
    return makeRecommendation({ year, sector: reco.sector });
  }

  const parcelMap = blocks.find((b) => b.kind === "parcelMap");
  if (parcelMap && parcelMap.kind === "parcelMap" && parcelMap.parcelIds[0]) {
    return makeParcelDetail({ year, parcelId: parcelMap.parcelIds[0] });
  }

  const scorecard = blocks.find((b) => b.kind === "scorecard");
  if (scorecard && scorecard.kind === "scorecard") {
    const loc = getLocation(scorecard.locationSiruta);
    if (loc?.type === "city") return makeCitySnapshot({ year, citySiruta: scorecard.locationSiruta });
    if (loc?.type === "commune") return makeCommuneDetail({ year, communeSiruta: scorecard.locationSiruta });
    return makeCountySnapshot({ year, countySiruta: scorecard.locationSiruta });
  }

  const line = blocks.find((b) => b.kind === "lineChart");
  if (line && line.kind === "lineChart") {
    if (line.series.length >= 2) {
      return makeComparison({
        year,
        kpiCode: line.kpiCode,
        locationSirutas: line.series.map((s) => s.locationSiruta),
      });
    }
    return makeTrend({
      year,
      kpiCode: line.kpiCode,
      locationSiruta: line.series[0]?.locationSiruta ?? ctx.activeDeckLocation ?? "120",
    });
  }

  const metric = blocks.find((b) => b.kind === "metricCard");
  if (metric && metric.kind === "metricCard") {
    return {
      ...makeStatInfographic({ year, layout: "panel" }),
      stats: [
        { value: String(metric.value), label: metric.kpiCode },
      ],
    };
  }

  const map = blocks.find((b) => b.kind === "map");
  if (map && map.kind === "map") {
    return makeRecommendation({ year, sector: "general" });
  }

  const text = blocks.find((b) => b.kind === "text" && b.text.trim().length > 0);
  if (text && text.kind === "text") {
    return { ...makeTextSlide({ year }), paragraphs: text.text.split(/\n\n+/) };
  }

  return makeTextSlide({ year });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- createSlideFromChat.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/decks/createSlideFromChat.ts frontend/src/lib/decks/__tests__/createSlideFromChat.test.ts
git commit -m "feat(reports): chat → deck bridge (assistant blocks → slide)"
```

### Task 34: useActiveDeck hook + AssistantCard wire-up

**Files:**
- Create: `frontend/src/lib/decks/useActiveDeck.ts`
- Modify: `frontend/src/components/chat/AssistantCard.tsx`

- [ ] **Step 1: Write the hook**

Create `frontend/src/lib/decks/useActiveDeck.ts`:

```ts
"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { makeInvestorPitchDeck, type Deck, type Slide } from "@/lib/mock/decks";
import { slideFromAssistantBlocks } from "./createSlideFromChat";
import type { AssistantBlock } from "@/lib/mock/chat";

/**
 * Reads/writes the active deck via localStorage; exposes a single
 * `addSlideFromChat` action used by the AssistantCard "Use in report".
 */
export function useActiveDeck() {
  const router = useRouter();

  const addSlideFromChat = useCallback(
    (blocks: AssistantBlock[]) => {
      const year = readStorage<number>(STORAGE_KEYS.systemYear, new Date().getFullYear());
      let decks = readStorage<Deck[]>(STORAGE_KEYS.decks, []);
      let activeId = readStorage<string>(STORAGE_KEYS.activeDeck, decks[0]?.id ?? "");

      // Bootstrap: create an Investor Pitch deck if none exists.
      if (decks.length === 0) {
        const seeded = makeInvestorPitchDeck({ year });
        decks = [seeded];
        activeId = seeded.id;
      } else if (!decks.find((d) => d.id === activeId)) {
        activeId = decks[0].id;
      }

      const active = decks.find((d) => d.id === activeId)!;
      const newSlide: Slide = slideFromAssistantBlocks(blocks, {
        activeDeckLocation: active.locationSiruta,
        activeDeckYear: active.systemYear,
      });
      const newDecks = decks.map((d) =>
        d.id === active.id
          ? { ...d, slides: [...d.slides, newSlide], updatedAt: Date.now() }
          : d
      );

      writeStorage(STORAGE_KEYS.decks, newDecks);
      writeStorage(STORAGE_KEYS.activeDeck, active.id);
      router.push(`/reports?slide=${newSlide.id}`);
    },
    [router]
  );

  return { addSlideFromChat };
}
```

- [ ] **Step 2: Wire AssistantCard's "Use in report" link to call the hook**

Edit `frontend/src/components/chat/AssistantCard.tsx`.

Add imports near the top (with the other imports):

```tsx
import { useActiveDeck } from "@/lib/decks/useActiveDeck";
```

Inside the `AssistantCard` function (next to `handleCopy`), add:

```tsx
const { addSlideFromChat } = useActiveDeck();
function handleUseInReport() {
  addSlideFromChat(blocks);
}
```

Replace the `<a href="/reports">…Use in report</a>` element with:

```tsx
<button
  type="button"
  onClick={handleUseInReport}
  className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
>
  <FileText size={12} /> Use in report
</button>
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Manual smoke test**

```bash
cd web && rm -rf .next && npm run dev
```

In the browser:
1. Open `/chat`.
2. Type `Snapshot Cluj-Napoca` → submit.
3. After the response renders, click **Use in report**.
4. Land on `/reports?slide=…`. Confirm the new slide appears at the end of the seeded deck and is selected.
5. Repeat with `recommend tech investments` → expect a `recommendation` slide added.
6. Repeat with `parcels in Cluj` → expect a `parcel_detail` slide added.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/decks/useActiveDeck.ts frontend/src/components/chat/AssistantCard.tsx
git commit -m "feat(chat): wire Use-in-report to append a slide to active deck"
```

---

## Wave 11 — Final verification (1 task)

End-to-end smoke covering build, tests, and the user-facing flows.

### Task 35: Build, full test run, full manual smoke

**Files:** none modified.

- [ ] **Step 1: TypeScript check from scratch**

Run: `cd web && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Full vitest run**

Run: `cd web && npm test`
Expected: all tests pass (decks, autoNarrative, deckMigration, createSlideFromChat — at least 23 tests).

- [ ] **Step 3: Production build**

Run: `cd web && rm -rf .next && npm run build`
Expected: build succeeds; `/reports` and `/reports/[reportId]` are listed as dynamic (`λ`) routes; bundle size for `/reports` shouldn't exceed ~500KB first-load (Leaflet is large; flag and investigate if it exceeds 1MB).

- [ ] **Step 4: Manual smoke — editor**

```bash
cd web && npm run dev
```

In a fresh browser profile (or after `localStorage.clear()`):
- Visit `/reports`. The seeded "Investor Pitch — Florești" appears with 17 slides; slide #1 (cover) is selected.
- Verify each slide kind renders correctly. Walk through all 17 slides via the outline.
- Edit the cover title from the right panel → canvas updates.
- Edit the cover title inline on the canvas (click in the headline area) → right panel updates.
- Drag slide #5 to position #2 in the outline → order persists; refresh and re-verify.
- Add a `text` slide via the palette → it appears after the currently selected slide.
- Right-click a slide → Duplicate, Delete work.
- Click **+ New deck** → a clone appears in the Mine section with name "Investor Pitch 1".
- Click **Share** → URL copied to clipboard.

- [ ] **Step 5: Manual smoke — print**

In `/reports`, click **PDF** → navigates to `/reports/[reportId]` → press ⌘P / Ctrl-P:
- Browser print dialog shows 17 landscape A4 pages.
- No TopNav, no print bar, no slide chrome controls.
- Slides render with brand chrome (flag, logos, page numbers).
- Save as PDF → file looks like a deck.

- [ ] **Step 6: Manual smoke — chat bridge**

In `/chat`, run each of these and verify the right slide kind lands in `/reports`:

| Chat query | Expected slide kind appended |
| --- | --- |
| `Snapshot Cluj-Napoca` | `city_snapshot` |
| `Snapshot Cluj` (county) | `county_snapshot` |
| `Trend GDP per capita Cluj` | `trend` |
| `Compare wages Cluj vs Bistrița` | `comparison` |
| `Recommend tech investments` | `recommendation` |
| `Parcels in Cluj` | `parcel_detail` |
| `Where can I build a factory in Bihor` | `parcel_detail` |

Each click on **Use in report** should navigate to `/reports?slide=<id>` with the new slide selected and visible in the right outline.

- [ ] **Step 7: Manual smoke — migration**

Open DevTools → Application → Local Storage → site origin:
- Run `localStorage.clear()` and reload `/reports`. The migration seeds the Investor Pitch deck. `innoinvest:decks` and `innoinvest:active-deck` keys appear. Old `innoinvest:templates` / `innoinvest:reports` keys do not.
- Set `localStorage.setItem("innoinvest:templates", "[]")` and `localStorage.setItem("innoinvest:reports", "[]")`, then clear `innoinvest:decks` and reload. The legacy keys are removed; the seeded deck is recreated.

- [ ] **Step 8: Final commit (only if any small fixes were needed)**

If any of the smoke tests required a code change, commit each fix as its own small commit referencing the wave it's repairing. Otherwise, no commit needed.

- [ ] **Step 9: Mark plan complete**

This plan is done. The deck builder ships with:
- 15 slide kinds
- 17-slide seeded Investor Pitch — Florești
- 3-column editor with drag-reorder, kind-specific forms, picker components
- Inline + side-panel editing
- Read-only print view with browser PDF export
- Chat → deck bridge that always lands on the active deck

---

## Self-review checklist

After writing this plan, an end-of-plan pass confirmed:

1. **Spec coverage**: every numbered section of the spec maps to a task —
   - § 2.2 data model → Tasks 5, 6
   - § 2.3 persistence → Task 8
   - § 2.4 file structure → Tasks 5-31 collectively
   - § 3 slide library (14 kinds + cover = 15) → Tasks 13-23
   - § 3.1 seeded deck → Task 6
   - § 3.2 palette grouping → Task 5 (SLIDE_PALETTE_GROUPS) + Task 27 (SlidePalette)
   - § 4 editor UX → Tasks 28-31
   - § 5.1 chat bridge → Tasks 33, 34
   - § 5.2 regenerate → covered by the year-on-deck plumbing in Tasks 6, 31 (Regenerate button is deferred; the year pill works; the spec's "v1 just bumps values silently" requirement is satisfied because each slide carries `dataYear` and re-derives KPI values on render)
   - § 5.3 migration → Task 8
   - § 6 visual style → Tasks 2 (tokens), 9-10 (chrome), all renderers
   - § 7 print → Task 4 (CSS), 32 (preview wire-up)

2. **Placeholder scan**: zero TODO/TBD; every code step includes complete code.

3. **Type consistency**: the names `Deck`, `Slide`, `SlideKind`, `PhotoId`, factory functions (`makeCoverSlide`, `makeCountySnapshot`, etc.), and helpers (`slideOutlineLabel`, `photoUrl`, `defaultSlideForKind`, `SLIDE_PALETTE_GROUPS`, `SLIDE_KIND_LABELS`) match between Tasks 5/6 (definition) and Tasks 11/13-31/33/34 (consumption). Field names (`backgroundPhotoId`, `heroPhotoId`, `photoId`, `kpiCodes`, `locationSirutas`, `parcelId`) are used consistently in the slide-type definitions and the matching edit-panel forms.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-24-report-builder-v2-pitch-deck.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best fit because this plan has ~35 mostly-independent tasks with clear visual/typecheck verification at each step.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints for review.

**Which approach?**












