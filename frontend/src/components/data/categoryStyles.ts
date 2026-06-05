/**
 * Category → Tailwind classes for badges and accents. Tones are
 * deliberately muted to stay consistent with the institutional
 * brand — no neon, no full saturation. Each category gets a distinct
 * hue so they're scannable in a dense table.
 */

import { type KpiCategory } from "@/lib/mock/kpis";

export const CATEGORY_BADGE: Record<KpiCategory, string> = {
  Demographics: "bg-primary/10 text-primary-deep ring-1 ring-primary/20",
  "Macro-Economy": "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200",
  "Labor Market": "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  "Real Estate": "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
  Infrastructure: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
  Education: "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
  Risks: "bg-rose-50 text-rose-900 ring-1 ring-rose-200",
};

export const CATEGORY_DOT: Record<KpiCategory, string> = {
  Demographics: "bg-primary",
  "Macro-Economy": "bg-indigo-500",
  "Labor Market": "bg-amber-500",
  "Real Estate": "bg-emerald-500",
  Infrastructure: "bg-sky-500",
  Education: "bg-violet-500",
  Risks: "bg-rose-500",
};
