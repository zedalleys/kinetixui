import { cn } from "@/lib/utils";

/**
 * Where `@kinetixui/iot` sits in a connected-device product — as a list of layers, top to bottom.
 *
 * It is HTML and CSS rather than an image for three reasons: it reads as an ordered list to a screen reader,
 * which a diagram does not; it reflows to one narrow column on a phone instead of shrinking to nothing; and it
 * re-themes with the rest of the site.
 *
 * The load-bearing part is that two of the five layers are **yours** and one of those does not exist in
 * KinetixUI at all. A diagram that drew a straight line from hardware to primitives would imply this module
 * talks to devices. It does not, and the dashed "you provide this" band is the whole point of the picture.
 */

type Layer = {
  title: string;
  body: string;
  /** Who owns it: the product, or this module. */
  owner: "you" | "kinetixui";
  /** The one layer that is both yours and the boundary this module starts above. */
  boundary?: boolean;
};

const LAYERS: readonly Layer[] = [
  {
    title: "Your devices and backend",
    body: "Hardware, a fleet service, a vendor cloud — wherever device state actually comes from.",
    owner: "you",
  },
  {
    title: "Your adapter layer",
    body: "Whatever moves that state into your app: an API call, a gateway, a device SDK, a socket, a broker. KinetixUI ships none of this.",
    owner: "you",
    boundary: true,
  },
  {
    title: "@kinetixui/iot/functions",
    body: "Models and pure functions. Classify a battery, band a signal, decide whether a reading is stale, compare two firmware strings. No React, no DOM.",
    owner: "kinetixui",
  },
  {
    title: "@kinetixui/iot/react",
    body: "Five primitives that render those facts as text first: DeviceStatusBadge, BatteryIndicator, SignalStrength, LastSync, SensorReading.",
    owner: "kinetixui",
  },
  {
    title: "Your product UI",
    body: "Your screens, your layout, your copy. The primitives are parts, not a dashboard.",
    owner: "you",
  },
];

export function ModuleBoundary({ className }: { className?: string }) {
  return (
    <div className={cn("not-prose", className)}>
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
                    "font-display text-sm font-semibold",
                    layer.owner === "kinetixui" ? "text-primary" : "text-foreground",
                  )}
                >
                  {layer.title}
                </span>
                <span
                  className={cn(
                    "ms-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
                    layer.owner === "kinetixui"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {layer.owner === "kinetixui" ? "KinetixUI IoT" : "You provide this"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{layer.body}</p>
            </div>
            {/* Decorative connector: the ordered list already carries the sequence. */}
            {i < LAYERS.length - 1 ? (
              <div aria-hidden className="mx-auto h-2 w-px bg-border" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
