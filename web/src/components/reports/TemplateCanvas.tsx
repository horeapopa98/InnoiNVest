"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { SectionBlock } from "./SectionBlock";
import { LocationPicker } from "./LocationPicker";
import { GenerateOverlay } from "./GenerateOverlay";
import { ReportPreview } from "./ReportPreview";
import { type Kpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { writeStorage, readStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { getSystemYear } from "@/lib/system-clock";
import { getObservation } from "@/lib/mock/observations";
import {
  type GeneratedReport,
  type ReportTemplate,
} from "@/lib/mock/templates";

type Props = {
  template: ReportTemplate;
  onChange: (next: ReportTemplate) => void;
};

export function TemplateCanvas({ template, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [locationSiruta, setLocationSiruta] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.data.current?.kind !== "kpi" || over.data.current?.kind !== "slot") return;

    const kpi: Kpi = active.data.current.kpi;
    const slotId: string = over.data.current.slot.id;

    // Validate category fit (defence in depth — SlotDropZone already shows red)
    const targetSlot = template.sections
      .flatMap((s) => s.slots)
      .find((s) => s.id === slotId);
    if (!targetSlot) return;
    if (targetSlot.acceptsCategory && targetSlot.acceptsCategory !== kpi.category) return;

    const next: ReportTemplate = {
      ...template,
      updatedAt: Date.now(),
      sections: template.sections.map((s) => ({
        ...s,
        slots: s.slots.map((slot) =>
          slot.id === slotId
            ? {
                ...slot,
                kpiCodes:
                  slot.kind === "table"
                    ? Array.from(new Set([...slot.kpiCodes, kpi.code])).slice(0, 4)
                    : [kpi.code],
              }
            : slot
        ),
      })),
    };
    onChange(next);
  }

  function handleClearSlot(slotId: string) {
    const next: ReportTemplate = {
      ...template,
      updatedAt: Date.now(),
      sections: template.sections.map((s) => ({
        ...s,
        slots: s.slots.map((slot) =>
          slot.id === slotId ? { ...slot, kpiCodes: [] } : slot
        ),
      })),
    };
    onChange(next);
  }

  function handleSaveTemplate() {
    if (template.origin !== "user") return;
    const all = readStorage<ReportTemplate[]>(STORAGE_KEYS.templates, []);
    const updated = all.some((t) => t.id === template.id)
      ? all.map((t) => (t.id === template.id ? template : t))
      : [...all, template];
    writeStorage(STORAGE_KEYS.templates, updated);
  }

  function handleGenerate() {
    if (!locationSiruta) {
      alert("Pick a location first.");
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      const loc = getLocation(locationSiruta)!;
      const systemYear = getSystemYear();
      const snapshot: Record<string, number> = {};
      for (const section of template.sections) {
        for (const slot of section.slots) {
          for (const code of slot.kpiCodes) {
            const obs = getObservation(loc.sirutaCode, code, systemYear);
            if (obs) snapshot[code] = obs.value;
          }
        }
      }
      const report: GeneratedReport = {
        id: `report-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        locationSiruta: loc.sirutaCode,
        locationName: loc.name,
        generatedAt: Date.now(),
        systemYear,
        snapshot,
      };
      const all = readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []);
      writeStorage(STORAGE_KEYS.reports, [report, ...all].slice(0, 50));
      setGeneratedReport(report);
      setGenerating(false);
    }, 800);
  }

  if (generatedReport) {
    return (
      <ReportPreview
        report={generatedReport}
        template={template}
        onBack={() => setGeneratedReport(null)}
      />
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="mx-auto max-w-[880px] space-y-6">
        <header className="flex items-baseline justify-between">
          <div>
            <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
              {template.origin === "user" ? "MY TEMPLATE" : "SHARED TEMPLATE"}
            </p>
            <h1 className="font-headline-lg text-headline-lg mt-1 text-on-surface">
              {template.name}
            </h1>
          </div>
          {template.origin === "user" && (
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="font-label-md text-label-md rounded border border-border-subtle px-3 py-1.5 transition-colors hover:border-primary"
            >
              Save template
            </button>
          )}
        </header>

        {template.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            onClearSlot={handleClearSlot}
          />
        ))}

        <footer className="sticky bottom-12 z-10 flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface p-3 shadow-sm">
          <LocationPicker value={locationSiruta} onChange={setLocationSiruta} />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="font-label-md text-label-md rounded bg-primary px-5 py-2 text-on-primary transition-colors hover:bg-primary-deep disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            {generating ? "Compiling…" : "Generate"}
          </button>
        </footer>
      </div>
      <GenerateOverlay visible={generating} />
    </DndContext>
  );
}
