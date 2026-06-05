"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * Sidebar outline for the Report Preview screen. Scroll-spies the page
 * sections and highlights the active one.
 *
 * Active-section selection uses a "focus band" defined via rootMargin
 * (~30% from top, ~35% tall). Whichever section currently crosses the
 * band is active — this is more stable than "first visible" or "highest
 * intersection ratio", both of which flicker mid-scroll on long pages.
 */

export type OutlineItem = {
  id: string;
  label: string;
  icon: IconName;
};

type Props = {
  items: readonly OutlineItem[];
  /** Selector of the scrollable region; defaults to the document viewport. */
  rootSelector?: string;
};

export function ReportOutline({ items, rootSelector }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const root = rootSelector
      ? (document.querySelector(rootSelector) as Element | null)
      : null;

    const observer = new IntersectionObserver(
      (entries) => {
        // Multiple sections may be intersecting the focus band during a
        // fast scroll. Pick the topmost one — that's the section the
        // user is reading into.
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (intersecting[0]) setActiveId(intersecting[0].target.id);
      },
      {
        root,
        // Focus band: 30% down from top, 35% tall.
        rootMargin: "-30% 0px -65% 0px",
        threshold: 0,
      }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items, rootSelector]);

  return (
    <nav className="space-y-1" aria-label="Report sections">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "flex items-center gap-3 rounded-lg bg-primary/10 p-3 font-semibold text-primary-deep transition-colors"
                : "flex items-center gap-3 rounded-lg p-3 text-on-surface-variant transition-colors hover:bg-surface-muted hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            }
          >
            <Icon name={item.icon} size={18} />
            <span className="font-body-md text-body-md">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
