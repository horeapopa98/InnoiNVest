"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/stitch/TopNav";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageThread } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { SuggestedPrompts } from "@/components/chat/SuggestedPrompts";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  respondTo,
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

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

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

  const active = conversations.find((c) => c.id === activeId);

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
    const fresh = blankConversation();
    persist((prev) => [fresh, ...prev], fresh.id);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    writeStorage(STORAGE_KEYS.activeChat, id);
  }

  function handleSend(text: string) {
    if (!active) return;
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

    setStreaming(true);
    setTimeout(() => {
      const blocks = respondTo(text);
      const assistantMsg: Message = {
        id: `m-${crypto.randomUUID()}`,
        role: "assistant",
        blocks,
        timestamp: Date.now(),
      };
      persist(
        (prev) =>
          prev.map((c) =>
            c.id === active.id
              ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() }
              : c
          ),
        active.id
      );
      setStreaming(false);
    }, 700);
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
                  <div className="mx-auto max-w-[640px] py-10">
                    <h2 className="font-headline-md text-headline-md mb-2 text-on-surface">
                      Ask anything about the data
                    </h2>
                    <p className="font-body-md text-body-md mb-6 text-on-surface-variant">
                      The assistant has access to ~800 observations across NW Romania.
                    </p>
                    <SuggestedPrompts onPick={handleSend} />
                  </div>
                ) : (
                  <MessageThread messages={active.messages} streaming={streaming} />
                )}
              </div>
              <div className="py-4">
                <MessageInput disabled={streaming} onSubmit={handleSend} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
