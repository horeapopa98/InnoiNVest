"use client";

import { useEffect, useRef, useState } from "react";
import { TopNav } from "@/components/stitch/TopNav";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageThread } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { SuggestedPrompts } from "@/components/chat/SuggestedPrompts";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  followUpsFor,
  summarizeIntent,
  type Conversation,
  type Message,
} from "@/lib/mock/chat";
import { postChat, type GeminiContent } from "@/lib/api";

function blankConversation(): Conversation {
  const now = Date.now();
  return {
    id: `chat-${now}`,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
    geminiHistory: [],
  };
}

/** Total duration of the word-by-word stream animation (ms). */
const STREAM_MS = 1800;

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);
  const [streamingProgress, setStreamingProgress] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<Record<string, readonly string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = readStorage<Conversation[]>(STORAGE_KEYS.chats, []);
    if (stored.length === 0) {
      const fresh = blankConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(stored);
      setActiveId(readStorage<string>(STORAGE_KEYS.activeChat, stored[0].id));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const active = conversations.find((c) => c.id === activeId);
  const isBusy = pendingIntent !== null || streamingProgress !== null;

  function persist(
    updater: (prev: Conversation[]) => Conversation[],
    nextActive: string | null
  ) {
    setConversations((prev) => {
      const next = updater(prev);
      writeStorage(STORAGE_KEYS.chats, next);
      return next;
    });
    if (nextActive !== null) {
      setActiveId(nextActive);
      writeStorage(STORAGE_KEYS.activeChat, nextActive);
    }
  }

  function handleNew() {
    if (isBusy) return;
    const fresh = blankConversation();
    persist((prev) => [fresh, ...prev], fresh.id);
    setError(null);
  }

  function handleSelect(id: string) {
    if (isBusy) return;
    setActiveId(id);
    writeStorage(STORAGE_KEYS.activeChat, id);
    setError(null);
  }

  function handleDelete(id: string) {
    if (isBusy) return;
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      // If we deleted the active chat, switch to the first remaining one
      // (or create a blank if none left).
      if (id === activeId) {
        if (next.length > 0) {
          setActiveId(next[0].id);
          writeStorage(STORAGE_KEYS.activeChat, next[0].id);
        } else {
          const fresh = blankConversation();
          next.push(fresh);
          setActiveId(fresh.id);
          writeStorage(STORAGE_KEYS.activeChat, fresh.id);
        }
      }
      writeStorage(STORAGE_KEYS.chats, next);
      return next;
    });
    setError(null);
  }

  async function handleSend(text: string) {
    if (!active || isBusy) return;
    setError(null);

    // 1. Append user message immediately.
    const userMsg: Message = {
      id: `m-${crypto.randomUUID()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    };
    const updatedTitle =
      active.messages.length === 0 ? text.slice(0, 60) : active.title;
    const withUser: Conversation = {
      ...active,
      title: updatedTitle,
      messages: [...active.messages, userMsg],
      updatedAt: Date.now(),
    };
    persist((prev) => prev.map((c) => (c.id === active.id ? withUser : c)), active.id);

    // 2. Show the "thinking" indicator with classified intent label.
    setPendingIntent(summarizeIntent(text, active.messages));

    // 3. Call the real backend.
    abortRef.current = new AbortController();
    try {
      const result = await postChat({
        message: text,
        history: (active.geminiHistory ?? []) as GeminiContent[],
      });

      const assistantId = `m-${crypto.randomUUID()}`;
      const blocks: import("@/lib/mock/chat").AssistantBlock[] = [
        { kind: "text", text: result.response },
      ];
      // Append a live map block when the backend resolved a location.
      if (result.map_data) {
        blocks.push({
          kind: "locationMap",
          lat: result.map_data.lat,
          lng: result.map_data.lng,
          label: result.map_data.label,
          radius_km: result.map_data.radius_km,
          markers: result.map_data.markers,
        });
      }

      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        blocks,
        timestamp: Date.now(),
      };

      // Follow-up suggestions are still derived locally from the user text.
      const follow = followUpsFor(text, blocks, active.messages);
      setFollowUps((prev) => ({ ...prev, [assistantId]: follow }));

      // Save message + updated Gemini history to this conversation.
      persist(
        (prev) =>
          prev.map((c) =>
            c.id === active.id
              ? {
                  ...c,
                  messages: [...c.messages, assistantMsg],
                  geminiHistory: result.history,
                  updatedAt: Date.now(),
                }
              : c
          ),
        active.id
      );

      // 4. Animate the word-reveal.
      setPendingIntent(null);
      setStreamingProgress(0);
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const p = Math.min(1, elapsed / STREAM_MS);
        setStreamingProgress(p);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          setStreamingProgress(null);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      // Don't show error for user-initiated aborts.
      if (err instanceof Error && err.name === "AbortError") return;
      setPendingIntent(null);
      setStreamingProgress(null);
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPendingIntent(null);
    setStreamingProgress(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden border-r border-border-subtle bg-surface lg:block">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={handleSelect}
            onNew={handleNew}
            onDelete={handleDelete}
          />
        </aside>

        <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col px-6">
          {active && (
            <>
              <header className="border-b border-border-subtle py-4">
                <h1 className="font-headline-sm text-headline-sm truncate text-on-surface">
                  {active.title}
                </h1>
              </header>
              <div className="flex-1 overflow-y-auto">
                {active.messages.length === 0 ? (
                  <div className="mx-auto max-w-[680px] py-12">
                    <h2 className="font-headline-md text-headline-md mb-2 text-on-surface">
                      What can I help you understand?
                    </h2>
                    <p className="font-body-md text-body-md mb-8 text-on-surface-variant">
                      Ask about investment properties, infrastructure, or any
                      location in North-West Romania — infrastructure projects,
                      industrial parks, universities, transport connectivity,
                      and more.
                    </p>
                    <SuggestedPrompts onPick={handleSend} />
                  </div>
                ) : (
                  <MessageThread
                    messages={active.messages}
                    streamingProgress={streamingProgress}
                    pendingIntent={pendingIntent}
                    followUpsByMessageId={followUps}
                    onPickFollowUp={handleSend}
                  />
                )}
              </div>

              {error && (
                <div className="mx-auto mb-2 w-full max-w-[880px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="py-4">
                <MessageInput
                  disabled={isBusy}
                  isStreaming={streamingProgress !== null}
                  onSubmit={handleSend}
                  onStop={handleStop}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
