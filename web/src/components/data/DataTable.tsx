"use client";

import { useMemo, useState, Fragment } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { getKpi, formatKpiValue } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { type Observation, OBSERVATIONS } from "@/lib/mock/observations";
import { CATEGORY_BADGE } from "./categoryStyles";

type SortCol = "location" | "kpi" | "year" | "value";
export type ViewMode = "flat" | "by-location" | "by-kpi";

type Props = {
  rows: readonly Observation[];
  viewMode: ViewMode;
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
      case "kpi":
        cmp = (ka?.nameEn ?? "").localeCompare(kb?.nameEn ?? "");
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

/**
 * Cache the full year series per (siruta, kpiCode) so the inline
 * sparkline doesn't re-scan OBSERVATIONS for every row on every render.
 */
const SERIES_CACHE = new Map<string, number[]>();
function fullSeries(siruta: string, kpiCode: string): number[] {
  const key = `${siruta}|${kpiCode}`;
  let cached = SERIES_CACHE.get(key);
  if (!cached) {
    cached = OBSERVATIONS.filter((o) => o.locationSiruta === siruta && o.kpiCode === kpiCode)
      .sort((a, b) => a.year - b.year)
      .map((o) => o.value);
    SERIES_CACHE.set(key, cached);
  }
  return cached;
}

function Row({
  o,
  onClick,
  showLocation = true,
  showKpi = true,
}: {
  o: Observation;
  onClick: () => void;
  showLocation?: boolean;
  showKpi?: boolean;
}) {
  const kpi = getKpi(o.kpiCode);
  const loc = getLocation(o.locationSiruta);
  if (!kpi || !loc) return null;
  const series = fullSeries(o.locationSiruta, o.kpiCode);

  return (
    <tr
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group cursor-pointer border-b border-border-subtle/60 hover:bg-surface-muted focus:bg-surface-muted focus:outline-none"
    >
      {showLocation && (
        <td className="p-3">
          <div className="font-medium text-on-surface">{loc.name}</div>
          <div className="font-label-md text-label-md text-on-surface-variant">
            {loc.countyName}
          </div>
        </td>
      )}
      {showKpi && (
        <td className="p-3">
          <div className="font-medium text-on-surface">{kpi.nameEn}</div>
          <span
            className={`font-label-md text-label-md mt-1 inline-flex items-center rounded px-1.5 py-0.5 ${CATEGORY_BADGE[kpi.category]}`}
          >
            {kpi.category}
          </span>
        </td>
      )}
      <td className="p-3 text-right tabular-nums text-on-surface-variant">{o.year}</td>
      <td className="p-3 text-right font-semibold tabular-nums text-on-surface">
        {formatKpiValue(o.value, kpi)}
      </td>
      <td className="p-3">
        <Sparkline values={series} width={88} height={28} />
      </td>
      <td className="p-3 font-label-md text-label-md text-on-surface-variant">{kpi.source}</td>
    </tr>
  );
}

/** Summary stats shown on group headers. */
function groupSummary(rows: Observation[]): { count: number; min: number; max: number } {
  if (rows.length === 0) return { count: 0, min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    if (r.value < min) min = r.value;
    if (r.value > max) max = r.value;
  }
  return { count: rows.length, min, max };
}

export function DataTable({ rows, viewMode, onRowClick }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("location");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortCol(col);
      setSortDir(1);
    }
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sorted = useMemo(() => [...rows].sort(compareBy(sortCol, sortDir)), [rows, sortCol, sortDir]);

  const grouped = useMemo(() => {
    if (viewMode === "flat") return null;
    const map = new Map<string, Observation[]>();
    for (const o of sorted) {
      const key =
        viewMode === "by-location" ? o.locationSiruta : o.kpiCode;
      const arr = map.get(key);
      if (arr) arr.push(o);
      else map.set(key, [o]);
    }
    // Stable key ordering by group label
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (viewMode === "by-location") {
        const la = getLocation(a);
        const lb = getLocation(b);
        return (la?.name ?? "").localeCompare(lb?.name ?? "");
      }
      const ka = getKpi(a);
      const kb = getKpi(b);
      return (ka?.nameEn ?? "").localeCompare(kb?.nameEn ?? "");
    });
    return keys.map((k) => ({ key: k, rows: map.get(k)! }));
  }, [sorted, viewMode]);

  const COLS: Array<{ key: SortCol; label: string; align?: "right"; show: boolean }> = [
    { key: "location", label: "Location", show: viewMode !== "by-location" },
    { key: "kpi", label: "Indicator", show: viewMode !== "by-kpi" },
    { key: "year", label: "Year", align: "right", show: true },
    { key: "value", label: "Value", align: "right", show: true },
  ];

  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-border-subtle p-12 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          No observations match the current filters.
        </p>
        <p className="font-body-sm text-body-sm mt-2 text-on-surface-variant/70">
          Try removing some filters or use the &ldquo;Reset all filters&rdquo; button in the sidebar.
        </p>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 z-10 bg-background">
        <tr className="border-b border-border-subtle">
          {COLS.filter((c) => c.show).map((c) => (
            <th
              key={c.key}
              scope="col"
              aria-sort={sortCol === c.key ? (sortDir === 1 ? "ascending" : "descending") : "none"}
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
            scope="col"
            className="font-label-md text-label-md p-3 text-left uppercase tracking-wider text-on-surface-variant"
          >
            Trend
          </th>
          <th
            scope="col"
            className="font-label-md text-label-md p-3 text-left uppercase tracking-wider text-on-surface-variant"
          >
            Source
          </th>
        </tr>
      </thead>
      <tbody className="font-body-sm text-body-sm">
        {viewMode === "flat" &&
          sorted.map((o) => (
            <Row
              key={`${o.locationSiruta}-${o.kpiCode}-${o.year}`}
              o={o}
              onClick={() => onRowClick(o)}
            />
          ))}
        {viewMode !== "flat" &&
          grouped?.map((g) => {
            const isCollapsed = collapsed.has(g.key);
            const label =
              viewMode === "by-location"
                ? (getLocation(g.key)?.name ?? g.key)
                : (getKpi(g.key)?.nameEn ?? g.key);
            const subLabel =
              viewMode === "by-location"
                ? getLocation(g.key)?.countyName
                : getKpi(g.key)?.category;
            const summary = groupSummary(g.rows);
            const colSpan = COLS.filter((c) => c.show).length + 2;
            return (
              <Fragment key={g.key}>
                <tr className="border-b border-border-subtle bg-surface-muted">
                  <td colSpan={colSpan} className="p-0">
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      aria-expanded={!isCollapsed}
                      className="font-body-md text-body-md flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-container"
                    >
                      {isCollapsed ? (
                        <ChevronRight size={14} className="text-on-surface-variant" />
                      ) : (
                        <ChevronDown size={14} className="text-on-surface-variant" />
                      )}
                      <span className="font-semibold text-on-surface">{label}</span>
                      {subLabel && (
                        <span className="font-label-md text-label-md text-on-surface-variant">
                          · {subLabel}
                        </span>
                      )}
                      <span className="font-label-md text-label-md ml-auto text-on-surface-variant">
                        {summary.count} {summary.count === 1 ? "observation" : "observations"}
                      </span>
                    </button>
                  </td>
                </tr>
                {!isCollapsed &&
                  g.rows.map((o) => (
                    <Row
                      key={`${o.locationSiruta}-${o.kpiCode}-${o.year}`}
                      o={o}
                      onClick={() => onRowClick(o)}
                      showLocation={viewMode !== "by-location"}
                      showKpi={viewMode !== "by-kpi"}
                    />
                  ))}
              </Fragment>
            );
          })}
      </tbody>
    </table>
  );
}
