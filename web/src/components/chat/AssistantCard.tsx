"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileText, Sparkles } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { getKpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import {
  messageToCopyText,
  type AssistantBlock,
} from "@/lib/mock/chat";
import dynamic from "next/dynamic";
import { useActiveDeck } from "@/lib/decks/useActiveDeck";
import { MetricCardBlock } from "./blocks/MetricCardBlock";
import { RankingTableBlock } from "./blocks/RankingTableBlock";
import { LineChartBlock } from "./blocks/LineChartBlock";
import { ScorecardBlock } from "./blocks/ScorecardBlock";
import { InteractiveRecommendationBlock } from "./blocks/InteractiveRecommendationBlock";

// Map blocks pull in Leaflet, which touches `window` at import time;
// load them client-only to keep SSR happy.
const MapLoadingFallback = () => (
  <div className="flex h-[320px] w-full items-center justify-center rounded-lg border border-border-subtle bg-surface-muted text-on-surface-variant">
    Loading map…
  </div>
);
const MapBlock = dynamic(
  () => import("./blocks/MapBlock").then((m) => m.MapBlock),
  { ssr: false, loading: MapLoadingFallback }
);
const ParcelMapBlock = dynamic(
  () => import("./blocks/ParcelMapBlock").then((m) => m.ParcelMapBlock),
  { ssr: false, loading: MapLoadingFallback }
);

type Props = {
  blocks: AssistantBlock[];
  /**
   * Word-reveal progress, 0..1. When < 1, text blocks are sliced and
   * non-text blocks (chart/map/etc.) stay hidden. When undefined or 1,
   * everything renders and the action row appears.
   */
  progress?: number;
  /** Context-aware follow-up suggestions to render under the response. */
  followUps?: readonly string[];
  /** Click handler for a follow-up chip → re-submit as a new user message. */
  onPickFollowUp?: (prompt: string) => void;
};

export function AssistantCard({ blocks, progress, followUps, onPickFollowUp }: Props) {
  const streaming = progress !== undefined && progress < 1;
  const done = !streaming;
  const [copied, setCopied] = useState(false);

  const textTokens = useMemo(
    () => blocks.map((b) => (b.kind === "text" ? b.text.split(/(\s+)/) : null)),
    [blocks]
  );

  const totalWords = useMemo(
    () =>
      textTokens.reduce<number>(
        (acc, toks) => acc + (toks ? toks.filter((t) => t.trim().length > 0).length : 0),
        0
      ),
    [textTokens]
  );

  const wordsToReveal = streaming ? Math.floor((progress ?? 1) * totalWords) : totalWords;

  const { addSlideFromChat } = useActiveDeck();
  function handleUseInReport() {
    addSlideFromChat(blocks);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(messageToCopyText(blocks));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable on insecure contexts — fall back silently.
    }
  }

  let consumed = 0;

  return (
    <article className="flex max-w-[92%] gap-3">
      <div
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-deep ring-1 ring-primary/20"
      >
        <Sparkles size={14} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="rounded-lg border border-border-subtle bg-surface-container-lowest p-4">
          <div className="space-y-4">
            {blocks.map((b, i) => {
              if (b.kind === "text") {
                const tokens = textTokens[i] ?? [];
                const wordsInBlock = tokens.filter((t) => t.trim().length > 0).length;
                const blockStart = consumed;
                consumed += wordsInBlock;

                let displayed = "";
                let wordCount = 0;
                for (const tok of tokens) {
                  const isWord = tok.trim().length > 0;
                  if (isWord) {
                    if (blockStart + wordCount >= wordsToReveal) break;
                    wordCount++;
                  }
                  displayed += tok;
                }

                const isCurrentBlock =
                  streaming &&
                  wordsToReveal > blockStart &&
                  wordsToReveal < blockStart + wordsInBlock;

                return (
                  <p
                    key={i}
                    className="font-body-md text-body-md whitespace-pre-line text-on-surface"
                  >
                    {displayed}
                    {isCurrentBlock && (
                      <span
                        aria-hidden="true"
                        className="ml-0.5 inline-block h-4 w-[3px] animate-pulse bg-primary align-middle"
                      />
                    )}
                  </p>
                );
              }

              // Non-text blocks only appear once the text stream completes.
              if (!done) return null;

              switch (b.kind) {
                case "sparkline": {
                  const kpi = getKpi(b.kpiCode);
                  const loc = getLocation(b.locationSiruta);
                  return (
                    <div key={i} className="rounded-md border border-border-subtle/60 bg-surface p-3">
                      <p className="font-label-md text-label-md mb-1 uppercase tracking-wider text-on-surface-variant">
                        {kpi?.nameEn} · {loc?.name}
                      </p>
                      <Sparkline values={b.values} width={420} height={56} />
                    </div>
                  );
                }
                case "comparison": {
                  const kpi = getKpi(b.kpiCode);
                  const bars = b.series.map((s) => {
                    const loc = getLocation(s.locationSiruta);
                    const latest = s.values[s.values.length - 1];
                    return {
                      label: loc?.name ?? s.locationSiruta,
                      value: latest?.value ?? 0,
                    };
                  });
                  return (
                    <div key={i} className="rounded-md border border-border-subtle/60 bg-surface p-3">
                      <p className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
                        {kpi?.nameEn}
                      </p>
                      <MiniBarChart bars={bars} width={420} height={140} />
                    </div>
                  );
                }
                case "metricCard":
                  return (
                    <MetricCardBlock
                      key={i}
                      locationSiruta={b.locationSiruta}
                      kpiCode={b.kpiCode}
                      year={b.year}
                      value={b.value}
                      regionAvg={b.regionAvg}
                      series={b.series}
                    />
                  );
                case "rankingTable":
                  return <RankingTableBlock key={i} kpiCode={b.kpiCode} year={b.year} rows={b.rows} />;
                case "lineChart":
                  return (
                    <LineChartBlock
                      key={i}
                      kpiCode={b.kpiCode}
                      yearRange={b.yearRange}
                      series={b.series}
                    />
                  );
                case "map":
                  return (
                    <MapBlock
                      key={i}
                      kpiCode={b.kpiCode}
                      year={b.year}
                      valuesByCounty={b.valuesByCounty}
                    />
                  );
                case "scorecard":
                  return (
                    <ScorecardBlock
                      key={i}
                      locationSiruta={b.locationSiruta}
                      year={b.year}
                      tiles={b.tiles}
                    />
                  );
                case "interactiveRecommendation":
                  return (
                    <InteractiveRecommendationBlock
                      key={i}
                      initialSector={b.sector}
                      year={b.year}
                    />
                  );
                case "parcelMap":
                  return (
                    <ParcelMapBlock
                      key={i}
                      parcelIds={b.parcelIds}
                      filterType={b.filterType}
                    />
                  );
                case "citation":
                  return (
                    <div key={i} className="border-t border-border-subtle/60 pt-3">
                      <p className="font-label-md text-label-md mb-1 uppercase tracking-wider text-on-surface-variant">
                        Sources
                      </p>
                      <ol className="font-body-sm text-body-sm list-decimal space-y-0.5 pl-5 text-on-surface-variant">
                        {b.sources.map((s) =>
                          s.href ? (
                            <li key={s.id}>
                              <a
                                href={s.href}
                                className="text-primary-deep underline-offset-2 transition-colors hover:underline"
                                title="Open this observation in the Data Browser"
                              >
                                {s.label}
                              </a>
                            </li>
                          ) : (
                            <li key={s.id}>{s.label}</li>
                          )
                        )}
                      </ol>
                    </div>
                  );
                default: {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const _exhaustive: never = b;
                  return null;
                }
              }
            })}
          </div>

          {done && (
            <div className="mt-3 flex gap-1.5 border-t border-border-subtle/60 pt-3">
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy response"}
                className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={handleUseInReport}
                className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
              >
                <FileText size={12} /> Use in report
              </button>
            </div>
          )}
        </div>

        {done && followUps && followUps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {followUps.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onPickFollowUp?.(f)}
                className="font-body-sm text-body-sm rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function AssistantTurn(props: Props) {
  return (
    <div className="group">
      <AssistantCard {...props} />
    </div>
  );
}
