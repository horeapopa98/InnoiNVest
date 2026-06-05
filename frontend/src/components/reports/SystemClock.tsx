"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  DEFAULT_SYSTEM_YEAR,
  getSystemYear,
  selectableYears,
  setSystemYear,
} from "@/lib/system-clock";

export function SystemClock() {
  const [year, setYear] = useState(DEFAULT_SYSTEM_YEAR);

  useEffect(() => {
    setYear(getSystemYear());
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value);
    setYear(next);
    setSystemYear(next);
  }

  return (
    <footer className="sticky bottom-0 z-30 flex h-10 items-center justify-end gap-3 border-t border-border-subtle bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <span className="font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-wider text-on-surface-variant">
        <Clock size={12} aria-hidden="true" /> System year
      </span>
      <select
        value={year}
        onChange={handleChange}
        className="font-label-md text-label-md rounded border border-border-subtle bg-surface px-2 py-0.5 text-on-surface focus:border-primary focus:outline-none"
        aria-label="System year"
      >
        {selectableYears(DEFAULT_SYSTEM_YEAR).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </footer>
  );
}
