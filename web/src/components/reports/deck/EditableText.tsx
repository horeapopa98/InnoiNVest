"use client";

import { createElement, useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Tag to render. Defaults to span. Use "h1"/"p"/etc. to inherit slide typography. */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** When true, the field is locked (read-only mode of the preview). */
  readOnly?: boolean;
  /** Optional placeholder shown when value is empty. */
  placeholder?: string;
};

/**
 * Single-line contenteditable with explicit commit semantics:
 *   • Edit happens in DOM (uncontrolled while focused)
 *   • Blur or Enter commits → onChange
 *   • Escape cancels → revert to last committed value
 *   • External value changes while NOT focused → render the new value
 */
export function EditableText({
  value,
  onChange,
  as = "span",
  className = "",
  readOnly = false,
  placeholder,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // Re-sync the DOM when the prop changes and we're not editing.
    if (!focused && ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value, focused]);

  function handleBlur() {
    setFocused(false);
    const next = ref.current?.innerText ?? "";
    if (next !== value) onChange(next);
  }

  function handleKey(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (ref.current) ref.current.innerText = value;
      (e.target as HTMLElement).blur();
    }
  }

  // dynamic Tag binding — createElement avoids ref-type erasure issue with JSX
  return createElement(
    as,
    {
      ref,
      contentEditable: !readOnly,
      suppressContentEditableWarning: true,
      onFocus: () => setFocused(true),
      onBlur: handleBlur,
      onKeyDown: handleKey,
      className:
        (readOnly
          ? ""
          : "outline-none focus:rounded-sm focus:ring-2 focus:ring-[var(--color-deck-bright)] hover:underline hover:decoration-dashed hover:underline-offset-4 ") +
        className,
      "data-placeholder": placeholder,
    },
    value,
  );
}
