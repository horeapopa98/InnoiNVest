"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { KpiDto } from "@/lib/api";
import { citation, formatValue, freshnessLabel } from "@/lib/format";

export function KpiRow({ kpi }: { kpi: KpiDto }) {
  const fresh = freshnessLabel(kpi.latest.fetched_at);
  const badgeColor =
    fresh === "fresh" ? "bg-green-600" :
    fresh === "ok"    ? "bg-yellow-500" : "bg-red-500";

  const copy = async () => {
    await navigator.clipboard.writeText(
      citation(kpi.unit, kpi.latest.value, kpi.latest.period,
               kpi.latest.source_code, kpi.latest.source_dataset_id)
    );
  };

  return (
    <div className="flex items-center justify-between border-b py-2">
      <div>
        <div className="font-medium">{kpi.name_en}</div>
        <div className="text-xs text-slate-500">
          {kpi.latest.source_code.toUpperCase()}
          {kpi.latest.source_dataset_id ? ` · ${kpi.latest.source_dataset_id}` : ""}
          {" · "}{kpi.latest.period}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono tabular-nums">{formatValue(kpi.latest.value, kpi.unit)}</span>
        <Badge className={`${badgeColor} text-white`}>{fresh}</Badge>
        <Button size="icon" variant="ghost" onClick={copy} title="Copy with citation">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
