"use client";

/**
 * Showcase primitives: small, presentational, token-only building blocks for the IoT showcase compositions.
 *
 * SHOWCASE code, not part of `@kinetixui/iot`. They express the visual language of the maturity pass:
 * three surface tiers (canvas, surface, inset), no borders on ordinary surfaces, scale contrast in the type
 * tokens, and state carried by shape + word + tint. Logical properties only, no arbitrary values.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * State glyphs
 * ----------------------------------------------------------------------------------------------- */

/** Shared state vocabulary of the kit. `confirmed` is the calm default; every other state has its own shape. */
export type ShowcaseState = "confirmed" | "pending" | "offline" | "warning" | "critical";

const STATE_WORD: Record<ShowcaseState, string> = {
  confirmed: "Confirmed",
  pending: "Not yet confirmed",
  offline: "Offline",
  warning: "Needs attention",
  critical: "Critical",
};

export const showcaseStateWord = (state: ShowcaseState) => STATE_WORD[state];

const GLYPH: Record<ShowcaseState, React.ReactNode> = {
  // check in a circle
  confirmed: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.4 2.7 2.7L16 9.6" />
    </>
  ),
  // dashed circle with a small clock hand
  pending: (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  // circle with a slash
  offline: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 18.4 12.8-12.8" />
    </>
  ),
  // triangle
  warning: (
    <>
      <path d="M12 3.8 21.2 19.6a.9.9 0 0 1-.8 1.4H3.6a.9.9 0 0 1-.8-1.4Z" />
      <path d="M12 10v4.4" />
      <path d="M12 17.4h.01" />
    </>
  ),
  // octagon
  critical: (
    <>
      <path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2Z" />
      <path d="M12 7.6v5.2" />
      <path d="M12 16.2h.01" />
    </>
  ),
};

/**
 * A state glyph. Decorative by default (`aria-hidden`); pass `label` only when the glyph is the sole carrier of
 * the word, which it should not be — put the word beside it.
 */
export function StateGlyph({ state, size = 16, label, className }: { state: ShowcaseState; size?: number; label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {GLYPH[state]}
    </svg>
  );
}

export const STATE_TEXT: Record<ShowcaseState, string> = {
  confirmed: "text-success",
  pending: "text-primary",
  offline: "text-muted-foreground",
  warning: "text-warning",
  critical: "text-destructive",
};

/** A state as glyph + word, e.g. "Needs attention" with a triangle. Never colour alone. */
export function StateBadge({ state, children, className }: { state: ShowcaseState; children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-body-md text-foreground", className)}>
      <StateGlyph state={state} className={STATE_TEXT[state]} />
      <span>{children ?? STATE_WORD[state]}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Chevron (internal)
 * ----------------------------------------------------------------------------------------------- */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0 text-muted-foreground transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Panel
 * ----------------------------------------------------------------------------------------------- */

type HeadingTag = "h3" | "h4" | "h5";

/**
 * Panel: a titled surface with a quiet header and an optional action. Replaces the bordered box.
 * `tone="surface"` is `bg-card`; `tone="inset"` is the tier below (`bg-muted/60`) for grouped controls.
 */
export function Panel({
  title,
  description,
  action,
  as: Heading = "h4",
  tone = "surface",
  padded = true,
  className,
  children,
  ...rest
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Sits at the inline-end of the header, e.g. a "View all" button. */
  action?: React.ReactNode;
  /** The page owns levels 1-3 around an example, so the default is 4. */
  as?: HeadingTag;
  tone?: "surface" | "inset";
  padded?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  const titleId = React.useId();
  return (
    <section
      {...rest}
      aria-labelledby={title ? titleId : rest["aria-labelledby"]}
      className={cn(
        "flex min-w-0 flex-col gap-4",
        tone === "surface" ? "rounded-2xl bg-card text-card-foreground shadow-sm" : "rounded-xl bg-muted/60",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {title || action ? (
        <header className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title ? (
              <Heading id={titleId} className="text-title-md text-foreground">
                {title}
              </Heading>
            ) : null}
            {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Disclosure
 * ----------------------------------------------------------------------------------------------- */

/**
 * Disclosure: a Panel-looking `<details>` with a count badge and a visible chevron. With `defaultOpen` left
 * undefined it starts collapsed below `md` and open from `md` up (read after mount, so the server render and
 * hydration agree), which is what the shell's aside wants: secondary information present, not shouting.
 */
export function Disclosure({
  title,
  count,
  countNoun = "items",
  defaultOpen,
  className,
  children,
}: {
  title: React.ReactNode;
  count?: number;
  /** Read after the number by assistive technology only ("3 items"). */
  countNoun?: string;
  defaultOpen?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  React.useEffect(() => {
    if (defaultOpen !== undefined) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(min-width: 768px)").matches) setOpen(true);
  }, [defaultOpen]);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={cn("min-w-0 rounded-2xl bg-card text-card-foreground shadow-sm", className)}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-title-md text-foreground marker:hidden sm:px-5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{title}</span>
          {count !== undefined ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 text-label-md tabular-nums text-foreground">
              {count}
              <span className="sr-only"> {countNoun}</span>
            </span>
          ) : null}
        </span>
        <Chevron open={open} />
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </details>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Stat
 * ----------------------------------------------------------------------------------------------- */

const STAT_SIZE = { md: "text-headline-lg", lg: "text-display-sm" } as const;

/** Stat: large value + unit + label, with an optional worded trend and/or state. */
export function Stat({
  label,
  value,
  unit,
  trend,
  trendDirection,
  state,
  stateWord,
  size = "md",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  /** Words, e.g. "0.4 °C warmer than yesterday". */
  trend?: React.ReactNode;
  trendDirection?: "up" | "down" | "flat";
  state?: ShowcaseState;
  /** Overrides the default word for `state`. */
  stateWord?: React.ReactNode;
  size?: keyof typeof STAT_SIZE;
  className?: string;
}) {
  const arrow = trendDirection === "up" ? "M12 19V5m-6 6 6-6 6 6" : trendDirection === "down" ? "M12 5v14m-6-6 6 6 6-6" : "M5 12h14";
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <p className="text-body-md text-muted-foreground">{label}</p>
      <p className={cn("tabular-nums text-foreground", STAT_SIZE[size])}>
        {/* number then unit as one left-to-right run, so an RTL page does not print "% 92" */}
        <bdi dir="ltr" className="inline-flex items-baseline gap-1.5">
          <span>{value}</span>
          {unit ? <span className="text-title-md text-muted-foreground">{unit}</span> : null}
        </bdi>
      </p>
      {state ? <StateBadge state={state}>{stateWord}</StateBadge> : null}
      {trend ? (
        <p className="inline-flex items-center gap-1 text-body-sm text-muted-foreground">
          {trendDirection ? (
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d={arrow} />
            </svg>
          ) : null}
          <bdi>{trend}</bdi>
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Chips
 * ----------------------------------------------------------------------------------------------- */

/** A small read-only summary chip for the header: an optional glyph, a label and a value. */
export function SummaryChip({ icon, label, value, className }: { icon?: React.ReactNode; label?: string; value: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-9 items-center gap-2 rounded-full bg-card px-3 text-body-md text-foreground shadow-sm", className)}>
      {icon ? (
        <span aria-hidden="true" className="text-muted-foreground">
          {icon}
        </span>
      ) : null}
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      <bdi className="tabular-nums">{value}</bdi>
    </span>
  );
}

/** The header's attention button: a count with a word and a glyph. `count === 0` reads "All clear". */
export function AttentionButton({
  count,
  label = "need attention",
  onClick,
  pressed,
  className,
}: {
  count: number;
  /** The noun phrase after the count, e.g. "need attention". */
  label?: string;
  onClick?: () => void;
  pressed?: boolean;
  className?: string;
}) {
  const clear = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-body-md font-medium text-foreground md:min-h-9",
        "transition-colors duration-fast motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        clear ? "bg-card shadow-sm hover:bg-muted" : "bg-warning/15 hover:bg-warning/25",
        className,
      )}
    >
      <StateGlyph state={clear ? "confirmed" : "warning"} className={clear ? "text-success" : "text-warning"} />
      <span className="tabular-nums">{clear ? "All clear" : `${count} ${label}`}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------------------------------
 * SpaceHeader
 * ----------------------------------------------------------------------------------------------- */

/** An abstract original house mark: a soft tile with a roofline and a lit window. Decorative. */
export function HouseMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm sm:size-14", className)}>
      <svg viewBox="0 0 48 48" width={36} height={36} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22 24 8l18 14" className="stroke-primary" strokeWidth={3} />
        <path d="M11 20v18a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V20" className="fill-primary/10 stroke-muted-foreground/50" strokeWidth={2} />
        <rect x="19" y="24" width="10" height="16" rx="3" className="fill-card stroke-muted-foreground/50" strokeWidth={2} />
        <circle cx="26.5" cy="32" r="1.2" className="fill-primary stroke-none" />
        <circle cx="35" cy="14" r="2.2" className="fill-warning/60 stroke-none" />
      </svg>
    </span>
  );
}

/** A round 44px icon button for the header's compact cluster. `badge` is a count drawn as a dot with a number. */
export function IconButton({
  label,
  onClick,
  pressed,
  badge,
  children,
  className,
}: {
  /** The accessible name. The glyph itself is decorative. */
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  badge?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={badge ? `${label}, ${badge} new` : label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "relative inline-flex size-11 items-center justify-center rounded-full text-foreground",
        "transition-colors duration-fast motion-reduce:transition-none hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pressed && "bg-muted",
        className,
      )}
    >
      <span aria-hidden="true">{children}</span>
      {badge ? (
        <span aria-hidden="true" className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-label-md tabular-nums text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/** A pill that groups `IconButton`s tonally, like a compact toolbar. */
export function IconCluster({ children, label, className }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function SpaceHeader({
  title,
  eyebrow,
  location,
  identity,
  icon,
  status,
  statusWord,
  chips,
  actions,
  attention,
  as: Heading = "h4",
  className,
}: {
  title: React.ReactNode;
  /** A small line above the title, e.g. "Home · 2 floors". */
  eyebrow?: React.ReactNode;
  /** A quiet location line under the title, with a pin glyph, e.g. "Demo street 4". */
  location?: React.ReactNode;
  /** The identity tile at the start. Defaults to the abstract `HouseMark`; pass your own for a farm or a plant. */
  identity?: React.ReactNode;
  /** Shorthand for a tinted identity tile around a glyph (used when `identity` is not given). */
  icon?: React.ReactNode;
  /** Overall status: glyph + word. */
  status?: ShowcaseState;
  /** The word for `status`; defaults to the kit's word for it. */
  statusWord?: React.ReactNode;
  /** Environment summary chips (`SummaryChip`s). */
  chips?: React.ReactNode;
  /** A compact cluster of round icon buttons (`IconCluster` with `IconButton`s). */
  actions?: React.ReactNode;
  /** The attention / notification button (`AttentionButton`). */
  attention?: React.ReactNode;
  as?: HeadingTag;
  className?: string;
}) {
  const mark =
    identity ??
    (icon ? (
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-14">
        {icon}
      </span>
    ) : (
      <HouseMark />
    ));
  return (
    <div className={cn("flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6", className)}>
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {mark}
        <div className="flex min-w-0 flex-col">
          {eyebrow ? <p className="truncate text-label-md uppercase tracking-wide text-muted-foreground">{eyebrow}</p> : null}
          <Heading className="truncate text-title-lg text-foreground sm:text-headline-sm">{title}</Heading>
          {location ? (
            <p className="flex items-center gap-1.5 text-body-md text-muted-foreground">
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" focusable="false">
                  <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z" />
                  <circle cx="12" cy="10" r="2" />
                </svg>
              </span>
              <span className="truncate">{location}</span>
            </p>
          ) : null}
          {status ? (
            <StateBadge state={status} className="mt-0.5 text-body-md text-muted-foreground">
              {statusWord}
            </StateBadge>
          ) : null}
        </div>
      </div>
      {chips || actions || attention ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {chips}
          {actions}
          {attention}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Rail
 * ----------------------------------------------------------------------------------------------- */

// Below lg the rail is a wrapped tile selector (2-3 columns, no hidden scroll); from lg it is one column of rows.
const RAIL_GRID = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col lg:gap-1";

/** The rail's list. Children are `RailItem`s and/or `RailGroup`s. */
export function RailList({ children, className, ...rest }: { children: React.ReactNode; className?: string } & Omit<React.HTMLAttributes<HTMLUListElement>, "children">) {
  return (
    <ul {...rest} className={cn("flex flex-col gap-2 lg:gap-3", className)}>
      {children}
    </ul>
  );
}

/** A labelled group of rail items (e.g. a floor). */
export function RailGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <li className="flex flex-col gap-2 lg:gap-1">
      <p id={id} className="px-1 text-label-md uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ul aria-labelledby={id} className={RAIL_GRID}>
        {children}
      </ul>
    </li>
  );
}

/** RailItem: one selectable space/device row. `selected` -> `aria-current`, tint, weight and a start-edge bar. */
export function RailItem({
  icon,
  name,
  state,
  health,
  healthWord,
  count,
  countNoun = "devices",
  selected = false,
  onSelect,
  className,
}: {
  icon?: React.ReactNode;
  name: string;
  /** One line of state, e.g. "21.4 °C · 2 devices". */
  state?: string;
  /** A non-confirmed health state adds its glyph, and `healthWord` (or the default word) for assistive technology. */
  health?: ShowcaseState;
  healthWord?: string;
  count?: number;
  countNoun?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "relative flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-start lg:gap-3 lg:px-3",
          "transition-colors duration-fast motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "bg-primary/10 font-semibold text-foreground" : "bg-card/70 text-foreground hover:bg-card lg:bg-transparent lg:hover:bg-card/70",
          className,
        )}
      >
        {selected ? <span aria-hidden="true" className="absolute inset-y-2 start-0 hidden w-1 rounded-full bg-primary lg:block" /> : null}
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-md leading-snug sm:truncate">{name}</span>
          {state ? <span className={cn("text-body-sm font-normal sm:truncate", selected ? "text-foreground/80" : "text-muted-foreground")}><bdi>{state}</bdi></span> : null}
        </span>
        {health && health !== "confirmed" ? (
          <>
            <StateGlyph state={health} className={STATE_TEXT[health]} />
            <span className="sr-only">{healthWord ?? STATE_WORD[health]}</span>
          </>
        ) : null}
        {count !== undefined ? (
          <span className="hidden min-w-6 items-center justify-center rounded-full bg-muted px-2 text-label-md font-medium tabular-nums text-foreground sm:inline-flex">
            {count}
            <span className="sr-only"> {countNoun}</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Tile
 * ----------------------------------------------------------------------------------------------- */

/**
 * Tile: a device tile. A soft tonal surface with the name and worded state at the start, an illustration at the
 * inline-end, and a big value with a control slot (a toggle) along the bottom. `requested` adds the dashed
 * "requested, not yet confirmed" treatment; the confirmed value stays the big number.
 */
export function Tile({
  visual,
  name,
  state,
  value,
  control,
  selected,
  onSelect,
  requested = false,
  requestedWord = "Requested, not yet confirmed",
  className,
}: {
  /** Usually a `DeviceIllustration`; placed at the inline-end. */
  visual?: React.ReactNode;
  name: string;
  /** Worded state, e.g. "On, 6 hr up" or "Offline". */
  state?: string;
  /** The confirmed value, big. */
  value?: React.ReactNode;
  /** The control slot (a switch, a small stepper). Kept outside the selectable area. */
  control?: React.ReactNode;
  /** When `onSelect` is given the tile is a toggle button (`aria-pressed`). */
  selected?: boolean;
  onSelect?: () => void;
  /** A request is pending: dashed outline plus the words. */
  requested?: boolean;
  requestedWord?: string;
  className?: string;
}) {
  const head = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-title-md text-foreground">{name}</span>
        {state ? <span className="text-body-md text-muted-foreground">{state}</span> : null}
        {requested ? (
          <span className="mt-1 inline-flex items-center gap-1.5 text-label-md font-medium text-foreground">
            <StateGlyph state="pending" size={14} className="text-primary" />
            {requestedWord}
          </span>
        ) : null}
      </span>
      {visual ? <span className="shrink-0 self-start">{visual}</span> : null}
    </>
  );
  const headClass = "flex min-h-11 w-full min-w-0 items-start justify-between gap-3 text-start";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border-2 p-4 transition-colors duration-fast motion-reduce:transition-none",
        requested ? "border-dashed border-primary" : "border-transparent",
        selected ? "bg-primary/10" : "bg-muted/60",
        className,
      )}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected ?? false}
          className={cn(headClass, "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
        >
          {head}
        </button>
      ) : (
        <div className={headClass}>{head}</div>
      )}
      {value !== undefined || control ? (
        <div className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-headline-sm tabular-nums text-foreground">{value}</span>
          {control ? <span className="shrink-0">{control}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
