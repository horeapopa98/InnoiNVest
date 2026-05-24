type Props = { page: number; total: number };

export function PageNumber({ page, total }: Props) {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-[2%] right-[2.5%] z-10 text-[10px] tabular-nums text-[var(--color-deck-muted)]"
    >
      {page.toString().padStart(2, "0")} / {total.toString().padStart(2, "0")}
    </div>
  );
}
