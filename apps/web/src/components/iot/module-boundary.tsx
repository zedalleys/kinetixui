import { cn } from "@/lib/utils";

/**
 * Where `@kinetixui/iot` sits in a connected product, drawn as an ordered list of layers.
 *
 * It is HTML and CSS rather than an image for three reasons: it reads as an ordered list to a screen reader,
 * which a picture does not; it reflows to one narrow column on a phone instead of shrinking to nothing; and it
 * re-themes with the rest of the site. The figure is named by its caption, the provider chips are a labelled
 * list, and the connector arrows are decorative because the numbering already carries the sequence.
 *
 * The load-bearing part is the dashed boundary. Everything above it is the application's, and one of those
 * layers — the adapter — does not exist in KinetixUI at all. A diagram that drew a line from a protocol
 * straight to a component would imply this module talks to devices. It does not, and the words "KinetixUI does
 * not own the transport" are written into the boundary rather than left to the colours.
 *
 * The provider names are examples of what an *application* might use. They are not a support list, which is why
 * the chips sit under a heading that says so.
 */

/** What an application might already be using to reach a device. Named as examples, never as support. */
const PROVIDERS = ["MQTT", "BLE", "Matter", "REST", "WebSocket", "Vendor SDK", "Cloud service"] as const;

type Layer = {
  title: string;
  body: string;
  owner: "you" | "kinetixui";
  /** Ends with the boundary statement. */
  boundary?: boolean;
  chips?: boolean;
  mono?: boolean;
};

const LAYERS: readonly Layer[] = [
  {
    title: "Application and provider layer",
    body: "Wherever device state actually comes from. These are examples of what your application might use; KinetixUI ships none of them.",
    owner: "you",
    chips: true,
  },
  {
    title: "Application adapter",
    body: "Your code turns whatever the provider sends into KinetixUI's shapes: a device with a status, a reading with a timestamp, a command that was confirmed or was not. It also carries intent the other way, from a callback to the provider.",
    owner: "you",
    boundary: true,
  },
  {
    title: "@kinetixui/iot/functions",
    body: "The state model as pure functions: device status and health, telemetry quality and thresholds, the command lifecycle, pairing stages, automation rules, the space hierarchy. No React, no DOM, no clock unless you pass one.",
    owner: "kinetixui",
    mono: true,
  },
  {
    title: "@kinetixui/iot/react",
    body: "Primitives, controls and patterns that draw that state, and report intent through callbacks. They send nothing.",
    owner: "kinetixui",
    mono: true,
  },
  {
    title: "Compositions",
    body: "Whole screens assembled from those parts, published as source on this site to copy into your own product. Your layout, your copy, your decisions.",
    owner: "you",
  },
];

export function ModuleBoundary({ className }: { className?: string }) {
  return (
    <figure className={cn("not-prose m-0", className)} aria-labelledby="module-boundary-caption">
      <figcaption id="module-boundary-caption" className="mb-4 text-sm font-medium text-foreground">
        Where KinetixUI IoT sits, from the application down to the interface. Everything above the boundary is
        yours.
      </figcaption>
      <ol className="grid gap-2">
        {LAYERS.map((layer, i) => (
          <li key={layer.title}>
            <div
              className={cn(
                "rounded-lg border p-4",
                layer.owner === "kinetixui"
                  ? "border-primary/40 bg-primary/5"
                  : layer.boundary
                    ? "border-dashed border-border bg-transparent"
                    : "border-border bg-muted/30",
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span aria-hidden className="font-mono text-[11px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    layer.mono ? "font-mono" : "font-display",
                    layer.owner === "kinetixui" ? "text-primary" : "text-foreground",
                  )}
                  dir={layer.mono ? "ltr" : undefined}
                >
                  {layer.title}
                </span>
                <span
                  className={cn(
                    "ms-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
                    layer.owner === "kinetixui" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {layer.owner === "kinetixui" ? "KinetixUI IoT" : "Yours"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{layer.body}</p>
              {layer.chips ? (
                <ul aria-label="Examples of transports and providers your application might use" className="mt-3 flex flex-wrap gap-1.5">
                  {PROVIDERS.map((name) => (
                    <li key={name} className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground" dir="ltr">
                      {name}
                    </li>
                  ))}
                </ul>
              ) : null}
              {layer.boundary ? (
                <p className="mt-3 border-t border-dashed border-border pt-3 text-sm font-medium text-foreground">
                  The boundary: KinetixUI does not own the transport.
                </p>
              ) : null}
            </div>
            {i < LAYERS.length - 1 ? <div aria-hidden className="mx-auto h-2 w-px bg-border" /> : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
