/**
 * Mock SIRUTA locations covering the 6 ADR Nord-Vest counties + 6
 * cities/communes. Populations are real-ish for demo plausibility but
 * not authoritative. Replace with a backend fetch when wired.
 */

export type LocationType = "commune" | "city" | "county";

export type Location = {
  sirutaCode: string;
  name: string;
  type: LocationType;
  /** SIRUTA code of the containing county (self for counties). */
  countyCode: string;
  countyName: string;
  populationApprox: number;
};

export const LOCATIONS: readonly Location[] = [
  // --- Counties (NUTS3) ---
  { sirutaCode: "54", name: "Bihor", type: "county", countyCode: "54", countyName: "Bihor", populationApprox: 562_000 },
  { sirutaCode: "63", name: "Bistrița-Năsăud", type: "county", countyCode: "63", countyName: "Bistrița-Năsăud", populationApprox: 285_000 },
  { sirutaCode: "120", name: "Cluj", type: "county", countyCode: "120", countyName: "Cluj", populationApprox: 691_000 },
  { sirutaCode: "275", name: "Maramureș", type: "county", countyCode: "275", countyName: "Maramureș", populationApprox: 460_000 },
  { sirutaCode: "393", name: "Satu Mare", type: "county", countyCode: "393", countyName: "Satu Mare", populationApprox: 332_000 },
  { sirutaCode: "402", name: "Sălaj", type: "county", countyCode: "402", countyName: "Sălaj", populationApprox: 213_000 },

  // --- Cities ---
  { sirutaCode: "55039", name: "Oradea", type: "city", countyCode: "54", countyName: "Bihor", populationApprox: 196_000 },
  { sirutaCode: "63956", name: "Bistrița", type: "city", countyCode: "63", countyName: "Bistrița-Năsăud", populationApprox: 75_000 },
  { sirutaCode: "54975", name: "Cluj-Napoca", type: "city", countyCode: "120", countyName: "Cluj", populationApprox: 286_000 },
  { sirutaCode: "106572", name: "Baia Mare", type: "city", countyCode: "275", countyName: "Maramureș", populationApprox: 108_000 },
  { sirutaCode: "136942", name: "Satu Mare", type: "city", countyCode: "393", countyName: "Satu Mare", populationApprox: 92_000 },
  { sirutaCode: "139029", name: "Zalău", type: "city", countyCode: "402", countyName: "Sălaj", populationApprox: 56_000 },

  // --- Communes (selected) ---
  { sirutaCode: "57706", name: "Florești", type: "commune", countyCode: "120", countyName: "Cluj", populationApprox: 52_000 },
];

export function getLocation(siruta: string): Location | undefined {
  return LOCATIONS.find((l) => l.sirutaCode === siruta);
}

export function locationsByCounty(): ReadonlyArray<{
  county: string;
  items: readonly Location[];
}> {
  const counties = Array.from(new Set(LOCATIONS.map((l) => l.countyName))).sort();
  return counties.map((county) => ({
    county,
    items: LOCATIONS.filter((l) => l.countyName === county).sort((a, b) => {
      const order = { county: 0, city: 1, commune: 2 } as const;
      if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
      return a.name.localeCompare(b.name);
    }),
  }));
}
