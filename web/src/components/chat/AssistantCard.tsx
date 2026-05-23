"use client";

import { Sparkline } from "@/components/charts/Sparkline";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { getKpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { type AssistantBlock } from "@/lib/mock/chat";

export function AssistantCard({ blocks }: { blocks: AssistantBlock[] }) {
  return (
    <article className="max-w-[80%] rounded-lg border border-border-subtle bg-surface-container-lowest p-4">
      <div className="space-y-4">
        {blocks.map((b, i) => {
          if (b.kind === "text") {
            return (
              <p key={i} className="font-body-md text-body-md whitespace-pre-line text-on-surface">
                {b.text}
              </p>
            );
          }
          if (b.kind === "sparkline") {
            const kpi = getKpi(b.kpiCode);
            const loc = getLocation(b.locationSiruta);
            return (
              <div key={i}>
                <p className="font-label-md text-label-md text-on-surface-variant">
                  {kpi?.nameEn} — {loc?.name}
                </p>
                <Sparkline values={b.values} width={420} height={56} />
              </div>
            );
          }
          if (b.kind === "comparison") {
            const kpi = getKpi(b.kpiCode);
            // Use the latest year per location for a bar chart.
            const bars = b.series.map((s) => {
              const loc = getLocation(s.locationSiruta);
              const latest = s.values[s.values.length - 1];
              return { label: loc?.name ?? s.locationSiruta, value: latest?.value ?? 0 };
            });
            return (
              <div key={i}>
                <p className="font-label-md text-label-md text-on-surface-variant">
                  {kpi?.nameEn}
                </p>
                <MiniBarChart bars={bars} width={420} height={140} />
              </div>
            );
          }
          if (b.kind === "citation") {
            return (
              <ol key={i} className="font-label-md text-label-md mt-2 list-decimal space-y-1 pl-5 text-on-surface-variant">
                {b.sources.map((s) => (
                  <li key={s.id}>{s.label}</li>
                ))}
              </ol>
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _exhaustive: never = b;
          return null;
        })}
      </div>
    </article>
  );
}
