"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { KPIS, getKpi } from "@/lib/mock/kpis";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  /** Optional cap on number of selected KPIs. */
  max?: number;
};

export function KpiPicker({ selected, onChange, max = 8 }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = KPIS.filter((k) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      k.nameEn.toLowerCase().includes(q) ||
      k.nameRo.toLowerCase().includes(q) ||
      k.code.toLowerCase().includes(q)
    );
  }).filter((k) => !selected.includes(k.code));

  function add(code: string) {
    if (selected.length >= max) return;
    onChange([...selected, code]);
    setQuery("");
    setOpen(false);
  }
  function remove(code: string) {
    onChange(selected.filter((c) => c !== code));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((code) => {
          const k = getKpi(code);
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
            >
              {k?.nameEn ?? code}
              <button
                type="button"
                onClick={() => remove(code)}
                className="text-on-surface-variant hover:text-error"
                aria-label={`Remove ${k?.nameEn ?? code}`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
      </div>
      {selected.length < max && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 rounded border border-dashed border-border-subtle px-2 py-1 text-xs text-on-surface-variant hover:border-primary hover:text-primary-deep"
          >
            <Plus size={12} /> Add KPI
          </button>
          {open && (
            <div className="absolute left-0 z-30 mt-1 max-h-60 w-72 overflow-y-auto rounded border border-border-subtle bg-surface-container-lowest shadow-lg">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                autoFocus
                className="w-full border-b border-border-subtle bg-transparent px-2 py-1.5 text-xs outline-none"
              />
              <ul>
                {matches.slice(0, 20).map((k) => (
                  <li key={k.code}>
                    <button
                      type="button"
                      onClick={() => add(k.code)}
                      className="block w-full px-2 py-1.5 text-left text-xs hover:bg-surface-container"
                    >
                      <span className="font-medium">{k.nameEn}</span>
                      <span className="ml-1 text-on-surface-variant">· {k.category}</span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-2 py-2 text-xs text-on-surface-variant">No matches.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
