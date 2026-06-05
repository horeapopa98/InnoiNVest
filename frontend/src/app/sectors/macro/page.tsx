import Link from "next/link";
import { TopNav } from "@/components/stitch/TopNav";
import { Icon } from "@/components/stitch/Icon";

/**
 * Macro-Economic Indicators detail.
 *
 * Design intent (post-audit): drop the "huge number + tiny label + icon
 * tile + colored trend pill" bento that screamed AI-template. Replaced
 * with an editorial layout — small uppercase label, value inline with
 * source citation, change indicator integrated rather than badged.
 * Each metric also shows a horizontal comparison-to-benchmark bar so
 * users can read context without a click.
 */

type Trend = "up" | "down" | "flat";

type Metric = {
  label: string;
  value: string;
  unit: string;
  source: string;
  change: string;
  trend: Trend;
  /** Position on a 0–100 scale relative to the metric's healthy benchmark. */
  benchmarkPosition: number;
};

const METRICS: readonly Metric[] = [
  {
    label: "Real GDP growth",
    value: "2.4",
    unit: "%",
    source: "IMF World Economic Outlook",
    change: "+0.3pp vs prev. quarter",
    trend: "up",
    benchmarkPosition: 68,
  },
  {
    label: "Headline inflation",
    value: "3.1",
    unit: "%",
    source: "OECD harmonised CPI",
    change: "−0.5pp vs prev. quarter",
    trend: "down",
    benchmarkPosition: 42,
  },
  {
    label: "Unemployment rate",
    value: "3.8",
    unit: "%",
    source: "Eurostat LFS",
    change: "Stable vs prev. quarter",
    trend: "flat",
    benchmarkPosition: 78,
  },
  {
    label: "GDP per capita",
    value: "68,420",
    unit: "USD",
    source: "World Bank",
    change: "Updated annually",
    trend: "flat",
    benchmarkPosition: 60,
  },
];

const TREND_GLYPH: Record<Trend, { symbol: string; tone: string }> = {
  up: { symbol: "↑", tone: "text-primary-deep" },
  down: { symbol: "↓", tone: "text-error" },
  flat: { symbol: "→", tone: "text-on-surface-variant" },
};

const SUBPAGE_NAV = [
  { label: "Workspace", href: "/sectors" },
  { label: "Intelligence", href: "/sectors/macro" },
  { label: "Reports", href: "/report-preview" },
];

function MetricRow({ metric }: { metric: Metric }) {
  const trend = TREND_GLYPH[metric.trend];
  // Long values like "68,420" need wider value column at display-lg
  // sizing — otherwise the unit overlaps the change indicator.
  const isLongValue = metric.value.length > 4;
  return (
    <article className="grid grid-cols-12 items-baseline gap-4 border-b border-border-subtle py-6 last:border-b-0">
      <div className="col-span-12 md:col-span-4">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {metric.label}
        </p>
        <p className="font-body-sm text-body-sm mt-1 text-on-surface-variant/80">
          {metric.source}
        </p>
      </div>
      <div
        className={
          isLongValue
            ? "col-span-12 md:col-span-4"
            : "col-span-6 md:col-span-3"
        }
      >
        <p
          className={
            isLongValue
              ? "font-headline-lg text-headline-lg leading-none text-on-surface"
              : "font-display-lg text-display-lg leading-none text-on-surface"
          }
        >
          {metric.value}
          <span
            className={
              isLongValue
                ? "font-body-md text-body-md ml-2 text-on-surface-variant"
                : "font-headline-md text-headline-md ml-1 text-on-surface-variant"
            }
          >
            {metric.unit}
          </span>
        </p>
      </div>
      <div
        className={
          isLongValue
            ? "col-span-12 md:col-span-4"
            : "col-span-6 md:col-span-5"
        }
      >
        <p className={`font-body-sm text-body-sm flex items-center gap-2 ${trend.tone}`}>
          <span aria-hidden="true" className="text-base">
            {trend.symbol}
          </span>
          {metric.change}
        </p>
        <div
          className="mt-3 h-1 w-full rounded-full bg-surface-container"
          role="img"
          aria-label={`Benchmark position: ${metric.benchmarkPosition} of 100`}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${metric.benchmarkPosition}%` }}
          />
        </div>
      </div>
    </article>
  );
}

export default function MacroIndicatorsPage() {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface selection:bg-primary/20 selection:text-primary-deep">
      <TopNav items={SUBPAGE_NAV} showSearch={false} hasUnreadNotifications />

      <main className="mx-auto w-full max-w-container-max flex-1 px-margin-desktop py-10">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-on-surface-variant"
        >
          <Link
            href="/sectors"
            className="font-label-md text-label-md rounded transition-colors hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            Workspace
          </Link>
          <Icon name="chevron_right" size={14} />
          <span
            aria-current="page"
            className="font-label-md text-label-md font-semibold text-on-surface"
          >
            Macro-Economic Indicators
          </span>
        </nav>

        {/* Page header */}
        <header className="mb-10 flex flex-col gap-6 border-b border-border-subtle pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                Macro-Economic Indicators
              </h1>
              <span className="font-label-md text-label-md rounded-sm bg-primary/10 px-2 py-0.5 text-primary-deep">
                LOADED
              </span>
            </div>
            <p className="font-body-sm text-body-sm mt-2 flex items-center gap-2 text-on-surface-variant">
              <Icon name="schedule" size={14} />
              Last fetch · October 24, 2024 · 09:42 GMT
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/sectors"
              className="font-label-md text-label-md inline-flex items-center gap-2 rounded border border-border-subtle px-3 py-2 text-on-surface-variant transition-colors hover:border-outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <Icon name="arrow_back" size={14} />
              Back
            </Link>
            <button
              type="button"
              className="font-label-md text-label-md inline-flex items-center gap-2 rounded border border-border-subtle px-3 py-2 text-on-surface-variant transition-colors hover:border-outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <Icon name="refresh" size={14} />
              Re-fetch
            </button>
            <button
              type="button"
              className="font-label-md text-label-md inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-on-primary transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <Icon name="save" size={14} />
              Save changes
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_3fr]">
          {/* Executive Insights — narrow column, editorial framing */}
          <section aria-labelledby="insights-heading">
            <header className="mb-3 flex items-center justify-between">
              <h2
                id="insights-heading"
                className="font-headline-sm text-headline-sm text-on-surface"
              >
                Executive insights
              </h2>
              <span className="font-label-md text-label-md text-on-surface-variant">
                EDITABLE
              </span>
            </header>
            <label className="sr-only" htmlFor="executive-insights">
              Executive insights
            </label>
            <textarea
              id="executive-insights"
              defaultValue="Recent quarterly data indicates a stabilizing inflation trend across G7 nations, though labor market tightness remains a persistent concern. GDP growth trajectories are being revised upward slightly due to unexpected resilience in consumer spending and manufacturing output. Immediate focus should remain on interest rate pivot timelines and their subsequent impact on liquidity scores."
              placeholder="Enter high-level summary…"
              className="font-body-md text-body-md min-h-[16rem] w-full rounded border border-border-subtle bg-surface-container-lowest p-5 leading-relaxed text-on-surface transition-colors focus:border-primary focus:outline-2 focus:outline-primary focus:outline-offset-1"
            />
          </section>

          {/* Key Metrics — editorial rows, no icon tiles, comparison bars */}
          <section aria-labelledby="metrics-heading">
            <header className="mb-3 flex items-center justify-between">
              <h2
                id="metrics-heading"
                className="font-headline-sm text-headline-sm text-on-surface"
              >
                Key metrics
              </h2>
              <span className="font-label-md text-label-md text-on-surface-variant">
                Q3 2024
              </span>
            </header>
            <div className="border-t border-border-subtle">
              {METRICS.map((m) => (
                <MetricRow key={m.label} metric={m} />
              ))}
            </div>
            <p className="font-body-sm text-body-sm mt-3 text-on-surface-variant/80">
              Comparison bars show the metric&rsquo;s position relative to
              the healthy benchmark range (0 = bottom of range, 100 = top).
              Source data refreshed on save.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border-subtle bg-surface">
        <div className="mx-auto flex w-full max-w-container-max flex-col items-start justify-between gap-3 px-margin-desktop py-4 md:flex-row md:items-center">
          <p className="font-label-md text-label-md text-on-surface-variant">
            © {year} InnoiNVest Intelligence · ADR Nord-Vest
          </p>
          <nav className="flex items-center gap-5" aria-label="Footer">
            <a
              href="#"
              className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Export PDF
            </a>
            <Link
              href="/report-preview"
              className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Generate report
            </Link>
            <a
              href="#"
              className="font-label-md text-label-md font-semibold text-primary-deep hover:underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Share workspace
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
