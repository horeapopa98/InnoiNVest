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

type Props = {
  blocks: AssistantBlock[];
  /**
   * Word-reveal progress, 0..1. When < 1, text blocks are sliced and
   * non-text blocks (chart/citation) stay hidden. When undefined or 1,
   * everything renders in full and the action row appears.
   */
  progress?: number;
  /** Context-aware follow-up suggestions to render under the response. */
  followUps?: readonly string[];
  /** Click handler for a follow-up chip → re-submit as a new user message. */
  onPickFollowUp?: (prompt: string) => void;
};

/**
 * One assistant turn — composed of typed blocks (text, sparkline,
 * comparison, citation). Text blocks reveal word-by-word during
 * streaming for a real-LLM feel; everything else snaps in once the
 * text is fully revealed.
 */
export function AssistantCard({ blocks, progress, followUps, onPickFollowUp }: Props) {
  const streaming = progress !== undefined && progress < 1;
  const done = !streaming;
  const [copied, setCopied] = useState(false);

  // Pre-tokenise text blocks so the slice computation is cheap.
  const textTokens = useMemo(() => {
    return blocks.map((b) =>
      b.kind === "text" ? b.text.split(/(\s+)/) : null
    );
  }, [blocks]);

  // Total words across all text blocks.
  const totalWords = useMemo(
    () =>
      textTokens.reduce<number>(
        (acc, toks) => acc + (toks ? toks.filter((t) => t.trim().length > 0).length : 0),
        0
      ),
    [textTokens]
  );

  // How many words to reveal globally given the progress.
  const wordsToReveal = streaming ? Math.floor((progress ?? 1) * totalWords) : totalWords;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(messageToCopyText(blocks));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail on insecure contexts — fall back silently.
    }
  }

  // Track words consumed so each block knows where in the global stream it sits.
  let consumed = 0;

  return (
    <article className="flex max-w-[88%] gap-3">
      {/* Brand-tinted assistant avatar */}
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

                // Build the visible substring up to the current global word index.
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
                  streaming && wordsToReveal > blockStart && wordsToReveal < blockStart + wordsInBlock;

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

              // Non-text blocks only appear once the text stream is complete.
              if (!done) return null;

              if (b.kind === "sparkline") {
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
              if (b.kind === "comparison") {
                const kpi = getKpi(b.kpiCode);
                const bars = b.series.map((s) => {
                  const loc = getLocation(s.locationSiruta);
                  const latest = s.values[s.values.length - 1];
                  return { label: loc?.name ?? s.locationSiruta, value: latest?.value ?? 0 };
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
              if (b.kind === "citation") {
                return (
                  <div key={i} className="border-t border-border-subtle/60 pt-3">
                    <p className="font-label-md text-label-md mb-1 uppercase tracking-wider text-on-surface-variant">
                      Sources
                    </p>
                    <ol className="font-body-sm text-body-sm list-decimal space-y-0.5 pl-5 text-on-surface-variant">
                      {b.sources.map((s) => (
                        <li key={s.id}>{s.label}</li>
                      ))}
                    </ol>
                  </div>
                );
              }
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const _exhaustive: never = b;
              return null;
            })}
          </div>

          {/* Hover-revealed action row — only when response is complete */}
          {done && (
            <div className="mt-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy response"}
                className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href="/reports"
                className="font-label-md text-label-md inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
              >
                <FileText size={12} /> Use in report
              </a>
            </div>
          )}
        </div>

        {/* Follow-up chips */}
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

/** Wrap with a `group` so the hover-action row reveals on hover. */
export function AssistantTurn(props: Props) {
  return (
    <div className="group">
      <AssistantCard {...props} />
    </div>
  );
}
