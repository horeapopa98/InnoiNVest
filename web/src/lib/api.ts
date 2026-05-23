const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type LocationSummary = {
  siruta_code: string;
  name: string;
  type: "commune" | "city" | "county" | "region" | "country";
  parent_siruta: string | null;
  nuts_code: string | null;
  population_latest: number | null;
};

export type KpiValueDto = {
  period: string;
  value: string | null;
  source_code: string;
  source_dataset_id: string | null;
  source_url: string | null;
  fetched_at: string | null;
};

export type KpiDto = {
  kpi_code: string;
  name_en: string;
  name_ro: string;
  unit: string;
  category: string;
  aggregation_level: "commune" | "county" | "country";
  latest: KpiValueDto;
  history: KpiValueDto[];
};

export type Institution = {
  name: string;
  type: "university" | "high_school" | "research_institute";
  url: string | null;
  for_siruta: string;
};

export type GroupedReport = {
  location: LocationSummary;
  categories: { category: string; kpis: KpiDto[] }[];
  institutions: Institution[];
};

export type FlatRow = {
  kpi_code: string;
  kpi_name_en: string;
  category: string;
  unit: string;
  period: string;
  value: string | null;
  source_code: string;
  source_dataset_id: string | null;
  source_url: string | null;
  aggregation_level: string;
  for_siruta: string;
};

export type FlatReport = { location: LocationSummary; rows: FlatRow[] };

export async function searchLocations(q: string): Promise<LocationSummary[]> {
  const r = await fetch(`${BASE}/locations?q=${encodeURIComponent(q)}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`search failed: ${r.status}`);
  return r.json();
}

export async function getGroupedReport(siruta: string): Promise<GroupedReport> {
  const r = await fetch(`${BASE}/report/${siruta}?format=grouped`, { cache: "no-store" });
  if (!r.ok) throw new Error(`report failed: ${r.status}`);
  return r.json();
}

export async function getFlatReport(siruta: string): Promise<FlatReport> {
  const r = await fetch(`${BASE}/report/${siruta}?format=flat`, { cache: "no-store" });
  if (!r.ok) throw new Error(`report failed: ${r.status}`);
  return r.json();
}
