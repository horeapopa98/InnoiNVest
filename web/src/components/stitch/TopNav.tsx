import Link from "next/link";

/**
 * Shared top navigation bar used by the Stitch-ported "Intelligence" screens.
 * Matches the InnoiNVest Intelligence design system from
 * https://stitch.withgoogle.com/projects/17049715552381140836
 */

export type TopNavItem = {
  label: string;
  href: string;
  active?: boolean;
};

type Props = {
  /** Optional override of nav items. Defaults to the standard 3-tab set. */
  items?: TopNavItem[];
  /** Show the right-side search input. Hidden on focused sub-pages. */
  showSearch?: boolean;
  /** Show a notification dot on the bell. */
  hasUnreadNotifications?: boolean;
};

const DEFAULT_ITEMS: TopNavItem[] = [
  { label: "Intelligence Hub", href: "/sectors", active: true },
  { label: "Global Benchmarks", href: "#" },
  { label: "Team Archive", href: "#" },
];

export function TopNav({
  items = DEFAULT_ITEMS,
  showSearch = true,
  hasUnreadNotifications = false,
}: Props) {
  return (
    <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between border-b border-border-subtle bg-surface px-margin-desktop">
      <div className="flex items-center gap-8">
        <Link
          href="/sectors"
          className="font-headline-md text-headline-md font-bold text-primary"
        >
          InnoiNVest
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                item.active
                  ? "font-body-md text-body-md border-b-2 border-primary py-4 text-primary"
                  : "font-body-md text-body-md py-4 text-on-surface-variant transition-colors hover:bg-surface-muted"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="flex items-center rounded-lg border border-border-subtle bg-surface-muted px-3 py-1.5">
            <span
              className="material-symbols-outlined mr-2 text-on-surface-variant"
              style={{ fontSize: 18 }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search projects..."
              className="w-48 border-none bg-transparent text-sm focus:ring-0"
            />
          </div>
        )}
        <button className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-muted">
          <span className="material-symbols-outlined">notifications</span>
          {hasUnreadNotifications && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-surface bg-error" />
          )}
        </button>
        <button className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-muted">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <button className="font-label-md text-label-md rounded bg-primary px-4 py-2 text-on-primary transition-opacity hover:opacity-90">
          New Project
        </button>
        <div
          className="h-8 w-8 rounded-full border border-border-subtle bg-surface-container-high bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://lh3.googleusercontent.com/aida-public/AB6AXuAJfAkqlL1tlfRO6CbvKUFBKsFlYd6nvfTWK7FgEGamQorV1a98k0kyCH-UsHxQ8K2tC6bI0mxRukKhKAvlywZzznLxTKOwvf1bfXH5-R8xYx1eL2lK034oY8k4M2ECZ23BaOLJya7FA2AQkHuVynf3_5f-8NNGa6mnIkOxDeejdqW-t_uc2M0dJOYoy2ys_XhLc4tQRFIBcJkye6kiu2pZlveMXCqo8fHgN12nkEsxSbprif1bWqI-K7q52j4JUuwf3CdgYOPrfQhF)",
          }}
          aria-label="User profile"
        />
      </div>
    </header>
  );
}
