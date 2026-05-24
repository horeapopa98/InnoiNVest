"use client";

import { defaultSlideForKind, SLIDE_KIND_LABELS, type Deck, type Slide } from "@/lib/mock/decks";
import { KpiPicker } from "./KpiPicker";
import { ParcelPicker } from "./ParcelPicker";
import { PhotoPicker } from "./PhotoPicker";
import {
  countyNarrative,
  cityNarrative,
  communeCallout,
} from "@/lib/decks/autoNarrative";

type Props = {
  deck: Deck;
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
  onResetToDefaults: () => void;
};

export function EditPanel({ deck, slide, onChange, onResetToDefaults }: Props) {
  return (
    <aside className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          {SLIDE_KIND_LABELS[slide.kind]}
        </p>
        <button
          type="button"
          onClick={onResetToDefaults}
          className="text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-primary-deep"
        >
          Reset
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        <Body deck={deck} slide={slide} onChange={onChange} />
      </div>
    </aside>
  );
}

function Body({ deck, slide, onChange }: { deck: Deck; slide: Slide; onChange: (p: Partial<Slide>) => void }) {
  switch (slide.kind) {
    case "cover":
      return (
        <Form>
          <Text label="Title" value={slide.title} onChange={(v) => onChange({ title: v } as Partial<Slide>)} />
          <Text label="Subtitle" value={slide.subtitle} onChange={(v) => onChange({ subtitle: v } as Partial<Slide>)} />
          <Text label="Prepared for" value={slide.preparedFor} onChange={(v) => onChange({ preparedFor: v } as Partial<Slide>)} />
          <Text label="Date issued" value={slide.dateIssued} onChange={(v) => onChange({ dateIssued: v } as Partial<Slide>)} />
        </Form>
      );
    case "section_divider":
    case "strategic_location":
    case "infrastructure_divider":
      return (
        <Form>
          <Text label="Title" value={slide.title} onChange={(v) => onChange({ title: v } as Partial<Slide>)} />
          <Field label="Background photo">
            <PhotoPicker
              selected={slide.backgroundPhotoId}
              onChange={(id) => onChange({ backgroundPhotoId: id } as Partial<Slide>)}
            />
          </Field>
        </Form>
      );
    case "county_snapshot":
      return (
        <Form>
          <Text label="Eyebrow" value={slide.eyebrow} onChange={(v) => onChange({ eyebrow: v } as Partial<Slide>)} />
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="KPI tiles (max 4)">
            <KpiPicker
              selected={slide.kpiCodes}
              onChange={(codes) => onChange({ kpiCodes: codes } as Partial<Slide>)}
              max={4}
            />
          </Field>
          <NarrativeBlock
            current={slide.narrative}
            onChange={(v) => onChange({ narrative: v } as Partial<Slide>)}
            generate={() => countyNarrative({ siruta: slide.locationSiruta, year: slide.dataYear })}
          />
        </Form>
      );
    case "city_snapshot":
      return (
        <Form>
          <Text label="Eyebrow" value={slide.eyebrow} onChange={(v) => onChange({ eyebrow: v } as Partial<Slide>)} />
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="KPI tiles (max 4)">
            <KpiPicker
              selected={slide.kpiCodes}
              onChange={(codes) => onChange({ kpiCodes: codes } as Partial<Slide>)}
              max={4}
            />
          </Field>
          <Field label="Photo">
            <PhotoPicker
              selected={slide.photoId}
              onChange={(id) => onChange({ photoId: id } as Partial<Slide>)}
            />
          </Field>
          <ParagraphsBlock
            paragraphs={slide.paragraphs}
            onChange={(ps) => onChange({ paragraphs: ps } as Partial<Slide>)}
            generate={() => cityNarrative({ siruta: slide.locationSiruta, year: slide.dataYear })}
          />
        </Form>
      );
    case "commune_detail":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="Photo">
            <PhotoPicker
              selected={slide.heroPhotoId}
              onChange={(id) => onChange({ heroPhotoId: id } as Partial<Slide>)}
            />
          </Field>
          <ParagraphsBlock
            paragraphs={slide.paragraphs}
            onChange={(ps) => onChange({ paragraphs: ps } as Partial<Slide>)}
            generate={() => [communeCallout({ siruta: slide.locationSiruta, year: slide.dataYear })]}
          />
          <Text label="Callout" value={slide.calloutText} onChange={(v) => onChange({ calloutText: v } as Partial<Slide>)} />
        </Form>
      );
    case "parcel_detail":
      return (
        <Form>
          <Text label="Title" value={slide.title} onChange={(v) => onChange({ title: v } as Partial<Slide>)} />
          <Field label="Parcel">
            <ParcelPicker selected={slide.parcelId} onChange={(id) => onChange({ parcelId: id } as Partial<Slide>)} />
          </Field>
          <ListBlock
            label="Features (3 pills)"
            items={slide.features}
            onChange={(items) => onChange({ features: items } as Partial<Slide>)}
            max={3}
          />
          <ListBlock
            label="Key features (bullets)"
            items={slide.keyFeatures}
            onChange={(items) => onChange({ keyFeatures: items } as Partial<Slide>)}
            max={8}
          />
          <Text label="Indicated price" value={slide.indicatedPrice} onChange={(v) => onChange({ indicatedPrice: v } as Partial<Slide>)} />
        </Form>
      );
    case "infrastructure_page":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="Parcel (map centre)">
            <ParcelPicker selected={slide.parcelId} onChange={(id) => onChange({ parcelId: id } as Partial<Slide>)} />
          </Field>
          <Field label="Distances">
            <div className="flex flex-col gap-2">
              {slide.distances.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px] gap-2">
                  <input
                    value={d.label}
                    onChange={(e) => {
                      const next = [...slide.distances];
                      next[i] = { ...d, label: e.target.value };
                      onChange({ distances: next } as Partial<Slide>);
                    }}
                    className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
                  />
                  <input
                    value={d.value}
                    onChange={(e) => {
                      const next = [...slide.distances];
                      next[i] = { ...d, value: e.target.value };
                      onChange({ distances: next } as Partial<Slide>);
                    }}
                    className="rounded border border-border-subtle bg-surface px-2 py-1 text-right text-xs"
                  />
                </div>
              ))}
            </div>
          </Field>
        </Form>
      );
    case "stat_infographic":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="Layout">
            <div className="flex gap-1">
              {(["radial", "panel"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onChange({ layout: l } as Partial<Slide>)}
                  className={
                    "rounded border px-2 py-1 text-xs " +
                    (slide.layout === l ? "border-primary bg-primary/10 text-primary-deep" : "border-border-subtle")
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <StatsBlock stats={slide.stats} onChange={(stats) => onChange({ stats } as Partial<Slide>)} max={8} />
        </Form>
      );
    case "trend":
    case "comparison":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Text label="Commentary" value={slide.commentary} onChange={(v) => onChange({ commentary: v } as Partial<Slide>)} multiline />
        </Form>
      );
    case "recommendation":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Field label="Sector">
            <div className="flex gap-1">
              {(["tech", "manufacturing", "general"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ sector: s } as Partial<Slide>)}
                  className={
                    "rounded border px-2 py-1 text-xs " +
                    (slide.sector === s ? "border-primary bg-primary/10 text-primary-deep" : "border-border-subtle")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Text label="Narrative" value={slide.narrative} onChange={(v) => onChange({ narrative: v } as Partial<Slide>)} multiline />
        </Form>
      );
    case "text":
      return (
        <Form>
          <Text label="Title" value={slide.title} onChange={(v) => onChange({ title: v } as Partial<Slide>)} />
          <ParagraphsBlock
            paragraphs={slide.paragraphs}
            onChange={(ps) => onChange({ paragraphs: ps } as Partial<Slide>)}
          />
        </Form>
      );
    case "contact":
      return (
        <Form>
          <Text label="Headline" value={slide.headline} onChange={(v) => onChange({ headline: v } as Partial<Slide>)} />
          <Text label="CTA" value={slide.ctaText} onChange={(v) => onChange({ ctaText: v } as Partial<Slide>)} />
        </Form>
      );
  }
}

function Form({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
        />
      )}
    </Field>
  );
}

function ParagraphsBlock({
  paragraphs,
  onChange,
  generate,
}: {
  paragraphs: string[];
  onChange: (ps: string[]) => void;
  generate?: () => string[];
}) {
  return (
    <Field label="Paragraphs">
      <div className="flex flex-col gap-2">
        {paragraphs.map((p, i) => (
          <textarea
            key={i}
            value={p}
            onChange={(e) => {
              const next = [...paragraphs];
              next[i] = e.target.value;
              onChange(next);
            }}
            rows={2}
            className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
          />
        ))}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange([...paragraphs, ""])}
            className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] hover:border-primary"
          >
            + Paragraph
          </button>
          {paragraphs.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(paragraphs.slice(0, -1))}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] text-on-surface-variant hover:text-error hover:border-error"
            >
              − Last
            </button>
          )}
          {generate && (
            <button
              type="button"
              onClick={() => onChange(generate())}
              className="ml-auto rounded border border-border-subtle px-2 py-1 text-[11px] hover:border-primary hover:text-primary-deep"
            >
              Auto-fill
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

function NarrativeBlock({
  current,
  onChange,
  generate,
}: {
  current: string | null;
  onChange: (v: string | null) => void;
  generate: () => string;
}) {
  return (
    <Field label="Narrative">
      <textarea
        value={current ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        rows={3}
        placeholder="Optional narrative…"
        className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
      />
      <button
        type="button"
        onClick={() => onChange(generate())}
        className="self-start rounded border border-border-subtle px-2 py-1 text-[11px] hover:border-primary hover:text-primary-deep"
      >
        Auto-fill from data
      </button>
    </Field>
  );
}

function ListBlock({
  label,
  items,
  onChange,
  max,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  max: number;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-col gap-1">
        {items.map((item, i) => (
          <input
            key={i}
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
          />
        ))}
        <div className="flex gap-1">
          {items.length < max && (
            <button
              type="button"
              onClick={() => onChange([...items, ""])}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] hover:border-primary"
            >
              + Item
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => onChange(items.slice(0, -1))}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] text-on-surface-variant hover:text-error hover:border-error"
            >
              − Last
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

function StatsBlock({
  stats,
  onChange,
  max,
}: {
  stats: Array<{ value: string; label: string }>;
  onChange: (next: Array<{ value: string; label: string }>) => void;
  max: number;
}) {
  return (
    <Field label="Stats">
      <div className="flex flex-col gap-2">
        {stats.map((s, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr] gap-2">
            <input
              value={s.value}
              onChange={(e) => {
                const next = [...stats];
                next[i] = { ...s, value: e.target.value };
                onChange(next);
              }}
              className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
            />
            <input
              value={s.label}
              onChange={(e) => {
                const next = [...stats];
                next[i] = { ...s, label: e.target.value };
                onChange(next);
              }}
              className="rounded border border-border-subtle bg-surface px-2 py-1 text-xs"
            />
          </div>
        ))}
        <div className="flex gap-1">
          {stats.length < max && (
            <button
              type="button"
              onClick={() => onChange([...stats, { value: "", label: "" }])}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] hover:border-primary"
            >
              + Stat
            </button>
          )}
          {stats.length > 0 && (
            <button
              type="button"
              onClick={() => onChange(stats.slice(0, -1))}
              className="rounded border border-dashed border-border-subtle px-2 py-1 text-[11px] text-on-surface-variant hover:text-error hover:border-error"
            >
              − Last
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}
