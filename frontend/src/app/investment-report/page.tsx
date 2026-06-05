"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/stitch/TopNav";
import { API_BASE } from "@/lib/api";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  Landmark,
  MapPin,
  Plane,
  Train,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

// ─── types (matches combined-report.service.js output) ───────────────────────

type ConnectivityScore = { score: number; reasons: string[] };

type NearbyItem = { name?: string; locality?: string; city?: string; distance_km: number; [key: string]: unknown };

type Infrastructure = {
  industrial_parks: { count: number; items: NearbyItem[] };
  airports: { count: number; items: NearbyItem[] };
  railway_stations: { count: number; closest_5: NearbyItem[] };
  border_crossings: { count: number; items: NearbyItem[] };
  universities: { count: number; items: NearbyItem[] };
};

type TransportProject = {
  name?: string;
  type?: string;
  highway?: string;
  railway?: string;
  category?: string;
  progress_percent?: number;
  financing?: string;
  distance_km: number;
};

type Report = {
  report_type: string;
  target: {
    type: string;
    title?: string;
    name?: string;
    queried_place?: string;
    city?: string;
    county?: { name?: string } | string;
    area_sqm?: number;
    area_ha?: number;
    price_per_sqm_eur?: number;
    acquisition_method?: string;
    listing_url?: string;
    coordinate_source?: string;
  };
  center: { lat: number; lng: number };
  radius_km: number;
  location_population?: {
    locality_name_clean?: string;
    population?: number;
    locality_type?: string;
  } | null;
  connectivity_score: ConnectivityScore;
  property_context: {
    nearby_investment_properties: number;
    closest_properties: Array<{
      id: string;
      name?: string;
      county?: string;
      area_ha?: number;
      acquisition_method?: string;
      distance_km: number;
    }>;
  };
  infrastructure: Infrastructure;
  transport: {
    summary: {
      total_segments: number;
      roads: number;
      railways: number;
      active_construction: number;
      highways_expressways: number;
      closest_highway?: TransportProject | null;
    };
    projects: TransportProject[];
  };
  generated_at: string;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function scoreLabel(score: number) {
  if (score >= 70) return "Strong";
  if (score >= 40) return "Moderate";
  return "Low";
}

function targetTitle(target: Report["target"]): string {
  return target.title ?? target.name ?? target.queried_place ?? "Property Report";
}

function targetLocation(target: Report["target"]): string {
  const city = target.city;
  const county =
    typeof target.county === "object" ? target.county?.name : target.county;
  if (city && county) return `${city}, ${county}`;
  return city ?? county ?? "";
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-subtle bg-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function KvRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-subtle/50 py-2 last:border-0">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-right text-sm font-medium text-on-surface">{value}</span>
    </div>
  );
}

function InfraList({ items, nameKey = "name" }: { items: NearbyItem[]; nameKey?: string }) {
  if (!items.length) return <p className="text-sm text-on-surface-variant">None within range.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between text-sm">
          <span className="text-on-surface">
            {(item[nameKey] as string) ?? item.locality ?? item.name ?? "—"}
          </span>
          <span className="ml-4 shrink-0 font-mono text-xs text-on-surface-variant">
            {item.distance_km} km
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function InvestmentReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportInner />
    </Suspense>
  );
}

function ReportInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const location = searchParams.get("location");

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id && !location) {
      setError("No property ID or location provided.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (id) params.set("id", id);
    if (location) params.set("location", location);

    setLoading(true);
    fetch(`${API_BASE}/api/investment-report?${params}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.message ?? `HTTP ${r.status}`); });
        return r.json();
      })
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id, location]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {/* Back link */}
        <Link
          href="/properties"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-deep"
        >
          <ArrowLeft size={14} />
          Back to properties
        </Link>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-surface-muted" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-surface-muted" />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl border border-border-subtle bg-surface-muted" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Report */}
        {!loading && report && (
          <>
            {/* Title */}
            <div className="mb-6">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                {targetTitle(report.target)}
              </h1>
              {targetLocation(report.target) && (
                <p className="mt-1 flex items-center gap-1 text-sm text-on-surface-variant">
                  <MapPin size={13} />
                  {targetLocation(report.target)}
                </p>
              )}
              <p className="mt-1 text-xs text-on-surface-variant">
                Report generated at{" "}
                {new Date(report.generated_at).toLocaleString("ro-RO")}
                {" · "}
                {report.center.lat.toFixed(4)}, {report.center.lng.toFixed(4)}
              </p>
            </div>

            {/* Grid */}
            <div className="grid gap-4 md:grid-cols-2">

              {/* Connectivity score */}
              <Section icon={<Zap size={14} />} title="Connectivity Score">
                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-lg border px-4 py-2 text-3xl font-bold ${scoreColor(report.connectivity_score.score)}`}
                  >
                    {report.connectivity_score.score}
                    <span className="ml-0.5 text-lg font-normal">/100</span>
                  </span>
                  <span className={`text-sm font-medium ${scoreColor(report.connectivity_score.score).split(" ")[0]}`}>
                    {scoreLabel(report.connectivity_score.score)}
                  </span>
                </div>
                {report.connectivity_score.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {report.connectivity_score.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-on-surface">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* Population */}
              <Section icon={<Users size={14} />} title="Local Population">
                {report.location_population ? (
                  <>
                    <KvRow
                      label="Locality"
                      value={report.location_population.locality_name_clean ?? "—"}
                    />
                    <KvRow
                      label="Type"
                      value={report.location_population.locality_type ?? "—"}
                    />
                    <KvRow
                      label="Population (2021)"
                      value={report.location_population.population?.toLocaleString("ro-RO") ?? "—"}
                    />
                  </>
                ) : (
                  <p className="text-sm text-on-surface-variant">No population data available.</p>
                )}
              </Section>

              {/* Transport summary */}
              <Section icon={<TrendingUp size={14} />} title="Transport Infrastructure">
                <KvRow label="Total road/rail segments" value={report.transport.summary.total_segments} />
                <KvRow label="Active construction" value={report.transport.summary.active_construction} />
                <KvRow label="Highways / expressways" value={report.transport.summary.highways_expressways} />
                {report.transport.summary.closest_highway && (
                  <KvRow
                    label="Closest highway"
                    value={`${report.transport.summary.closest_highway.name ?? "—"} · ${report.transport.summary.closest_highway.distance_km} km`}
                  />
                )}
              </Section>

              {/* Nearby properties */}
              <Section icon={<Building2 size={14} />} title="Nearby Investment Properties">
                <KvRow
                  label="Properties in radius"
                  value={report.property_context.nearby_investment_properties}
                />
                {report.property_context.closest_properties.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {report.property_context.closest_properties.slice(0, 5).map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span className="truncate text-on-surface">{p.name ?? p.id}</span>
                        <span className="ml-4 shrink-0 font-mono text-xs text-on-surface-variant">
                          {p.distance_km} km
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* Industrial parks */}
              <Section icon={<Landmark size={14} />} title="Industrial Parks">
                <InfraList items={report.infrastructure.industrial_parks.items} />
              </Section>

              {/* Universities */}
              <Section icon={<GraduationCap size={14} />} title="Nearby Universities">
                <InfraList items={report.infrastructure.universities.items} />
              </Section>

              {/* Airports */}
              <Section icon={<Plane size={14} />} title="Airports">
                <InfraList items={report.infrastructure.airports.items} />
              </Section>

              {/* Railway stations */}
              <Section icon={<Train size={14} />} title="Railway Stations">
                <InfraList items={report.infrastructure.railway_stations.closest_5} />
              </Section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
