"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { TopNav } from "@/components/stitch/TopNav";
import { DataFiltersBar, type DataFilters } from "@/components/data/DataFilters";
import { DataTable } from "@/components/data/DataTable";
import { DataRowDrawer } from "@/components/data/DataRowDrawer";
import { downloadCsv } from "@/components/data/exportCsv";
import { OBSERVATIONS, type Observation } from "@/lib/mock/observations";
import { getKpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";

const INITIAL_FILTERS: DataFilters = {
  search: "",
  locationCodes: [],
  categories: [],
  year: null,
};

export default function DataPage() {
  const [filters, setFilters] = useState<DataFilters>(INITIAL_FILTERS);
  const [active, setActive] = useState<Observation | null>(null);

  const rows = useMemo(() => {
    const needle = filters.search.toLowerCase();
    return OBSERVATIONS.filter((o) => {
      const kpi = getKpi(o.kpiCode);
      const loc = getLocation(o.locationSiruta);
      if (!kpi || !loc) return false;
      if (
        needle.length > 1 &&
        !kpi.nameEn.toLowerCase().includes(needle) &&
        !loc.name.toLowerCase().includes(needle) &&
        !loc.countyName.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (filters.locationCodes.length > 0 && !filters.locationCodes.includes(o.locationSiruta)) {
        return false;
      }
      if (filters.categories.length > 0 && !filters.categories.includes(kpi.category)) {
        return false;
      }
      if (filters.year !== null && o.year !== filters.year) return false;
      return true;
    });
  }, [filters]);

  function handleExport() {
    const headers = ["location", "county", "kpi", "category", "year", "value", "unit", "source"];
    const records = rows.map((o) => {
      const kpi = getKpi(o.kpiCode)!;
      const loc = getLocation(o.locationSiruta)!;
      return [loc.name, loc.countyName, kpi.nameEn, kpi.category, o.year, o.value, kpi.unit, kpi.source];
    });
    downloadCsv(`innoinvest-data-${new Date().toISOString().slice(0, 10)}.csv`, headers, records);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-margin-desktop py-8">
        <header className="mb-2">
          <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
            ALL INDICATORS · NORD-VEST ROMANIA
          </p>
          <h1 className="font-headline-lg text-headline-lg mt-1 text-on-surface">
            Data Browser
          </h1>
          <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
            Every observation the platform has, filterable and exportable.
          </p>
        </header>

        <DataFiltersBar value={filters} onChange={setFilters} resultCount={rows.length} />

        <DataTable rows={rows} onRowClick={setActive} />

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleExport}
            className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-2 hover:border-primary"
          >
            <Download size={14} /> Export CSV ({rows.length})
          </button>
        </div>

        <DataRowDrawer observation={active} onClose={() => setActive(null)} />
      </main>
    </div>
  );
}
