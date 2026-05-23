"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  SEED_TEMPLATES,
  createStandardTemplate,
  type GeneratedReport,
  type ReportTemplate,
} from "@/lib/mock/templates";

type Props = {
  activeId: string;
  onSelect: (template: ReportTemplate) => void;
};

export function TemplateLibrary({ activeId, onSelect }: Props) {
  const [userTemplates, setUserTemplates] = useState<ReportTemplate[]>([]);
  const [recent, setRecent] = useState<GeneratedReport[]>([]);

  useEffect(() => {
    setUserTemplates(readStorage<ReportTemplate[]>(STORAGE_KEYS.templates, []));
    setRecent(readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []));
  }, []);

  function handleNew() {
    const seed = createStandardTemplate();
    const fresh: ReportTemplate = {
      ...seed,
      id: `user-${Date.now()}`,
      origin: "user",
      name: "Untitled template",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [...userTemplates, fresh];
    setUserTemplates(next);
    writeStorage(STORAGE_KEYS.templates, next);
    onSelect(fresh);
  }

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4" aria-label="Template library">
      <section>
        <h2 className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
          Mine
        </h2>
        <ul className="space-y-1">
          {userTemplates.length === 0 && (
            <li className="font-body-sm text-body-sm text-on-surface-variant/70">
              No saved templates yet.
            </li>
          )}
          {userTemplates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                aria-current={activeId === t.id ? "true" : undefined}
                className={
                  activeId === t.id
                    ? "font-body-sm text-body-sm w-full rounded bg-primary/10 px-3 py-2 text-left font-semibold text-primary-deep"
                    : "font-body-sm text-body-sm w-full rounded px-3 py-2 text-left text-on-surface transition-colors hover:bg-surface-muted"
                }
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleNew}
          className="font-label-md text-label-md mt-3 inline-flex items-center gap-1 rounded border border-border-subtle px-3 py-1.5 text-on-surface-variant transition-colors hover:border-outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          <Plus size={14} /> New template
        </button>
      </section>

      <section>
        <h2 className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
          Shared
        </h2>
        <ul className="space-y-1">
          {SEED_TEMPLATES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                aria-current={activeId === t.id ? "true" : undefined}
                className={
                  activeId === t.id
                    ? "font-body-sm text-body-sm w-full rounded bg-primary/10 px-3 py-2 text-left font-semibold text-primary-deep"
                    : "font-body-sm text-body-sm w-full rounded px-3 py-2 text-left text-on-surface transition-colors hover:bg-surface-muted"
                }
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
          Recent generated
        </h2>
        <ul className="space-y-1">
          {recent.length === 0 && (
            <li className="font-body-sm text-body-sm text-on-surface-variant/70">
              No reports generated yet.
            </li>
          )}
          {recent.slice(0, 8).map((r) => (
            <li key={r.id}>
              <a
                href={`/reports/${r.id}`}
                className="font-body-sm text-body-sm block rounded px-3 py-2 text-on-surface transition-colors hover:bg-surface-muted"
              >
                <span className="block font-medium">{r.locationName}</span>
                <span className="text-xs text-on-surface-variant">
                  {new Date(r.generatedAt).toLocaleDateString()}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </nav>
  );
}
