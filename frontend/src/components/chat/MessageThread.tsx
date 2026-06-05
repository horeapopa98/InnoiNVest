"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { AssistantTurn } from "./AssistantCard";
import { type Message } from "@/lib/mock/chat";

type Props = {
  messages: Message[];
  /** Reveal progress for the LAST assistant message (0..1). null when no streaming. */
  streamingProgress: number | null;
  /** Short, intent-aware label shown while the assistant is "thinking". */
  pendingIntent: string | null;
  /** Per assistant message (by message id), the contextual follow-up prompts. */
  followUpsByMessageId: Record<string, readonly string[]>;
  /** Triggered when the user clicks a follow-up chip. */
  onPickFollowUp: (prompt: string) => void;
};

export function MessageThread({
  messages,
  streamingProgress,
  pendingIntent,
  followUpsByMessageId,
  onPickFollowUp,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingProgress, pendingIntent]);

  // Identify the last assistant message — it gets the streaming progress.
  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  })();

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="flex flex-col gap-6 py-6"
    >
      {messages.map((m) =>
        m.role === "user" ? (
          <div
            key={m.id}
            className="self-end max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-on-primary shadow-sm"
            title={new Date(m.timestamp).toLocaleString()}
          >
            <p className="font-body-md text-body-md whitespace-pre-line">{m.text}</p>
          </div>
        ) : (
          <AssistantTurn
            key={m.id}
            blocks={m.blocks}
            progress={
              m.id === lastAssistantId && streamingProgress !== null
                ? streamingProgress
                : undefined
            }
            followUps={followUpsByMessageId[m.id]}
            onPickFollowUp={onPickFollowUp}
          />
        )
      )}

      {pendingIntent && (
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-deep ring-1 ring-primary/20"
          >
            <Sparkles size={14} className="animate-pulse" />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {pendingIntent}
            <span className="ml-1 inline-flex gap-0.5">
              <span className="h-1 w-1 animate-bounce rounded-full bg-on-surface-variant" style={{ animationDelay: "0ms" }} />
              <span className="h-1 w-1 animate-bounce rounded-full bg-on-surface-variant" style={{ animationDelay: "150ms" }} />
              <span className="h-1 w-1 animate-bounce rounded-full bg-on-surface-variant" style={{ animationDelay: "300ms" }} />
            </span>
          </p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
