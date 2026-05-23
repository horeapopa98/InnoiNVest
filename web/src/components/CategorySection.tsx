import { KpiRow } from "./KpiRow";
import type { KpiDto } from "@/lib/api";

export function CategorySection({ category, kpis }: { category: string; kpis: KpiDto[] }) {
  return (
    <section className="space-y-1">
      <h2 className="border-b pb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {category}
      </h2>
      {kpis.map((k) => <KpiRow key={k.kpi_code} kpi={k} />)}
    </section>
  );
}
