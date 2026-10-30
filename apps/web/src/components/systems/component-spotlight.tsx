import type * as React from "react";
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
import { MountNear } from "./mount-near";

/**
 * The homepage's component discovery: fewer components, shown larger, each with what is true of it on every
 * platform beside it.
 *
 * The previews are the real React components. The strip under each one is derived on the server from the
 * manifest (`platformStateFor`) and `verification.json` (`verificationFor`), so it can say "composition" or
 * "planned" where that is the truth instead of a row of identical ticks. It is always visible; hovering or
 * focusing a tile only brings it forward.
 *
 * A server component: the tiles, notes and strips are HTML. The previews are the real interactive components,
 * mounted on the client as their tile nears the screen (`MountNear`).
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
    // Tablet: the composed interface across the top, the three components in a row under it. Desktop: the
    // composed interface beside the three, which stack; no tile is stretched past what its content needs.
    //
    // One ladder, all `-rem`. `md-rem` is `48rem`, which is `md` for a reader who has not changed
    // their text size, so nothing moves at 100%. It is not `md:`, because a `px` rung and a `rem`
    // rung on the same property resolve by source order and the `px` one wins — which left this a
    // three-column grid holding children that asked for five- and seven-column spans. See
    // `remBreakpoints` in packages/ui/tailwind.config.ts.
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 md-rem:grid-cols-3 lg-rem:grid-cols-12 lg-rem:items-start">
      {lead ? <Tile item={lead} lead className="md-rem:col-span-3 lg-rem:col-span-7 lg-rem:row-span-3" /> : null}
      {rest.map((item) => (
        <Tile key={item.slug} item={item} className="lg-rem:col-span-5" />
      ))}
    </div>
  );
}

function Tile({ item, lead = false, className }: { item: SpotlightItem; lead?: boolean; className?: string }) {
  const preview = PREVIEW[item.slug];
  // Styled by `.kx-tile*` in globals.css (the lead tile through `data-lead`): four tiles repeating the same utility
  // lists cost more in the page's HTML and component payload than everything they hold.
  return (
    <article data-spotlight={item.slug} {...(lead ? { "data-lead": "" } : {})} className={cn("kx-tile group", className)}>
      <div className="kx-tile-head">
        <h3>{item.name}</h3>
        <Link href={item.href}>
          Open<span className="sr-only"> {item.name}</span> <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <p className="kx-tile-note">{item.note}</p>
      <div className="kx-tile-preview">
        {/* the live component mounts as the tile nears the screen; the box holds its height until then */}
        {preview ? <MountNear className="kx-tile-mount">{preview()}</MountNear> : null}
      </div>
      <div className="kx-tile-foot">
        <p id={`strip-${item.slug}`}>{item.stripLabel}</p>
        {/* cells styled by `.kx-strip`: four strips of five cells would otherwise repeat the same utilities */}
        <ul aria-labelledby={`strip-${item.slug}`} className="kx-strip mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 [@container(min-width:30rem)]:grid-cols-5">
          {item.strip.map((c) => (
            <li key={c.platform} {...(c.kind === "implementation" ? { "data-implemented": "" } : {})}>
              <span>{c.short}</span>
              <span>{c.state}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
