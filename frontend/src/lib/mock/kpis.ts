/**
 * Mocked KPI catalog modeled after the Python backend's config/kpis.yaml.
 * Replace with a fetch from /api/kpis when wiring the backend.
 */

export type KpiCategory =
  | "Demographics"
  | "Macro-Economy"
  | "Labor Market"
  | "Real Estate"
  | "Infrastructure"
  | "Education"
  | "Risks";

export type KpiSource = "INS Tempo" | "Eurostat" | "World Bank";

export type Kpi = {
  code: string;
  nameEn: string;
  nameRo: string;
  unit: string;
  category: KpiCategory;
  source: KpiSource;
  /** Lower bound for the seeded PRNG values in observations.ts. */
  rangeMin: number;
  /** Upper bound. */
  rangeMax: number;
  /** Whether values trend up (growth) or are stable in the mock generator. */
  trendBias: "up" | "down" | "flat";
  /** Aggregation level — affects which locations can hold this KPI. */
  level: "commune" | "county" | "region";
};

export const KPIS: readonly Kpi[] = [
  // --- Demographics ---
  { code: "pop_total", nameEn: "Total population", nameRo: "Populația totală", unit: "persons", category: "Demographics", source: "INS Tempo", rangeMin: 5_000, rangeMax: 350_000, trendBias: "flat", level: "commune" },
  { code: "active_pop", nameEn: "Working-age population (15–64)", nameRo: "Populația activă (15–64)", unit: "persons", category: "Demographics", source: "INS Tempo", rangeMin: 3_000, rangeMax: 220_000, trendBias: "flat", level: "commune" },
  { code: "pop_density", nameEn: "Population density", nameRo: "Densitatea populației", unit: "persons/km²", category: "Demographics", source: "Eurostat", rangeMin: 45, rangeMax: 1_800, trendBias: "flat", level: "county" },
  { code: "net_migration", nameEn: "Net migration rate", nameRo: "Rata netă a migrației", unit: "‰", category: "Demographics", source: "INS Tempo", rangeMin: -8, rangeMax: 12, trendBias: "up", level: "commune" },
  // --- Macro-Economy ---
  { code: "gdp_per_capita", nameEn: "GDP per capita", nameRo: "PIB pe locuitor", unit: "EUR", category: "Macro-Economy", source: "Eurostat", rangeMin: 8_000, rangeMax: 35_000, trendBias: "up", level: "county" },
  { code: "gdp_growth", nameEn: "Real GDP growth", nameRo: "Creșterea reală a PIB", unit: "%", category: "Macro-Economy", source: "Eurostat", rangeMin: -2, rangeMax: 6, trendBias: "flat", level: "county" },
  { code: "inflation_hicp", nameEn: "Inflation (HICP)", nameRo: "Inflația (HICP)", unit: "%", category: "Macro-Economy", source: "Eurostat", rangeMin: 0.5, rangeMax: 14, trendBias: "down", level: "region" },
  { code: "gdp_total", nameEn: "GDP", nameRo: "PIB total", unit: "M EUR", category: "Macro-Economy", source: "Eurostat", rangeMin: 200, rangeMax: 9_500, trendBias: "up", level: "county" },
  // --- Labor Market ---
  { code: "unemployment", nameEn: "Unemployment rate", nameRo: "Rata șomajului", unit: "%", category: "Labor Market", source: "Eurostat", rangeMin: 2, rangeMax: 11, trendBias: "down", level: "county" },
  { code: "wage_avg", nameEn: "Average gross wage", nameRo: "Salariul brut mediu", unit: "RON", category: "Labor Market", source: "INS Tempo", rangeMin: 3_800, rangeMax: 9_400, trendBias: "up", level: "county" },
  { code: "employment_rate", nameEn: "Employment rate (15–64)", nameRo: "Rata ocupării (15–64)", unit: "%", category: "Labor Market", source: "Eurostat", rangeMin: 55, rangeMax: 78, trendBias: "up", level: "county" },
  { code: "youth_unemployment", nameEn: "Youth unemployment (15–24)", nameRo: "Șomaj tineri (15–24)", unit: "%", category: "Labor Market", source: "Eurostat", rangeMin: 5, rangeMax: 28, trendBias: "down", level: "county" },
  // --- Real Estate ---
  { code: "housing_price_m2", nameEn: "Avg. residential price", nameRo: "Preț mediu rezidențial", unit: "EUR/m²", category: "Real Estate", source: "INS Tempo", rangeMin: 700, rangeMax: 3_200, trendBias: "up", level: "commune" },
  { code: "permits_issued", nameEn: "Construction permits issued", nameRo: "Autorizații de construire", unit: "count", category: "Real Estate", source: "INS Tempo", rangeMin: 5, rangeMax: 1_400, trendBias: "up", level: "commune" },
  // --- Infrastructure ---
  { code: "fiber_coverage", nameEn: "Fibre broadband coverage", nameRo: "Acoperire fibră", unit: "% households", category: "Infrastructure", source: "Eurostat", rangeMin: 30, rangeMax: 98, trendBias: "up", level: "county" },
  { code: "highway_access_km", nameEn: "Distance to nearest highway", nameRo: "Distanță până la autostradă", unit: "km", category: "Infrastructure", source: "INS Tempo", rangeMin: 0, rangeMax: 120, trendBias: "down", level: "commune" },
  // --- Education ---
  { code: "tertiary_attainment", nameEn: "Tertiary education attainment (25–64)", nameRo: "Studii superioare (25–64)", unit: "%", category: "Education", source: "Eurostat", rangeMin: 8, rangeMax: 38, trendBias: "up", level: "county" },
  { code: "student_count", nameEn: "Tertiary students enrolled", nameRo: "Studenți înscriși", unit: "persons", category: "Education", source: "INS Tempo", rangeMin: 200, rangeMax: 75_000, trendBias: "up", level: "county" },
  // --- Risks ---
  { code: "flood_risk_index", nameEn: "Flood risk index", nameRo: "Indice risc inundații", unit: "0–100", category: "Risks", source: "Eurostat", rangeMin: 5, rangeMax: 75, trendBias: "flat", level: "commune" },
  { code: "seismic_zone", nameEn: "Seismic hazard zone", nameRo: "Zonă seismică", unit: "PGA g", category: "Risks", source: "Eurostat", rangeMin: 0.08, rangeMax: 0.32, trendBias: "flat", level: "region" },
];

/** Lookup helper — returns undefined if the code isn't in the catalog. */
export function getKpi(code: string): Kpi | undefined {
  return KPIS.find((k) => k.code === code);
}

/** Group KPIs by category in a deterministic order. */
export function kpisByCategory(): ReadonlyArray<{
  category: KpiCategory;
  items: readonly Kpi[];
}> {
  const order: KpiCategory[] = [
    "Demographics",
    "Macro-Economy",
    "Labor Market",
    "Real Estate",
    "Infrastructure",
    "Education",
    "Risks",
  ];
  return order
    .map((category) => ({
      category,
      items: KPIS.filter((k) => k.category === category),
    }))
    .filter((g) => g.items.length > 0);
}

/** Format a numeric value with the KPI's unit applied. Returns "—" for nullish. */
export function formatKpiValue(value: number | null | undefined, kpi: Kpi): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const isInt = Number.isInteger(value);
  const formatted = isInt
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${formatted} ${kpi.unit}`;
}
