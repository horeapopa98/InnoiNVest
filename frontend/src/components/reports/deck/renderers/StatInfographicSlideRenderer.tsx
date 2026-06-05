import type { StatInfographicSlide } from "@/lib/mock/decks";

type Props = { slide: StatInfographicSlide };

export function StatInfographicSlideRenderer({ slide }: Props) {
  if (slide.layout === "radial") return <RadialLayout slide={slide} />;
  return <PanelLayout slide={slide} />;
}

function RadialLayout({ slide }: Props) {
  const items = slide.stats.slice(0, 8);
  const N = items.length;
  const RX = 32;
  const RY = 30;
  const centre = { x: 50, y: 50 };
  return (
    <div className="flex h-full flex-col gap-4 px-[6%] py-[6%]">
      <h1 className="deck-underline text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
        {slide.headline}
      </h1>
      <div className="relative grid flex-1 place-items-center">
        <svg viewBox="0 0 100 100" className="h-full w-full max-h-[85%] max-w-[85%]">
          <circle cx={centre.x} cy={centre.y} r={4} fill="var(--color-deck-accent)" />
          {items.map((_, i) => {
            const a = (i / N) * Math.PI * 2 - Math.PI / 2;
            const x = centre.x + Math.cos(a) * RX;
            const y = centre.y + Math.sin(a) * RY;
            return (
              <line
                key={i}
                x1={centre.x}
                y1={centre.y}
                x2={x}
                y2={y}
                stroke="var(--color-deck-deep)"
                strokeWidth={0.2}
                strokeDasharray="0.6 0.6"
                opacity={0.4}
              />
            );
          })}
        </svg>
        {items.map((s, i) => {
          const a = (i / N) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(a) * RX;
          const y = 50 + Math.sin(a) * RY;
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <p className="whitespace-nowrap text-2xl font-bold text-[var(--color-deck-deep)]">{s.value}</p>
              <p className="mt-0.5 max-w-[120px] text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelLayout({ slide }: Props) {
  return (
    <div className="grid h-full grid-cols-[1.4fr_1fr] gap-6 px-[6%] py-[6%]">
      <div className="flex flex-col gap-4">
        <h1 className="deck-underline text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
        <div className="grid grid-cols-2 gap-4">
          {slide.stats.map((s, i) => (
            <div key={i} className="rounded bg-white p-4 ring-1 ring-[var(--color-deck-deep)]/15">
              <p className="text-3xl font-bold text-[var(--color-deck-deep)]">{s.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
      <aside
        className="flex flex-col gap-3 rounded p-5 text-white"
        style={{ background: "var(--color-deck-deep)" }}
      >
        <p className="deck-eyebrow text-[var(--color-deck-accent)]">{slide.sidePanelTitle}</p>
        <ul className="flex flex-col divide-y divide-white/10">
          {slide.sidePanelRows.map((r, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-[14px]">
              <span>{r.label}</span>
              <span className="font-bold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
