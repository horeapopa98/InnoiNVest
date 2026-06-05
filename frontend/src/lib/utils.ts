import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip common markdown syntax from a string so it reads as plain text.
 * Handles headings, bold, italic, inline code, horizontal rules, and
 * leading bullet / dash characters.
 */
export function stripMarkdown(text: string): string {
  return text
    // ATX headings: ## Title → Title
    .replace(/^#{1,6}\s+/gm, "")
    // Bold + italic: ***text*** / **text** / *text* → text
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
    // Inline code: `code` → code
    .replace(/`([^`\n]+)`/g, "$1")
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Leading bullet / dash list markers
    .replace(/^[\s]*[-*+]\s+/gm, "")
    // Collapse 3+ newlines to 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
