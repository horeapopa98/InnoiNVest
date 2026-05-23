"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { RankingTableBlock } from "./RankingTableBlock";
import {
  DEFAULT_WEIGHTS,
  computeComposite,
  kpiLabel,
  type Sector,
  type WeightedKpi,
} from "@/lib/mock/composite";
import { LOCATIONS } from "@/lib/mock/locations";

// MapBlock pulls in Leaflet (needs window). Load it client-only so
// the InteractiveRecommendationBlock doesn't trip SSR.
const MapBlock = dynamic(() => import("./MapBlock").then((m) => m.MapBlock), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-lg border border-border-subtle bg-surface-muted text-on-surface-variant">
      Loading map…
    </div>
  ),
});

type Props = {
  initialSector: Sector;
  year: number;
};

const SECTOR_LABEL: Record<Sector, string> = {
  tech: "Tech investment",
  manufacturing: "Manufacturing investment",
  general: "General investment",
};

/**
 * Interactive recommendation: lets the user dial the per-KPI weights
 * and switch sector, re-computing the ranking + map + methodology
 * live. This is the centrepiece of the "where should I invest" answer
 * — the analyst can pressure-test the model rather than trust an
 * opaque output.
 */
export function InteractiveRecommendationBlock({ initialSector, year }: Props) {
  const [sector, setSector] = useState<Sector>(initialSector);
  const [weights, setWeights] = useState<WeightedKpi[]>(() => [...DEFAULT_WEIGHTS[initialSector]]);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  function handleSectorSwitch(s: Sector) {
    setSector(s);
    setWeights([...DEFAULT_WEIGHTS[s]]);
  }

  function updateWeight(code: string, value: number) {
    setWeights((prev) => prev.map((w) => (w.kpiCode === code ? { ...w, weight: value } : w)));
  }

  function resetWeights() {
    setWeights([...DEFAULT_WEIGHTS[sector]]);
  }

  const scored = useMemo(() => computeComposite(weights, year), [weights, year]);
  const rankingRows = useMemo(
    () => scored.map((s) => ({ locationSiruta: s.locationSiruta, value: s.value })),
    [scored]
  );
  const valuesByCounty = useMemo(
    () => Object.fromEntries(scored.map((s) => [s.locationSiruta, s.value])),
    [scored]
  );

  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);

  return (
    <div className="space-y-3">
      {/* Sector switcher */}
      <div className="rounded-lg border border-border-subtle bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
            Sector
          </span>
          <div role="tablist" className="inline-flex rounded border border-border-subtle bg-surface-container-lowest p-0.5">
            {(["tech", "manufacturing", "general"] as Sector[]).map((s) => (
              <button
                key={s}
                role="tab"
                type="button"
                aria-selected={sector === s}
                onClick={() => handleSectorSwitch(s)}
                className={
                  sector === s
                    ? "font-label-md text-label-md rounded-sm bg-primary px-2.5 py-1 text-on-primary"
                    : "font-label-md text-label-md rounded-sm px-2.5 py-1 text-on-surface-variant hover:text-primary-deep"
                }
              >
                {SECTOR_LABEL[s].split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Weight sliders */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
              Weights
            </p>
            <button
              type="button"
              onClick={resetWeights}
              className="font-label-md text-label-md inline-flex items-center gap-1 rounded text-on-surface-variant hover:text-primary-deep"
            >
              <RotateCcw size={11} aria-hidden="true" /> Reset
            </button>
          </div>
          <ul className="space-y-1.5">
            {weights.map((w) => {
              const normShare = totalWeight === 0 ? 0 : (w.weight / totalWeight) * 100;
              return (
                <li key={w.kpiCode} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3">
                  <label className="font-body-sm text-body-sm flex items-center gap-2 text-on-surface">
                    <span className="truncate">
                      {kpiLabel(w.kpiCode)}
                      {w.lowerBetter && (
                        <span
                          className="ml-1 font-label-md text-label-md rounded bg-surface-muted px-1 py-0.5 text-on-surface-variant"
                          title="Lower values score higher"
                        >
                          ↓ better
                        </span>
                      )}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={w.weight}
                      onChange={(e) => updateWeight(w.kpiCode, Number(e.target.value))}
                      className="ml-auto h-1 w-32 accent-primary"
                      aria-label={`Weight for ${kpiLabel(w.kpiCode)}`}
                    />
                  </label>
                  <span className="font-label-md text-label-md text-right tabular-nums text-on-surface-variant">
                    {normShare.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Live-recomputed ranking + map */}
      <RankingTableBlock kpiCode="composite_score" year={year} rows={rankingRows} />
      <MapBlock kpiCode="composite_score" year={year} valuesByCounty={valuesByCounty} />

      {/* Methodology */}
      <div className="rounded-lg border border-border-subtle bg-surface">
        <button
          type="button"
          onClick={() => setMethodologyOpen((v) => !v)}
          aria-expanded={methodologyOpen}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        >
          {methodologyOpen ? (
            <ChevronDown size={14} className="text-on-surface-variant" />
          ) : (
            <ChevronRight size={14} className="text-on-surface-variant" />
          )}
          <span className="font-body-sm text-body-sm font-semibold text-on-surface">
            How I computed this
          </span>
          <span className="font-label-md text-label-md ml-auto text-on-surface-variant">
            {weights.length} indicators · weighted score
          </span>
        </button>
        {methodologyOpen && (
          <div className="border-t border-border-subtle px-4 py-3">
            <p className="font-body-sm text-body-sm mb-3 text-on-surface-variant">
              Each county&rsquo;s raw value for every indicator is min-max
              normalised across the six NW counties. Indicators where lower is
              better (unemployment, distance to highway) are inverted. The
              composite is the weighted sum, re-normalised to 0–100.
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left">
                  <th className="font-label-md text-label-md py-1.5 text-on-surface-variant">
                    County
                  </th>
                  {weights.map((w) => (
                    <th
                      key={w.kpiCode}
                      className="font-label-md text-label-md py-1.5 text-right text-on-surface-variant"
                      title={kpiLabel(w.kpiCode)}
                    >
                      {kpiLabel(w.kpiCode).split(" ")[0]}
                    </th>
                  ))}
                  <th className="font-label-md text-label-md py-1.5 text-right text-on-surface-variant">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60">
                {scored.map((s) => {
                  const loc = LOCATIONS.find((l) => l.sirutaCode === s.locationSiruta);
                  return (
                    <tr key={s.locationSiruta}>
                      <td className="py-1.5 font-medium text-on-surface">{loc?.name}</td>
                      {weights.map((w) => {
                        const c = s.contributions[w.kpiCode];
                        return (
                          <td
                            key={w.kpiCode}
                            className="py-1.5 text-right tabular-nums text-on-surface-variant"
                          >
                            {c !== undefined ? (c * 100).toFixed(0) : "—"}
                          </td>
                        );
                      })}
                      <td className="py-1.5 text-right font-semibold tabular-nums text-on-surface">
                        {s.value.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="font-label-md text-label-md mt-3 text-on-surface-variant">
              Indicator columns show the post-normalisation 0–100 score the
              county received on that indicator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
