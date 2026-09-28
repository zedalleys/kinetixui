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
}: {
  slug: string;
  title: string;
  description: string;
  uses: readonly string[];
  path: string;
  code: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-border bg-background", className)}>
      <header className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-title-sm text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {/* What it is built from, named rather than described — the reader can look each one up. */}
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {uses.map((name) => (
              <li
                key={name}
                className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <Tabs.Root defaultValue="preview">
        <div className="flex items-center justify-between border-b border-border px-2">
          <Tabs.List className="flex" aria-label={`${title}: preview or code`}>
            {(["preview", "code"] as const).map((value) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className={cn(
                  "-mb-px border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground",
                  "transition-colors duration-200 hover:text-foreground motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  "data-[state=active]:border-primary data-[state=active]:text-foreground",
                )}
              >
                {value}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <CopyButton
            value={code}
            className="me-1"
            // Only the surface and the position travel. Not the slug, not the snippet. See the note
            // on `iot_example_copied` in lib/analytics.ts for why this is not `component_code_copied`.
            onCopy={() => analytics.track("iot_example_copied", { source: "iot_page", location: "code_example" })}
          />
        </div>

        <Tabs.Content value="preview" forceMount className="data-[state=inactive]:hidden">
          {/* `overflow-x-auto` with a focusable region: the dashboard is wide, and a scroll container
              only a pointer can reach strands keyboard users (axe `scrollable-region-focusable`). */}
          <div
            role="region"
            aria-label={`${title} preview`}
            tabIndex={0}
            className="overflow-x-auto bg-muted/20 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6"
          >
            {children}
          </div>
        </Tabs.Content>

        <Tabs.Content value="code" forceMount className="data-[state=inactive]:hidden">
          <pre
            // Code is code: the surrounding prose flips under RTL and this must not.
            dir="ltr"
            tabIndex={0}
            aria-label={`${title} source, ${path}`}
            className="max-h-[32rem] overflow-auto p-4 font-mono text-[13px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <code>{code}</code>
          </pre>
          <p className="border-t border-border px-4 py-2 font-mono text-[11px] text-muted-foreground" dir="ltr">
            {path}
          </p>
        </Tabs.Content>
      </Tabs.Root>
      <span className="sr-only" data-example={slug} />
    </section>
  );
}
