# Report Builder v2 — Investor Pitch Deck

**Date:** 2026-05-24
**Status:** Approved — ready for implementation planning
**Scope:** Complete rewrite of `/reports`. The existing template-and-slot model ships out; a deck editor with typed slide kinds ships in. Adds a real chat → deck bridge.

---

## 1. Context

The current `/reports` page is a tile/slot dashboard generator. It produces a portrait, single-page report that bears no resemblance to the real ADR Nord-Vest pitch deck the analyst team actually uses (a 29-page landscape PDF, full-bleed photography, branded headers, infographic stats, satellite parcel maps, section dividers).

User feedback (verbatim): *"the generated raport looks nothing like the one i have as an example. lets brainstorm variations, maybe do an a/b testing."* Plus: *"the use in the raport button doesnt really work out."*

The example PDF (`Copy of INNO, Florești, 01 AUGUST (1).pdf`, 29 pages, landscape) is the visual reference. The chat's **Use in report** button is currently a stub link to `/reports` with no payload.

This spec replaces the report builder entirely with a deck editor that:
- Outputs decks that look like the ADR example (visual direction "C" from the brainstorm — example energy + cleaner data, split-layouts inside)
- Lets analysts edit text inline, add/remove/reorder slides, swap data-bound elements (KPIs, parcels)
- Keeps the brand chrome (ADR flag, logo strip, page numbers, accent underlines) locked — analysts can't go off-brand
- Wires the chat's **Use in report** to actually create a new slide in the active deck

## 2. Architecture

### 2.1 Routes (unchanged externally)

| Route | Purpose |
| --- | --- |
| `/reports` | Deck editor — three-column workspace (deck library / canvas / edit panel) |
| `/reports/[reportId]` | Read-only deck preview, optimised for printing (calls `window.print()` on a button) |

Both routes are now driven by the new Deck data model.

### 2.2 Data model

A `Deck` is an ordered list of typed `Slide` records, each with locked brand chrome plus a small editable surface.

```ts
export type Deck = {
  id: string;
  title: string;
  templateOrigin: "investor-pitch" | "blank" | "user-saved";
  /** Primary location the deck is about. Drives data-bound elements. */
  locationSiruta: string | null;
  /** Year used to derive KPI values when a slide is added or regenerated. */
  systemYear: number;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
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

// Every Slide carries: { id, kind, dataYear, ...kind-specific fields }
```

Each kind has a discriminated `kind: "cover" | "section_divider" | …` field. The renderer is a `switch (slide.kind)` mapping each kind to a `<XSlideRenderer>` component.

### 2.3 Persistence

`localStorage` under a single key `innoinvest:decks` holding `Deck[]`. Active deck id under `innoinvest:active-deck`. The current `innoinvest:templates` and `innoinvest:reports` keys are deprecated and migrated away on first load (see § 5.3).

### 2.4 File structure

```
frontend/src/
├── app/reports/
│   ├── page.tsx                              # MODIFY: rewritten as 3-column deck editor
│   └── [reportId]/page.tsx                   # MODIFY: read-only deck render w/ print
├── components/reports/                       # OLD FILES DELETED ENTIRELY:
│   ├── TemplateLibrary.tsx                   #   DELETE
│   ├── TemplateCanvas.tsx                    #   DELETE
│   ├── SectionBlock.tsx                      #   DELETE
│   ├── SlotDropZone.tsx                      #   DELETE
│   ├── VariablesPicker.tsx                   #   DELETE (functionality reused in KpiPicker)
│   ├── LocationPicker.tsx                    #   DELETE
│   ├── GenerateOverlay.tsx                   #   DELETE
│   ├── ReportPreview.tsx                     #   DELETE
│   ├── DiffBadge.tsx                         #   DELETE
│   └── SystemClock.tsx                       #   KEEP (referenced by /reports page)
├── components/reports/deck/                  # NEW DIR
│   ├── DeckLibrary.tsx                       # left rail: decks + slide outline
│   ├── DeckCanvas.tsx                        # centre: selected-slide renderer + edit toolbar
│   ├── EditPanel.tsx                         # right rail: slide-kind-specific form
│   ├── SlidePalette.tsx                      # popover from "+ Add slide"
│   ├── SlideThumbnail.tsx                    # low-fidelity sidebar preview
│   ├── KpiPicker.tsx                         # autocomplete + chip list (reuses dnd-kit)
│   ├── ParcelPicker.tsx                      # autocomplete from mock/parcels
│   ├── PhotoPicker.tsx                       # 6-photo grid
│   ├── EditableText.tsx                      # contenteditable span helper
│   └── renderers/                            # one per slide kind
│       ├── CoverSlideRenderer.tsx
│       ├── SectionDividerSlideRenderer.tsx
│       ├── CountySnapshotSlideRenderer.tsx
│       ├── CitySnapshotSlideRenderer.tsx
│       ├── CommuneDetailSlideRenderer.tsx
│       ├── StrategicLocationSlideRenderer.tsx
│       ├── ParcelDetailSlideRenderer.tsx
│       ├── InfrastructureDividerSlideRenderer.tsx
│       ├── InfrastructurePageSlideRenderer.tsx
│       ├── StatInfographicSlideRenderer.tsx
│       ├── TrendSlideRenderer.tsx
│       ├── ComparisonSlideRenderer.tsx
│       ├── RecommendationSlideRenderer.tsx
│       ├── TextSlideRenderer.tsx
│       └── ContactSlideRenderer.tsx
├── components/reports/chrome/                # NEW DIR: brand chrome + print rules
│   ├── BrandFlag.tsx                         # ADR Nord-Vest flag (top-left, locked)
│   ├── LogoStrip.tsx                         # top-right logos (location coat-of-arms + INNO)
│   ├── PageNumber.tsx                        # bottom-right
│   └── deck-print.css                        # @media print rules
├── lib/mock/
│   ├── decks.ts                              # NEW: types + seeded "Investor Pitch — Florești"
│   └── templates.ts                          # DELETE
├── lib/decks/                                # NEW DIR
│   ├── createSlideFromChat.ts                # AssistantBlock[] → Slide
│   ├── deckMigration.ts                      # one-time localStorage migration helper
│   └── autoNarrative.ts                      # templated paragraph generators for snapshots
├── lib/persistence/keys.ts                   # MODIFY: deprecate templates/reports keys, add deck keys
└── public/deck-photos/                       # NEW: 6 stock photos for divider/cover slides
```

Total: ~25 new files; ~10 deleted; small modifications to `[reportId]/page.tsx`, `keys.ts`, `AssistantCard.tsx`.

## 3. Slide library

14 slide kinds, each with **fixed layout**, **locked brand chrome**, and **a defined set of editable text fields + data-bound elements**. Aspect ratio is landscape A4 (1.414 : 1).

| Kind | Layout summary | Editable fields | Data-bound elements |
| --- | --- | --- | --- |
| `cover` | Big title block, project tag, RO map with NW counties highlighted, "prepared for / date" | `title`, `subtitle`, `preparedFor`, `dateIssued` | RO map auto-highlights deck's `locationSiruta` county |
| `section_divider` | Full-width photo with centred all-caps title | `title` | `backgroundPhotoId` (picker, 6 stock options) |
| `county_snapshot` | Eyebrow, headline, 4 KPI tiles, 5-year sparkline strip | `eyebrow`, `headline`, optional `narrative` | KPI codes (default: workforce, gdp_per_capita, businesses, exports); values for `deck.locationSiruta` |
| `city_snapshot` | County variant with city-level photo strip + "Romania's IT hub" style narrative block | `eyebrow`, `headline`, `narrative` (3 paragraphs) | KPI tiles + city photo (auto-selected from deck-photos) |
| `commune_detail` | Icon + headline + 2-3 short paragraphs, hero photo, single key callout | `headline`, `paragraphs[]` (1-4), `calloutText` | hero photo (picker), optional callout |
| `strategic_location` | Full-page divider styled like example p.5 — large centred title over dimmed industrial photo | `title` | `backgroundPhotoId` |
| `parcel_detail` | "200HA Florești, Cluj County" headline, 3 pill features, satellite map, key-features bullets | `title`, `features[]` (3 pills), `keyFeatures[]` (bullets), `indicatedPrice` | `parcelId` → pulls from `mock/parcels`; Leaflet map zoomed to parcel, satellite tile layer; "nearby major companies" hand-edited |
| `infrastructure_divider` | Section divider variant labeled "Infrastructure & Utilities" | `title` | photo |
| `infrastructure_page` | Like example p.8: 3 highlighted icons (highway / airport / border) + Leaflet road map | `feature labels`, `distances[]` (3) | parcel/location infrastructure data; map auto-centres on parcel |
| `stat_infographic` | Like example p.2: 5-8 big statistics arranged in a layout with dotted-line connectors + side panel ("Overnight delivery to: …") | each stat: `value`, `label`; side panel rows | optional auto-fill from KPI catalogue |
| `trend` | Headline + multi-year LineChartBlock + commentary paragraph | `headline`, `commentary` | KPI + location → series |
| `comparison` | Headline + multi-location LineChartBlock + commentary | `headline`, `commentary`, `locationSirutas[]` | KPI + N locations |
| `recommendation` | Headline + composite-score RankingTable + MapBlock + narrative | `headline`, `narrative`, `sector` | sector + deck year → live composite |
| `text` | Generic prose page — title + 1-3 paragraph rich text | `title`, `paragraphs[]` | none |
| `contact` | Final slide: ADR contact info, INNO + Florești logos, "for more information" CTA | `headline`, `contactRows[]`, `ctaText` | static |

### 3.1 Seeded "Investor Pitch — Florești" deck (17 slides)

Modeled directly on the example PDF:

1. Cover
2. County snapshot — Cluj
3. City snapshot — Cluj-Napoca
4. Commune detail — Florești
5. Strategic location divider
6. Parcel detail — Florești 200HA
7. Infrastructure divider
8. Infrastructure page
9. Stat infographic — workforce / income / business density (radial layout)
10. Trend — GDP growth (10-year)
11. Comparison — Cluj vs Bistrița-Năsăud
12. Recommendation — tech investment
13. Section divider — "Workforce & Ecosystem"
14. Stat infographic — overnight delivery to European cities (side panel layout)
15. Strategic location divider — "Additional Sites"
16. Parcel detail — Jucu Industrial Park
17. Contact

### 3.2 Slide palette grouping

The "+ Add slide" popover groups the 14 kinds into 5 categories:

- **Structure**: cover, section_divider, contact
- **Snapshot**: county_snapshot, city_snapshot, commune_detail
- **Location**: parcel_detail, strategic_location, infrastructure_divider, infrastructure_page
- **Data**: stat_infographic, trend, comparison, recommendation
- **Custom**: text

## 4. Editor UX

Three-column workspace at desktop, simplified collapse on smaller widths.

```
┌─TopNav────────────────────────────────────────────────────────────┐
├─16rem──────┬──────────────────────────────────────┬─18rem─────────┤
│ Deck       │  Canvas                              │ Edit panel    │
│ library    │                                      │ (selected     │
│  Mine      │  ┌─slide thumbnail (full A4)──────┐  │  slide)       │
│  Shared    │  │   Brand chrome (locked)        │  │               │
│            │  │                                │  │ Eyebrow       │
│ ───        │  │   Editable headline → click    │  │ [input]       │
│ Slides     │  │   Stat tiles (data-bound)      │  │               │
│ 1 · Cover  │  │                                │  │ Headline      │
│ 2 · County │  └────────────────────────────────┘  │ [input]       │
│ 3 · City   │                                      │               │
│ 4 · …      │  Florești · 2024 · Slide 4 of 17    │ KPI tiles     │
│            │  ← Prev   Next →                     │ ⠿ workforce ✕ │
│ + Slide    │                                      │ + Add KPI     │
└────────────┴──────────────────────────────────────┴─[Save] [PDF]──┘
```

### 4.1 Left column — Deck library + slide outline

- **Decks list** at top, two sections (Mine / Shared); the seeded "Investor Pitch — Florești" lives in Shared and is clone-only (deleting it is blocked).
- **Slides list** below, vertical. Each item shows position + kind label + first few words of `title` (or auto-derived label). Drag-handle on the left for reorder via dnd-kit (already installed). Right-click → Duplicate / Delete.
- **+ Add slide** opens `SlidePalette` popover — grouped per § 3.2. Clicking a kind appends at the end (selected slide-position + 1) and selects it.
- **+ New deck** at the very bottom clones the Shared "Investor Pitch — Florești" with the current Mine deck count appended to the name; analyst can inline-rename.

### 4.2 Centre column — Canvas

- Renders the selected slide at full landscape-A4 fidelity via the appropriate `XSlideRenderer`, scaled to fit the column with aspect preserved.
- **Editable text** uses `<EditableText>` — a small `contenteditable` span helper that on blur calls back with the new string, the renderer commits to the slide record, the page persists. Visual cue: dotted underline on hover, brand-teal outline on focus, "Esc to cancel" hint.
- **Above the canvas (sticky toolbar)**:
  - Deck name (click to rename)
  - Location pill ("Florești") — click to open `LocationPicker` popover; changing the location re-derives all data-bound values on every slide.
  - Year pill ("2024") — click to set; affects new slides + Regenerate.
  - **Download PDF** → `window.print()` with the print CSS active (§ 6).
  - **Share** → copies the read-only `/reports/[reportId]` URL.
- **Below the canvas**: status row — last-saved timestamp, slide kind, Prev / Next slide arrows.

### 4.3 Right column — Edit panel

- Header: slide-kind label + an overflow menu (Duplicate slide / Delete slide / Reset slide to template defaults).
- Body: form fields specific to the kind:
  - **Text inputs / textareas** for editable strings — synced two-way with the canvas (typing on either side updates the other).
  - **KPI picker** (`<KpiPicker>`) for slides with stat tiles: a chip list with ✕ remove + an "+ Add KPI" autocomplete that filters the KPI catalogue. Validation: caps stat-infographic at 8 KPIs.
  - **Parcel picker** (`<ParcelPicker>`) for parcel slides: autocomplete from `mock/parcels`.
  - **Photo picker** (`<PhotoPicker>`) for dividers / cover: 3 × 2 grid of stock photos from `public/deck-photos/` + a "no photo" option.
  - **Auto-narrative** toggle on snapshot slides — "Fill paragraphs from data" populates the editable text fields with templated copy that reflects the location's current values (e.g. "Florești has 57,437 residents — the largest commune in Romania."). Analyst can then hand-edit.
- Footer: **Reset slide to template defaults** (re-renders the slide with the seeded values for its kind + current deck location/year).

### 4.4 Selection state

- Selected slide id is URL-bound (`?slide=<id>`) so it survives reloads and is the target for the chat bridge's deep-link.
- Keyboard: ↑/↓ moves between slides in the outline; ⌘D duplicates; Delete removes.

## 5. Bridges, regeneration, migration

### 5.1 Chat → Deck bridge

The chat's **Use in report** button on every `AssistantCard` becomes a real handler:

```ts
// frontend/src/lib/decks/createSlideFromChat.ts
export function slideFromAssistantBlocks(
  blocks: AssistantBlock[],
  ctx: { activeDeckLocation: string | null; activeDeckYear: number }
): Slide;
```

Mapping:

| Source `AssistantBlock` kind | Produced `Slide` kind |
| --- | --- |
| `scorecard` | `county_snapshot` (or `city_snapshot` if the location type is city) |
| `recommendation` / `interactiveRecommendation` | `recommendation` |
| `lineChart` w/ 1 series | `trend` |
| `lineChart` w/ 2+ series | `comparison` |
| `metricCard` | `stat_infographic` with one stat |
| `parcelMap` | `parcel_detail` (uses the highest-scoring parcel in the block) |
| `map` (county choropleth) | `recommendation` (re-runs composite for the inferred sector) |
| Fallback / text-only | `text` |

AssistantCard's button invokes a small `useActiveDeck()` hook that:

1. Reads `innoinvest:decks` + `innoinvest:active-deck` from localStorage.
2. If no active deck, creates one from the Investor Pitch template using the chat's referenced location, then inserts the new slide at position 2 (right after Cover).
3. Otherwise appends the new slide at the end.
4. Persists, sets active slide id, navigates `/reports?slide=<new-slide-id>`.

If the chat's referenced location differs from the active deck's location, a small toast offers "Switch deck location to Florești?" with Accept / Decline.

### 5.2 Regenerate

Each slide carries `dataYear: number`. The deck's year pill drives the **default for new slides** and a **Regenerate** action that bumps every slide's `dataYear` to the deck's current year, re-deriving stat values from observations. Generated PDFs already exported are unaffected (they're files). Diff badges between old and new values are deferred to v2.

### 5.3 Persistence migration

On first mount, `frontend/src/lib/decks/deckMigration.ts` runs:

1. If `innoinvest:decks` exists → no-op.
2. Otherwise, clear `innoinvest:templates` + `innoinvest:reports` + `innoinvest:active-deck` (the schemas are incompatible — no need to preserve old user data, the demo restarts cleanly).
3. Seed `innoinvest:decks` with the Investor Pitch — Florești deck and set it as active.

`STORAGE_KEYS` in `frontend/src/lib/persistence/keys.ts` gains `decks: "innoinvest:decks"` and `activeDeck: "innoinvest:active-deck"`; `templates` and `reports` constants are removed.

## 6. Visual style

### 6.1 Locked brand chrome (every slide)

- **`<BrandFlag>`** top-left: 32 × 42 px, deep teal `#157777` (closer to the example PDF than our brand `#45afaa`), arrow-shaped clip-path: `polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%)`, white "ADR Nord-Vest" wordmark.
- **`<LogoStrip>`** top-right: location's coat-of-arms (mocked SVG for v1) + INNO logo, ~80px tall, right-aligned. Coat-of-arms is selected automatically based on the deck's `locationSiruta` (county-level mapping). Logo upload is deferred to v2.
- **`<PageNumber>`** bottom-right: small grey numeric, plain text.
- **Underline accent** on most headlines: 2px orange `#f5a623`, ~80px wide. Reusable utility class `.deck-underline`.

### 6.2 Typography

- **Display headlines:** `Raleway 700/800`, all-caps for hero/divider slides; sentence case for snapshot/text. Tight tracking (`-0.02em`).
- **Body:** `Open Sans 400/600`.
- **Eyebrows / metadata:** `Open Sans 600`, 0.05em tracking, uppercase, 10-12px.

(Both families already loaded in `layout.tsx` — no new font imports needed.)

### 6.3 Deck palette

A small additive token set in `globals.css`, scoped to the deck:

```css
--color-deck-deep: #157777;     /* flag, dark headlines */
--color-deck-bright: #1ea29a;   /* eyebrows, accents — close to existing primary-container */
--color-deck-accent: #f5a623;   /* underline accents */
--color-deck-paper: #fafbfb;    /* page background */
--color-deck-ink: #1a2322;      /* body */
```

The existing brand tokens (`--color-primary` etc.) stay untouched. The deck uses `var(--color-deck-*)` exclusively so its appearance is independent of any future global brand tweak.

### 6.4 Photos

`public/deck-photos/` carries 6 stock photos sourced from a free-commercial-use library (Unsplash with appropriate attribution in a `frontend/public/deck-photos/CREDITS.md`):

- `industrial-park-1.jpg` — generic industrial park, used as default for parcel_detail / strategic_location
- `urban-cluj.jpg` — Cluj-Napoca skyline
- `commune-blocks.jpg` — residential blocks (Florești-like)
- `landscape-mountains.jpg` — NW Romania mountain landscape
- `highway-aerial.jpg` — aerial highway shot, used by infrastructure_divider default
- `satellite-default.jpg` — overhead satellite-style (used as fallback when a parcel's specific satellite tile fails to load)

Each ~150-300 KB JPEG, served statically.

## 7. Print / PDF export

Browser print-to-PDF via `window.print()`. Print CSS lives in `frontend/src/components/reports/chrome/deck-print.css`, applied globally when the page is in print mode.

`@media print` rules:

- Hide the TopNav, deck library, edit panel, all toolbars.
- Render the slides stacked vertically, page-break-after each slide.
- Each slide rendered at landscape A4: `@page { size: A4 landscape; margin: 0 }`.
- Disable transitions, hover effects, animations.
- Ensure Leaflet maps within slides render their final state (no zoom controls in print).

The "Download PDF" button just calls `window.print()`. The user picks "Save as PDF" in the browser's print dialog. No backend.

## 8. Out of scope (v2)

Explicitly deferred:

- Real `.pptx` export
- Photo upload (only the curated 6-photo set ships in v1)
- Real logo upload — the 6 county coat-of-arms ship as mocked-up SVGs in `public/deck-photos/coats/`
- Multi-template choice — only the Investor Pitch + blank deck for v1
- Collaborative editing
- Diff badges on regenerate (v1 just bumps values silently)
- AI-suggested narrative — `auto-narrative` toggle uses templated strings, not LLM
- Server-side PDF generation (Puppeteer/Chrome headless)
- Embedded video / animation
- Slide-level theme overrides (all slides use the global deck palette)

## 9. Open questions

None — all design decisions confirmed during the brainstorm.
