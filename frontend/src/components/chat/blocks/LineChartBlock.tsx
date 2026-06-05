"use client";

import { useMemo } from "react";
import { getKpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";

type Series = {
  locationSiruta: string;
  points: Array<{ year: number; value: number }>;
};

type Props = {
  kpiCode: string;
  yearRange: [number, number];
  series: Series[];
};

// Brand-aligned series palette. Falls back to primary if a series goes
// past index 4 (unlikely with our 4-location limit).
const SERIES_COLORS = [
  "var(--color-primary)",
  "#3f51b5", // data indigo
  "#d97706", // amber
  "#dc2626", // rose / error red
  "#0891b2", // cyan-darker
];

/**
 * Multi-series time-series. Replaces the single-line sparkline for
 * trend and comparison answers. Renders axes, a legend, dot markers,
 * and gridline ticks.
 */
export function LineChartBlock({ kpiCode, yearRange, series }: Props) {
  const kpi = getKpi(kpiCode);

  const width = 520;
  const height = 220;
  const padTop = 12;
  const padBottom = 28;
  const padLeft = 44;
  const padRight = 12;
  const drawW = width - padLeft - padRight;
  const drawH = height - padTop - padBottom;

  const [minYear, maxYear] = yearRange;
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = minYear; y <= maxYear; y++) arr.push(y);
    return arr;
  }, [minYear, maxYear]);

  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  if (allValues.length === 0) return null;
  let yMin = Math.min(...allValues);
  let yMax = Math.max(...allValues);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  // Pad y-range by 8% so points don't kiss the top/bottom.
  const range = yMax - yMin;
  yMin -= range * 0.08;
  yMax += range * 0.08;

  function xOf(year: number) {
    if (years.length === 1) return padLeft + drawW / 2;
    return padLeft + ((year - minYear) / (maxYear - minYear)) * drawW;
  }
  function yOf(v: number) {
    return padTop + (1 - (v - yMin) / (yMax - yMin)) * drawH;
  }

  // 4-tick y-axis
  const yTicks = [yMin, yMin + (yMax - yMin) / 3, yMin + (2 * (yMax - yMin)) / 3, yMax];

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {kpi?.nameEn ?? kpiCode}
          {kpi && <span className="ml-1 normal-case tracking-normal text-on-surface-variant/70">({kpi.unit})</span>}
        </p>
        <p className="font-label-md text-label-md text-on-surface-variant">
          {minYear}–{maxYear}
        </p>
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${kpi?.nameEn ?? kpiCode} time series`}>
        {/* Y gridlines + labels */}
        {yTicks.map((t, i) => {
          const y = yOf(t);
          return (
            <g key={i}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="var(--color-border-subtle)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-on-surface-variant text-[10px] tabular-nums"
              >
                {t.toLocaleString("en-US", { maximumFractionDigits: t < 100 ? 1 : 0 })}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {years.map((y) => (
          <text
            key={y}
            x={xOf(y)}
            y={height - padBottom + 14}
            textAnchor="middle"
            className="fill-on-surface-variant text-[10px] tabular-nums"
          >
            {y}
          </text>
        ))}

        {/* Series lines + dots */}
        {series.map((s, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const d = s.points
            .map((p, j) => `${j === 0 ? "M" : "L"}${xOf(p.year).toFixed(2)},${yOf(p.value).toFixed(2)}`)
            .join(" ");
          return (
            <g key={s.locationSiruta}>
              <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
              {s.points.map((p) => (
                <circle
                  key={p.year}
                  cx={xOf(p.year)}
                  cy={yOf(p.value)}
                  r={2.5}
                  fill={color}
                  stroke="var(--color-surface)"
                  strokeWidth={1}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const loc = getLocation(s.locationSiruta);
          return (
            <li
              key={s.locationSiruta}
              className="font-label-md text-label-md inline-flex items-center gap-1.5 text-on-surface-variant"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {loc?.name ?? s.locationSiruta}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
