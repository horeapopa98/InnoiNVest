"use client";

import type { ReactNode } from "react";

/**
 * Thin client wrapper so the Download PDF button on /report-preview can
 * trigger window.print() without turning the whole page into a client
 * component (the page still benefits from being a server component for
 * fast initial paint of the document layout).
 */
export function PrintButton({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}
