"use client";

import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { getKpi, formatKpiValue } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { CATEGORY_BADGE } from "@/components/data/categoryStyles";
import { type AssistantBlock } from "@/lib/mock/chat";

type ScorecardTile = Extract<AssistantBlock, { kind: "scorecard" }>["tiles"][number];

type Props = {
  locationSiruta: string;
  year: number;
  tiles: ScorecardTile[];
};

function deltaPill(delta: number | null) {
  if (delta === null || delta === 0)
    return (
      <span className="font-label-md text-label-md inline-flex items-center gap-0.5 text-on-surface-variant">
        <ArrowRight size={10} aria-hidden="true" /> Stable
      </span>
    );
  if (delta > 0)
    return (
      <span className="font-label-md text-label-md inline-flex items-center gap-0.5 text-primary-deep">
        <ArrowUp size={10} aria-hidden="true" /> {delta.toFixed(1)}% YoY
      </span>
    );
  return (
    <span className="font-label-md text-label-md inline-flex items-center gap-0.5 text-amber-700">
      <ArrowDown size={10} aria-hidden="true" /> {Math.abs(delta).toFixed(1)}% YoY
    </span>
  );
}

/**
 * Multi-KPI snapshot for a single location — a 3×2 grid of category-
 * coded tiles. Each tile carries the value + YoY delta + a category
 * badge so analysts can scan a location's profile at a glance.
 */
export function ScorecardBlock({ locationSiruta, year, tiles }: Props) {
  const loc = getLocation(locationSiruta);
  if (!loc) return null;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {loc.name} · {loc.countyName} county
        </p>
        <p className="font-label-md text-label-md text-on-surface-variant">{year}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => {
          const kpi = getKpi(tile.kpiCode);
          if (!kpi) return null;
          return (
            <div
              key={tile.kpiCode}
              className="flex flex-col gap-1 rounded-md border border-border-subtle/60 bg-surface-container-lowest p-3"
            >
              <span
                className={`font-label-md text-label-md inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] ${CATEGORY_BADGE[tile.category]}`}
              >
                {tile.category}
              </span>
              <p className="font-label-md text-label-md mt-1 uppercase tracking-wider text-on-surface-variant">
                {kpi.nameEn}
              </p>
              <p className="font-headline-sm text-headline-sm tabular-nums text-on-surface">
                {tile.value !== null ? formatKpiValue(tile.value, kpi) : "—"}
              </p>
              <div>{deltaPill(tile.delta)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
