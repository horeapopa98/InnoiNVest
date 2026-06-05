"use client";

import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatKpiValue, getKpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";

type Props = {
  locationSiruta: string;
  kpiCode: string;
  year: number;
  value: number;
  regionAvg: number | null;
  series: number[];
};

/**
 * Hero metric for "what is X in Y?" answers — large value, location +
 * year context, mini-sparkline, and a comparison to the NW-region
 * average so the analyst sees relative position at a glance.
 */
export function MetricCardBlock({
  locationSiruta,
  kpiCode,
  year,
  value,
  regionAvg,
  series,
}: Props) {
  const kpi = getKpi(kpiCode);
  const loc = getLocation(locationSiruta);
  if (!kpi || !loc) return null;

  const deltaVsAvg =
    regionAvg !== null && regionAvg !== 0 ? ((value - regionAvg) / regionAvg) * 100 : null;
  const isAbove = deltaVsAvg !== null && deltaVsAvg > 0;
  const isBelow = deltaVsAvg !== null && deltaVsAvg < 0;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
            {kpi.nameEn}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant/80">
            {loc.name} · {year}
          </p>
          <p className="font-display-lg text-display-lg mt-3 leading-none text-on-surface">
            {formatKpiValue(value, kpi)}
          </p>
          {regionAvg !== null && (
            <div className="mt-3 flex items-baseline gap-3 text-sm">
              <span className="font-label-md text-label-md text-on-surface-variant">
                NW region avg
              </span>
              <span className="font-body-sm text-body-sm tabular-nums text-on-surface">
                {regionAvg.toLocaleString("en-US", { maximumFractionDigits: 1 })} {kpi.unit}
              </span>
              {deltaVsAvg !== null && (
                <span
                  className={
                    isAbove
                      ? "font-label-md text-label-md inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary-deep"
                      : isBelow
                        ? "font-label-md text-label-md inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-900"
                        : "font-label-md text-label-md inline-flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-on-surface-variant"
                  }
                  title="Relative to NW Romania county average"
                >
                  {isAbove ? <ArrowUp size={11} /> : isBelow ? <ArrowDown size={11} /> : <ArrowRight size={11} />}
                  {Math.abs(deltaVsAvg).toFixed(1)}% vs avg
                </span>
              )}
            </div>
          )}
        </div>
        {series.length > 1 && (
          <div className="min-w-[180px]">
            <p className="font-label-md text-label-md mb-1 uppercase tracking-wider text-on-surface-variant">
              Trend
            </p>
            <Sparkline values={series} width={180} height={64} />
            <p className="font-label-md text-label-md mt-1 text-on-surface-variant/80">
              {series.length}-year series
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
