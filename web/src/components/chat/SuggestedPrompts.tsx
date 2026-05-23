"use client";

import {
  ArrowRight,
  ArrowLeftRight,
  Compass,
  FileText,
  LayoutDashboard,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { CAPABILITIES, type CapabilityCard } from "@/lib/mock/chat";

type Props = {
  onPick: (prompt: string) => void;
};

const ICON_FOR: Record<CapabilityCard["icon"], React.ReactNode> = {
  trending_up: <TrendingUp size={16} />,
  compare: <ArrowLeftRight size={16} />,
  trophy: <Trophy size={16} />,
  document: <FileText size={16} />,
  snapshot: <LayoutDashboard size={16} />,
  recommend: <Compass size={16} />,
};

export function SuggestedPrompts({ onPick }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CAPABILITIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.example)}
          className="group flex flex-col items-start gap-2 rounded-lg border border-border-subtle bg-surface-container-lowest p-4 text-left transition-colors hover:border-primary hover:bg-surface-muted"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary-deep ring-1 ring-primary/20">
            {ICON_FOR[c.icon]}
          </div>
          <p className="font-body-md text-body-md font-semibold text-on-surface">
            {c.title}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {c.description}
          </p>
          <p className="font-label-md text-label-md mt-1 inline-flex items-center gap-1 text-primary-deep">
            <span>&ldquo;{c.example}&rdquo;</span>
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </p>
        </button>
      ))}
    </div>
  );
}
