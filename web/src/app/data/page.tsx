"use client";

import { useMemo, useState } from "react";
import { Download, Rows3, LayoutGrid, FolderTree, X } from "lucide-react";
import { TopNav } from "@/components/stitch/TopNav";
import {
  DataFiltersSidebar,
  EMPTY_FILTERS,
  type DataFilters,
} from "@/components/data/DataFilters";
import { DataTable, type ViewMode } from "@/components/data/DataTable";
import { DataRowDrawer } from "@/components/data/DataRowDrawer";
import { downloadCsv } from "@/components/data/exportCsv";
import { CATEGORY_DOT } from "@/components/data/categoryStyles";
import { OBSERVATIONS, type Observation, YEARS_AVAILABLE } from "@/lib/mock/observations";
import { getKpi, KPIS, type KpiCategory } from "@/lib/mock/kpis";
import { getLocation, LOCATIONS } from "@/lib/mock/locations";

const VIEW_MODES: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
  { id: "flat", label: "Flat", icon: <Rows3 size={14} aria-hidden="true" /> },
  { id: "by-location", label: "By location", icon: <FolderTree size={14} aria-hidden="true" /> },
  { id: "by-kpi", label: "By indicator", icon: <LayoutGrid size={14} aria-hidden="true" /> },
];

export default function DataPage() {
  const [filters, setFilters] = useState<DataFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [active, setActive] = useState<Observation | null>(null);

  const rows = useMemo(() => {
    const needle = filters.search.toLowerCase();
    return OBSERVATIONS.filter((o) => {
      const kpi = getKpi(o.kpiCode);
      const loc = getLocation(o.locationSiruta);
      if (!kpi || !loc) return false;
      if (
        needle.length >= 1 &&
        !kpi.nameEn.toLowerCase().includes(needle) &&
        !loc.name.toLowerCase().includes(needle) &&
        !loc.countyName.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (filters.locationCodes.length > 0 && !filters.locationCodes.includes(o.locationSiruta)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(kpi.category)) return false;
      if (filters.years.length > 0 && !filters.years.includes(o.year)) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(kpi.source)) return false;
      return true;
    });
  }, [filters]);

  // Pre-computed totals for the stats bar (constant, not filter-dependent).
  const totals = useMemo(
    () => ({
      observations: OBSERVATIONS.length,
      locations: LOCATIONS.length,
      indicators: KPIS.length,
      years: YEARS_AVAILABLE.length,
    }),
    []
  );

  function handleExport() {
    const headers = ["location", "county", "indicator", "category", "year", "value", "unit", "source"];
    const records = rows.map((o) => {
      const kpi = getKpi(o.kpiCode)!;
      const loc = getLocation(o.locationSiruta)!;
      return [loc.name, loc.countyName, kpi.nameEn, kpi.category, o.year, o.value, kpi.unit, kpi.source];
    });
    downloadCsv(`innoinvest-data-${new Date().toISOString().slice(0, 10)}.csv`, headers, records);
  }

  // Active-filter chips
  type Chip = { key: string; label: string; tone?: KpiCategory; onRemove: () => void };
  const chips: Chip[] = [];
  if (filters.search) {
    chips.push({
      key: `s:${filters.search}`,
      label: `“${filters.search}”`,
      onRemove: () => setFilters({ ...filters, search: "" }),
    });
  }
  for (const code of filters.locationCodes) {
    const loc = getLocation(code);
    if (loc) {
      chips.push({
        key: `l:${code}`,
        label: loc.name,
        onRemove: () =>
          setFilters({ ...filters, locationCodes: filters.locationCodes.filter((x) => x !== code) }),
      });
    }
  }
  for (const c of filters.categories) {
    chips.push({
      key: `c:${c}`,
      label: c,
      tone: c,
      onRemove: () =>
        setFilters({ ...filters, categories: filters.categories.filter((x) => x !== c) }),
    });
  }
  for (const y of filters.years) {
    chips.push({
      key: `y:${y}`,
      label: String(y),
      onRemove: () => setFilters({ ...filters, years: filters.years.filter((x) => x !== y) }),
    });
  }
  for (const s of filters.sources) {
    chips.push({
      key: `src:${s}`,
      label: s,
      onRemove: () => setFilters({ ...filters, sources: filters.sources.filter((x) => x !== s) }),
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[18rem_1fr]">
        {/* Filter sidebar */}
        <aside className="hidden border-r border-border-subtle bg-surface lg:block">
          <DataFiltersSidebar value={filters} onChange={setFilters} />
        </aside>

        {/* Main content */}
        <main className="min-w-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1280px] px-margin-desktop py-8">
            {/* Header + stats line */}
            <header className="mb-6">
              <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                ALL INDICATORS · NORD-VEST ROMANIA
              </p>
              <h1 className="font-headline-lg text-headline-lg mt-1 text-on-surface">
                Data Browser
              </h1>
              <p className="font-body-md text-body-md mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-on-surface-variant">
                <span>
                  <strong className="text-on-surface">{totals.observations.toLocaleString("en-US")}</strong> observations
                </span>
                <span>
                  <strong className="text-on-surface">{totals.locations}</strong> locations
                </span>
                <span>
                  <strong className="text-on-surface">{totals.indicators}</strong> indicators
                </span>
                <span>
                  <strong className="text-on-surface">{totals.years}</strong> years (2018–2027)
                </span>
              </p>
            </header>

            {/* Controls row: result count + view toggle + export */}
            <div className="sticky top-16 z-20 -mx-margin-desktop mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-background/95 px-margin-desktop py-3 backdrop-blur">
              <div className="flex items-baseline gap-3">
                <span className="font-headline-sm text-headline-sm font-semibold text-on-surface tabular-nums">
                  {rows.length.toLocaleString("en-US")}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {rows.length === totals.observations
                    ? "showing all observations"
                    : `of ${totals.observations.toLocaleString("en-US")} matching filters`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* View mode toggle */}
                <div
                  role="tablist"
                  aria-label="View mode"
                  className="inline-flex rounded border border-border-subtle bg-surface p-0.5"
                >
                  {VIEW_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={viewMode === m.id}
                      onClick={() => setViewMode(m.id)}
                      className={
                        viewMode === m.id
                          ? "font-label-md text-label-md inline-flex items-center gap-1.5 rounded-sm bg-primary px-2.5 py-1 text-on-primary"
                          : "font-label-md text-label-md inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-on-surface-variant transition-colors hover:text-primary-deep"
                      }
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={rows.length === 0}
                  className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-1.5 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={14} aria-hidden="true" /> Export CSV
                </button>
              </div>
            </div>

            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
                <span className="font-label-md text-label-md text-on-surface-variant">Filtering by:</span>
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="font-label-md text-label-md group inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 py-1 text-on-surface transition-colors hover:border-error hover:text-error"
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    {chip.tone && (
                      <span
                        className={`h-2 w-2 rounded-full ${CATEGORY_DOT[chip.tone]}`}
                        aria-hidden="true"
                      />
                    )}
                    {chip.label}
                    <X size={12} aria-hidden="true" className="opacity-60 group-hover:opacity-100" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="font-label-md text-label-md ml-1 text-on-surface-variant underline-offset-2 hover:text-error hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Table */}
            <DataTable rows={rows} viewMode={viewMode} onRowClick={setActive} />
          </div>
        </main>

        <DataRowDrawer observation={active} onClose={() => setActive(null)} />
      </div>
    </div>
  );
}
