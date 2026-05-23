"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { searchLocations, type LocationSummary } from "@/lib/api";

export function LocationPicker() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LocationSummary[]>([]);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults(await searchLocations(q)); }
      catch { setResults([]); }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="w-full max-w-xl space-y-2">
      <Input
        placeholder="Type a commune, city, or county…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <ul className="divide-y rounded border bg-white shadow-sm">
        {results.map((r) => (
          <li key={r.siruta_code}>
            <button
              onClick={() => router.push(`/report/${r.siruta_code}`)}
              className="flex w-full justify-between p-3 text-left hover:bg-slate-50"
            >
              <span>
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-sm text-slate-500">({r.type})</span>
              </span>
              <span className="text-xs text-slate-400">SIRUTA {r.siruta_code}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
