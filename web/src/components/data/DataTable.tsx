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
