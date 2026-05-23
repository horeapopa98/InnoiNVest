/**
 * Report template data model + the seeded "Standard ADR Commune
 * Dossier" template. User templates live in localStorage; the seeded
 * one ships in code (always available, can be cloned but not deleted).
 */

import { type KpiCategory } from "./kpis";

export type SectionKind =
  | "cover"
  | "executive_summary"
  | "demographics"
  | "macro_economy"
  | "labor_market"
  | "real_estate"
  | "risks"
  | "appendix";

export type SlotKind = "headline" | "chart" | "table" | "prose" | "location" | "date";

export type SectionSlot = {
  id: string;
  kind: SlotKind;
  label: string;
  /** Bound KPI code(s). Empty until the user drops a variable. */
  kpiCodes: string[];
  /** For category-constrained sections, which category accepts drops. */
  acceptsCategory?: KpiCategory;
};

export type SectionConfig = {
  id: string;
  kind: SectionKind;
  title: string;
  slots: SectionSlot[];
};

export type ReportTemplate = {
  id: string;
  name: string;
  /** Locale-tagged description. */
  description: string;
  /** "seed" = ships in code (read-only); "user" = saved by user. */
  origin: "seed" | "user";
  sections: SectionConfig[];
  createdAt: number;
  updatedAt: number;
};

/**
 * Factory for a fresh "Standard ADR Commune Dossier" template.
 * Used both as a seed and as the starting point for "+ New".
 */
export function createStandardTemplate(): ReportTemplate {
  const now = Date.now();
  return {
    id: "seed-standard-adr",
    origin: "seed",
    name: "Standard ADR Commune Dossier",
    description:
      "Baseline 8-section investment dossier covering demographics, macro-economy, labor, real estate, and risks.",
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: "cover",
        kind: "cover",
        title: "Cover",
        slots: [
          { id: "cover-loc", kind: "location", label: "Location", kpiCodes: [] },
          { id: "cover-date", kind: "date", label: "Date issued", kpiCodes: [] },
        ],
      },
      {
        id: "summary",
        kind: "executive_summary",
        title: "Executive Summary",
        slots: [
          { id: "summary-headline", kind: "headline", label: "Headline metric", kpiCodes: [] },
          { id: "summary-trend", kind: "chart", label: "Trend chart", kpiCodes: [] },
          { id: "summary-prose", kind: "prose", label: "Narrative", kpiCodes: [] },
        ],
      },
      {
        id: "demographics",
        kind: "demographics",
        title: "Demographics",
        slots: [
          { id: "demo-chart", kind: "chart", label: "Population trend", kpiCodes: [], acceptsCategory: "Demographics" },
          { id: "demo-table", kind: "table", label: "Demographic indicators", kpiCodes: [], acceptsCategory: "Demographics" },
        ],
      },
      {
        id: "macro",
        kind: "macro_economy",
        title: "Macro-Economy",
        slots: [
          { id: "macro-chart", kind: "chart", label: "GDP trend", kpiCodes: [], acceptsCategory: "Macro-Economy" },
          { id: "macro-table", kind: "table", label: "Macro indicators", kpiCodes: [], acceptsCategory: "Macro-Economy" },
        ],
      },
      {
        id: "labor",
        kind: "labor_market",
        title: "Labor Market",
        slots: [
          { id: "labor-chart", kind: "chart", label: "Employment trend", kpiCodes: [], acceptsCategory: "Labor Market" },
          { id: "labor-table", kind: "table", label: "Labor indicators", kpiCodes: [], acceptsCategory: "Labor Market" },
        ],
      },
      {
        id: "real-estate",
        kind: "real_estate",
        title: "Real Estate",
        slots: [
          { id: "re-chart", kind: "chart", label: "Price trend", kpiCodes: [], acceptsCategory: "Real Estate" },
          { id: "re-table", kind: "table", label: "Real estate indicators", kpiCodes: [], acceptsCategory: "Real Estate" },
        ],
      },
      {
        id: "risks",
        kind: "risks",
        title: "Risks",
        slots: [{ id: "risks-prose", kind: "prose", label: "Risk narrative", kpiCodes: [] }],
      },
      {
        id: "appendix",
        kind: "appendix",
        title: "Appendix",
        slots: [{ id: "appendix-table", kind: "table", label: "Full indicator table", kpiCodes: [] }],
      },
    ],
  };
}

export const SEED_TEMPLATES: readonly ReportTemplate[] = [createStandardTemplate()];

/** Generated reports — one per (templateId, locationId, generation event). */
export type GeneratedReport = {
  id: string;
  templateId: string;
  templateName: string;
  locationSiruta: string;
  locationName: string;
  generatedAt: number;
  /** Year the system was on when this was generated. */
  systemYear: number;
  /** Snapshot of {kpiCode: value} for the report's selected year. */
  snapshot: Record<string, number>;
  /** Previous report id this regenerated from (if any). */
  parentReportId?: string;
};
