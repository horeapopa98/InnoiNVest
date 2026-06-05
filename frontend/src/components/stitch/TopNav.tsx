"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { InitialsAvatar } from "./InitialsAvatar";

/**
 * Shared top navigation for the InnoiNVest Intelligence screens. The
 * brand identity follows inno.ro (teal #45afaa primary, no shadows,
 * generous white space, modest scale).
 *
 * Behaviour:
 * - Active tab is derived from usePathname() instead of hardcoded flags
 *   so deep links highlight the right item.
 * - Touch targets meet WCAG 2.5.5 (44×44 minimum on the icon buttons).
 * - Focus-visible outlines are restored where Tailwind's default would
 *   have hidden them.
 */

export type TopNavItem = {
  label: string;
  href: string;
  /** Optional matcher; defaults to startsWith(href) when href !== "/". */
  matches?: (pathname: string) => boolean;
};

type Props = {
  items?: TopNavItem[];
  showSearch?: boolean;
  hasUnreadNotifications?: boolean;
  /** Display name for the demo user avatar. Defaults to "Nord-Vest Analyst". */
  userName?: string;
};

const DEFAULT_ITEMS: TopNavItem[] = [
  { label: "Workspace", href: "/sectors" },
  { label: "Properties", href: "/properties" },
  { label: "Reports", href: "/reports" },
  { label: "Data", href: "/data" },
  { label: "Chat", href: "/chat" },
];

function isActive(pathname: string, item: TopNavItem): boolean {
  if (item.matches) return item.matches(pathname);
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const ICON_BUTTON =
  "relative flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2";

export function TopNav({
  items = DEFAULT_ITEMS,
  showSearch = true,
  hasUnreadNotifications = false,
  userName = "Nord-Vest Analyst",
}: Props) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border-subtle bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:px-margin-desktop">
      <div className="flex items-center gap-8">
        <Link
          href="/sectors"
          className="font-headline-md text-headline-md rounded font-bold text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
        >
          InnoiNVest
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {items.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "font-body-md text-body-md relative rounded-sm px-3 py-2 font-semibold text-primary-deep after:absolute after:inset-x-3 after:-bottom-[17px] after:h-[2px] after:bg-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    : "font-body-md text-body-md rounded-sm px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-muted hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {showSearch && (
          <label className="hidden items-center rounded-md border border-border-subtle bg-surface-muted px-3 py-1.5 transition-colors focus-within:border-primary focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 md:flex">
            <span className="sr-only">Search projects</span>
            <Icon
              name="search"
              size={16}
              className="mr-2 text-on-surface-variant"
            />
            <input
              type="search"
              placeholder="Search projects…"
              className="w-48 border-none bg-transparent text-sm placeholder:text-on-surface-variant/70 focus:outline-none"
            />
          </label>
        )}
        <button
          className={ICON_BUTTON}
          aria-label={
            hasUnreadNotifications
              ? "Notifications, unread"
              : "Notifications"
          }
        >
          <Icon name="notifications" size={20} />
          {hasUnreadNotifications && (
            <span
              className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-surface bg-error"
              aria-hidden="true"
            />
          )}
        </button>
        <button
          className={`${ICON_BUTTON} hidden sm:flex`}
          aria-label="Settings"
        >
          <Icon name="settings" size={20} />
        </button>
        <button className="font-label-md text-label-md ml-1 hidden rounded bg-primary px-4 py-2 text-on-primary transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 sm:inline-flex">
          New Project
        </button>
        <InitialsAvatar name={userName} />
      </div>
    </header>
  );
}
