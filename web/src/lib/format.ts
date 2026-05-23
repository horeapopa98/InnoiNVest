export function formatValue(raw: string | null, unit: string): string {
  if (raw === null) return "—";
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  switch (unit) {
    case "EUR": return `${fmt.format(n)} €`;
    case "RON": return `${fmt.format(n)} RON`;
    case "percent": return `${fmt.format(n)} %`;
    case "persons": return fmt.format(n);
    default: return `${fmt.format(n)} ${unit}`;
  }
}

export function citation(unit: string, value: string | null, period: string,
                         sourceCode: string, datasetId: string | null): string {
  const v = formatValue(value, unit);
  const src = datasetId ? `${sourceCode.toUpperCase()} ${datasetId}` : sourceCode.toUpperCase();
  return `${v} (${src}, ${period})`;
}

export function freshnessLabel(fetchedAtIso: string | null): "fresh" | "ok" | "stale" {
  if (!fetchedAtIso) return "stale";
  const ageDays = (Date.now() - new Date(fetchedAtIso).getTime()) / 86_400_000;
  if (ageDays < 30) return "fresh";
  if (ageDays < 365) return "ok";
  return "stale";
}
