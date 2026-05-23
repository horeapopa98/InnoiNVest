"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySection } from "./CategorySection";
import { FlatTable } from "./FlatTable";
import { ExportButtons } from "./ExportButtons";
import type { GroupedReport, FlatReport } from "@/lib/api";

export function ReportView({ grouped, flat }: { grouped: GroupedReport; flat: FlatReport }) {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{grouped.location.name}</h1>
          <p className="text-sm text-slate-500">
            {grouped.location.type} · SIRUTA {grouped.location.siruta_code}
          </p>
        </div>
        <ExportButtons siruta={grouped.location.siruta_code} />
      </header>

      <Tabs defaultValue="grouped">
        <TabsList>
          <TabsTrigger value="grouped">Categories</TabsTrigger>
          <TabsTrigger value="flat">Flat table</TabsTrigger>
        </TabsList>
        <TabsContent value="grouped" className="space-y-6">
          {grouped.categories.map((c) => (
            <CategorySection key={c.category} category={c.category} kpis={c.kpis} />
          ))}
        </TabsContent>
        <TabsContent value="flat">
          <FlatTable rows={flat.rows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
