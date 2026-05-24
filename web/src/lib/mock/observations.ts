/**
 * Deterministically-generated time series for every (location, kpi)
 * pair that satisfies the KPI's aggregation level. Years 2018–2027 are
 * pre-computed so the time-travel control in /reports has data to land
 * on. PRNG is a deterministic xmur3 + mulberry32 pair seeded with a
 * stable string derived from (sirutaCode, kpiCode) — that gives stable
 * values across reloads and across browsers.
 */

import { KPIS, type Kpi } from "./kpis";
import { LOCATIONS, type Location } from "./locations";

export type Observation = {
  locationSiruta: string;
  kpiCode: string;
  year: number;
  value: number;
  /** ISO date the value was "fetched". Cosmetic. */
  fetchedAt: string;
};

const YEAR_FROM = 2018;
const YEAR_TO = 2027;

// --- PRNG --------------------------------------------------------------

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRng(seed: string): () => number {
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
}

// --- Eligibility -------------------------------------------------------

function isEligible(loc: Location, kpi: Kpi): boolean {
  if (kpi.level === "region") return true; // every location can show region-level KPIs
  if (kpi.level === "county") return loc.type === "county" || loc.type === "city" || loc.type === "commune";
  // commune-level: only commune & city
  return loc.type === "commune" || loc.type === "city";
}

// --- Series generator --------------------------------------------------

function generateSeries(loc: Location, kpi: Kpi): number[] {
  const rng = seededRng(`${loc.sirutaCode}|${kpi.code}`);
  // Anchor value somewhere in the KPI's range, biased by population for
  // count-style metrics so cities don't have communes' values.
  const isPopulationScaled = kpi.unit === "persons" || kpi.unit === "count";
  let anchor: number;
  if (isPopulationScaled) {
    const popFactor = loc.populationApprox / 50_000; // 1.0 ~= a mid-size city
    anchor = kpi.rangeMin + (kpi.rangeMax - kpi.rangeMin) * Math.min(1, popFactor * 0.4) * (0.7 + rng() * 0.3);
  } else {
    anchor = kpi.rangeMin + (kpi.rangeMax - kpi.rangeMin) * (0.3 + rng() * 0.5);
  }

  const years = YEAR_TO - YEAR_FROM + 1;
  const out: number[] = [];
  let value = anchor;
  for (let i = 0; i < years; i++) {
    const noise = (rng() - 0.5) * 0.06; // ±3% jitter
    const trend =
      kpi.trendBias === "up" ? 0.025 + rng() * 0.03 :
      kpi.trendBias === "down" ? -(0.015 + rng() * 0.02) :
      (rng() - 0.5) * 0.02;
    value = value * (1 + trend + noise);
    // clamp into range so we don't drift outside the rangeMin/rangeMax envelope
    value = Math.min(kpi.rangeMax, Math.max(kpi.rangeMin, value));
    out.push(Number(value.toFixed(value < 100 ? 2 : 0)));
  }
  return out;
}

// --- Build observation array -------------------------------------------

const RESULT: Observation[] = (() => {
  const rows: Observation[] = [];
  for (const loc of LOCATIONS) {
    for (const kpi of KPIS) {
      if (!isEligible(loc, kpi)) continue;
      const series = generateSeries(loc, kpi);
      for (let y = YEAR_FROM; y <= YEAR_TO; y++) {
        const value = series[y - YEAR_FROM];
        rows.push({
          locationSiruta: loc.sirutaCode,
          kpiCode: kpi.code,
          year: y,
          value,
          fetchedAt: `${y}-12-31`,
        });
      }
    }
  }
  return rows;
})();

export const OBSERVATIONS: readonly Observation[] = RESULT;

/** All observations for a single (location, kpi). Ordered by year asc. */
export function getSeries(siruta: string, kpiCode: string): Observation[] {
  return RESULT.filter((o) => o.locationSiruta === siruta && o.kpiCode === kpiCode);
}

/** Single observation for a (location, kpi, year). */
export function getObservation(
  siruta: string,
  kpiCode: string,
  year: number
): Observation | undefined {
  return RESULT.find(
    (o) => o.locationSiruta === siruta && o.kpiCode === kpiCode && o.year === year
  );
}

/** Year range covered. Useful for filter dropdowns and time-travel UI. */
export const YEARS_AVAILABLE: readonly number[] = Array.from(
  { length: YEAR_TO - YEAR_FROM + 1 },
  (_, i) => YEAR_FROM + i
);
