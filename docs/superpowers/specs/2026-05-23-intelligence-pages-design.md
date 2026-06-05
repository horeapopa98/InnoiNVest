# Intelligence Platform Pages — Design

**Date:** 2026-05-23
**Status:** Approved — ready for implementation planning
**Scope:** 3 new frontend pages (Report Builder, Data Browser, Chat). Mock data only; no backend wiring in this phase.

---

## 1. Context

The Stitch-ported screens (`/sectors`, `/sectors/macro`, `/report-preview`) currently demo a narrative around InnoiNVest. They are static showpieces. To make the product usable for ADR Nord-Vest analysts, we need three workflow pages:

1. **Report Builder** — assemble a reusable template of variables, generate a report for a specific commune/city/county, and **regenerate later with fresh data** (the killer feature for the investor-revisit workflow: "ADR, generate the same dossier again with this year's numbers").
2. **Data Browser** — a table view of all observations with filtering, so analysts can verify what the system has and explore freely.
3. **Chat** — a ChatGPT-style interface for natural-language Q&A over the data.

This phase ships them as **high-fidelity mocked UI** — drag-drop, filtering, generation, and chat all feel real, but data is hardcoded TypeScript modeled after `config/kpis.yaml`. The Python backend (`src/innoinvest/`) remains dormant. Wiring is a follow-up phase.

## 2. Architecture

### 2.1 Routes

| Route | Purpose |
| --- | --- |
| `/reports` | Report Builder: template editor + library + generated-report list |
| `/reports/[reportId]` | Read-only preview of a generated report; landing target for share links and the regenerate flow |
| `/data` | Data Browser: filtered long-format table |
| `/chat` | Chat: ChatGPT-style sidebar + thread |

Existing routes (`/sectors`, `/sectors/macro`, `/report-preview`) remain untouched.

### 2.2 TopNav update

`DEFAULT_ITEMS` in `frontend/src/components/stitch/TopNav.tsx` grows from 3 to 4 items:

```ts
[
  { label: "Workspace", href: "/sectors" },
  { label: "Reports", href: "/reports" },
  { label: "Data", href: "/data" },
  { label: "Chat", href: "/chat" },
]
```

The existing `usePathname()`-based active-state logic handles routing without further changes.

### 2.3 Shared mock data layer

A new `frontend/src/lib/mock/` directory holds all sample data:

- **`kpis.ts`** — ~20 KPI definitions modeled after `config/kpis.yaml`. Each entry: `{ code, name_en, name_ro, unit, category, source, formatter }`. Categories: Demographics, Macro-Economy, Labor Market, Real Estate, Infrastructure, Education, Risks.
- **`locations.ts`** — 12 SIRUTA locations:
  - 6 counties (Cluj, Bistrița-Năsăud, Maramureș, Satu Mare, Sălaj, Bihor)
  - 6 cities/communes (Cluj-Napoca, Florești, Bistrița, Baia Mare, Oradea, Zalău)
  - Each entry: `{ sirutaCode, name, type: "commune" | "city" | "county", county, population }`.
- **`observations.ts`** — Deterministic time series per `(locationSiruta, kpiCode, year)` for years 2018–2024 (7 years × 12 locations × 20 KPIs ≈ 1,680 rows; some KPIs are county-level only, so realistic total ≈ 800–1,000). Generated via a seeded PRNG so values are stable across reloads and consistent with growth narratives (e.g. Cluj-Napoca GDP grows monotonically, Maramureș population shrinks).
- **`templates.ts`** — One seeded template ("Standard ADR Commune Dossier"). User-saved templates live in localStorage.
- **`chat.ts`** — Intent classifier + ~15 pre-authored response templates keyed off keywords (`gdp`, `population`, `compare`, `trend`, `unemployment`, named locations). Each response can include text, an inline sparkline component, a small table, and numbered source citations.

All exports are TypeScript constants — no async, no fetch. Ready to be swapped for a real API client by renaming the module and changing return types to `Promise<T>`.

### 2.4 Persistence

`localStorage` for everything user-generated:

| Key | Shape |
| --- | --- |
| `innoinvest:templates` | `SavedTemplate[]` |
| `innoinvest:reports` | `GeneratedReport[]` |
| `innoinvest:chats` | `Conversation[]` |
| `innoinvest:active-chat` | `string` (conversation id) |

Each surface has a small "Reset" link (in the footer or settings menu) to clear its key for demo purposes. Versioning prefix `innoinvest:` so future keys are namespaced.

### 2.5 Drag-and-drop

`@dnd-kit/core` + `@dnd-kit/sortable`. Reasons over react-dnd / native HTML5 DnD:
- Accessible by default (keyboard-navigable, screen-reader-friendly).
- Doesn't rely on the broken HTML5 DnD spec.
- Supports custom collision detection (needed for slot-typed drops in the Report Builder).
- Already widely used in React 19 / Next 15 stacks.

Used by:
- Report Builder: drag KPI from variables sidebar into a section slot; reorder sections.
- Data Browser: reorder columns.

### 2.6 Charts

Inline SVG components, no chart library. The data is small (max ~10 data points per sparkline) and we control the visual language. Components:

- `<Sparkline points={...} color="primary" height={32} />` — single-line trend
- `<BarRow value={...} max={...} />` — single horizontal bar (already used on /sectors/macro)
- `<MiniBarChart series={...} />` — small grouped bar chart for comparisons

This keeps the bundle additions minimal and the visuals on-brand.

---

## 3. Page 1 — `/reports` (Report Builder)

### 3.1 Layout

Three-column workspace at desktop, single-column with collapsible drawers on mobile:

```
┌─Sidebar L (16rem)──┬─Canvas (flex-1, max 880px)───┬─Sidebar R (16rem)──┐
│ Template Library   │ Section blocks               │ Variables Picker   │
│  - Mine            │  - Cover                     │  Search input      │
│  - Shared          │  - Executive Summary         │  Grouped by        │
│  - + New           │  - Demographics              │  category, with    │
│ Recent Generated   │  - Macro-Economy             │  collapse toggles  │
│  - <loc> <date>    │  - …                         │                    │
│                    │ [+ Add section ▾]            │                    │
│                    │                              │                    │
│                    │ Location: <picker>           │                    │
│                    │ [Preview] [Generate]         │                    │
└────────────────────┴──────────────────────────────┴────────────────────┘
```

### 3.2 Sections & slots

Eight section types, each with typed slots. A section can be added once or skipped.

| Section | Slot kinds | Constraint |
| --- | --- | --- |
| Cover | `location` (auto), `date` (auto) | none |
| Executive Summary | `headline` (1), `trend` (1), `prose` (auto) | from any category |
| Demographics | `chart` (1), `table` (1–4 KPIs) | category = Demographics |
| Macro-Economy | `chart` (1), `table` (1–4 KPIs) | category = Macro-Economy |
| Labor Market | `chart` (1), `table` (1–4 KPIs) | category = Labor Market |
| Real Estate | `chart` (1), `table` (1–4 KPIs) | category = Real Estate |
| Risks | `prose` (auto-generated) | none |
| Appendix | `table` (any KPIs, ungrouped) | none |

Slot kinds:
- **`headline`** — single big number + trend indicator (matches the /sectors/macro hero pattern but in document context).
- **`chart`** — sparkline of the selected KPI over the last 5 years.
- **`table`** — multi-row table of values for several KPIs at the selected location (most recent year).
- **`prose`** — system-generated paragraph from selected KPIs (e.g. "Population grew from 16,820 in 2020 to 18,420 in 2024, a 9.5% increase that outpaces both county and region averages.")
- **`location`** / **`date`** — auto-populated from the report's location selection and generation timestamp.

### 3.3 Variables picker (right sidebar)

Lists all KPIs from `lib/mock/kpis.ts`, grouped by category. Each KPI shows:
- Drag handle (Lucide `GripVertical`)
- Name (current locale; defaults to `name_en`)
- Unit chip
- For locations where this KPI is loaded: a tiny live preview of the current value

Search input filters by name in either language.

### 3.4 Drop validation

When dragging a KPI over a slot:
- **Valid drop**: green dashed outline, slot tooltip shows "Drop to use as headline value".
- **Invalid drop** (category mismatch, slot type mismatch): red outline + tooltip with reason ("This is a Labor Market KPI; this is a Demographics section").
- **Already-filled slot**: amber outline + tooltip "Replace current variable?"; drop = replace.

Slots with no compatible KPI in the variables list show "No KPIs available for this slot" with a link to clear filters.

### 3.5 Generate flow

1. User selects a location from the picker at the bottom of the canvas (required).
2. User clicks **Generate**.
3. UI shows a brief 800ms "Compiling 13 sources…" overlay (cosmetic; uses a stagger of category labels rotating).
4. Renders an A4-style preview using the existing `.a4-page` styles + Stitch typography from `/report-preview`.
5. The new report appears under **▼ Recent generated** in the left sidebar with `{templateName, locationName, generatedAt}`.
6. The preview is read-only with three actions: **Edit template** (returns to builder with this template loaded), **Regenerate**, **Download PDF** (uses existing `PrintButton`).

### 3.6 Template save/load

- **+ New** clones the current canvas state (sections + slot bindings) as a new template named "Untitled".
- Inline rename (click name → input).
- **Save** persists to `localStorage:innoinvest:templates`.
- Templates can be **duplicated** or **deleted** from a row hover menu.
- **Shared** tab is read-only and ships with the "Standard ADR Commune Dossier" template (defined in `lib/mock/templates.ts`).
- Clicking a template in the library loads it into the canvas, discarding unsaved changes (with a confirm modal).

### 3.7 Regenerate-with-diff (the investor-revisit feature)

A generated report stores:
```ts
{
  id, templateId, locationId,
  observationSnapshot: { [kpiCode]: { year, value, source } },
  generatedAt,
}
```

When the user clicks **Regenerate** on a recent report:
1. The same template + location are re-applied.
2. A fresh `observationSnapshot` is computed from the current mock observations (which include +1 year of data if the user has fast-forwarded — see § 3.8).
3. The new report renders with **diff badges** next to changed values:
   - "Population: 18,420 → **18,910** ▲ +2.7%"
   - "GDP/capita: €24,300 → **€25,100** ▲ +3.3%"
4. The header shows "Regenerated from <original-date> · Fresh fetch on <today>".
5. Both versions persist; the original is not overwritten.

### 3.8 Time-travel for demo realism

Because mock observations are static, the user needs a way to simulate "1-2-3 years later". A small **clock control** in the page footer lets demo users jump the system's "current year" forward:

```
System year: [2024 ▾]   (2024 · 2025 · 2026 · 2027)
```

Switching the year:
- Updates which observations are "current" for new generations.
- Does NOT mutate existing generated reports.
- Persists in `localStorage` so the demo state survives reloads.

This makes the regenerate-with-diff flow demonstrable without a real backend.

---

## 4. Page 2 — `/data` (Data Browser)

### 4.1 Layout

Single-column page with a sticky filter bar above the table:

```
┌─Heading + stat counters──────────────────────┐
│ All indicators · 847 rows · 12 locations · …│
├─Filter bar (sticky on scroll)────────────────┤
│ Search · Location · Category · Year · Range  │
├─Table (sticky header)────────────────────────┤
│ Location ⇅ │ KPI ⇅ │ Cat │ Year │ Value │ … │
│ …                                            │
└──────────────────────────────────────────────┘
                              [Export CSV] [⋯]
```

### 4.2 Columns

| Column | Sortable | Notes |
| --- | --- | --- |
| Location | ✓ | Locations from `lib/mock/locations.ts` |
| County | ✓ | Auto-derived from location |
| KPI | ✓ | Name in current locale |
| Category | ✓ | Color-chip per category |
| Year | ✓ | 2018–2024 |
| Value | ✓ | Right-aligned, formatted per KPI unit |
| Unit | – |  |
| Source | – | "INS Tempo" / "Eurostat" chip |
| Last fetched | ✓ | Relative (e.g. "2 days ago") |

Default sort: Location asc, then KPI asc.

### 4.3 Filters

All filters AND together. Combine via a single state shape:

```ts
type DataFilters = {
  search: string;           // matches location name OR KPI name
  locationCodes: string[];  // multi-select
  categories: string[];     // multi-select
  year: number | null;      // single-select; null = all
  valueRange: [number, number] | null;
};
```

Filter UI:
- **Search** — free text, 150ms debounce.
- **Location** — chip multi-select dropdown.
- **Category** — chip multi-select dropdown.
- **Year** — single-select dropdown with year options.
- **Value range** — two numeric inputs (`from`, `to`), only enabled when a single KPI is filtered (otherwise the range is meaningless across units).
- **Reset filters** — clears everything.

### 4.4 Row drawer

Clicking a row opens a side drawer (slides in from right, 32rem wide) with:
- The KPI's full definition (description, source URL, raw matrix/dataset reference from the mock kpis catalog).
- The last 5 years of values for this `(location, kpi)` pair as a sparkline + table.
- Two actions: **Use in report** (jumps to `/reports` with this KPI pre-selected for a slot) and **Open KPI page** (placeholder link for future).

### 4.5 Export CSV

`Blob` + `URL.createObjectURL` — generates a CSV of the currently-filtered rows. Filename: `innoinvest-data-YYYY-MM-DD.csv`.

### 4.6 Performance

~800 rows. We start without virtualization. If perf measurements during build show jank on filter changes, add `react-window`. Decision is empirical; do not preempt with library choice.

### 4.7 Column reorder

dnd-kit sortable on the header cells. Reorder persists to `localStorage:innoinvest:data-column-order`.

---

## 5. Page 3 — `/chat`

### 5.1 Layout

Two-column: conversation list (16rem) + thread (flex-1, max 880px centered).

```
┌─Conversations────┬─Thread────────────────────────────────────┐
│ ▼ Today          │ Title: "GDP comparison — Cluj vs Bistrița"│
│  GDP compare     │ ─────                                     │
│ ▼ Yesterday      │                                           │
│  Florești pop    │ <messages>                                │
│ …                │                                           │
│                  │ ┌─Suggested chips─────────────────────┐   │
│ [+ New chat]     │ │ Show trend · Export to report · …   │   │
│                  │ └─────────────────────────────────────┘   │
│                  │ ┌─Input───────────────────────────[↑]┐    │
│                  │ │ Ask anything about the data…       │    │
│                  │ └────────────────────────────────────┘    │
└──────────────────┴───────────────────────────────────────────┘
```

### 5.2 Message types

```ts
type Message =
  | { role: "user"; text: string; timestamp: number }
  | { role: "assistant"; blocks: AssistantBlock[]; timestamp: number };

type AssistantBlock =
  | { kind: "text"; text: string }
  | { kind: "sparkline"; locationCode: string; kpiCode: string; years: number[] }
  | { kind: "comparison"; series: Array<{ locationCode: string; kpiCode: string; values: Array<{year: number; value: number}> }> }
  | { kind: "table"; rows: Array<{ label: string; value: string; source: string }> }
  | { kind: "citation"; sources: Array<{ id: number; label: string; url: string }> };
```

User messages render as right-aligned bubbles with brand teal background. Assistant messages render as left-aligned cards with the blocks composed inline.

### 5.3 Streaming feel

The assistant response appears word-by-word with a typing cursor. Implementation: tokenize the pre-written response into ~3-char chunks and append on a 30ms interval until done. Scrolling up pauses the auto-scroll-to-bottom; scrolling back to the bottom resumes it. Pressing **Esc** or clicking a "Stop" button cancels the stream.

### 5.4 Suggested prompts

Shown above the input when the thread is empty:
1. "Show me unemployment trends in Cluj"
2. "Compare population growth in Cluj-Napoca vs Maramureș"
3. "Which commune has the highest GDP per capita?"
4. "Generate a Florești dossier"

Click → pre-fills the input and submits.

### 5.5 Inline actions on assistant messages

Hover an assistant card to reveal:
- **Copy** — copies the text content to clipboard.
- **Export to report** — opens `/reports` with a new prose section pre-populated from this message.

### 5.6 Mock response engine

`lib/mock/chat.ts` exports `respondTo(message: string, history: Message[]): AssistantBlock[]`.

Implementation:
1. Classify intent by keyword matching: `gdp`, `population`, `compare`, `trend`, `unemployment`, `unemployment rate`, `employment`, `density`, names of any of the 12 locations, `dossier`, `report`.
2. Resolve the most-likely `(locationCode | locationCodes, kpiCode)` referenced.
3. Look up the relevant observations from `lib/mock/observations.ts`.
4. Compose a 2–4 block response: short text + sparkline-or-comparison + numbered citations.
5. If no intent matches confidently, return a fallback response with 3 follow-up suggestions.

About 8 distinct response templates cover the demo space. Each is hand-authored prose with `{{values}}` interpolated from the observation lookup so the numbers feel real.

### 5.7 Conversation lifecycle

- **+ New chat** — creates an empty conversation, makes it active.
- **First user message** auto-titles the conversation (first 60 chars of the user message, truncated on a word boundary).
- **Delete** — row hover button, with confirm.
- **Empty state** — show the 4 suggested prompts large and centered.

### 5.8 Sidebar grouping

Group conversations by recency:
- Today (any updated in the last 24h)
- Yesterday
- This week
- Older

Within each group, sort by `updatedAt` desc.

---

## 6. Out of scope (this phase)

The following are explicitly NOT in this scope and will land in follow-up phases:

- **Real backend wiring** — `lib/mock/*` is the single boundary; no fetch calls anywhere yet.
- **Real PDF / Word export** — Generate produces an in-browser preview only. The PrintButton's `window.print()` is the closest thing to "export" for now.
- **Real LLM in chat** — no OpenAI / Anthropic API calls. The mock response engine is the entire chat brain for this phase.
- **User accounts / auth** — single-user / single-tab; localStorage is per-browser.
- **Multi-language UI** — KPIs carry both `name_en` and `name_ro` but the rest of the UI is English-only. Locale switch is a follow-up.
- **Charts beyond sparkline / mini-bar** — no maps, no advanced visualizations.
- **Mobile-first redesign** — pages must be functional on mobile (no horizontal scroll, key actions accessible) but not optimized for it.

## 7. Component layout (new files)

```
frontend/src/
├── app/
│   ├── reports/
│   │   ├── page.tsx                 # Report Builder (the 3-column workspace)
│   │   └── [reportId]/page.tsx      # Generated report preview (read-only)
│   ├── data/page.tsx                # Data Browser
│   └── chat/page.tsx                # Chat
├── components/
│   ├── reports/                     # Builder-specific
│   │   ├── TemplateLibrary.tsx
│   │   ├── VariablesPicker.tsx
│   │   ├── TemplateCanvas.tsx
│   │   ├── SectionBlock.tsx
│   │   ├── SlotDropZone.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── GenerateOverlay.tsx
│   │   ├── ReportPreview.tsx
│   │   └── DiffBadge.tsx
│   ├── data/
│   │   ├── DataTable.tsx
│   │   ├── DataFilters.tsx
│   │   ├── DataRowDrawer.tsx
│   │   └── exportCsv.ts
│   ├── chat/
│   │   ├── ConversationList.tsx
│   │   ├── MessageThread.tsx
│   │   ├── AssistantCard.tsx
│   │   ├── MessageInput.tsx
│   │   └── SuggestedPrompts.tsx
│   └── charts/
│       ├── Sparkline.tsx
│       └── MiniBarChart.tsx
└── lib/
    ├── mock/
    │   ├── kpis.ts
    │   ├── locations.ts
    │   ├── observations.ts
    │   ├── templates.ts
    │   └── chat.ts
    ├── persistence/
    │   ├── storage.ts               # Typed localStorage helpers
    │   └── keys.ts
    └── system-clock.ts              # Demo time-travel control
```

## 8. Open questions

None. All design decisions confirmed during the brainstorming pass.
