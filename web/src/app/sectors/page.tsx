import { TopNav } from "@/components/stitch/TopNav";

/**
 * Intelligence Hub workspace.
 *
 * Design intent (post-audit): break the templated 15-identical-cards grid
 * by tiering by status. The 2 LOADED domains get a featured layout that
 * shows their key metric, source, and "last fetch" — answering the
 * user's primary question (what does the data show?) without a click.
 * The 13 PENDING domains compress into a denser action grid so the eye
 * isn't repeating the same card 15 times.
 *
 * Copy is specific to the actual region (Nord-Vest Romania, 452 commune-
 * level units) instead of corporate-vague "any global region".
 */

type SectorStatus = "pending" | "loaded";

type Sector = {
  number: number;
  title: string;
  description: string;
  icon: string;
  status: SectorStatus;
  /** Featured tile data (LOADED status only). */
  featured?: {
    headline: string;
    detail: string;
    source: string;
    lastFetch: string;
  };
};

const SECTORS: readonly Sector[] = [
  {
    number: 1,
    title: "Strategic Location & Logistics",
    description:
      "Geographic advantages, time zones, and global trade route proximity analysis.",
    icon: "map",
    status: "pending",
  },
  {
    number: 2,
    title: "Macro-Economic Indicators",
    description:
      "National GDP performance, inflation trends, and currency stability benchmarks.",
    icon: "trending_up",
    status: "loaded",
    featured: {
      headline: "GDP growth steady at 2.4%",
      detail: "Inflation 3.1% (−0.5pp QoQ). Unemployment flat at 3.8%.",
      source: "IMF · OECD · Eurostat",
      lastFetch: "Oct 24, 2024 · 09:42 GMT",
    },
  },
  {
    number: 3,
    title: "Quality of Life, Safety & Liveability",
    description:
      "Comprehensive indexing of local crime rates, cultural amenities, and general living standards.",
    icon: "home_health",
    status: "pending",
  },
  {
    number: 4,
    title: "Demographics",
    description:
      "Detailed population pyramids, age distributions, and migration pattern analysis.",
    icon: "groups",
    status: "loaded",
    featured: {
      headline: "452 settlements indexed",
      detail:
        "Median age 41.2y. Net internal migration +0.8% YoY. 6 counties covered.",
      source: "INS Tempo · Eurostat",
      lastFetch: "Oct 24, 2024 · 09:42 GMT",
    },
  },
  {
    number: 5,
    title: "Land, Real Estate & Construction",
    description:
      "Commercial availability, industrial zones, and land acquisition costs.",
    icon: "domain",
    status: "pending",
  },
  {
    number: 6,
    title: "Transportation Infrastructure",
    description:
      "Airport connectivity, highway access, rail networks, and port capacity.",
    icon: "train",
    status: "pending",
  },
  {
    number: 7,
    title: "Utilities",
    description:
      "Grid stability, water resources, waste management, and energy costs.",
    icon: "bolt",
    status: "pending",
  },
  {
    number: 8,
    title: "Health Infrastructure",
    description:
      "Hospital density, specialized care facilities, and public health metrics.",
    icon: "medical_services",
    status: "pending",
  },
  {
    number: 9,
    title: "Labor Market & HR",
    description:
      "Employment rates, average wages, and technical skill distribution.",
    icon: "badge",
    status: "pending",
  },
  {
    number: 10,
    title: "Education & Talent Pipeline",
    description:
      "University rankings, graduate output, and R&D partnership potential.",
    icon: "school",
    status: "pending",
  },
  {
    number: 11,
    title: "Business Ecosystem",
    description:
      "Industry clusters, anchor tenants, and supply chain maturity.",
    icon: "corporate_fare",
    status: "pending",
  },
  {
    number: 12,
    title: "Innovation & Startups",
    description:
      "Incubators, VC activity, patent filings, and tech community density.",
    icon: "rocket_launch",
    status: "pending",
  },
  {
    number: 13,
    title: "Environment & Climate",
    description:
      "Climate risk assessment, carbon intensity, and environmental regulations.",
    icon: "park",
    status: "pending",
  },
  {
    number: 14,
    title: "Tax & Incentives",
    description:
      "Corporate tax rates, state aid eligibility, and municipal subsidies.",
    icon: "account_balance",
    status: "pending",
  },
  {
    number: 15,
    title: "Digital Infrastructure",
    description:
      "5G coverage, fibre availability, and smart-city implementation.",
    icon: "wifi",
    status: "pending",
  },
];

function FeaturedCard({ sector }: { sector: Sector }) {
  if (!sector.featured) return null;
  const { headline, detail, source, lastFetch } = sector.featured;

  // Featured cards anchor the layout — they span 3 columns on desktop
  // (full width of the pending tier below) so the LOADED state actually
  // looks loaded, with editorial preview text instead of generic description.
  return (
    <article className="md:col-span-2 group flex flex-col gap-4 rounded-md border border-primary/30 bg-surface-container-lowest p-7 ring-1 ring-primary/10 transition-colors hover:border-primary">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-primary"
            style={{ fontSize: 22 }}
          >
            {sector.icon}
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {sector.title}
          </h2>
        </div>
        <span className="font-label-md text-label-md rounded-sm bg-primary/10 px-2 py-0.5 text-primary-deep">
          LOADED
        </span>
      </header>
      <p className="font-body-lg text-body-lg text-on-surface">
        {headline}
      </p>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {detail}
      </p>
      <div className="mt-auto flex items-end justify-between border-t border-border-subtle pt-4">
        <dl className="space-y-0.5 text-xs">
          <div className="flex gap-2">
            <dt className="text-on-surface-variant">Source</dt>
            <dd className="text-on-surface">{source}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-on-surface-variant">Fetched</dt>
            <dd className="text-on-surface">{lastFetch}</dd>
          </div>
        </dl>
        <a
          href={
            sector.title === "Macro-Economic Indicators"
              ? "/sectors/macro"
              : "#"
          }
          className="font-label-md text-label-md inline-flex items-center gap-1 rounded text-primary-deep underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          View summary
          <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 16 }}>
            arrow_forward
          </span>
        </a>
      </div>
    </article>
  );
}

function PendingCard({ sector }: { sector: Sector }) {
  // Pending cards drop to a denser tier — same affordance (Fetch) but
  // shorter, no description visible until hover, no separate icon tile.
  return (
    <article className="group flex items-start gap-3 rounded-sm border border-border-subtle bg-surface-container-lowest p-4 transition-colors hover:border-outline">
      <span
        aria-hidden="true"
        className="material-symbols-outlined mt-0.5 text-on-surface-variant"
        style={{ fontSize: 20 }}
      >
        {sector.icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-body-md text-body-md truncate font-semibold text-on-surface">
          {sector.title}
        </h3>
        <p className="font-body-sm text-body-sm mt-0.5 line-clamp-2 text-on-surface-variant">
          {sector.description}
        </p>
      </div>
      <button
        type="button"
        className="font-label-md text-label-md mt-0.5 shrink-0 rounded-sm border border-border-subtle px-3 py-1.5 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        aria-label={`Fetch data for ${sector.title}`}
      >
        Fetch
      </button>
    </article>
  );
}

export default function SectorsPage() {
  const loaded = SECTORS.filter((s) => s.status === "loaded");
  const pending = SECTORS.filter((s) => s.status === "pending");
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-margin-desktop py-12">
        {/* Editorial intro — asymmetric, specific, with a strip rather than a card */}
        <section className="mb-10 border-l-2 border-primary pl-6">
          <p className="font-label-md text-label-md text-primary-deep">
            WORKSPACE · NORD-VEST ROMANIA
          </p>
          <h1 className="font-headline-lg text-headline-lg mt-2 text-on-surface">
            Investment intelligence for 452 settlements across 6 counties.
          </h1>
          <p className="font-body-lg text-body-lg mt-3 max-w-2xl text-on-surface-variant">
            Compile an institutional-grade dossier for any commune, city,
            or județ in the ADR Nord-Vest region. {loaded.length} of{" "}
            {SECTORS.length} data domains are ready to review.
          </p>
        </section>

        {/* Data Collection Center — restrained styling, no enclosing card */}
        <div className="mb-10 flex flex-col items-end gap-3 border-b border-border-subtle pb-6 md:flex-row">
          <div className="w-full flex-1">
            <label
              htmlFor="target-region"
              className="font-label-md text-label-md mb-2 block text-on-surface-variant"
            >
              Target region
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              >
                location_on
              </span>
              <input
                id="target-region"
                type="text"
                placeholder="e.g. Florești, Cluj-Napoca, or județul Cluj"
                className="font-body-md w-full rounded border border-border-subtle bg-surface py-3 pl-10 pr-4 transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:bg-surface-container-lowest focus:outline-2 focus:outline-primary focus:outline-offset-1"
              />
            </div>
          </div>
          <button
            type="button"
            className="font-label-md text-label-md flex w-full items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-on-primary transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 md:w-auto"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              style={{ fontSize: 20 }}
            >
              cloud_download
            </span>
            Fetch all domains
          </button>
        </div>

        {/* Featured (LOADED) tier */}
        {loaded.length > 0 && (
          <section className="mb-10" aria-labelledby="loaded-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2
                id="loaded-heading"
                className="font-headline-sm text-headline-sm text-on-surface"
              >
                Loaded domains
              </h2>
              <span className="font-label-md text-label-md text-on-surface-variant">
                {loaded.length} of {SECTORS.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {loaded.map((s) => (
                <FeaturedCard key={s.number} sector={s} />
              ))}
            </div>
          </section>
        )}

        {/* Pending tier — compact list-style cards */}
        <section aria-labelledby="pending-heading">
          <div className="mb-4 flex items-baseline justify-between">
            <h2
              id="pending-heading"
              className="font-headline-sm text-headline-sm text-on-surface"
            >
              Pending domains
            </h2>
            <span className="font-label-md text-label-md text-on-surface-variant">
              {pending.length} to fetch
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((s) => (
              <PendingCard key={s.number} sector={s} />
            ))}
          </div>
        </section>
      </main>

      {/* Sticky in-flow footer — no fixed positioning, no calc'd heights */}
      <footer className="sticky bottom-0 z-40 border-t border-border-subtle bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start justify-between gap-3 px-margin-desktop py-3 md:flex-row md:items-center">
          <p className="font-label-md text-label-md text-on-surface-variant">
            © {year} InnoiNVest Intelligence · ADR Nord-Vest
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="font-label-md text-label-md rounded border border-border-subtle px-4 py-2 text-on-surface-variant transition-colors hover:border-outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Export PDF
            </button>
            <button
              type="button"
              className="font-label-md text-label-md rounded border border-border-subtle px-4 py-2 text-on-surface-variant transition-colors hover:border-outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Share workspace
            </button>
            <a
              href="/report-preview"
              className="font-label-md text-label-md rounded bg-primary px-4 py-2 text-on-primary transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Generate report
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
