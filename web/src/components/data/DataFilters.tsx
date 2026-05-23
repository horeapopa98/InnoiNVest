"use client";

import { useId, useMemo } from "react";
import { Search, X } from "lucide-react";
import { LOCATIONS } from "@/lib/mock/locations";
import { YEARS_AVAILABLE, OBSERVATIONS } from "@/lib/mock/observations";
import { getKpi, type KpiCategory } from "@/lib/mock/kpis";
import { CATEGORY_DOT } from "./categoryStyles";

/**
 * Faceted filter shape. All array-valued facets are AND'd against the
 * observations; empty array means "no filter on this facet".
 */
export type DataFilters = {
  search: string;
  locationCodes: string[];
  categories: KpiCategory[];
  years: number[];
  sources: string[];
};

export const EMPTY_FILTERS: DataFilters = {
  search: "",
  locationCodes: [],
  categories: [],
  years: [],
  sources: [],
};

const CATEGORIES: KpiCategory[] = [
  "Demographics",
  "Macro-Economy",
  "Labor Market",
  "Real Estate",
  "Infrastructure",
  "Education",
  "Risks",
];

const SOURCES = ["INS Tempo", "Eurostat", "World Bank"] as const;

type Props = {
  value: DataFilters;
  onChange: (next: DataFilters) => void;
};

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

/**
 * Count how many observations match a single facet candidate, holding
 * all OTHER facets in `value` constant. This is the classic
 * faceted-search count, so users see "Cluj (45)" instead of "Cluj"
 * and know the result before they click.
 */
function countMatching(
  facet: keyof DataFilters,
  candidate: string | number,
  value: DataFilters
): number {
  let count = 0;
  for (const o of OBSERVATIONS) {
    const kpi = getKpi(o.kpiCode);
    if (!kpi) continue;
    // Apply other facets.
    if (
      facet !== "search" &&
      value.search.length >= 1 &&
      !kpi.nameEn.toLowerCase().includes(value.search.toLowerCase())
    ) {
      continue;
    }
    if (facet !== "locationCodes" && value.locationCodes.length > 0 && !value.locationCodes.includes(o.locationSiruta)) {
      continue;
    }
    if (facet !== "categories" && value.categories.length > 0 && !value.categories.includes(kpi.category)) {
      continue;
    }
    if (facet !== "years" && value.years.length > 0 && !value.years.includes(o.year)) {
      continue;
    }
    if (facet !== "sources" && value.sources.length > 0 && !value.sources.includes(kpi.source)) {
      continue;
    }
    // Now require the facet itself to match the candidate.
    if (facet === "locationCodes" && o.locationSiruta !== candidate) continue;
    if (facet === "categories" && kpi.category !== candidate) continue;
    if (facet === "years" && o.year !== candidate) continue;
    if (facet === "sources" && kpi.source !== candidate) continue;
    count++;
  }
  return count;
}

function FacetSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border-subtle py-4 first:border-t-0 first:pt-0">
      <h3 className="font-label-md text-label-md mb-3 uppercase tracking-wider text-on-surface-variant">
        {title}
      </h3>
      {children}
    </section>
  );
}

function CheckboxRow({
  checked,
  onToggle,
  label,
  count,
  dotClass,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count: number;
  dotClass?: string;
}) {
  return (
    <li>
      <label
        className={
          "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-surface-muted " +
          (count === 0 ? "opacity-40" : "")
        }
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={count === 0 && !checked}
          className="h-3.5 w-3.5 cursor-pointer accent-primary"
        />
        {dotClass && <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />}
        <span className="font-body-sm text-body-sm flex-1 truncate text-on-surface">{label}</span>
        <span className="font-label-md text-label-md tabular-nums text-on-surface-variant">
          {count}
        </span>
      </label>
    </li>
  );
}

export function DataFiltersSidebar({ value, onChange }: Props) {
  const searchId = useId();
  const locationsByCounty = useMemo(() => {
    const counties = Array.from(new Set(LOCATIONS.map((l) => l.countyName))).sort();
    return counties.map((c) => ({
      county: c,
      items: LOCATIONS.filter((l) => l.countyName === c).sort((a, b) => {
        const order = { county: 0, city: 1, commune: 2 } as const;
        if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
        return a.name.localeCompare(b.name);
      }),
    }));
  }, []);

  const isFiltering =
    value.search.length > 0 ||
    value.locationCodes.length > 0 ||
    value.categories.length > 0 ||
    value.years.length > 0 ||
    value.sources.length > 0;

  // Quick filter helpers
  function applyCountiesOnly() {
    onChange({
      ...value,
      locationCodes: LOCATIONS.filter((l) => l.type === "county").map((l) => l.sirutaCode),
    });
  }
  function applyLatestYear() {
    onChange({ ...value, years: [Math.max(...YEARS_AVAILABLE)] });
  }
  function applyClujCounty() {
    onChange({
      ...value,
      locationCodes: LOCATIONS.filter((l) => l.countyName === "Cluj").map((l) => l.sirutaCode),
    });
  }
  function applyLabor() {
    onChange({ ...value, categories: ["Labor Market"] });
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Search */}
      <label className="flex items-center gap-2 rounded border border-border-subtle bg-surface px-3 py-2 focus-within:border-primary">
        <Search size={14} className="text-on-surface-variant" aria-hidden="true" />
        <span className="sr-only" id={searchId}>
          Search location or indicator
        </span>
        <input
          type="search"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Search…"
          aria-labelledby={searchId}
          className="font-body-sm w-full border-none bg-transparent text-sm focus:outline-none"
        />
      </label>

      {/* Quick filters */}
      <FacetSection title="Quick filters">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={applyCountiesOnly}
            className="font-label-md text-label-md rounded-full border border-border-subtle px-3 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
          >
            Counties only
          </button>
          <button
            type="button"
            onClick={applyLatestYear}
            className="font-label-md text-label-md rounded-full border border-border-subtle px-3 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
          >
            Latest year
          </button>
          <button
            type="button"
            onClick={applyClujCounty}
            className="font-label-md text-label-md rounded-full border border-border-subtle px-3 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
          >
            Cluj county
          </button>
          <button
            type="button"
            onClick={applyLabor}
            className="font-label-md text-label-md rounded-full border border-border-subtle px-3 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
          >
            Labor Market
          </button>
        </div>
      </FacetSection>

      {/* Categories */}
      <FacetSection title="Category">
        <ul className="space-y-0.5">
          {CATEGORIES.map((c) => {
            const count = countMatching("categories", c, value);
            return (
              <CheckboxRow
                key={c}
                checked={value.categories.includes(c)}
                onToggle={() => onChange({ ...value, categories: toggle(value.categories, c) })}
                label={c}
                count={count}
                dotClass={CATEGORY_DOT[c]}
              />
            );
          })}
        </ul>
      </FacetSection>

      {/* Locations grouped by county */}
      <FacetSection title="Location">
        <div className="space-y-3">
          {locationsByCounty.map((g) => (
            <div key={g.county}>
              <p className="font-label-md text-label-md mb-1 text-on-surface-variant/80">
                {g.county}
              </p>
              <ul className="space-y-0.5">
                {g.items.map((loc) => {
                  const count = countMatching("locationCodes", loc.sirutaCode, value);
                  return (
                    <CheckboxRow
                      key={loc.sirutaCode}
                      checked={value.locationCodes.includes(loc.sirutaCode)}
                      onToggle={() =>
                        onChange({
                          ...value,
                          locationCodes: toggle(value.locationCodes, loc.sirutaCode),
                        })
                      }
                      label={`${loc.name} ${loc.type === "county" ? "(county)" : loc.type === "city" ? "(city)" : ""}`}
                      count={count}
                    />
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </FacetSection>

      {/* Years as chip row */}
      <FacetSection title="Year">
        <div className="flex flex-wrap gap-1.5">
          {YEARS_AVAILABLE.map((y) => {
            const checked = value.years.includes(y);
            const count = countMatching("years", y, value);
            const disabled = count === 0 && !checked;
            return (
              <button
                key={y}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, years: toggle(value.years, y) })}
                aria-pressed={checked}
                className={
                  checked
                    ? "font-label-md text-label-md rounded-full bg-primary px-3 py-1 text-on-primary"
                    : disabled
                      ? "font-label-md text-label-md rounded-full border border-border-subtle px-3 py-1 text-on-surface-variant/40"
                      : "font-label-md text-label-md rounded-full border border-border-subtle px-3 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
                }
              >
                {y}
              </button>
            );
          })}
        </div>
      </FacetSection>

      {/* Sources */}
      <FacetSection title="Source">
        <ul className="space-y-0.5">
          {SOURCES.map((s) => {
            const count = countMatching("sources", s, value);
            return (
              <CheckboxRow
                key={s}
                checked={value.sources.includes(s)}
                onToggle={() => onChange({ ...value, sources: toggle(value.sources, s) })}
                label={s}
                count={count}
              />
            );
          })}
        </ul>
      </FacetSection>

      {/* Reset */}
      {isFiltering && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="font-label-md text-label-md mt-2 inline-flex items-center justify-center gap-1 rounded border border-border-subtle px-3 py-2 text-on-surface-variant transition-colors hover:border-error hover:text-error"
        >
          <X size={14} aria-hidden="true" /> Reset all filters
        </button>
      )}
    </div>
  );
}
