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
  respondTo,
  summarizeIntent,
  type Conversation,
  type Message,
} from "@/lib/mock/chat";

function blankConversation(): Conversation {
  const now = Date.now();
  return {
    id: `chat-${now}`,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Time the assistant "thinks" before streaming begins (ms). */
const THINKING_MS = 600;
/** Total duration of the word-by-word stream (ms). */
const STREAM_MS = 1400;

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);
  const [streamingProgress, setStreamingProgress] = useState<number | null>(null);
  /** Follow-up prompts per assistant message id (keyed so they survive reorders). */
  const [followUps, setFollowUps] = useState<Record<string, readonly string[]>>({});
  const rafRef = useRef<number | null>(null);

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

  // Tear down any in-flight animation on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const active = conversations.find((c) => c.id === activeId);
  const isBusy = pendingIntent !== null || streamingProgress !== null;

  function persist(updater: (prev: Conversation[]) => Conversation[], nextActive: string | null) {
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
  }

  function handleSelect(id: string) {
    if (isBusy) return;
    setActiveId(id);
    writeStorage(STORAGE_KEYS.activeChat, id);
  }

  function handleSend(text: string) {
    if (!active || isBusy) return;

    // 1. Append the user message immediately.
    const userMsg: Message = {
      id: `m-${crypto.randomUUID()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    };
    const updatedTitle = active.messages.length === 0 ? text.slice(0, 60) : active.title;
    const withUser: Conversation = {
      ...active,
      title: updatedTitle,
      messages: [...active.messages, userMsg],
      updatedAt: Date.now(),
    };
    persist((prev) => prev.map((c) => (c.id === active.id ? withUser : c)), active.id);

    // 2. Show the smart "thinking" indicator with the classified intent.
    setPendingIntent(summarizeIntent(text));

    // 3. After the "thinking" delay, append the assistant message and
    //    animate its reveal word-by-word over STREAM_MS.
    setTimeout(() => {
      const blocks = respondTo(text);
      const assistantId = `m-${crypto.randomUUID()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        blocks,
        timestamp: Date.now(),
      };
      const follow = followUpsFor(text);
      setFollowUps((prev) => ({ ...prev, [assistantId]: follow }));
      persist(
        (prev) =>
          prev.map((c) =>
            c.id === active.id
              ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() }
              : c
          ),
        active.id
      );
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
    }, THINKING_MS);
  }

  function handleStop() {
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
                      I have access to {/* keep simple — exact counts live on /data */}
                      ~2,000 observations across NW Romania&apos;s 13 commune-, city-, and
                      county-level locations. Ask in plain English.
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
