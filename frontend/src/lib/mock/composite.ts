/**
 * Sector-weighted composite scoring across NW Romania counties.
 * Extracted so the interactive recommendation block can re-run it
 * client-side whenever the user adjusts a weight slider.
 */

import { getKpi } from "./kpis";
import { LOCATIONS } from "./locations";
import { getObservation } from "./observations";

export type Sector = "tech" | "manufacturing" | "general";

export type WeightedKpi = {
  kpiCode: string;
  /** 0..1, will be re-normalised before scoring. */
  weight: number;
  /** When true, lower raw values score higher (e.g. unemployment). */
  lowerBetter: boolean;
};

export const DEFAULT_WEIGHTS: Record<Sector, WeightedKpi[]> = {
  tech: [
    { kpiCode: "tertiary_attainment", weight: 0.35, lowerBetter: false },
    { kpiCode: "fiber_coverage", weight: 0.25, lowerBetter: false },
    { kpiCode: "employment_rate", weight: 0.15, lowerBetter: false },
    { kpiCode: "gdp_per_capita", weight: 0.15, lowerBetter: false },
    { kpiCode: "gdp_growth", weight: 0.10, lowerBetter: false },
  ],
  manufacturing: [
    { kpiCode: "wage_avg", weight: 0.30, lowerBetter: false },
    { kpiCode: "employment_rate", weight: 0.25, lowerBetter: false },
    { kpiCode: "gdp_per_capita", weight: 0.20, lowerBetter: false },
    { kpiCode: "highway_access_km", weight: 0.15, lowerBetter: true },
    { kpiCode: "unemployment", weight: 0.10, lowerBetter: true },
  ],
  general: [
    { kpiCode: "gdp_per_capita", weight: 0.30, lowerBetter: false },
    { kpiCode: "gdp_growth", weight: 0.20, lowerBetter: false },
    { kpiCode: "employment_rate", weight: 0.15, lowerBetter: false },
    { kpiCode: "tertiary_attainment", weight: 0.15, lowerBetter: false },
    { kpiCode: "unemployment", weight: 0.10, lowerBetter: true },
    { kpiCode: "fiber_coverage", weight: 0.10, lowerBetter: false },
  ],
};

export type CompositeScore = {
  locationSiruta: string;
  /** 0–100, weighted-normalised. */
  value: number;
  /** Per-KPI normalised scores 0..1 (post-direction-flip), for methodology breakdown. */
  contributions: Record<string, number>;
};

/**
 * Compute composite scores for every NW county. Returns sorted desc.
 */
export function computeComposite(
  weights: WeightedKpi[],
  year: number
): CompositeScore[] {
  // 1) min/max per KPI across counties for normalisation
  const counties = LOCATIONS.filter((l) => l.type === "county");
  const range: Record<string, { min: number; max: number }> = {};
  for (const w of weights) {
    const values: number[] = [];
    for (const c of counties) {
      const o = getObservation(c.sirutaCode, w.kpiCode, year);
      if (o) values.push(o.value);
    }
    if (values.length > 0) {
      range[w.kpiCode] = { min: Math.min(...values), max: Math.max(...values) };
    }
  }

  // 2) score each county
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  const scored: CompositeScore[] = counties.map((c) => {
    let score = 0;
    let usedWeight = 0;
    const contributions: Record<string, number> = {};
    for (const w of weights) {
      const r = range[w.kpiCode];
      if (!r) continue;
      const o = getObservation(c.sirutaCode, w.kpiCode, year);
      if (!o) continue;
      const norm = r.max === r.min ? 0.5 : (o.value - r.min) / (r.max - r.min);
      const adjusted = w.lowerBetter ? 1 - norm : norm;
      contributions[w.kpiCode] = adjusted;
      score += adjusted * w.weight;
      usedWeight += w.weight;
    }
    const normalised = usedWeight === 0 ? 0 : (score / usedWeight) * 100;
    return { locationSiruta: c.sirutaCode, value: normalised, contributions };
  });

  scored.sort((a, b) => b.value - a.value);
  return scored;
}

/** Friendly KPI label, for the methodology UI. */
export function kpiLabel(code: string): string {
  return getKpi(code)?.nameEn ?? code;
}
