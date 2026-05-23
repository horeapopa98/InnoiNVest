"use client";

import { useId } from "react";
import { Search, X } from "lucide-react";
import { LOCATIONS } from "@/lib/mock/locations";
import { YEARS_AVAILABLE } from "@/lib/mock/observations";

export type DataFilters = {
  search: string;
  locationCodes: string[];
  categories: string[];
  year: number | null;
};

const CATEGORIES = [
  "Demographics",
  "Macro-Economy",
  "Labor Market",
  "Real Estate",
  "Infrastructure",
  "Education",
  "Risks",
];

type Props = {
  value: DataFilters;
  onChange: (next: DataFilters) => void;
  resultCount: number;
};

export function DataFiltersBar({ value, onChange, resultCount }: Props) {
  const searchId = useId();
  return (
    <div className="sticky top-16 z-20 flex flex-wrap items-end gap-3 border-b border-border-subtle bg-background/95 py-4 backdrop-blur">
      <label className="flex flex-1 min-w-[14rem] items-center gap-2 rounded border border-border-subtle bg-surface px-3 py-2 focus-within:border-primary">
        <Search size={14} className="text-on-surface-variant" />
        <span className="sr-only">Search</span>
        <input
          id={searchId}
          type="search"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Search location or KPI…"
          className="font-body-sm w-full border-none bg-transparent text-sm focus:outline-none"
        />
      </label>

      <select
        value={value.locationCodes[0] ?? ""}
        onChange={(e) => onChange({ ...value, locationCodes: e.target.value ? [e.target.value] : [] })}
        className="font-body-sm rounded border border-border-subtle bg-surface px-2 py-2 text-sm focus:border-primary focus:outline-none"
        aria-label="Filter by location"
      >
        <option value="">All locations</option>
        {LOCATIONS.map((l) => (
          <option key={l.sirutaCode} value={l.sirutaCode}>
            {l.name} ({l.type})
          </option>
        ))}
      </select>

      <select
        value={value.categories[0] ?? ""}
        onChange={(e) => onChange({ ...value, categories: e.target.value ? [e.target.value] : [] })}
        className="font-body-sm rounded border border-border-subtle bg-surface px-2 py-2 text-sm focus:border-primary focus:outline-none"
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={value.year ?? ""}
        onChange={(e) =>
          onChange({ ...value, year: e.target.value ? Number(e.target.value) : null })
        }
        className="font-body-sm rounded border border-border-subtle bg-surface px-2 py-2 text-sm focus:border-primary focus:outline-none"
        aria-label="Filter by year"
      >
        <option value="">All years</option>
        {YEARS_AVAILABLE.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() =>
          onChange({ search: "", locationCodes: [], categories: [], year: null })
        }
        className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-2 text-on-surface-variant hover:border-error hover:text-error"
      >
        <X size={14} /> Reset
      </button>

      <span className="font-label-md text-label-md ml-auto text-on-surface-variant">
        {resultCount.toLocaleString("en-US")} rows
      </span>
    </div>
  );
}
