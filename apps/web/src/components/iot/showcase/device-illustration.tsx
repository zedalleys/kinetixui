/**
 * DeviceIllustration: small original, abstract illustrations of generic device shapes, drawn as inline SVG with token
 * classes only. Showcase code, not part of `@kinetixui/iot`. Decorative (`aria-hidden`): the host tile always carries
 * the name and the state in words.
 *
 * `on` drives a warm glow, an accent tint or a filled level, never as the only carrier of state. The shapes are
 * deliberately generic (a pendant, a sphere, a dome, a keypad slab) and do not depict any real product.
 */
import * as React from "react";
import type { KinetixDeviceCategory } from "@kinetixui/iot/functions";
import { cn } from "@/lib/utils";

/** Every device category, plus a generic spherical `speaker`, which the package has no category for. */
export type IllustrationKind = KinetixDeviceCategory | "speaker";

const SIZE = { sm: "size-10", md: "size-16", lg: "size-28" } as const;

// shared token classes
const BODY = "fill-card stroke-muted-foreground/55";
const DARK = "fill-foreground/85 stroke-none";
const SOFT = "fill-muted stroke-muted-foreground/45";
const LINE = "fill-none stroke-muted-foreground/50";

function art(kind: IllustrationKind, on: boolean): React.ReactNode {
  const accent = on ? "fill-primary stroke-none" : "fill-muted-foreground/40 stroke-none";
  const accentStroke = on ? "stroke-primary" : "stroke-muted-foreground/40";
  switch (kind) {
    case "light":
      return (
        <>
          {on ? (
            <>
              <path d="M32 66 20 92H76L64 66Z" className="fill-warning/20 stroke-none" />
              <circle cx="48" cy="68" r="22" className="fill-warning/20 stroke-none" />
            </>
          ) : null}
          <path d="M48 0V22" className={LINE} strokeWidth={2} />
          <rect x="43" y="20" width="10" height="9" rx="3" className={DARK} />
          <path d="M24 64C24 44 34 32 48 30C62 32 72 44 72 64Z" className={DARK} />
          <path d="M24 64H72" className="stroke-background/40" strokeWidth={2} />
          <circle cx="48" cy="68" r="6" className={on ? "fill-warning stroke-none" : "fill-muted-foreground/40 stroke-none"} />
        </>
      );
    case "speaker":
    case "unknown":
      return kind === "unknown" ? (
        <>
          <rect x="16" y="16" width="64" height="64" rx="18" className={BODY} strokeWidth={2.5} />
          <circle cx="48" cy="48" r="10" className={LINE} strokeWidth={2} />
        </>
      ) : (
        <>
          <ellipse cx="48" cy="88" rx="26" ry="4" className="fill-foreground/10 stroke-none" />
          <circle cx="48" cy="50" r="34" className={DARK} />
          <path d="M18 40Q48 54 78 40M15 52Q48 68 81 52M20 64Q48 78 76 64M28 28Q48 38 68 28" className="fill-none stroke-background/35" strokeWidth={2.5} strokeLinecap="round" />
          <ellipse cx="48" cy="19" rx="17" ry="4.5" className={cn(accent, on && "opacity-90")} />
        </>
      );
    case "camera":
      return (
        <>
          <rect x="30" y="76" width="36" height="10" rx="5" className={SOFT} strokeWidth={2.5} />
          <rect x="42" y="64" width="12" height="14" className={SOFT} strokeWidth={2.5} />
          <circle cx="48" cy="42" r="28" className={BODY} strokeWidth={2.5} />
          <circle cx="48" cy="44" r="15" className={DARK} />
          <circle cx="48" cy="44" r="6" className={on ? "fill-primary stroke-none" : "fill-muted-foreground/60 stroke-none"} />
          <path d="M30 28Q38 20 50 20" className="fill-none stroke-background" strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case "lock":
      return (
        <>
          <rect x="28" y="8" width="40" height="80" rx="12" className={DARK} />
          <circle cx="48" cy="20" r="3.5" className={on ? "fill-primary stroke-none" : "fill-background/40 stroke-none"} />
          {[34, 46, 58, 70].flatMap((y) => [38, 48, 58].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" className="fill-background/55 stroke-none" />))}
          <rect x="66" y="40" width="22" height="9" rx="4.5" className={SOFT} strokeWidth={2.5} />
        </>
      );
    case "thermostat":
      return (
        <>
          <ellipse cx="48" cy="88" rx="26" ry="3.5" className="fill-foreground/10 stroke-none" />
          <circle cx="48" cy="48" r="36" className={BODY} strokeWidth={2.5} />
          <circle cx="48" cy="48" r="27" className="fill-muted/60 stroke-muted-foreground/30" strokeWidth={2.5} />
          <path d="M28 66A27 27 0 1 1 68 66" className={cn("fill-none", accentStroke)} strokeWidth={4} strokeLinecap="round" />
          <circle cx="48" cy="48" r="4" className={accent} />
        </>
      );
    case "plug":
      return (
        <>
          <rect x="37" y="8" width="7" height="22" rx="2" className={DARK} />
          <rect x="52" y="8" width="7" height="22" rx="2" className={DARK} />
          <rect x="24" y="28" width="48" height="56" rx="16" className={BODY} strokeWidth={2.5} />
          <circle cx="48" cy="58" r="8" className={accent} />
          {on ? <circle cx="48" cy="58" r="13" className="fill-primary/15 stroke-none" /> : null}
        </>
      );
    case "air-quality":
      return (
        <>
          <rect x="22" y="22" width="52" height="54" rx="16" className={BODY} strokeWidth={2.5} />
          <path d="M34 40H62M34 50H62M34 60H62" className={LINE} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx="62" cy="32" r="3" className={accent} />
          <path d="M34 12Q42 6 50 12T66 12" className={cn("fill-none", on ? "stroke-primary/50" : "stroke-muted-foreground/30")} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case "sensor":
      return (
        <>
          <circle cx="48" cy="48" r="16" className={BODY} strokeWidth={2.5} />
          <circle cx="48" cy="48" r="5" className={accent} />
          <path d="M28 30A26 26 0 0 0 28 66M68 30A26 26 0 0 1 68 66" className={cn("fill-none", on ? "stroke-primary/50" : "stroke-muted-foreground/30")} strokeWidth={3} strokeLinecap="round" />
          <path d="M16 20A44 44 0 0 0 16 76M80 20A44 44 0 0 1 80 76" className={cn("fill-none", on ? "stroke-primary/25" : "stroke-muted-foreground/20")} strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case "valve":
      return (
        <>
          <rect x="6" y="46" width="84" height="18" rx="4" className={SOFT} strokeWidth={2.5} />
          <rect x="32" y="36" width="32" height="38" rx="10" className={BODY} strokeWidth={2.5} />
          <rect x="45" y="16" width="6" height="22" className={DARK} />
          <rect x="30" y="8" width="36" height="9" rx="4.5" className={on ? "fill-primary stroke-none" : "fill-muted-foreground/50 stroke-none"} />
          {on ? <path d="M12 55H28M68 55H84" className="fill-none stroke-info/60" strokeWidth={3} strokeDasharray="4 4" /> : null}
        </>
      );
    case "pump":
      return (
        <>
          <rect x="18" y="78" width="54" height="9" rx="3" className={SOFT} strokeWidth={2.5} />
          <rect x="34" y="14" width="18" height="16" rx="3" className={SOFT} strokeWidth={2.5} />
          <rect x="64" y="42" width="26" height="16" rx="3" className={SOFT} strokeWidth={2.5} />
          <circle cx="44" cy="54" r="26" className={BODY} strokeWidth={2.5} />
          <circle cx="44" cy="54" r="13" className="fill-muted/60 stroke-muted-foreground/30" strokeWidth={2.5} />
          <path d="M44 41V67M31 54H57" className={cn("fill-none", accentStroke)} strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case "motor":
      return (
        <>
          <rect x="24" y="72" width="44" height="10" rx="3" className={SOFT} strokeWidth={2.5} />
          <rect x="72" y="44" width="16" height="9" rx="2" className={DARK} />
          <rect x="16" y="30" width="58" height="42" rx="10" className={BODY} strokeWidth={2.5} />
          <path d="M28 36V66M38 36V66M48 36V66M58 36V66" className={LINE} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx="66" cy="38" r="3" className={accent} />
        </>
      );
    case "weather-station":
      return (
        <>
          <rect x="45" y="30" width="6" height="58" className={SOFT} strokeWidth={2.5} />
          <path d="M30 20H66" className={LINE} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx="28" cy="20" r="7" className={BODY} strokeWidth={2.5} />
          <circle cx="68" cy="20" r="7" className={BODY} strokeWidth={2.5} />
          <circle cx="48" cy="20" r="3" className={DARK} />
          <rect x="34" y="46" width="28" height="16" rx="3" className={on ? "fill-primary/25 stroke-primary/60" : "fill-muted stroke-muted-foreground/40"} strokeWidth={2.5} />
          <rect x="32" y="84" width="32" height="6" rx="3" className={SOFT} strokeWidth={2.5} />
        </>
      );
    case "soil-sensor":
      return (
        <>
          <rect x="8" y="58" width="80" height="30" rx="6" className="fill-muted stroke-none" />
          {on ? <rect x="8" y="70" width="80" height="18" rx="6" className="fill-info/25 stroke-none" /> : null}
          <rect x="38" y="8" width="20" height="38" rx="8" className={BODY} strokeWidth={2.5} />
          <circle cx="48" cy="22" r="4" className={accent} />
          <path d="M40 46H56L48 84Z" className={DARK} />
        </>
      );
    case "gateway":
      return (
        <>
          <path d="M30 46V22M66 46V22" className={LINE} strokeWidth={3} strokeLinecap="round" />
          <circle cx="30" cy="20" r="4" className={accent} />
          <circle cx="66" cy="20" r="4" className={accent} />
          <rect x="14" y="46" width="68" height="26" rx="10" className={BODY} strokeWidth={2.5} />
          <circle cx="32" cy="59" r="3" className={accent} />
          <circle cx="44" cy="59" r="3" className="fill-muted-foreground/40 stroke-none" />
          <circle cx="56" cy="59" r="3" className="fill-muted-foreground/40 stroke-none" />
        </>
      );
    case "meter":
      return (
        <>
          <rect x="20" y="12" width="56" height="72" rx="12" className={BODY} strokeWidth={2.5} />
          <rect x="29" y="22" width="38" height="18" rx="4" className={DARK} />
          <path d="M34 32H50" className={on ? "fill-none stroke-primary" : "fill-none stroke-background/40"} strokeWidth={3} strokeLinecap="round" />
          <circle cx="48" cy="62" r="11" className="fill-muted/60 stroke-muted-foreground/30" strokeWidth={2.5} />
          <path d="M48 62 55 55" className={cn("fill-none", accentStroke)} strokeWidth={2.5} strokeLinecap="round" />
        </>
      );
    case "fan":
      return (
        <>
          <circle cx="48" cy="48" r="36" className={BODY} strokeWidth={2.5} />
          {[0, 120, 240].map((deg) => (
            <ellipse key={deg} cx="48" cy="30" rx="8" ry="15" transform={`rotate(${deg} 48 48)`} className={on ? "fill-primary/35 stroke-primary/60" : "fill-muted stroke-muted-foreground/40"} strokeWidth={2.5} />
          ))}
          <circle cx="48" cy="48" r="6" className={DARK} />
        </>
      );
  }
}

export function DeviceIllustration({ category, on = false, size = "md", className }: { category: IllustrationKind; on?: boolean; size?: keyof typeof SIZE; className?: string }) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" data-illustration={category} data-on={on ? "true" : "false"} className={cn("shrink-0", SIZE[size], className)}>
      {art(category, on)}
    </svg>
  );
}
