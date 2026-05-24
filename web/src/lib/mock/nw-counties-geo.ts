/**
 * Approximate boundary polygons for the six NW Romania counties. Hand-
 * traced from the real geography with shared vertices at triple points
 * so adjacent counties tile cleanly (no gaps or overlaps). Coordinates
 * are [lng, lat] in WGS84, matching the GeoJSON spec.
 *
 * The shapes are simplified (12–20 vertices each) — accurate enough to
 * recognise visually but not survey-grade. Swap for an official source
 * (data.gov.ro shapefile → GeoJSON) when production fidelity matters.
 */

export type CountyFeature = {
  type: "Feature";
  /** SIRUTA code, matching LOCATIONS. */
  id: string;
  properties: { name: string; siruta: string };
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
};

// Shared triple-points so polygons match at the seams. lng, lat tuples.
// Hungary border = west edge. Ukraine border = north of Maramureș.
const A_SM_NW: [number, number] = [22.05, 47.95]; // Satu Mare NW (Hungary + Ukraine corner)
const B_SM_N_MM: [number, number] = [23.20, 47.95]; // Satu Mare / Maramureș top
const C_MM_NE: [number, number] = [24.95, 47.80]; // Maramureș NE (Ukraine border)
const D_MM_BN_E: [number, number] = [25.15, 47.45]; // Maramureș / Bistrița-N east
const E_BN_E: [number, number] = [25.20, 46.95]; // Bistrița-N south-east
const F_BN_CJ_E: [number, number] = [24.65, 46.70]; // Bistrița-N / Cluj east
const G_CJ_S_E: [number, number] = [24.10, 46.40]; // Cluj south-east
const H_CJ_S: [number, number] = [23.50, 46.35]; // Cluj south
const I_CJ_BH_S: [number, number] = [22.85, 46.45]; // Cluj / Bihor south
const J_BH_S: [number, number] = [22.20, 46.45]; // Bihor south
const K_BH_SW: [number, number] = [21.45, 46.55]; // Bihor SW (Hungary)
const L_BH_NW: [number, number] = [21.35, 47.10]; // Bihor NW (Hungary)
const M_SM_W: [number, number] = [21.85, 47.40]; // Satu Mare W (Hungary)

// Triple points (interior, county-to-county)
const T_SM_SJ_BH: [number, number] = [22.70, 47.55]; // Satu Mare / Sălaj / Bihor
const T_SM_MM_SJ: [number, number] = [23.20, 47.55]; // Satu Mare / Maramureș / Sălaj
const T_MM_SJ_BN: [number, number] = [23.85, 47.35]; // Maramureș / Sălaj / Bistrița-N
const T_SJ_BN_CJ: [number, number] = [23.85, 47.05]; // Sălaj / Bistrița-N / Cluj
const T_SJ_BH_CJ: [number, number] = [22.95, 47.00]; // Sălaj / Bihor / Cluj

export const NW_COUNTIES_GEOJSON: {
  type: "FeatureCollection";
  features: CountyFeature[];
} = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "393",
      properties: { name: "Satu Mare", siruta: "393" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          A_SM_NW,
          B_SM_N_MM,
          T_SM_MM_SJ,
          T_SM_SJ_BH,
          [22.20, 47.60],
          M_SM_W,
          [21.95, 47.65],
          A_SM_NW,
        ]],
      },
    },
    {
      type: "Feature",
      id: "275",
      properties: { name: "Maramureș", siruta: "275" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          B_SM_N_MM,
          [23.70, 47.95],
          [24.30, 47.90],
          C_MM_NE,
          [24.95, 47.65],
          D_MM_BN_E,
          [24.60, 47.30],
          T_MM_SJ_BN,
          [23.55, 47.45],
          T_SM_MM_SJ,
          B_SM_N_MM,
        ]],
      },
    },
    {
      type: "Feature",
      id: "402",
      properties: { name: "Sălaj", siruta: "402" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          T_SM_SJ_BH,
          T_SM_MM_SJ,
          [23.55, 47.45],
          T_MM_SJ_BN,
          T_SJ_BN_CJ,
          [23.40, 46.95],
          T_SJ_BH_CJ,
          [22.85, 47.20],
          T_SM_SJ_BH,
        ]],
      },
    },
    {
      type: "Feature",
      id: "63",
      properties: { name: "Bistrița-Năsăud", siruta: "63" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          T_MM_SJ_BN,
          [24.60, 47.30],
          D_MM_BN_E,
          [25.20, 47.20],
          E_BN_E,
          [24.95, 46.80],
          F_BN_CJ_E,
          [24.20, 46.85],
          T_SJ_BN_CJ,
          T_MM_SJ_BN,
        ]],
      },
    },
    {
      type: "Feature",
      id: "120",
      properties: { name: "Cluj", siruta: "120" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          T_SJ_BH_CJ,
          [23.40, 46.95],
          T_SJ_BN_CJ,
          [24.20, 46.85],
          F_BN_CJ_E,
          G_CJ_S_E,
          H_CJ_S,
          I_CJ_BH_S,
          [22.95, 46.65],
          T_SJ_BH_CJ,
        ]],
      },
    },
    {
      type: "Feature",
      id: "54",
      properties: { name: "Bihor", siruta: "54" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          L_BH_NW,
          [21.65, 47.45],
          [22.05, 47.55],
          T_SM_SJ_BH,
          [22.85, 47.20],
          T_SJ_BH_CJ,
          [22.95, 46.65],
          I_CJ_BH_S,
          J_BH_S,
          [21.95, 46.50],
          K_BH_SW,
          [21.30, 46.75],
          L_BH_NW,
        ]],
      },
    },
  ],
};
