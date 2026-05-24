/**
 * Deck data model. A Deck is an ordered list of typed Slides, each
 * carrying a discriminated `kind`. The renderer is a switch (slide.kind).
 *
 * Persisted under STORAGE_KEYS.decks as Deck[].
 */

import type { ParcelType } from "./parcels";
import type { Sector } from "./composite";

export type SlideId = string;
export type PhotoId =
  | "industrial-park-1"
  | "urban-cluj"
  | "commune-blocks"
  | "landscape-mountains"
  | "highway-aerial"
  | "satellite-default"
  | null;

type BaseSlide = {
  id: SlideId;
  /** Year the slide's data was derived for. The deck-level year drives new slides. */
  dataYear: number;
};

export type CoverSlide = BaseSlide & {
  kind: "cover";
  title: string;
  subtitle: string;
  preparedFor: string;
  dateIssued: string; // ISO date
  /** SIRUTA highlighted on the RO map; defaults to deck.locationSiruta. */
  highlightCounty: string | null;
};

export type SectionDividerSlide = BaseSlide & {
  kind: "section_divider";
  title: string;
  backgroundPhotoId: PhotoId;
};

export type CountySnapshotSlide = BaseSlide & {
  kind: "county_snapshot";
  eyebrow: string;
  headline: string;
  /** Optional auto-narrative; analyst can override or clear. */
  narrative: string | null;
  /** Tile KPIs, max 4. */
  kpiCodes: string[];
  /** SIRUTA of the county. */
  locationSiruta: string;
};

export type CitySnapshotSlide = BaseSlide & {
  kind: "city_snapshot";
  eyebrow: string;
  headline: string;
  /** 3 paragraphs of narrative. */
  paragraphs: string[];
  kpiCodes: string[];
  photoId: PhotoId;
  /** SIRUTA of the city. */
  locationSiruta: string;
};

export type CommuneDetailSlide = BaseSlide & {
  kind: "commune_detail";
  headline: string;
  paragraphs: string[];
  calloutText: string;
  heroPhotoId: PhotoId;
  /** SIRUTA of the commune. */
  locationSiruta: string;
};

export type StrategicLocationSlide = BaseSlide & {
  kind: "strategic_location";
  title: string;
  backgroundPhotoId: PhotoId;
};

export type ParcelDetailSlide = BaseSlide & {
  kind: "parcel_detail";
  title: string;
  /** Three short pill labels. */
  features: string[];
  /** Bulleted detail list. */
  keyFeatures: string[];
  indicatedPrice: string;
  parcelId: string;
};

export type InfrastructureDividerSlide = BaseSlide & {
  kind: "infrastructure_divider";
  title: string;
  backgroundPhotoId: PhotoId;
};

export type InfrastructurePageSlide = BaseSlide & {
  kind: "infrastructure_page";
  headline: string;
  /** Three (label, distance) pairs for the highlighted icons. */
  distances: Array<{ label: string; value: string }>;
  /** Centring point for the map (lat/lng). */
  parcelId: string;
};

export type StatInfographicSlide = BaseSlide & {
  kind: "stat_infographic";
  headline: string;
  /** Either "radial" (5-8 stats around a centre) or "panel" (3-5 stats + side panel rows). */
  layout: "radial" | "panel";
  stats: Array<{ value: string; label: string }>;
  /** Used only for `panel` layout. */
  sidePanelTitle: string;
  sidePanelRows: Array<{ label: string; value: string }>;
};

export type TrendSlide = BaseSlide & {
  kind: "trend";
  headline: string;
  commentary: string;
  kpiCode: string;
  locationSiruta: string;
  /** Inclusive year range pulled from observations. */
  yearRange: [number, number];
};

export type ComparisonSlide = BaseSlide & {
  kind: "comparison";
  headline: string;
  commentary: string;
  kpiCode: string;
  locationSirutas: string[];
  yearRange: [number, number];
};

export type RecommendationSlide = BaseSlide & {
  kind: "recommendation";
  headline: string;
  narrative: string;
  sector: Sector;
};

export type TextSlide = BaseSlide & {
  kind: "text";
  title: string;
  paragraphs: string[];
};

export type ContactSlide = BaseSlide & {
  kind: "contact";
  headline: string;
  contactRows: Array<{ label: string; value: string }>;
  ctaText: string;
};

export type Slide =
  | CoverSlide
  | SectionDividerSlide
  | CountySnapshotSlide
  | CitySnapshotSlide
  | CommuneDetailSlide
  | StrategicLocationSlide
  | ParcelDetailSlide
  | InfrastructureDividerSlide
  | InfrastructurePageSlide
  | StatInfographicSlide
  | TrendSlide
  | ComparisonSlide
  | RecommendationSlide
  | TextSlide
  | ContactSlide;

export type SlideKind = Slide["kind"];

export const SLIDE_KIND_LABELS: Record<SlideKind, string> = {
  cover: "Cover",
  section_divider: "Section divider",
  county_snapshot: "County snapshot",
  city_snapshot: "City snapshot",
  commune_detail: "Commune detail",
  strategic_location: "Strategic location",
  parcel_detail: "Parcel detail",
  infrastructure_divider: "Infrastructure divider",
  infrastructure_page: "Infrastructure page",
  stat_infographic: "Stat infographic",
  trend: "Trend",
  comparison: "Comparison",
  recommendation: "Recommendation",
  text: "Text",
  contact: "Contact",
};

export const SLIDE_PALETTE_GROUPS: ReadonlyArray<{
  label: string;
  kinds: SlideKind[];
}> = [
  { label: "Structure", kinds: ["cover", "section_divider", "contact"] },
  { label: "Snapshot", kinds: ["county_snapshot", "city_snapshot", "commune_detail"] },
  { label: "Location", kinds: ["parcel_detail", "strategic_location", "infrastructure_divider", "infrastructure_page"] },
  { label: "Data", kinds: ["stat_infographic", "trend", "comparison", "recommendation"] },
  { label: "Custom", kinds: ["text"] },
];

export type Deck = {
  id: string;
  title: string;
  templateOrigin: "investor-pitch" | "blank" | "user-saved";
  /** Primary location the deck is about. Drives data-bound elements + cover map. */
  locationSiruta: string | null;
  /** Year used to derive KPI values when a slide is added or regenerated. */
  systemYear: number;
  slides: Slide[];
  /** Whether the deck is shared (template, clone-only) or user-owned. */
  isShared: boolean;
  createdAt: number;
  updatedAt: number;
};

export type { ParcelType, Sector };

// ---------------------------------------------------------------------
// Slide factories — one per kind. Each produces a sensible default for
// the kind, given a (year, location?) context. Used by:
//   • the SlidePalette "+ Add slide" popover
//   • the seeded Florești deck below
//   • the chat → deck bridge (createSlideFromChat) as a fallback
// ---------------------------------------------------------------------

import { getLocation } from "./locations";

let _slideIdSeq = 0;
function nextSlideId(prefix: string): string {
  _slideIdSeq += 1;
  return `slide-${prefix}-${Date.now().toString(36)}-${_slideIdSeq}`;
}

export function makeCoverSlide(opts: {
  year: number;
  locationSiruta: string | null;
  title?: string;
  preparedFor?: string;
}): CoverSlide {
  const loc = opts.locationSiruta ? getLocation(opts.locationSiruta) : undefined;
  return {
    id: nextSlideId("cover"),
    kind: "cover",
    dataYear: opts.year,
    title: opts.title ?? (loc ? `${loc.name} — Investor Pitch` : "Investor Pitch"),
    subtitle: "Strategic location for regional investment",
    preparedFor: opts.preparedFor ?? "ADR Nord-Vest",
    dateIssued: new Date().toISOString().slice(0, 10),
    highlightCounty: loc?.countyCode ?? null,
  };
}

export function makeSectionDivider(title: string, year: number, photoId: PhotoId = "landscape-mountains"): SectionDividerSlide {
  return {
    id: nextSlideId("section"),
    kind: "section_divider",
    dataYear: year,
    title,
    backgroundPhotoId: photoId,
  };
}

export function makeCountySnapshot(opts: {
  year: number;
  countySiruta: string;
  kpiCodes?: string[];
}): CountySnapshotSlide {
  const loc = getLocation(opts.countySiruta);
  return {
    id: nextSlideId("county"),
    kind: "county_snapshot",
    dataYear: opts.year,
    eyebrow: "COUNTY SNAPSHOT",
    headline: loc?.name ?? "County",
    narrative: null,
    kpiCodes: opts.kpiCodes ?? ["pop_total", "gdp_per_capita", "wage_avg", "fiber_coverage"],
    locationSiruta: opts.countySiruta,
  };
}

export function makeCitySnapshot(opts: {
  year: number;
  citySiruta: string;
  photoId?: PhotoId;
}): CitySnapshotSlide {
  const loc = getLocation(opts.citySiruta);
  return {
    id: nextSlideId("city"),
    kind: "city_snapshot",
    dataYear: opts.year,
    eyebrow: "CITY HUB",
    headline: loc?.name ?? "City",
    paragraphs: [
      `${loc?.name ?? "The city"} anchors the regional economy with a deep tech and services ecosystem.`,
      "Tertiary education attainment and the multilingual workforce drive sustained foreign direct investment.",
      "Growing residential supply and modern infrastructure support continued in-migration.",
    ],
    kpiCodes: ["pop_total", "wage_avg", "tertiary_attainment", "gdp_per_capita"],
    photoId: opts.photoId ?? "urban-cluj",
    locationSiruta: opts.citySiruta,
  };
}

export function makeCommuneDetail(opts: {
  year: number;
  communeSiruta: string;
}): CommuneDetailSlide {
  const loc = getLocation(opts.communeSiruta);
  return {
    id: nextSlideId("commune"),
    kind: "commune_detail",
    dataYear: opts.year,
    headline: loc?.name ?? "Commune",
    paragraphs: [
      `${loc?.name ?? "The commune"} is the fastest-growing settlement in the metropolitan area.`,
      "Residential development is matched by new commercial and logistics floorspace.",
    ],
    calloutText: "Largest commune in Romania by population",
    heroPhotoId: "commune-blocks",
    locationSiruta: opts.communeSiruta,
  };
}

export function makeStrategicLocation(title: string, year: number): StrategicLocationSlide {
  return {
    id: nextSlideId("strategic"),
    kind: "strategic_location",
    dataYear: year,
    title,
    backgroundPhotoId: "industrial-park-1",
  };
}

export function makeParcelDetail(opts: {
  year: number;
  parcelId: string;
  title?: string;
}): ParcelDetailSlide {
  return {
    id: nextSlideId("parcel"),
    kind: "parcel_detail",
    dataYear: opts.year,
    title: opts.title ?? "Investable Site",
    features: ["Greenfield", "A3 motorway", "Utilities at gate"],
    keyFeatures: [
      "Direct rail siding active",
      "Gas, water, 20kV grid connections",
      "Strategic distance from Cluj-Napoca",
      "Multi-tenant ready",
    ],
    indicatedPrice: "Price on request",
    parcelId: opts.parcelId,
  };
}

export function makeInfrastructureDivider(year: number): InfrastructureDividerSlide {
  return {
    id: nextSlideId("infradiv"),
    kind: "infrastructure_divider",
    dataYear: year,
    title: "Infrastructure & Utilities",
    backgroundPhotoId: "highway-aerial",
  };
}

export function makeInfrastructurePage(opts: { year: number; parcelId: string }): InfrastructurePageSlide {
  return {
    id: nextSlideId("infra"),
    kind: "infrastructure_page",
    dataYear: opts.year,
    headline: "Infrastructure access",
    distances: [
      { label: "A3 motorway", value: "1 km" },
      { label: "Cluj-Napoca airport", value: "18 km" },
      { label: "Hungarian border", value: "165 km" },
    ],
    parcelId: opts.parcelId,
  };
}

export function makeStatInfographic(opts: {
  year: number;
  layout?: "radial" | "panel";
  headline?: string;
}): StatInfographicSlide {
  return {
    id: nextSlideId("stat"),
    kind: "stat_infographic",
    dataYear: opts.year,
    headline: opts.headline ?? "Key indicators",
    layout: opts.layout ?? "radial",
    stats: [
      { value: "286k", label: "Cluj-Napoca residents" },
      { value: "€17.4k", label: "GDP per capita" },
      { value: "8.4k", label: "Average gross wage RON" },
      { value: "32%", label: "Tertiary attainment" },
      { value: "92%", label: "Fibre coverage" },
    ],
    sidePanelTitle: "Overnight delivery to",
    sidePanelRows: [
      { label: "Budapest", value: "590 km" },
      { label: "Vienna", value: "770 km" },
      { label: "Bucharest", value: "450 km" },
      { label: "Sofia", value: "640 km" },
    ],
  };
}

export function makeTrend(opts: { year: number; kpiCode: string; locationSiruta: string }): TrendSlide {
  return {
    id: nextSlideId("trend"),
    kind: "trend",
    dataYear: opts.year,
    headline: "10-year trajectory",
    commentary: "Sustained growth aligned with the regional convergence story.",
    kpiCode: opts.kpiCode,
    locationSiruta: opts.locationSiruta,
    yearRange: [2018, opts.year],
  };
}

export function makeComparison(opts: {
  year: number;
  kpiCode: string;
  locationSirutas: string[];
}): ComparisonSlide {
  return {
    id: nextSlideId("compare"),
    kind: "comparison",
    dataYear: opts.year,
    headline: "Comparative view",
    commentary: "Cluj's lead on this metric has widened over the period.",
    kpiCode: opts.kpiCode,
    locationSirutas: opts.locationSirutas,
    yearRange: [2018, opts.year],
  };
}

export function makeRecommendation(opts: { year: number; sector: Sector }): RecommendationSlide {
  return {
    id: nextSlideId("reco"),
    kind: "recommendation",
    dataYear: opts.year,
    headline: "Where to invest",
    narrative: "Cluj retains the strongest composite score for the chosen sector, driven by talent and infrastructure.",
    sector: opts.sector,
  };
}

export function makeTextSlide(opts: { year: number; title?: string }): TextSlide {
  return {
    id: nextSlideId("text"),
    kind: "text",
    dataYear: opts.year,
    title: opts.title ?? "Section",
    paragraphs: ["Add narrative content here."],
  };
}

export function makeContactSlide(opts: { year: number }): ContactSlide {
  return {
    id: nextSlideId("contact"),
    kind: "contact",
    dataYear: opts.year,
    headline: "For more information",
    contactRows: [
      { label: "ADR Nord-Vest", value: "secretariat@nord-vest.ro" },
      { label: "Phone", value: "+40 264 431 550" },
      { label: "Website", value: "nord-vest.ro" },
    ],
    ctaText: "Contact us to schedule a site visit",
  };
}

// ---------------------------------------------------------------------
// Seeded Investor Pitch — Florești deck (17 slides) modeled on the
// reference ADR PDF.
// ---------------------------------------------------------------------

const CLUJ_COUNTY_SIRUTA = "120";
const CLUJ_NAPOCA_SIRUTA = "54975";
const FLORESTI_SIRUTA = "57706";
const BN_COUNTY_SIRUTA = "63";

export function makeInvestorPitchDeck(opts: { year: number }): Deck {
  const now = Date.now();
  const year = opts.year;
  const slides: Slide[] = [
    makeCoverSlide({ year, locationSiruta: FLORESTI_SIRUTA, title: "Florești — Investor Pitch", preparedFor: "ADR Nord-Vest" }),
    makeCountySnapshot({ year, countySiruta: CLUJ_COUNTY_SIRUTA }),
    makeCitySnapshot({ year, citySiruta: CLUJ_NAPOCA_SIRUTA, photoId: "urban-cluj" }),
    makeCommuneDetail({ year, communeSiruta: FLORESTI_SIRUTA }),
    makeStrategicLocation("Strategic Location", year),
    makeParcelDetail({ year, parcelId: "p-cluj-floresti", title: "200HA Florești, Cluj County" }),
    makeInfrastructureDivider(year),
    makeInfrastructurePage({ year, parcelId: "p-cluj-floresti" }),
    makeStatInfographic({ year, layout: "radial", headline: "Why Cluj" }),
    makeTrend({ year, kpiCode: "gdp_per_capita", locationSiruta: CLUJ_COUNTY_SIRUTA }),
    makeComparison({ year, kpiCode: "wage_avg", locationSirutas: [CLUJ_COUNTY_SIRUTA, BN_COUNTY_SIRUTA] }),
    makeRecommendation({ year, sector: "tech" }),
    makeSectionDivider("Workforce & Ecosystem", year, "urban-cluj"),
    makeStatInfographic({ year, layout: "panel", headline: "Overnight delivery from Cluj" }),
    makeStrategicLocation("Additional Sites", year),
    makeParcelDetail({ year, parcelId: "p-cluj-jucu", title: "Jucu Industrial Park" }),
    makeContactSlide({ year }),
  ];
  return {
    id: "deck-investor-pitch-floresti",
    title: "Investor Pitch — Florești",
    templateOrigin: "investor-pitch",
    locationSiruta: FLORESTI_SIRUTA,
    systemYear: year,
    slides,
    isShared: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Empty deck for "+ New deck" starting from blank — just a cover + a text slide. */
export function makeBlankDeck(opts: { year: number; title?: string }): Deck {
  const now = Date.now();
  return {
    id: `deck-${now.toString(36)}`,
    title: opts.title ?? "Untitled deck",
    templateOrigin: "blank",
    locationSiruta: null,
    systemYear: opts.year,
    slides: [
      makeCoverSlide({ year: opts.year, locationSiruta: null, title: opts.title ?? "Untitled deck" }),
      makeTextSlide({ year: opts.year, title: "Add a section title" }),
    ],
    isShared: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Returns a default slide for a given kind — used by the SlidePalette
 * "+ Add slide" popover so the analyst gets a sensible starting point.
 */
export function defaultSlideForKind(kind: SlideKind, ctx: { year: number; locationSiruta: string | null }): Slide {
  const year = ctx.year;
  const siruta = ctx.locationSiruta;
  switch (kind) {
    case "cover": return makeCoverSlide({ year, locationSiruta: siruta });
    case "section_divider": return makeSectionDivider("Section title", year);
    case "county_snapshot": return makeCountySnapshot({ year, countySiruta: siruta ?? CLUJ_COUNTY_SIRUTA });
    case "city_snapshot": return makeCitySnapshot({ year, citySiruta: siruta ?? CLUJ_NAPOCA_SIRUTA });
    case "commune_detail": return makeCommuneDetail({ year, communeSiruta: siruta ?? FLORESTI_SIRUTA });
    case "strategic_location": return makeStrategicLocation("Strategic location", year);
    case "parcel_detail": return makeParcelDetail({ year, parcelId: "p-cluj-floresti" });
    case "infrastructure_divider": return makeInfrastructureDivider(year);
    case "infrastructure_page": return makeInfrastructurePage({ year, parcelId: "p-cluj-floresti" });
    case "stat_infographic": return makeStatInfographic({ year });
    case "trend": return makeTrend({ year, kpiCode: "gdp_per_capita", locationSiruta: siruta ?? CLUJ_COUNTY_SIRUTA });
    case "comparison": return makeComparison({ year, kpiCode: "wage_avg", locationSirutas: [CLUJ_COUNTY_SIRUTA, BN_COUNTY_SIRUTA] });
    case "recommendation": return makeRecommendation({ year, sector: "tech" });
    case "text": return makeTextSlide({ year });
    case "contact": return makeContactSlide({ year });
  }
}

/** Resolve a PhotoId to a public URL. Returns null for `null` PhotoId. */
export function photoUrl(id: PhotoId): string | null {
  if (id === null) return null;
  return `/deck-photos/${id}.svg`;
}

/** Stable label for a slide in the sidebar outline. */
export function slideOutlineLabel(slide: Slide): string {
  switch (slide.kind) {
    case "cover": return slide.title;
    case "section_divider":
    case "strategic_location":
    case "infrastructure_divider":
    case "parcel_detail": return slide.title;
    case "county_snapshot":
    case "city_snapshot": return slide.headline;
    case "commune_detail": return slide.headline;
    case "infrastructure_page": return slide.headline;
    case "stat_infographic": return slide.headline;
    case "trend":
    case "comparison":
    case "recommendation": return slide.headline;
    case "text": return slide.title;
    case "contact": return slide.headline;
  }
}
