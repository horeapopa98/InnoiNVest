"use client";

import { useState } from "react";
import { PARCELS, getParcel } from "@/lib/mock/parcels";
import { getLocation } from "@/lib/mock/locations";

type Props = {
  selected: string;
  onChange: (id: string) => void;
};

export function ParcelPicker({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const current = getParcel(selected);
  const matches = PARCELS.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  }).slice(0, 12);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-on-surface-variant">
        Current: <span className="font-medium text-on-surface">{current?.name ?? "—"}</span>
      </p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter parcels…"
        className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
      />
      <ul className="max-h-48 overflow-y-auto rounded border border-border-subtle">
        {matches.map((p) => {
          const loc = getLocation(p.nearestSiruta);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onChange(p.id)}
                className={
                  "block w-full px-2 py-1.5 text-left text-xs hover:bg-surface-container " +
                  (p.id === selected ? "bg-surface-container font-semibold" : "")
                }
              >
                {p.name}
                <span className="ml-1 text-on-surface-variant">
                  · {loc?.name ?? p.nearestSiruta} · {p.areaHa} ha
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
