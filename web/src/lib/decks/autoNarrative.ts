/**
 * Templated paragraph generators that synthesise narrative copy from
 * the deterministic observations + locations data. No LLM — pure
 * string templating with KPI lookups so output is stable across renders.
 */

import { getLocation } from "@/lib/mock/locations";
import { getObservation } from "@/lib/mock/observations";
import { formatKpiValue, getKpi } from "@/lib/mock/kpis";

function formattedKpi(siruta: string, kpiCode: string, year: number): string {
  const kpi = getKpi(kpiCode);
  if (!kpi) return "—";
  const o = getObservation(siruta, kpiCode, year);
  return formatKpiValue(o?.value, kpi);
}

export function countyNarrative({ siruta, year }: { siruta: string; year: number }): string {
  const loc = getLocation(siruta);
  if (!loc) return "Nord-Vest region snapshot for the selected year.";
  const pop = formattedKpi(siruta, "pop_total", year);
  const gdp = formattedKpi(siruta, "gdp_per_capita", year);
  const wage = formattedKpi(siruta, "wage_avg", year);
  return `${loc.name} County is home to ${pop}, with GDP per capita at ${gdp} and an average gross wage of ${wage}. The county anchors the Nord-Vest region's tech, manufacturing and logistics economy.`;
}

export function cityNarrative({ siruta, year }: { siruta: string; year: number }): string[] {
  const loc = getLocation(siruta);
  if (!loc) return ["City snapshot.", "Workforce snapshot.", "Infrastructure snapshot."];
  const pop = formattedKpi(siruta, "pop_total", year);
  const tert = formattedKpi(siruta, "tertiary_attainment", year);
  const fibre = formattedKpi(siruta, "fiber_coverage", year);
  return [
    `${loc.name} is the urban anchor of ${loc.countyName} County, with ${pop} residents and a growing tech & services ecosystem.`,
    `Tertiary education attainment of ${tert} provides a deep, multilingual talent pool that has attracted sustained foreign direct investment.`,
    `Modern infrastructure — including ${fibre} fibre broadband coverage — supports the city's continued growth.`,
  ];
}

export function communeCallout({ siruta, year }: { siruta: string; year: number }): string {
  const loc = getLocation(siruta);
  if (!loc) return "Fastest-growing commune in the region.";
  const pop = formattedKpi(siruta, "pop_total", year);
  return `${loc.name} hosts ${pop} — among the largest communes in Romania.`;
}
