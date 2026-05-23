"use client";

import { useEffect, useState } from "react";

/**
 * Sidebar outline for the Report Preview screen. Scroll-spies the page
 * sections and highlights the active one. Pure client component — needs
 * the DOM and IntersectionObserver.
 */

export type OutlineItem = {
  id: string;
  label: string;
  icon: string;
};

type Props = {
  items: readonly OutlineItem[];
  /** Selector of the scrollable region; defaults to the document viewport. */
  rootSelector?: string;
};

export function ReportOutline({ items, rootSelector }: Props) {
  // First item starts active so the sidebar isn't blank on initial paint.
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const root = rootSelector
      ? (document.querySelector(rootSelector) as Element | null)
      : null;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the section closest to the top that's still visible.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { root, threshold: 0.4 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items, rootSelector]);

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={
              active
                ? "flex items-center gap-3 rounded-lg bg-primary-container/10 p-3 font-bold text-primary transition-all"
                : "flex items-center gap-3 rounded-lg p-3 text-on-surface-variant transition-all hover:bg-surface-muted"
            }
          >
            <span className="material-symbols-outlined text-[20px]">
              {item.icon}
            </span>
            <span className="font-body-md text-body-md">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
