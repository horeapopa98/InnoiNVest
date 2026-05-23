type Props = {
  previous: number | undefined;
  current: number;
};

export function DiffBadge({ previous, current }: Props) {
  if (previous === undefined || previous === current) return null;
  const delta = current - previous;
  const pct = (delta / previous) * 100;
  const isUp = delta > 0;
  return (
    <span
      className={
        isUp
          ? "font-label-md text-label-md ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-primary-deep"
          : "font-label-md text-label-md ml-2 rounded bg-error/10 px-1.5 py-0.5 text-error"
      }
    >
      {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
