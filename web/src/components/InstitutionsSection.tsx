import type { Institution } from "@/lib/api";

const TYPE_LABEL: Record<Institution["type"], string> = {
  university: "Universities",
  research_institute: "Research Institutes",
  high_school: "Top High Schools",
};

const TYPE_ORDER: Institution["type"][] = ["university", "research_institute", "high_school"];

export function InstitutionsSection({ institutions }: { institutions: Institution[] }) {
  if (institutions.length === 0) return null;

  const byType = new Map<Institution["type"], Institution[]>();
  for (const inst of institutions) {
    const arr = byType.get(inst.type) ?? [];
    arr.push(inst);
    byType.set(inst.type, arr);
  }

  return (
    <section className="space-y-2">
      <h2 className="border-b pb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Education & Research
      </h2>
      {TYPE_ORDER.filter((t) => byType.has(t)).map((t) => (
        <div key={t} className="space-y-1">
          <div className="text-xs font-medium text-slate-600">{TYPE_LABEL[t]} ({byType.get(t)!.length})</div>
          <ul className="ml-4 list-disc text-sm">
            {byType.get(t)!.map((inst) => (
              <li key={inst.name}>
                {inst.url ? (
                  <a href={inst.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {inst.name}
                  </a>
                ) : (
                  inst.name
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
