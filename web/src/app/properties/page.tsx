"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/stitch/TopNav";
import { API_BASE } from "@/lib/api";
import Link from "next/link";
import { BarChart2, MapPin, Search, X } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  county: { code: string; name: string; region: string } | null;
  location: { city: string | null; county_hint: string | null } | null;
  area_sqm: number | null;
  availability: string[] | null;
  use_cases: string[];
  listing_url: string;
};

const COUNTY_CODES = ["BH", "MM", "BN", "SM", "CJ", "SJ"] as const;
const COUNTY_NAMES: Record<string, string> = {
  BH: "Bihor",
  MM: "Maramureș",
  BN: "Bistrița-Năsăud",
  SM: "Satu Mare",
  CJ: "Cluj",
  SJ: "Sălaj",
};

function locationLabel(listing: Listing): string {
  const city = listing.location?.city;
  const county = listing.county?.name;
  if (city && county) return `${city}, ${county}`;
  if (city) return city;
  if (county) return county;
  return "—";
}

function areaLabel(sqm: number | null): string {
  if (sqm == null) return "";
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`;
  return `${sqm.toLocaleString("ro-RO")} m²`;
}

export default function PropertiesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCounty, setActiveCounty] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/properties?limit=500`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setListings(data.listings ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const filtered = listings.filter((l) => {
    if (activeCounty && l.county?.code !== activeCounty) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = [l.title, l.location?.city, l.county?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Investment Properties
          </h1>
          <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
            Curated land and property listings across North-West Romania from INNO.
          </p>
        </div>

        {/* Filters row */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Search */}
          <label className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search size={14} className="shrink-0 text-on-surface-variant" />
            <input
              type="search"
              placeholder="Search by name or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 border-none bg-transparent text-sm placeholder:text-on-surface-variant/60 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search">
                <X size={12} className="text-on-surface-variant" />
              </button>
            )}
          </label>

          {/* County chips */}
          <div className="flex flex-wrap gap-1.5">
            {COUNTY_CODES.map((code) => (
              <button
                key={code}
                onClick={() => setActiveCounty(activeCounty === code ? null : code)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activeCounty === code
                    ? "border-primary bg-primary/10 text-primary-deep"
                    : "border-border-subtle text-on-surface-variant hover:border-primary hover:text-primary-deep"
                }`}
              >
                {COUNTY_NAMES[code]}
              </button>
            ))}
          </div>

          {(search || activeCounty) && (
            <button
              onClick={() => { setSearch(""); setActiveCounty(null); }}
              className="font-body-sm text-body-sm text-on-surface-variant underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Result count */}
        <p className="font-body-sm text-body-sm mb-4 text-on-surface-variant">
          {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "property" : "properties"}`}
        </p>

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load properties: {error}. Make sure the backend is running on port 3001.
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-lg border border-border-subtle bg-surface-muted"
              />
            ))}
          </div>
        )}

        {/* Property grid */}
        {!loading && !error && (
          <>
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-on-surface-variant">
                No properties match your filters.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    {/* Name */}
                    <a
                      href={listing.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body-md text-body-md line-clamp-1 font-medium text-on-surface hover:text-primary-deep"
                    >
                      {listing.title}
                    </a>

                    {/* Location + area */}
                    <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <MapPin size={11} className="shrink-0" />
                      {locationLabel(listing)}
                      {listing.area_sqm && (
                        <span className="ml-auto shrink-0 font-mono">
                          {areaLabel(listing.area_sqm)}
                        </span>
                      )}
                    </span>

                    {/* View report button */}
                    <Link
                      href={`/investment-report?id=${listing.id}`}
                      className="mt-1 inline-flex items-center gap-1.5 self-start rounded border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary-deep transition-colors hover:bg-primary/10"
                    >
                      <BarChart2 size={11} />
                      View investment report
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
