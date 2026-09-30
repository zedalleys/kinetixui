"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { CopyButton } from "@/components/copy-button";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Preview / Code for one IoT example.
 *
 * **The preview arrives as `children`.** That is the whole architectural point: this wrapper is a
 * client component because tabs need state, but the composition it shows is passed in already
 * rendered, so a static example (the fleet, the telemetry board, the troubleshooting grid) stays
 * server-rendered and only the tab chrome ships as JavaScript. Two of the six examples are
 * interactive and bring their own `"use client"`; the other four do not become client components
 * just because they live inside a tab.
 *
 * **Both panels stay mounted.** `forceMount` plus `hidden` rather than unmount-on-switch: the
 * interactive examples hold demo state, and losing a reader's acknowledged alert because they looked
 * at the code would be a strange thing for a code viewer to do.
 *
 * **The code is the file.** It comes from `iot-examples.generated.ts`, extracted from the same module
 * that rendered the preview, so the two cannot drift. See `scripts/gen-iot-examples.mjs`.
 */
export function IotExampleShowcase({
  slug,
  title,
  description,
  uses,
  path,
  code,
  children,
  className,
  bare = false,
}: {
  slug: string;
  title: string;
  description: string;
  uses: readonly string[];
  path: string;
  code: string;
  children: React.ReactNode;
  className?: string;
  /**
   * The preview brings its own surface (for example `ShowcaseShell`), so the wrapper drops its tinted frame and
   * padding and lets the child sit directly on the page. Default `false` keeps the framed preview.
   */
  bare?: boolean;
}) {
  // "Built from" is a quiet inline list from `md`; below it, a disclosure that starts closed. The list is rendered
  // once, inside the `<details>`, which is forced open from `md` up (and follows the breakpoint when it changes).
  const [partsOpen, setPartsOpen] = React.useState(false);
  // Radix Tabs stamps `dir="ltr"` on its root unless told otherwise, which would force every preview LTR. Read the
  // document's direction after mount (so server render and hydration agree) and hand it down.
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
  React.useEffect(() => {
    const read = () => setDir(document.documentElement.dir === "rtl" ? "rtl" : "ltr");
    read();
    // Follow a direction change made after mount (a language switch, a devtools toggle) instead of freezing the first reading.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(min-width: 768px)");
    setPartsOpen(query.matches);
    const onChange = (event: MediaQueryListEvent) => setPartsOpen(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <section className={cn("flex min-w-0 flex-col gap-4 sm:gap-5", className)}>
      <header className="flex min-w-0 flex-col gap-2">
        <h3 className="text-title-lg text-foreground">{title}</h3>
        <p className="max-w-3xl text-body-md text-muted-foreground">{description}</p>
        {/* What it is built from, named rather than described — the reader can look each one up. */}
        <details open={partsOpen} onToggle={(event) => setPartsOpen(event.currentTarget.open)} className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-body-md text-muted-foreground marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden">
            <span>
              Built from {uses.length} {uses.length === 1 ? "part" : "parts"}
            </span>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={cn("transition-transform duration-fast motion-reduce:transition-none", partsOpen && "rotate-180")}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pb-1 md:pb-0">
            <span className="hidden text-body-sm text-muted-foreground md:inline">Built from</span>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {uses.map((name) => (
                <li key={name} className="font-mono text-label-md text-muted-foreground">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </header>

      <Tabs.Root defaultValue="preview" dir={dir} className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Tabs.List aria-label={`${title}: preview or code`} className="inline-flex rounded-full bg-muted/70 p-1">
            {(["preview", "code"] as const).map((value) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className={cn(
                  "min-h-11 rounded-full px-5 text-label-lg capitalize text-muted-foreground md:min-h-9 md:px-4",
                  "transition-colors duration-fast hover:text-foreground motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                )}
              >
                {value}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <CopyButton
            value={code}
            className="size-11 md:size-8"
            // Only the surface and the position travel. Not the slug, not the snippet. See the note
            // on `iot_example_copied` in lib/analytics.ts for why this is not `component_code_copied`.
            onCopy={() => analytics.track("iot_example_copied", { source: "iot_page", location: "code_example" })}
          />
        </div>

        <Tabs.Content value="preview" forceMount className="data-[state=inactive]:hidden">
          {/* `overflow-x-auto` with a focusable region: the dashboard is wide, and a scroll container
              only a pointer can reach strands keyboard users (axe `scrollable-region-focusable`). The
              region keeps its tabindex and its name whether or not it currently overflows — whether it
              does depends on the example and the viewport, and a tab stop that comes and goes with the
              window width is worse than one that is occasionally spare.

              The inline padding is the phone-width part: at 390 the page gutter already takes 32px, and
              a further 32px here left an otherwise-responsive example 326px to lay itself out in, which
              is where the "looks broken on a phone" reports came from. Below `sm` the frame is 8px a
              side — enough for the tint to read as a separate surface, 24px more content per example.
              `sm:p-6` is unchanged, so the desktop framing is exactly what it was. */}
          <div
            role="region"
            aria-label={`${title} preview`}
            tabIndex={0}
            className={cn(
              "overflow-x-auto rounded-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              bare ? undefined : "bg-muted/30 px-2 py-4 sm:p-6",
            )}
          >
            {children}
          </div>
        </Tabs.Content>

        <Tabs.Content value="code" forceMount className="data-[state=inactive]:hidden">
          <div className="overflow-hidden rounded-2xl bg-muted/40">
            <pre
              // Code is code: the surrounding prose flips under RTL and this must not.
              dir="ltr"
              tabIndex={0}
              aria-label={`${title} source, ${path}`}
              className="max-h-96 overflow-auto p-4 font-mono text-body-md leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <code>{code}</code>
            </pre>
            <p className="px-4 pb-3 font-mono text-label-md text-muted-foreground" dir="ltr">
              {path}
            </p>
          </div>
        </Tabs.Content>
      </Tabs.Root>
      <span className="sr-only" data-example={slug} />
    </section>
  );
}
