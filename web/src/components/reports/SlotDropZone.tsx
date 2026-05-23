"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { getKpi } from "@/lib/mock/kpis";
import { type SectionSlot } from "@/lib/mock/templates";

type Props = {
  slot: SectionSlot;
  onClear: () => void;
};

export function SlotDropZone({ slot, onClear }: Props) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot:${slot.id}`,
    data: { kind: "slot", slot },
  });

  // Determine whether the active drag is valid for this slot.
  const draggedKpi = active?.data.current?.kind === "kpi" ? active.data.current.kpi : null;
  const invalid =
    draggedKpi !== null &&
    slot.acceptsCategory !== undefined &&
    draggedKpi.category !== slot.acceptsCategory;
  const validHover = isOver && !invalid;
  const invalidHover = isOver && invalid;

  const filled = slot.kpiCodes.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={
        validHover
          ? "rounded border-2 border-dashed border-primary bg-primary/5 p-3 transition-colors"
          : invalidHover
            ? "rounded border-2 border-dashed border-error bg-error/5 p-3 transition-colors"
            : filled
              ? "rounded border border-border-subtle bg-surface-container-lowest p-3"
              : "rounded border-2 border-dashed border-border-subtle p-3 text-on-surface-variant"
      }
    >
      <div className="flex items-center justify-between">
        <p className="font-label-md text-label-md uppercase tracking-wider">
          {slot.label}
          {slot.acceptsCategory && (
            <span className="ml-2 normal-case tracking-normal text-on-surface-variant/70">
              · {slot.acceptsCategory}
            </span>
          )}
        </p>
        {filled && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-on-surface-variant hover:text-error"
            aria-label="Clear this slot"
          >
            Clear
          </button>
        )}
      </div>

      {filled ? (
        <ul className="mt-2 space-y-1">
          {slot.kpiCodes.map((code) => {
            const kpi = getKpi(code);
            return (
              <li
                key={code}
                className="font-body-sm text-body-sm flex items-baseline justify-between gap-3 text-on-surface"
              >
                <span className="font-medium">{kpi?.nameEn ?? code}</span>
                <span className="text-on-surface-variant">{kpi?.unit ?? ""}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-body-sm text-body-sm mt-2 flex items-center gap-2">
          <Plus size={14} aria-hidden="true" />
          Drop a variable here
        </p>
      )}

      {invalidHover && (
        <p className="font-label-md text-label-md mt-2 text-error">
          {`This slot accepts only ${slot.acceptsCategory} variables.`}
        </p>
      )}
    </div>
  );
}
