"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

type Props = {
  disabled?: boolean;
  /** When true, the send button morphs into a Stop button. */
  isStreaming?: boolean;
  onSubmit: (text: string) => void;
  onStop?: () => void;
};

export function MessageInput({ disabled, isStreaming, onSubmit, onStop }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea up to ~6 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text]);

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
    if (e.key === "Escape" && isStreaming && onStop) {
      e.preventDefault();
      onStop();
    }
  }

  const canSend = !disabled && text.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex items-end gap-2 rounded-2xl border border-border-subtle bg-surface-container-lowest p-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
    >
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        rows={1}
        placeholder={isStreaming ? "Press Esc to stop…" : "Ask anything about the data…"}
        aria-label="Message"
        disabled={disabled && !isStreaming}
        className="font-body-md max-h-36 min-h-[2rem] w-full resize-none border-none bg-transparent px-2 py-1.5 text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
      />
      {isStreaming && onStop ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-on-surface text-surface transition-opacity hover:opacity-90"
        >
          <Square size={14} fill="currentColor" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-deep disabled:opacity-40"
        >
          <ArrowUp size={16} />
        </button>
      )}
    </form>
  );
}
