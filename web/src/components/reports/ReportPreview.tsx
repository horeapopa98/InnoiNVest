"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { DiffBadge } from "./DiffBadge";
import { getKpi, formatKpiValue } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { getSeries, getObservation } from "@/lib/mock/observations";
import { getSystemYear } from "@/lib/system-clock";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  type GeneratedReport,
  type ReportTemplate,
} from "@/lib/mock/templates";

type Props = {
  report: GeneratedReport;
  template: ReportTemplate;
  onBack: () => void;
};

export function ReportPreview({ report, template, onBack }: Props) {
  const router = useRouter();
  const loc = getLocation(report.locationSiruta);
  const [parent, setParent] = useState<GeneratedReport | null>(null);

  useEffect(() => {
    if (!report.parentReportId) {
      setParent(null);
      return;
    }
    const all = readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []);
    setParent(all.find((r) => r.id === report.parentReportId) ?? null);
  }, [report.parentReportId]);

  function handleRegenerate() {
    const systemYear = getSystemYear();
    const snapshot: Record<string, number> = {};
    for (const section of template.sections) {
      for (const slot of section.slots) {
        for (const code of slot.kpiCodes) {
          const obs = getObservation(report.locationSiruta, code, systemYear);
          if (obs) snapshot[code] = obs.value;
        }
      }
    }
    const newReport: GeneratedReport = {
      id: `report-${Date.now()}`,
      templateId: report.templateId,
      templateName: report.templateName,
      locationSiruta: report.locationSiruta,
      locationName: report.locationName,
      generatedAt: Date.now(),
      systemYear,
      snapshot,
      parentReportId: report.id,
    };
    const all = readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []);
    writeStorage(STORAGE_KEYS.reports, [newReport, ...all].slice(0, 50));
    router.push(`/reports/${newReport.id}`);
  }

  return (
    <div className="mx-auto max-w-[880px]">
      <header className="mb-6 flex items-center justify-between border-b border-border-subtle pb-4">
        <button
          type="button"
          onClick={onBack}
          className="font-label-md text-label-md inline-flex items-center gap-1 text-on-surface-variant hover:text-primary-deep"
        >
          <ArrowLeft size={14} /> Back to builder
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-1.5 hover:border-primary"
          >
            <RotateCcw size={14} /> Regenerate
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="font-label-md text-label-md inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-on-primary hover:bg-primary-deep"
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </header>

      <article className="a4-page mx-auto border border-border-subtle bg-white p-12 shadow-xl">
        <header className="mb-12">
          <p className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
            {report.templateName}
          </p>
          <h1 className="font-display-lg text-display-lg mt-2 text-on-surface">
            {report.locationName}
          </h1>
          <p className="font-body-md text-body-md mt-3 text-on-surface-variant">
            {loc?.countyName} county ·{" "}
            {new Date(report.generatedAt).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {parent && (
              <>
                {" · "}
                <span className="text-primary-deep">
                  Regenerated from {new Date(parent.generatedAt).toLocaleDateString("en-GB")}
                </span>
              </>
            )}
          </p>
        </header>

        {template.sections
          .filter((s) => s.kind !== "cover")
          .map((section) => (
            <section key={section.id} className="mb-10">
              <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.slots.map((slot) => {
                  if (slot.kpiCodes.length === 0) {
                    return (
                      <p
                        key={slot.id}
                        className="font-body-sm text-body-sm italic text-on-surface-variant/70"
                      >
                        {slot.label} — not configured.
                      </p>
                    );
                  }
                  return slot.kpiCodes.map((code) => {
                    const kpi = getKpi(code);
                    if (!kpi) return null;
                    const value = report.snapshot[code];
                    const previousValue = parent?.snapshot[code];
                    const series = getSeries(report.locationSiruta, code).map((o) => o.value);

                    if (slot.kind === "chart") {
                      return (
                        <div key={`${slot.id}-${code}`}>
                          <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                            {kpi.nameEn}
                          </p>
                          <div className="mt-1 flex items-baseline gap-3">
                            <span className="font-headline-md text-headline-md text-on-surface">
                              {formatKpiValue(value, kpi)}
                            </span>
                            <DiffBadge previous={previousValue} current={value} />
                          </div>
                          <div className="mt-2">
                            <Sparkline values={series} width={520} height={64} />
                          </div>
                        </div>
                      );
                    }
                    if (slot.kind === "headline") {
                      return (
                        <div key={`${slot.id}-${code}`}>
                          <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                            {kpi.nameEn}
                          </p>
                          <p className="font-display-lg text-display-lg mt-1 text-on-surface">
                            {formatKpiValue(value, kpi)}
                            <DiffBadge previous={previousValue} current={value} />
                          </p>
                        </div>
                      );
                    }
                    if (slot.kind === "table") {
                      return (
                        <div
                          key={`${slot.id}-${code}`}
                          className="font-body-sm text-body-sm flex items-baseline justify-between border-b border-border-subtle py-2"
                        >
                          <span>{kpi.nameEn}</span>
                          <span className="font-medium">
                            {formatKpiValue(value, kpi)}
                            <DiffBadge previous={previousValue} current={value} />
                          </span>
                        </div>
                      );
                    }
                    if (slot.kind === "prose") {
                      const change =
                        previousValue !== undefined
                          ? ((value - previousValue) / previousValue) * 100
                          : null;
                      const trendWord =
                        change === null
                          ? "stands at"
                          : change > 0
                            ? "increased to"
                            : change < 0
                              ? "declined to"
                              : "remained at";
                      return (
                        <p
                          key={`${slot.id}-${code}`}
                          className="font-body-md text-body-md leading-relaxed text-on-surface"
                        >
                          {kpi.nameEn} {trendWord} {formatKpiValue(value, kpi)}{" "}
                          {change !== null && `(${change > 0 ? "+" : ""}${change.toFixed(1)}% vs prior report)`}
                          .
                        </p>
                      );
                    }
                    return null;
                  });
                })}
              </div>
            </section>
          ))}
      </article>
    </div>
  );
}
