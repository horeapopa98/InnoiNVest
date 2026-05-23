"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

type Props = {
  disabled?: boolean;
  onSubmit: (text: string) => void;
};

export function MessageInput({ disabled, onSubmit }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function send() {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setText("");
    ref.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex items-end gap-2 rounded-lg border border-border-subtle bg-surface-container-lowest p-2 focus-within:border-primary"
    >
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        rows={1}
        placeholder="Ask anything about the data…"
        disabled={disabled}
        className="font-body-md max-h-48 min-h-[2.5rem] w-full resize-none border-none bg-transparent text-on-surface focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || text.trim().length === 0}
        aria-label="Send"
        className="rounded bg-primary p-2 text-on-primary transition-colors hover:bg-primary-deep disabled:opacity-40"
      >
        <ArrowUp size={16} />
      </button>
    </form>
  );
}
