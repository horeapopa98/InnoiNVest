import Link from "next/link";
import { ReportOutline, type OutlineItem } from "@/components/stitch/ReportOutline";
import { PrintButton } from "@/components/stitch/PrintButton";
import { Icon, type IconName } from "@/components/stitch/Icon";

/**
 * Screen 3: Report Generation Preview
 *
 * Static port of the final-deliverable Stitch screen
 * (projects/17049715552381140836). A4-aspect document pages on the
 * right, with a left sidebar that scroll-spies the active section.
 *
 * This screen has its own minimal top nav (back button, brand, section
 * jumps, Share + Download PDF) rather than the standard hub TopNav,
 * matching the source design.
 */

const OUTLINE: readonly OutlineItem[] = [
  { id: "cover", label: "Cover Page", icon: "menu_book" },
  { id: "summary", label: "Executive Summary", icon: "summarize" },
  { id: "macro", label: "Macro-Economic", icon: "monitoring" },
  { id: "labor", label: "Labor Market", icon: "groups" },
  { id: "risks", label: "Risk Assessment", icon: "warning" },
];

type LaborRow = {
  metric: string;
  value: string;
  confidence: "High" | "Medium" | "Low";
  trend: "up" | "down" | "flat";
};

const LABOR_ROWS: readonly LaborRow[] = [
  {
    metric: "Unemployment Rate",
    value: "3.8%",
    confidence: "High",
    trend: "flat",
  },
  {
    metric: "Wage Growth (Nominal)",
    value: "4.2%",
    confidence: "Medium",
    trend: "up",
  },
  {
    metric: "Participation Rate",
    value: "62.8%",
    confidence: "High",
    trend: "up",
  },
  {
    metric: "Job Openings (JOLTS)",
    value: "8.7M",
    confidence: "Low",
    trend: "down",
  },
];

const CONFIDENCE_DOT: Record<LaborRow["confidence"], string> = {
  High: "bg-primary",
  Medium: "bg-primary",
  Low: "bg-error",
};

const TREND_ICON: Record<
  LaborRow["trend"],
  { icon: IconName; className: string }
> = {
  up: { icon: "trending_up", className: "text-primary" },
  down: { icon: "trending_down", className: "text-error" },
  flat: { icon: "trending_flat", className: "text-on-surface-variant" },
};

export default function ReportPreviewPage() {
  const year = new Date().getFullYear();
  return (
    <div className="scroll-smooth bg-surface font-body-md text-on-surface">
      {/* Top nav — minimal, report-specific */}
      <header className="sticky top-0 z-50 h-16 w-full border-b border-border-subtle bg-surface no-print">
        <div className="mx-auto flex h-full w-full max-w-container-max items-center justify-between px-margin-desktop">
          <div className="flex items-center gap-4">
            <Link
              href="/sectors"
              className="flex items-center text-on-surface-variant transition-colors hover:text-primary"
              aria-label="Back to workspace"
            >
              <Icon name="arrow_back" size={20} />
            </Link>
            <div className="font-headline-md text-headline-md font-bold text-primary">
              InnoInvest
            </div>
          </div>
          <nav className="hidden gap-base md:flex">
            <a
              href="#macro"
              className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
            >
              Macro
            </a>
            <a
              href="#labor"
              className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
            >
              Labor
            </a>
            <a
              href="#risks"
              className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
            >
              Markets
            </a>
            <a
              href="#risks"
              className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
            >
              Risks
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="font-label-md hidden items-center gap-2 rounded border border-primary px-4 py-2 text-primary-deep transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 sm:flex"
            >
              <Icon name="share" size={16} />
              Share report
            </button>
            <PrintButton className="font-label-md flex items-center gap-2 rounded bg-primary px-4 py-2 text-on-primary transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
              <Icon name="download" size={16} />
              Download PDF
            </PrintButton>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Left sidebar: report outline */}
        <aside
          id="report-preview-aside"
          className="no-print hidden w-72 flex-col overflow-y-auto border-r border-border-subtle bg-surface lg:flex"
        >
          <div className="p-6">
            <h3 className="font-headline-sm text-headline-sm mb-6 text-on-surface">
              Report Outline
            </h3>
            <ReportOutline
              items={OUTLINE}
              rootSelector="#report-preview-scroll"
            />
          </div>
          <div className="mt-auto border-t border-border-subtle bg-surface-muted p-6">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary-container" />
              <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                Live Preview
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Last auto-save: 2 minutes ago
            </p>
          </div>
        </aside>

        {/* Right: document pages */}
        <section
          id="report-preview-scroll"
          className="flex flex-1 flex-col items-center overflow-y-auto bg-surface-dim p-4 md:p-8"
        >
          {/* Page 1 — Cover */}
          <div
            id="cover"
            className="a4-page relative mb-12 flex flex-col justify-between overflow-hidden border border-border-subtle bg-white p-16 shadow-xl"
          >
            <div className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-primary-container/5" />
            <div className="relative z-10">
              <div className="mb-16 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container font-bold text-white">
                  I
                </div>
                <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
                  InnoInvest Intelligence
                </span>
              </div>
              <h1 className="font-display-lg text-display-lg mb-4 max-w-lg text-on-surface">
                Investment Intelligence Report
              </h1>
              <p className="font-body-lg text-body-lg mb-8 text-secondary">
                Quarterly Market Outlook &amp; Institutional Analysis
              </p>
              <div className="h-1 w-24 bg-primary-container" />
            </div>
            <div className="relative z-10 flex items-end justify-between">
              <div>
                <p className="font-label-md text-label-md mb-1 uppercase tracking-widest text-on-surface-variant">
                  Prepared For
                </p>
                <p className="font-headline-sm text-headline-sm text-on-surface">
                  Institutional Strategy Board
                </p>
              </div>
              <div className="text-right">
                <p className="font-label-md text-label-md mb-1 uppercase tracking-widest text-on-surface-variant">
                  Date Issued
                </p>
                <p className="font-body-md text-body-md text-on-surface">
                  November 14, 2024
                </p>
              </div>
            </div>
          </div>

          {/* Page 2 — Executive Summary */}
          <div
            id="summary"
            className="a4-page relative mb-12 border border-border-subtle bg-white p-16 shadow-xl"
          >
            <div className="font-label-md absolute right-16 top-8 text-on-surface-variant">
              Page 02
            </div>
            <header className="mb-12 border-b border-border-subtle pb-6">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Executive Summary
              </h2>
            </header>
            <div className="space-y-6 text-justify">
              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                The current macroeconomic landscape is characterized by a
                cautious transition toward normalization. While inflationary
                pressures have moderated across major economies, the &ldquo;last
                mile&rdquo; of central bank targets remains sensitive to
                geopolitical volatility and supply chain realignments.
                InnoInvest&rsquo;s proprietary analysis indicates a robust
                baseline for equity markets, though fixed-income sectors
                require granular selection to navigate shifting yield curves.
              </p>
              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                Our research suggests that institutional investors should
                prioritize liquidity and downside protection in the short term.
                The divergence between developed market performance and
                emerging market potential creates a specialized alpha
                opportunity for those capable of parsing non-traditional data
                streams. This report outlines the core pillars of our Q4
                strategy, focusing on Labor Market resilience and
                Macro-Economic stability.
              </p>
              <div className="my-12 border-l-4 border-primary-container bg-surface-muted p-8">
                <h4 className="font-headline-sm text-headline-sm mb-4 text-primary">
                  Key Takeaways
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Icon name="check_circle" size={16} className="mt-1 shrink-0 text-primary" />
                    <span className="font-body-md text-body-md">
                      GDP growth forecasts remain steady at 2.4% annually.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="check_circle" size={16} className="mt-1 shrink-0 text-primary" />
                    <span className="font-body-md text-body-md">
                      Labor participation rates show unexpected resilience in
                      tech sectors.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Icon name="check_circle" size={16} className="mt-1 shrink-0 text-primary" />
                    <span className="font-body-md text-body-md">
                      Strategic reallocation toward defensive energy assets is
                      recommended.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Page 3 — Sector Analysis */}
          <div
            id="macro"
            className="a4-page relative mb-12 border border-border-subtle bg-white p-16 shadow-xl"
          >
            <div className="font-label-md absolute right-16 top-8 text-on-surface-variant">
              Page 03
            </div>
            <header className="mb-12 border-b border-border-subtle pb-6">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Sector Analysis: Macro-Economic
              </h2>
            </header>

            <div className="mb-12 grid grid-cols-2 gap-gutter">
              <div className="rounded-lg border border-border-subtle p-6">
                <p className="font-label-md text-label-md mb-2 uppercase text-on-surface-variant">
                  Real GDP Growth
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg text-on-surface">
                    2.4%
                  </span>
                  <span className="text-sm font-bold text-primary">
                    +0.2% YoY
                  </span>
                </div>
                <div className="mt-4 h-1 w-full rounded bg-surface-muted">
                  <div
                    className="h-full rounded bg-primary-container"
                    style={{ width: "65%" }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border-subtle p-6">
                <p className="font-label-md text-label-md mb-2 uppercase text-on-surface-variant">
                  Headline Inflation
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg text-on-surface">
                    3.1%
                  </span>
                  <span className="text-sm font-bold text-error">
                    -0.5% MoM
                  </span>
                </div>
                <div className="mt-4 h-1 w-full rounded bg-surface-muted">
                  <div
                    className="h-full rounded bg-error"
                    style={{ width: "45%" }}
                  />
                </div>
              </div>
            </div>

            <h3
              id="labor"
              className="font-headline-md text-headline-md mb-6 text-on-surface"
            >
              Labor Market Dynamics
            </h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="font-label-md text-label-md p-4 text-left uppercase tracking-wider text-on-surface-variant">
                    Metric
                  </th>
                  <th className="font-label-md text-label-md p-4 text-left uppercase tracking-wider text-on-surface-variant">
                    Value
                  </th>
                  <th className="font-label-md text-label-md p-4 text-left uppercase tracking-wider text-on-surface-variant">
                    Confidence
                  </th>
                  <th className="font-label-md text-label-md p-4 text-right uppercase tracking-wider text-on-surface-variant">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle">
                {LABOR_ROWS.map((row) => {
                  const trend = TREND_ICON[row.trend];
                  return (
                    <tr key={row.metric}>
                      <td className="p-4">{row.metric}</td>
                      <td className="p-4">{row.value}</td>
                      <td className="p-4">
                        <span className="flex items-center gap-1">
                          <span
                            className={`h-2 w-2 rounded-full ${CONFIDENCE_DOT[row.confidence]}`}
                          />
                          {row.confidence}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Icon name={trend.icon} size={16} className={`inline ${trend.className}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-12 rounded-lg bg-secondary-container/20 p-6">
              <p className="font-body-md text-body-md italic text-on-secondary-container">
                &ldquo;The tightening of financial conditions has yet to
                manifest in widespread labor slack, suggesting a structurally
                higher equilibrium for hiring costs in the coming 12-18
                months.&rdquo;
              </p>
            </div>
          </div>

          {/* Page 4 — Risk Assessment */}
          <div
            id="risks"
            className="a4-page relative mb-12 border border-border-subtle bg-white p-16 shadow-xl"
          >
            <div className="font-label-md absolute right-16 top-8 text-on-surface-variant">
              Page 04
            </div>
            <header className="mb-12 border-b border-border-subtle pb-6">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Global Risk Assessment
              </h2>
            </header>
            <div className="space-y-8">
              <div className="flex gap-8">
                <div className="aspect-square w-1/3 overflow-hidden border border-border-subtle bg-surface-muted">
                  {/* Placeholder for the global-visualization image; intentionally
                      left as a styled tile so the static page has no broken
                      external dependency. Swap in a real asset later. */}
                  <div
                    className="h-full w-full"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(6, 165, 155, 0.18) 0%, rgba(48, 48, 48, 0) 60%), radial-gradient(circle at 70% 70%, rgba(63, 81, 181, 0.14) 0%, rgba(48, 48, 48, 0) 60%), #313030",
                    }}
                  />
                </div>
                <div className="w-2/3">
                  <h4 className="font-headline-sm text-headline-sm mb-2 text-on-surface">
                    Geopolitical Fragility
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Heightened tensions in trade corridors present a 35%
                    probability of localized supply chain disruptions.
                    InnoInvest monitors 14 discrete risk indicators across the
                    EMEA and APAC regions to provide real-time alerting for
                    portfolio rebalancing.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="border-t-2 border-error p-4">
                  <span className="font-label-md uppercase text-error">
                    High Priority
                  </span>
                  <p className="font-headline-sm text-headline-sm mt-1">
                    Sovereign Debt
                  </p>
                </div>
                <div className="border-t-2 border-tertiary p-4">
                  <span className="font-label-md uppercase text-on-surface-variant">
                    Medium Priority
                  </span>
                  <p className="font-headline-sm text-headline-sm mt-1">
                    AI Regulation
                  </p>
                </div>
                <div className="border-t-2 border-primary-container p-4">
                  <span className="font-label-md uppercase text-primary">
                    Monitoring
                  </span>
                  <p className="font-headline-sm text-headline-sm mt-1">
                    Climate Policy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="no-print w-full border-t border-border-subtle bg-surface">
        <div className="mx-auto flex w-full max-w-container-max items-center justify-between px-margin-desktop py-8">
          <div className="font-headline-sm text-headline-sm text-on-surface">
            InnoInvest
          </div>
          <div className="font-label-md text-label-md text-secondary">
            © {year} InnoiNVest Intelligence · ADR Nord-Vest
          </div>
          <div className="flex gap-6">
            <a
              href="#"
              className="font-label-md text-label-md text-on-surface-variant decoration-primary hover:underline"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="font-label-md text-label-md text-on-surface-variant decoration-primary hover:underline"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="font-label-md text-label-md text-on-surface-variant decoration-primary hover:underline"
            >
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
