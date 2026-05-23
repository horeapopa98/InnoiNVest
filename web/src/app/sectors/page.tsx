import { TopNav } from "@/components/stitch/TopNav";

/**
 * Screen 1: InnoiNVest Workspace — 15 Sectors Grid
 *
 * Static port of the "Intelligence Hub" Stitch screen
 * (projects/17049715552381140836). The 15 sector cards represent the
 * full intelligence dossier; each card is a "data domain" with a
 * Pending / Loaded status.
 */

type SectorStatus = "pending" | "loaded";

type Sector = {
  number: number;
  title: string;
  description: string;
  icon: string; // Material Symbols Outlined name
  status: SectorStatus;
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
    title: "Transportation Infrastructure (Existing & Planned)",
    description:
      "Airport connectivity, highway access, rail networks, and port capacity.",
    icon: "train",
    status: "pending",
  },
  {
    number: 7,
    title: "Utilities (Electricity, Gas, Water, Sewage)",
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
    title: "Labor Market & Human Resources",
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
    title: "Existing Business Ecosystem",
    description:
      "Industry clusters, anchor tenants, and supply chain maturity.",
    icon: "corporate_fare",
    status: "pending",
  },
  {
    number: 12,
    title: "Innovation, Research & Startup Ecosystem",
    description:
      "Incubators, VC activity, patent filings, and tech community density.",
    icon: "rocket_launch",
    status: "pending",
  },
  {
    number: 13,
    title: "Environment, Sustainability & Climate Risk",
    description:
      "Climate risk assessment, carbon intensity, and environmental regulations.",
    icon: "park",
    status: "pending",
  },
  {
    number: 14,
    title: "Tax, Incentives & State Aid",
    description:
      "Corporate tax rates, state aid eligibility, and municipal subsidies.",
    icon: "account_balance",
    status: "pending",
  },
  {
    number: 15,
    title: "Mobility & Connectivity (Digital Infrastructure)",
    description:
      "Digital infrastructure, 5G coverage, and smart city implementation.",
    icon: "wifi",
    status: "pending",
  },
];

function SectorCard({ sector }: { sector: Sector }) {
  const isLoaded = sector.status === "loaded";

  return (
    <div
      className={
        isLoaded
          ? "group flex h-64 flex-col border border-primary bg-surface p-6 shadow-sm"
          : "group flex h-64 flex-col border border-border-subtle bg-surface p-6 transition-colors hover:border-outline-variant"
      }
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className={
            isLoaded
              ? "flex h-10 w-10 items-center justify-center rounded bg-primary-container/10"
              : "flex h-10 w-10 items-center justify-center rounded border border-border-subtle bg-surface-muted"
          }
        >
          <span
            className={
              isLoaded
                ? "material-symbols-outlined text-primary"
                : "material-symbols-outlined text-on-surface-variant"
            }
          >
            {sector.icon}
          </span>
        </div>
        <span
          className={
            isLoaded
              ? "font-label-md text-[10px] font-bold uppercase text-primary"
              : "font-label-md text-[10px] uppercase text-on-surface-variant"
          }
        >
          {isLoaded ? "Loaded" : "Pending"}
        </span>
      </div>
      <h3 className="font-headline-sm text-headline-sm mb-2 text-on-surface">
        {sector.title}
      </h3>
      <p className="font-body-sm text-body-sm flex-grow text-on-surface-variant">
        {sector.description}
      </p>
      <button
        className={
          isLoaded
            ? "font-label-md text-label-md w-full border border-primary/20 py-2 text-primary transition-colors hover:bg-primary/5"
            : "font-label-md text-label-md w-full border border-border-subtle bg-surface-muted py-2 text-on-surface transition-colors hover:bg-surface-container-high"
        }
      >
        {isLoaded ? "View Full Summary" : "Fetch Data"}
      </button>
    </div>
  );
}

export default function SectorsPage() {
  const loadedCount = SECTORS.filter((s) => s.status === "loaded").length;
  const pendingCount = SECTORS.length - loadedCount;

  return (
    <div className="min-h-screen overflow-hidden bg-background text-on-surface">
      <TopNav />

      <main className="custom-scrollbar mt-16 h-[calc(100vh-64px-72px)] overflow-y-auto bg-background p-12">
        <div className="mx-auto max-w-[1200px]">
          {/* Intro */}
          <section className="mb-12">
            <h1 className="font-headline-lg text-headline-lg mb-2 text-on-surface">
              Workspace Intelligence Report
            </h1>
            <p className="font-body-lg text-body-lg max-w-2xl text-on-surface-variant">
              Generate comprehensive investment dossiers for any global region.
              Our intelligence engine compiles 15 critical data domains to
              provide an institutional-grade assessment of local market
              conditions.
            </p>
          </section>

          {/* Data Collection Center */}
          <div className="mb-10 rounded-lg border border-border-subtle bg-surface p-8">
            <div className="flex flex-col items-end gap-4 md:flex-row">
              <div className="w-full flex-1">
                <label
                  htmlFor="target-region"
                  className="font-label-md text-label-md mb-2 block text-on-surface-variant"
                >
                  Primary Target Region
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    location_on
                  </span>
                  <input
                    id="target-region"
                    type="text"
                    placeholder="Enter Region or Site name (e.g. Cluj-Napoca, Romania)"
                    className="font-body-md w-full rounded-lg border border-border-subtle bg-surface-muted py-3 pl-10 pr-4 focus:border-primary focus:ring-0"
                  />
                </div>
              </div>
              <button className="font-label-md text-label-md flex items-center gap-2 rounded bg-primary px-8 py-3.5 text-on-primary transition-all hover:opacity-95">
                <span className="material-symbols-outlined text-[20px]">
                  cloud_download
                </span>
                Fetch All Data
              </button>
            </div>
            <div className="font-body-sm mt-4 flex items-center gap-4 text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-status-loading" />
                Pending ({pendingCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Loaded ({loadedCount})
              </span>
            </div>
          </div>

          {/* 15-sector grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SECTORS.map((sector) => (
              <SectorCard key={sector.number} sector={sector} />
            ))}
          </div>

          {/* Spacer so the fixed footer doesn't cover the last row */}
          <div className="h-24" />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 right-0 z-40 flex w-full items-center justify-between border-t border-border-subtle bg-surface/80 px-margin-desktop py-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-on-surface-variant">
            © 2024 InnoiNVest Intelligence. Institutional Grade Analysis.
          </span>
          <div className="mt-1 flex gap-4">
            <a
              href="#"
              className="font-label-md text-[11px] text-on-surface-variant transition-colors hover:text-primary"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="font-label-md text-[11px] text-on-surface-variant transition-colors hover:text-primary"
            >
              Data Sources
            </a>
            <a
              href="#"
              className="font-label-md text-[11px] text-on-surface-variant transition-colors hover:text-primary"
            >
              Support
            </a>
          </div>
        </div>
        <div className="flex gap-4">
          <button className="font-label-md text-label-md border border-border-subtle bg-surface px-6 py-2.5 text-on-surface-variant transition-colors hover:bg-surface-muted active:scale-95">
            Export PDF
          </button>
          <button className="font-label-md text-label-md border border-border-subtle bg-surface px-6 py-2.5 text-on-surface-variant transition-colors hover:bg-surface-muted active:scale-95">
            Share Workspace
          </button>
          <button className="font-label-md text-label-md rounded bg-primary px-6 py-2.5 font-bold text-on-primary transition-all hover:opacity-90 active:scale-95">
            Generate Final Report
          </button>
        </div>
      </footer>
    </div>
  );
}
