"use client";

import { useMemo, useState } from "react";
import { GripVertical, Search } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { kpisByCategory, type Kpi } from "@/lib/mock/kpis";

function DraggableKpi({ kpi }: { kpi: Kpi }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `kpi:${kpi.code}`,
    data: { kind: "kpi", kpi },
  });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={
        isDragging
          ? "flex cursor-grabbing items-start gap-2 rounded border border-primary bg-primary/5 p-2 opacity-60"
          : "flex cursor-grab items-start gap-2 rounded border border-transparent p-2 transition-colors hover:border-border-subtle hover:bg-surface-muted"
      }
    >
      <GripVertical size={14} className="mt-0.5 shrink-0 text-on-surface-variant/60" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-body-sm text-body-sm truncate font-medium text-on-surface">{kpi.nameEn}</p>
        <p className="font-label-md text-label-md text-on-surface-variant">{kpi.unit}</p>
      </div>
    </li>
  );
}

export function VariablesPicker() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const all = kpisByCategory();
    if (q.length < 2) return all;
    const needle = q.toLowerCase();
    return all
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (k) =>
            k.nameEn.toLowerCase().includes(needle) ||
            k.nameRo.toLowerCase().includes(needle) ||
            k.code.toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <label className="flex items-center gap-2 rounded border border-border-subtle bg-surface-muted px-3 py-1.5 focus-within:border-primary">
        <Search size={14} className="text-on-surface-variant" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search variables…"
          className="font-body-sm w-full border-none bg-transparent text-sm focus:outline-none"
        />
      </label>

      <div className="mt-4 space-y-5">
        {groups.map((g) => (
          <section key={g.category} aria-labelledby={`grp-${g.category}`}>
            <h3
              id={`grp-${g.category}`}
              className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant"
            >
              {g.category}
            </h3>
            <ul className="space-y-1">
              {g.items.map((k) => (
                <DraggableKpi key={k.code} kpi={k} />
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant/70">
            No variables match &ldquo;{q}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
