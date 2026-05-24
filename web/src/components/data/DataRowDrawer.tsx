"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { getKpi, formatKpiValue } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { getSeries, type Observation } from "@/lib/mock/observations";

type Props = {
  observation: Observation | null;
  onClose: () => void;
};

export function DataRowDrawer({ observation, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Focus management + Escape handler — only active while drawer is open
  useEffect(() => {
    if (!observation) return;

    // Capture the element that had focus before the drawer opened
    previousActiveElement.current = document.activeElement;

    // Move focus into the drawer
    closeButtonRef.current?.focus();

    // Escape key closes the drawer
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that was active before the drawer opened
      (previousActiveElement.current as HTMLElement | null)?.focus?.();
    };
  }, [observation, onClose]);

  if (!observation) return null;
  const kpi = getKpi(observation.kpiCode);
  const loc = getLocation(observation.locationSiruta);
  if (!kpi || !loc) return null;

  const series = getSeries(observation.locationSiruta, observation.kpiCode);
  const values = series.map((o) => o.value);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-on-surface/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-[32rem] max-w-full flex-col overflow-y-auto border-l border-border-subtle bg-surface p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
              {kpi.category} · {kpi.source}
            </p>
            <h2 id="drawer-title" className="font-headline-md text-headline-md mt-1 text-on-surface">
              {kpi.nameEn}
            </h2>
            <p className="font-body-sm text-body-sm mt-1 text-on-surface-variant">
              {loc.name}, {loc.countyName} county
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X size={20} />
          </button>
        </header>

        <section className="mb-6">
          <p className="font-display-lg text-display-lg text-on-surface">
            {formatKpiValue(observation.value, kpi)}
          </p>
          <p className="font-body-sm text-body-sm mt-2 text-on-surface-variant">
            Year {observation.year} · Fetched {observation.fetchedAt}
          </p>
          <div className="mt-4">
            <Sparkline values={values} width={460} height={64} />
          </div>
        </section>

        <section className="mb-6">
          <h3 className="font-headline-sm text-headline-sm mb-2 text-on-surface">Last 5 years</h3>
          <table className="w-full text-sm">
            <tbody>
              {series.slice(-5).map((o) => (
                <tr key={o.year} className="border-b border-border-subtle/60">
                  <td className="py-2 text-on-surface-variant">{o.year}</td>
                  <td className="py-2 text-right font-medium">{formatKpiValue(o.value, kpi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-auto flex gap-2">
          <Link
            href={`/reports?prefillKpi=${kpi.code}&prefillLocation=${loc.sirutaCode}`}
            className="font-label-md text-label-md flex-1 rounded bg-primary px-3 py-2 text-center text-on-primary hover:bg-primary-deep"
          >
            Use in report
          </Link>
        </footer>
      </aside>
    </>
  );
}
