import Link from "next/link";
import { TopNav } from "@/components/stitch/TopNav";

/**
 * Screen 2: Macro-Economic Indicators
 *
 * Static port of the sector-detail Stitch screen
 * (projects/17049715552381140836). This is the "drill-in" view shown
 * after a user clicks "View Full Summary" on a loaded sector card.
 *
 * Per the Stitch design's Shell Visibility Rule, the side nav is
 * suppressed on focused task pages — only the top nav remains.
 */

type Trend = "up" | "down" | "flat" | "neutral";

type Metric = {
  icon: string;
  iconTone: "primary" | "secondary" | "tertiary";
  label: string;
  source: string;
  value: string;
  change: string;
  trend: Trend;
};

const METRICS: readonly Metric[] = [
  {
    icon: "trending_up",
    iconTone: "primary",
    label: "GDP Growth Rate (%)",
    source: "IMF World Bank",
    value: "2.4",
    change: "+0.3% vs Prev. Qtr",
    trend: "up",
  },
  {
    icon: "price_change",
    iconTone: "secondary",
    label: "Inflation Rate (%)",
    source: "OECD Data",
    value: "3.1",
    change: "-0.5% vs Prev. Qtr",
    trend: "down",
  },
  {
    icon: "group",
    iconTone: "tertiary",
    label: "Unemployment Rate (%)",
    source: "BLS / Eurostat",
    value: "3.8",
    change: "Stable vs Prev. Qtr",
    trend: "flat",
  },
  {
    icon: "payments",
    iconTone: "primary",
    label: "GDP Per Capita (USD)",
    source: "World Bank",
    value: "68,420",
    change: "Updated Yearly",
    trend: "neutral",
  },
];

const ICON_TONE_CLASSES: Record<Metric["iconTone"], string> = {
  primary: "bg-primary-container/10 text-primary",
  secondary: "bg-secondary-container/10 text-secondary",
  tertiary: "bg-tertiary-container/10 text-tertiary",
};

const TREND_INFO: Record<
  Trend,
  { color: string; icon: string }
> = {
  up: { color: "text-primary", icon: "arrow_upward" },
  down: { color: "text-error", icon: "arrow_downward" },
  flat: { color: "text-on-surface-variant", icon: "horizontal_rule" },
  neutral: { color: "text-primary", icon: "add" },
};

function MetricCard({ metric }: { metric: Metric }) {
  const trend = TREND_INFO[metric.trend];

  return (
    <div className="group relative cursor-pointer rounded-xl border border-border-subtle bg-surface-container-lowest p-6 transition-shadow hover:border-primary/50 hover:shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${ICON_TONE_CLASSES[metric.iconTone]}`}
        >
          <span className="material-symbols-outlined">{metric.icon}</span>
        </div>
        <span className="font-label-md text-label-md rounded bg-surface-muted px-2 py-1 text-on-surface-variant">
          {metric.source}
        </span>
      </div>
      <label className="font-label-md text-label-md mb-1 block uppercase tracking-wider text-outline">
        {metric.label}
      </label>
      <div className="font-display-lg text-display-lg mb-2 text-on-surface">
        {metric.value}
      </div>
      <div
        className={`font-label-md text-label-md flex items-center gap-2 ${trend.color}`}
      >
        <span className="material-symbols-outlined text-[14px]">
          {trend.icon}
        </span>
        {metric.change}
      </div>
    </div>
  );
}

const SUBPAGE_NAV = [
  { label: "Dashboard", href: "/sectors" },
  { label: "Intelligence", href: "/sectors/macro", active: true },
  { label: "Reports", href: "/report-preview" },
];

export default function MacroIndicatorsPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <TopNav items={SUBPAGE_NAV} showSearch={false} hasUnreadNotifications />

      <main className="mx-auto min-h-screen max-w-container-max px-margin-desktop pb-32 pt-24">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-on-surface-variant">
          <Link
            href="/sectors"
            className="font-label-md text-label-md transition-colors hover:text-primary"
          >
            Workspace
          </Link>
          <span className="material-symbols-outlined text-sm">
            chevron_right
          </span>
          <span className="font-label-md text-label-md font-bold text-primary">
            Macro-Economic Indicators
          </span>
        </nav>

        {/* Page header */}
        <header className="mb-section-gap flex flex-col justify-between gap-4 border-b border-border-subtle pb-8 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                Macro-Economic Indicators
              </h1>
              <span className="font-label-md text-label-md rounded border border-primary/20 bg-primary-container/10 px-2 py-0.5 tracking-widest text-primary">
                LOADED
              </span>
            </div>
            <p className="font-body-sm text-body-sm flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">
                schedule
              </span>
              Last fetch: October 24, 2024 • 09:42 AM GMT
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sectors"
              className="font-label-md text-label-md flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-on-surface-variant transition-all hover:bg-surface-muted active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Back to Workspace
            </Link>
            <button className="font-label-md text-label-md flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-primary transition-all hover:bg-surface-muted active:scale-95">
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              Re-fetch Data
            </button>
            <button className="font-label-md text-label-md flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-on-primary shadow-sm ring-2 ring-primary/30 transition-all hover:opacity-90 active:translate-y-0.5 active:scale-95 active:bg-primary/80">
              <span className="material-symbols-outlined text-[18px]">
                save
              </span>
              Save Changes
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-gutter">
          {/* Executive Insights */}
          <section className="group col-span-12 rounded-xl border border-outline-variant/30 bg-surface-container-low p-gutter transition-colors hover:border-primary/50">
            <div className="mb-4 flex items-center justify-between">
              <span className="material-symbols-outlined text-sm text-outline opacity-60">
                edit
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Executive Insights
              </h3>
              <span className="material-symbols-outlined text-outline">
                edit_note
              </span>
            </div>
            <textarea
              defaultValue="Recent quarterly data indicates a stabilizing inflation trend across G7 nations, though labor market tightness remains a persistent concern. GDP growth trajectories are being revised upward slightly due to unexpected resilience in consumer spending and manufacturing output. Immediate focus should remain on interest rate pivot timelines and their subsequent impact on liquidity scores."
              placeholder="Enter high-level summary here..."
              className="custom-scrollbar font-body-md text-body-md h-32 w-full resize-none rounded-lg border-none bg-transparent leading-relaxed text-on-surface-variant focus:ring-2 focus:ring-primary/20 group-hover:cursor-text"
            />
          </section>

          {/* Key Metrics Bento */}
          <section className="col-span-12 grid grid-cols-1 gap-gutter md:grid-cols-2">
            {METRICS.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 right-0 z-40 flex w-full flex-col items-center justify-between border-t border-border-subtle bg-surface/80 px-margin-desktop py-4 shadow-sm backdrop-blur-md md:flex-row">
        <div className="mb-4 flex items-center gap-6 md:mb-0">
          <span className="font-headline-sm text-headline-sm font-bold text-primary">
            InnoiNVest
          </span>
          <p className="font-label-md text-label-md text-on-surface-variant">
            © 2024 InnoiNVest Intelligence. Institutional Grade Analysis.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/report-preview"
            className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary"
          >
            Generate Final Report
          </Link>
          <a
            href="#"
            className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary"
          >
            Export PDF
          </a>
          <a
            href="#"
            className="font-label-md text-label-md font-bold text-primary transition-colors hover:text-primary"
          >
            Share Workspace
          </a>
        </div>
      </footer>
    </div>
  );
}
