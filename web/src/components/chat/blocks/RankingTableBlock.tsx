"use client";

import { getKpi, formatKpiValue, type Kpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";

type Props = {
  kpiCode: string;
  year: number;
  rows: Array<{ locationSiruta: string; value: number }>;
};

const MEDAL: Record<number, { text: string; cls: string }> = {
  0: { text: "1", cls: "bg-amber-100 text-amber-900 ring-amber-300" },
  1: { text: "2", cls: "bg-slate-200 text-slate-800 ring-slate-300" },
  2: { text: "3", cls: "bg-orange-100 text-orange-900 ring-orange-300" },
};

function formatValue(value: number, kpi: Kpi | undefined, isCompositeScore: boolean): string {
  if (isCompositeScore) return `${value.toFixed(1)} / 100`;
  return kpi ? formatKpiValue(value, kpi) : value.toLocaleString("en-US");
}

/**
 * Top-N table with proportional value bars and gold/silver/bronze
 * medal indicators for the top 3. Replaces text-only "1. X — Y" lists.
 */
export function RankingTableBlock({ kpiCode, year, rows }: Props) {
  // Composite score is synthetic — there's no Kpi entry for it.
  const isComposite = kpiCode === "composite_score";
  const kpi = isComposite ? undefined : getKpi(kpiCode);
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => Math.abs(r.value)));

  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <div className="flex items-baseline justify-between border-b border-border-subtle px-4 py-2">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {isComposite ? "Investment score" : (kpi?.nameEn ?? kpiCode)}
        </p>
        <p className="font-label-md text-label-md text-on-surface-variant">{year}</p>
      </div>
      <ol className="divide-y divide-border-subtle/60">
        {rows.map((r, i) => {
          const loc = getLocation(r.locationSiruta);
          if (!loc) return null;
          const widthPct = max === 0 ? 0 : (r.value / max) * 100;
          const medal = MEDAL[i];
          return (
            <li
              key={r.locationSiruta}
              className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-3 px-4 py-2.5"
            >
              <span
                className={
                  medal
                    ? `flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-1 ${medal.cls}`
                    : "font-label-md text-label-md text-center text-on-surface-variant"
                }
              >
                {medal ? medal.text : i + 1}
              </span>
              <span className="font-body-sm text-body-sm min-w-0 truncate font-medium text-on-surface">
                {loc.name}
                <span className="ml-1.5 font-normal text-on-surface-variant">
                  · {loc.countyName}
                </span>
              </span>
              <div className="h-1.5 w-full rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${widthPct}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="font-body-sm text-body-sm tabular-nums font-semibold text-on-surface">
                {formatValue(r.value, kpi, isComposite)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
