"use client";

import { MapPin } from "lucide-react";
import { locationsByCounty } from "@/lib/mock/locations";

type Props = {
  value: string;
  onChange: (siruta: string) => void;
};

export function LocationPicker({ value, onChange }: Props) {
  const groups = locationsByCounty();
  return (
    <label className="flex flex-1 items-center gap-2 rounded border border-border-subtle bg-surface-muted px-3 py-2 focus-within:border-primary">
      <MapPin size={16} className="text-on-surface-variant" />
      <span className="sr-only">Target location</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-body-sm w-full border-none bg-transparent text-on-surface focus:outline-none"
      >
        <option value="">Select a location…</option>
        {groups.map((g) => (
          <optgroup key={g.county} label={g.county}>
            {g.items.map((loc) => (
              <option key={loc.sirutaCode} value={loc.sirutaCode}>
                {loc.name} {loc.type !== "county" && `(${loc.type})`}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
