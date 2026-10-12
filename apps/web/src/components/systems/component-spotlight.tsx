"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  NativeSelect,
  NativeSelectOption,
  SegmentedControl,
  SegmentedControlItem,
  Slider,
} from "@kinetixui/ui";
import { PreferencesPanel } from "@/examples/flagship-preferences";
import { cn } from "@/lib/utils";

/**
 * The homepage's component discovery: fewer components, shown larger, each with what is true of it on every
 * platform beside it.
 *
 * The previews are the real React components. The strip under each one is derived on the server from the
 * manifest (`platformStateFor`) and `verification.json` (`verificationFor`), so it can say "composition" or
 * "planned" where that is the truth instead of a row of identical ticks. It is always visible; hovering or
 * focusing a tile only brings it forward.
 */

export type StripCell = { platform: string; short: string; state: string; kind: "implementation" | "guidance" | "none" };
export type SpotlightItem = {
  slug: string;
  name: string;
  /** what the strip is measuring, said in its header */
  stripLabel: string;
  note: string;
  href: string;
  strip: StripCell[];
};

const PREVIEW: Record<string, () => React.ReactNode> = {
  "flagship-preferences": () => <PreferencesPanel />,
  "segmented-control": () => (
    <SegmentedControl defaultValue="grid" aria-label="View" className="w-full max-w-xs">
      <SegmentedControlItem value="list">List</SegmentedControlItem>
      <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      <SegmentedControlItem value="board">Board</SegmentedControlItem>
    </SegmentedControl>
  ),
  slider: () => <Slider aria-label="Volume" defaultValue={[64]} max={100} step={1} className="w-full max-w-xs" />,
  "native-select": () => (
    <NativeSelect aria-label="Region" className="max-w-xs" defaultValue="eu">
      <NativeSelectOption value="eu">Europe</NativeSelectOption>
      <NativeSelectOption value="us">United States</NativeSelectOption>
      <NativeSelectOption value="apac">Asia Pacific</NativeSelectOption>
    </NativeSelect>
  ),
};

export function ComponentSpotlight({ items }: { items: SpotlightItem[] }) {
  const [lead, ...rest] = items;
  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg-rem:grid-cols-12">
      {lead ? <Tile item={lead} lead className="lg-rem:col-span-7 lg-rem:row-span-3" /> : null}
      {rest.map((item) => (
        <Tile key={item.slug} item={item} className="lg-rem:col-span-5" />
      ))}
    </div>
  );
}

function Tile({ item, lead = false, className }: { item: SpotlightItem; lead?: boolean; className?: string }) {
  const preview = PREVIEW[item.slug];
  return (
    <article
      data-spotlight={item.slug}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-background transition-colors duration-fast",
        "hover:border-primary/40 focus-within:border-primary/40",
        className,
      )}
    >
      <div className={cn("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-5", lead && "sm:px-7 sm:pt-7")}>
        <h3 className={cn("min-w-0 break-words font-display font-semibold", lead ? "text-2xl" : "text-lg")}>{item.name}</h3>
        <Link
          href={item.href}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 text-sm font-medium text-primary underline underline-offset-4"
        >
          Open<span className="sr-only"> {item.name}</span> <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <p className={cn("px-5 pt-1 text-sm text-muted-foreground", lead && "sm:px-7")}>{item.note}</p>
      <div
        className={cn(
          "flex flex-1 items-center justify-center px-5",
          lead ? "min-h-[22rem] py-10 sm:px-7" : "min-h-[8.5rem] py-6",
        )}
      >
        {preview ? preview() : null}
      </div>
      <div className="border-t border-border bg-muted/30 px-5 py-3 transition-colors duration-fast group-hover:bg-primary/5 group-focus-within:bg-primary/5">
        <p id={`strip-${item.slug}`} className="font-mono text-xs text-muted-foreground">
          {item.stripLabel}
        </p>
        <ul aria-labelledby={`strip-${item.slug}`} className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-5">
          {item.strip.map((c) => (
            <li key={c.platform} className="min-w-0 text-xs">
              <span className="block font-medium text-foreground">{c.short}</span>
              <span
                className={cn(
                  "block font-mono",
                  c.kind === "implementation" ? "text-primary" : "text-muted-foreground",
                )}
              >
                {c.state}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
