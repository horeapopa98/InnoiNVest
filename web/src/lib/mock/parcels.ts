/**
 * Mock catalog of investable industrial / tech / logistics / agricultural
 * parcels across NW Romania. Coordinates are approximate (lat/lng) so the
 * ParcelMapBlock can place them on the real outline. Replace with a
 * cadastral feed when wired to production.
 */

export type ParcelType = "industrial" | "tech" | "logistics" | "agricultural";
export type ParcelStatus = "available" | "reserved" | "developed";

export type Parcel = {
  id: string;
  name: string;
  /** SIRUTA of the county the parcel sits in. */
  countySiruta: string;
  /** Nearest city/commune (SIRUTA), for context. */
  nearestSiruta: string;
  type: ParcelType;
  status: ParcelStatus;
  areaHa: number;
  /** EUR per hectare, asking price. */
  pricePerHaEur: number;
  /** Approximate WGS84 position. */
  lat: number;
  lng: number;
  /** Infrastructure scoring (0–3 each). */
  highwayKm: number;
  railKm: number;
  utilitiesScore: 0 | 1 | 2 | 3;
  description: string;
};

export const PARCELS: readonly Parcel[] = [
  // --- Cluj county ---
  {
    id: "p-cluj-tetarom4",
    name: "TETAROM IV – Feleacu",
    countySiruta: "120",
    nearestSiruta: "54975",
    type: "tech",
    status: "available",
    areaHa: 158,
    pricePerHaEur: 220_000,
    lat: 46.71,
    lng: 23.62,
    highwayKm: 1,
    railKm: 5,
    utilitiesScore: 3,
    description:
      "Greenfield extension of the TETAROM tech park, served by A3 motorway and 110/20 kV substation. Fibre backbone present.",
  },
  {
    id: "p-cluj-jucu",
    name: "Jucu Industrial Park",
    countySiruta: "120",
    nearestSiruta: "54975",
    type: "industrial",
    status: "available",
    areaHa: 84,
    pricePerHaEur: 165_000,
    lat: 46.86,
    lng: 23.85,
    highwayKm: 4,
    railKm: 2,
    utilitiesScore: 3,
    description:
      "Established cluster (Nokia/Bosch alumni). Rail siding active, gas + water + 20 kV connections at the gate.",
  },
  {
    id: "p-cluj-floresti",
    name: "Florești Logistics Hub",
    countySiruta: "120",
    nearestSiruta: "57706",
    type: "logistics",
    status: "reserved",
    areaHa: 32,
    pricePerHaEur: 140_000,
    lat: 46.74,
    lng: 23.48,
    highwayKm: 2,
    railKm: 12,
    utilitiesScore: 2,
    description:
      "Last-mile distribution site at the Cluj western corridor. Currently optioned by a regional grocery chain.",
  },

  // --- Bihor county ---
  {
    id: "p-bihor-eurobusiness",
    name: "Eurobusiness Parc Oradea II",
    countySiruta: "54",
    nearestSiruta: "55039",
    type: "industrial",
    status: "available",
    areaHa: 120,
    pricePerHaEur: 130_000,
    lat: 47.10,
    lng: 21.93,
    highwayKm: 8,
    railKm: 3,
    utilitiesScore: 3,
    description:
      "Most active industrial park in NW. Hungarian-border corridor (A3 link). Plug-and-play utilities; multilingual workforce.",
  },
  {
    id: "p-bihor-salonta",
    name: "Salonta Greenfield",
    countySiruta: "54",
    nearestSiruta: "55039",
    type: "agricultural",
    status: "available",
    areaHa: 240,
    pricePerHaEur: 22_000,
    lat: 46.81,
    lng: 21.66,
    highwayKm: 38,
    railKm: 1,
    utilitiesScore: 1,
    description:
      "Class-I arable land suitable for agri-processing or food manufacturing. Direct rail to Arad / Hungarian network.",
  },
  {
    id: "p-bihor-stei",
    name: "Ștei Light-Industry Lot",
    countySiruta: "54",
    nearestSiruta: "55039",
    type: "industrial",
    status: "available",
    areaHa: 18,
    pricePerHaEur: 95_000,
    lat: 46.54,
    lng: 22.46,
    highwayKm: 65,
    railKm: 4,
    utilitiesScore: 2,
    description:
      "Reactivated post-industrial brownfield. Existing 6 kV substation, water/sewer infrastructure intact.",
  },

  // --- Maramureș county ---
  {
    id: "p-mm-baia",
    name: "Baia Mare South Tech Zone",
    countySiruta: "275",
    nearestSiruta: "106572",
    type: "tech",
    status: "available",
    areaHa: 46,
    pricePerHaEur: 110_000,
    lat: 47.65,
    lng: 23.59,
    highwayKm: 95,
    railKm: 2,
    utilitiesScore: 3,
    description:
      "Cluster proposal adjacent to UTCN North campus. Fibre, gas, 20 kV present. Highway access pending A8 build-out.",
  },
  {
    id: "p-mm-sighet",
    name: "Sighet Cross-Border Logistics",
    countySiruta: "275",
    nearestSiruta: "106572",
    type: "logistics",
    status: "available",
    areaHa: 28,
    pricePerHaEur: 65_000,
    lat: 47.93,
    lng: 23.89,
    highwayKm: 140,
    railKm: 1,
    utilitiesScore: 2,
    description:
      "Ukrainian-border crossing, rail-served. Suited to cross-border light-industry and warehousing.",
  },

  // --- Bistrița-Năsăud county ---
  {
    id: "p-bn-prundu",
    name: "Prundu Bârgăului Brownfield",
    countySiruta: "63",
    nearestSiruta: "63956",
    type: "industrial",
    status: "developed",
    areaHa: 22,
    pricePerHaEur: 78_000,
    lat: 47.21,
    lng: 24.81,
    highwayKm: 130,
    railKm: 18,
    utilitiesScore: 2,
    description:
      "Former wood-processing site. Already partially redeveloped; 8 ha remaining for sale.",
  },
  {
    id: "p-bn-bistrita",
    name: "Bistrița Industrial Park",
    countySiruta: "63",
    nearestSiruta: "63956",
    type: "industrial",
    status: "available",
    areaHa: 65,
    pricePerHaEur: 92_000,
    lat: 47.14,
    lng: 24.51,
    highwayKm: 110,
    railKm: 1,
    utilitiesScore: 3,
    description:
      "County-owned park with shovel-ready lots. Active automotive supplier presence (Leoni, Teraplast).",
  },

  // --- Satu Mare county ---
  {
    id: "p-sm-park",
    name: "Satu Mare South Industrial Park",
    countySiruta: "393",
    nearestSiruta: "136942",
    type: "industrial",
    status: "available",
    areaHa: 72,
    pricePerHaEur: 85_000,
    lat: 47.75,
    lng: 22.91,
    highwayKm: 35,
    railKm: 2,
    utilitiesScore: 3,
    description:
      "Hungarian-border corridor. Existing tenants (Autoliv, Hella). 12 ha greenfield remaining.",
  },
  {
    id: "p-sm-carei",
    name: "Carei Agro-Processing Lot",
    countySiruta: "393",
    nearestSiruta: "136942",
    type: "agricultural",
    status: "available",
    areaHa: 95,
    pricePerHaEur: 18_000,
    lat: 47.69,
    lng: 22.47,
    highwayKm: 22,
    railKm: 1,
    utilitiesScore: 1,
    description:
      "Cross-border agri-processing potential. Adjacent silos and primary water network.",
  },

  // --- Sălaj county ---
  {
    id: "p-sj-zalau",
    name: "Zalău Industrial Park",
    countySiruta: "402",
    nearestSiruta: "139029",
    type: "industrial",
    status: "available",
    areaHa: 38,
    pricePerHaEur: 72_000,
    lat: 47.18,
    lng: 23.06,
    highwayKm: 55,
    railKm: 4,
    utilitiesScore: 2,
    description:
      "Mid-size county park. Lower entry price than Cluj/Oradea, growing labour pool.",
  },
  {
    id: "p-sj-jibou",
    name: "Jibou Greenfield",
    countySiruta: "402",
    nearestSiruta: "139029",
    type: "agricultural",
    status: "available",
    areaHa: 140,
    pricePerHaEur: 14_000,
    lat: 47.26,
    lng: 23.25,
    highwayKm: 78,
    railKm: 1,
    utilitiesScore: 1,
    description:
      "Lowland arable. Suited to large-format food or biofuel processing. Direct rail link.",
  },
];

/** All parcels in a given county. */
export function parcelsInCounty(siruta: string): Parcel[] {
  return PARCELS.filter((p) => p.countySiruta === siruta);
}

/** Parcels matching a type. */
export function parcelsByType(type: ParcelType): Parcel[] {
  return PARCELS.filter((p) => p.type === type);
}

/**
 * Simple desirability score so the chat can rank parcels meaningfully:
 * favours availability, large size, low price, close highway+rail, and
 * full utilities. Returns 0–100.
 */
export function parcelScore(p: Parcel): number {
  const availability = p.status === "available" ? 1 : p.status === "reserved" ? 0.4 : 0;
  const size = Math.min(p.areaHa / 150, 1);
  const priceScore = Math.max(0, 1 - p.pricePerHaEur / 250_000);
  const highwayScore = Math.max(0, 1 - p.highwayKm / 80);
  const railScore = p.railKm <= 5 ? 1 : Math.max(0, 1 - (p.railKm - 5) / 30);
  const utils = p.utilitiesScore / 3;
  const composite =
    availability * 0.25 +
    priceScore * 0.2 +
    size * 0.15 +
    highwayScore * 0.15 +
    railScore * 0.1 +
    utils * 0.15;
  return Math.round(composite * 100);
}

export function getParcel(id: string): Parcel | undefined {
  return PARCELS.find((p) => p.id === id);
}
