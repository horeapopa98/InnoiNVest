"use client";

import { photoUrl, type PhotoId } from "@/lib/mock/decks";

const OPTIONS: Array<{ id: Exclude<PhotoId, null>; label: string }> = [
  { id: "industrial-park-1", label: "Industrial park" },
  { id: "urban-cluj", label: "Cluj urban" },
  { id: "commune-blocks", label: "Residential" },
  { id: "landscape-mountains", label: "Landscape" },
  { id: "highway-aerial", label: "Highway" },
  { id: "satellite-default", label: "Satellite" },
];

type Props = {
  selected: PhotoId;
  onChange: (id: PhotoId) => void;
};

export function PhotoPicker({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={
          "grid aspect-video place-items-center rounded border text-[10px] uppercase tracking-wider transition-colors " +
          (selected === null
            ? "border-primary bg-primary/10 text-primary-deep"
            : "border-border-subtle bg-surface text-on-surface-variant hover:border-primary")
        }
      >
        No photo
      </button>
      {OPTIONS.map((opt) => {
        const url = photoUrl(opt.id)!;
        const active = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={
              "relative aspect-video overflow-hidden rounded border transition-colors " +
              (active ? "border-primary ring-2 ring-primary/30" : "border-border-subtle hover:border-primary")
            }
          >
            <img src={url} alt={opt.label} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-[9px] uppercase tracking-wider text-white">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
