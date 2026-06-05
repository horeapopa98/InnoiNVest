/**
 * Initials-based avatar with a deterministic tint pulled from the brand
 * palette. Replaces the Stitch CDN URL placeholder that broke in
 * production and lacked a real alt text.
 */

type Props = {
  /** Full name. First letters of the first two whitespace-separated tokens render. */
  name: string;
  /** Optional explicit override of the tint hue. */
  tone?: "primary" | "secondary" | "accent" | "deep";
  /** Pixel size. Defaults to 32 (matches the 8-unit Tailwind w-8/h-8 sizing). */
  size?: number;
};

const TONE_BG: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-secondary text-on-secondary",
  accent: "bg-error text-on-error",
  deep: "bg-primary-deep text-on-primary",
};

function pickTone(name: string): NonNullable<Props["tone"]> {
  // Deterministic per-name selection so the same person always gets the
  // same swatch across reloads.
  const tones: NonNullable<Props["tone"]>[] = [
    "primary",
    "secondary",
    "deep",
    "accent",
  ];
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return tones[sum % tones.length];
}

export function InitialsAvatar({ name, tone, size = 32 }: Props) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const resolvedTone = tone ?? pickTone(name);

  return (
    <div
      role="img"
      aria-label={`${name} avatar`}
      style={{ width: size, height: size }}
      className={`flex select-none items-center justify-center rounded-full text-xs font-bold ring-1 ring-border-subtle ${TONE_BG[resolvedTone]}`}
    >
      {initials}
    </div>
  );
}
