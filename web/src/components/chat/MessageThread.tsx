"use client";

import { useEffect, useRef } from "react";
import { AssistantCard } from "./AssistantCard";
import { type Message } from "@/lib/mock/chat";

type Props = {
  messages: Message[];
  /** When true, the last assistant message is being streamed. */
  streaming?: boolean;
};

export function MessageThread({ messages, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  return (
    <div className="flex flex-col gap-4 py-6">
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="self-end max-w-[80%] rounded-lg bg-primary px-4 py-3 text-on-primary">
            <p className="font-body-md text-body-md whitespace-pre-line">{m.text}</p>
          </div>
        ) : (
          <AssistantCard key={m.id} blocks={m.blocks} />
        )
      )}
      {streaming && (
        <div className="font-label-md text-label-md text-on-surface-variant">Assistant is typing…</div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
