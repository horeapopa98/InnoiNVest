"use client";

import { useEffect, useState } from "react";

const SOURCES = [
  "Eurostat regional accounts…",
  "INS Tempo POP107D…",
  "Eurostat labour force survey…",
  "INS Tempo CON113A…",
  "Eurostat HICP series…",
  "INS Tempo wage census…",
];

type Props = { visible: boolean };

export function GenerateOverlay({ visible }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SOURCES.length), 140);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur">
      <div className="rounded-lg border border-border-subtle bg-surface px-8 py-6 shadow-lg">
        <p className="font-headline-sm text-headline-sm mb-2 text-on-surface">Compiling sources…</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{SOURCES[idx]}</p>
      </div>
    </div>
  );
}
