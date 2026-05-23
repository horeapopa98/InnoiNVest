"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { TopNav } from "@/components/stitch/TopNav";
import { TemplateLibrary } from "@/components/reports/TemplateLibrary";
import { TemplateCanvas } from "@/components/reports/TemplateCanvas";
import { VariablesPicker } from "@/components/reports/VariablesPicker";
import { SystemClock } from "@/components/reports/SystemClock";
import { type Kpi } from "@/lib/mock/kpis";
import { createStandardTemplate, type ReportTemplate } from "@/lib/mock/templates";

/**
 * DndContext lives at the page root so it can see both the draggable
 * KPIs in the right sidebar AND the drop zones in the centre canvas.
 * Earlier it lived inside TemplateCanvas and the right sidebar was a
 * sibling — drag events fired but never reached any drop zone because
 * the two halves were in different DndContexts.
 */
export default function ReportsPage() {
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate>(
    createStandardTemplate()
  );
  const [draggedKpi, setDraggedKpi] = useState<Kpi | null>(null);

  // PointerSensor with a small activation distance so that *clicks* on
  // the KPI rows still register normally — without this, every click on
  // a draggable would be eaten by a zero-distance drag start.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    const kpi = event.active.data.current?.kpi as Kpi | undefined;
    if (kpi) setDraggedKpi(kpi);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedKpi(null);
    const { active, over } = event;
    if (!over) return;
    if (active.data.current?.kind !== "kpi" || over.data.current?.kind !== "slot") return;

    const kpi: Kpi = active.data.current.kpi;
    const slotId: string = over.data.current.slot.id;

    // Defence-in-depth: SlotDropZone already shows red on invalid hover,
    // but a stray drop should still be ignored here.
    const targetSlot = activeTemplate.sections
      .flatMap((s) => s.slots)
      .find((s) => s.id === slotId);
    if (!targetSlot) return;
    if (targetSlot.acceptsCategory && targetSlot.acceptsCategory !== kpi.category) return;

    setActiveTemplate((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      sections: prev.sections.map((s) => ({
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
    }));
  }

  return (
    <DndContext
      // Stable id avoids a hydration mismatch on the per-draggable
      // aria-describedby attribute — without it, dnd-kit's internal
      // counter starts at 0 on the SSR pre-render and somewhere else
      // on the client, producing "DndDescribedBy-0" vs "DndDescribedBy-1".
      id="reports-builder-dnd"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggedKpi(null)}
    >
      <div className="flex min-h-screen flex-col bg-background text-on-surface">
        <TopNav />
        <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[16rem_1fr_18rem]">
          <aside className="hidden border-r border-border-subtle bg-surface lg:block">
            <TemplateLibrary
              activeId={activeTemplate.id}
              onSelect={setActiveTemplate}
            />
          </aside>
          <main className="min-w-0 overflow-y-auto bg-background px-6 py-8">
            <TemplateCanvas
              template={activeTemplate}
              onChange={setActiveTemplate}
            />
          </main>
          <aside className="hidden border-l border-border-subtle bg-surface lg:block">
            <VariablesPicker />
          </aside>
        </div>
        <SystemClock />
      </div>

      {/* Ghost that follows the cursor while a KPI is being dragged.
          Without this, dnd-kit only dims the source element in place,
          which makes the interaction feel broken on touchpads. */}
      <DragOverlay dropAnimation={null}>
        {draggedKpi && (
          <div className="flex max-w-xs cursor-grabbing items-start gap-2 rounded border border-primary bg-surface-container-lowest p-2 shadow-lg ring-2 ring-primary/20">
            <GripVertical
              size={14}
              className="mt-0.5 shrink-0 text-on-surface-variant/60"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="font-body-sm text-body-sm truncate font-medium text-on-surface">
                {draggedKpi.nameEn}
              </p>
              <p className="font-label-md text-label-md text-on-surface-variant">
                {draggedKpi.unit} · {draggedKpi.category}
              </p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
