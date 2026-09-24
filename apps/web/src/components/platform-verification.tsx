import Link from "next/link";
import {
  CATALOGUE_VERIFICATION,
  EVIDENCE_KINDS,
  PLATFORMS,
  PLATFORM_DEFINITIONS,
  evidenceFor,
  platformsFor,
  verificationFor,
  type EvidenceKind,
  type Platform,
  type VerificationLevel,
} from "@/lib/platform-parity";
import { GUIDANCE_LABEL, WAVE_LABEL, platformStateFor } from "@/lib/platform-tabs";

/**
 * What each platform offers for one component, and — behind a disclosure — exactly what has been proved
 * about it.
 *
 * Three separate statements, deliberately never merged into one badge:
 *
 *   availability   is there an implementation here, or guidance in place of one?
 *   package        is this platform's package a product yet? A decision, not a measurement.
 *   verification   how much automated evidence stands behind this implementation? A measurement, from the
 *                  tests, which is what `Verification details` opens.
 *
 * "React — Beta" would be a lie built from two truths: `@kinetixui/ui` is a stable, published package, and
 * its catalogue's verification is beta. This component exists so the page can say both.
 *
 * Partial coverage is never a tick. A kind either has evidence for THIS component or shows a dash; the
 * "21 / 98" style fractions live on /docs/platforms, where the subject is the catalogue rather than one
 * component.
 */

const KIND_LABEL: Record<EvidenceKind, string> = {
  build: "Build",
  interaction: "Interaction",
  accessibility: "Accessibility",
  rtl: "RTL",
  largeText: "Large text",
  visual: "Visual",
  published: "Published",
};

/** Plain words for the rung. Never colour alone — the word is the signal, the dot only repeats it. */
const LEVEL_LABEL: Record<VerificationLevel, string> = {
  experimental: "Experimental",
  preview: "Preview",
  beta: "Beta",
  stable: "Stable",
};

function Level({ level }: { level: VerificationLevel }) {
  return <span className="font-medium text-foreground">{LEVEL_LABEL[level]}</span>;
}

/**
 * One platform's evidence list. `✓` and `—` are announced through the visually hidden words beside them, so
 * the meaning does not depend on recognising a glyph or a colour.
 */
function Evidence({ slug, platform }: { slug: string; platform: Platform }) {
  const held = new Set(evidenceFor(slug, platform));
  return (
    <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
      {EVIDENCE_KINDS.map((kind) => {
        const yes = held.has(kind);
        return (
          <li key={kind} className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
            <span className="text-muted-foreground">{KIND_LABEL[kind]}</span>
            <span className={yes ? "text-foreground" : "text-muted-foreground"}>
              <span aria-hidden>{yes ? "✓" : "—"}</span>
              <span className="sr-only">{yes ? "verified" : "no evidence"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function PlatformVerification({ slug }: { slug: string }) {
  const on = new Set(platformsFor(slug));

  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {PLATFORMS.map((platform) => {
          const def = PLATFORM_DEFINITIONS[platform];
          const state = platformStateFor(slug, platform);
          const guidance = state && state !== "implementation" ? state : null;
          return (
            <li key={platform} className="flex flex-wrap items-baseline gap-x-2 font-mono text-[12px]">
              <span className="w-[8.5rem] shrink-0 text-foreground">{def.label}</span>
              {on.has(platform) ? (
                <span className="text-muted-foreground">Available</span>
              ) : (
                <span className="text-muted-foreground">
                  {guidance ? GUIDANCE_LABEL[guidance.type] : "—"}
                  {guidance?.type === "planned" && guidance.wave && (
                    <> · {WAVE_LABEL[guidance.wave] ?? guidance.wave} wave</>
                  )}
                </span>
              )}
              {/*
                Full `text-muted-foreground`, never an opacity modifier. `/80` reads as a softer secondary
                note and fails WCAG AA contrast in light mode — the rendered axe pass caught it, and
                platform-badges.tsx carries the same lesson from the last time.
              */}
              {def.maturity !== "stable" && (
                <span className="text-muted-foreground">· package {def.maturity}</span>
              )}
            </li>
          );
        })}
      </ul>

      {/*
        A native `<details>`: keyboard operable, announced as a disclosure, and open-able without JavaScript.
        Rebuilding this with a button and state would add a client component to every component page to
        reproduce behaviour the element already has.
      */}
      <details className="group rounded-md border border-border bg-background/60">
        <summary className="cursor-pointer list-none px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground marker:content-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background">
          <span aria-hidden className="mr-1.5 inline-block transition-transform group-open:rotate-90">
            ›
          </span>
          Verification details
        </summary>
        <div className="space-y-4 border-t border-border px-3 py-3">
          <p className="text-[12px] text-muted-foreground">
            What automated tests prove about each implementation — separate from whether the package itself is
            a finished product. Derived from the test files;{" "}
            <Link href="/docs/platforms#how-a-verification-level-is-earned" className="text-primary underline underline-offset-2">
              how the levels are earned
            </Link>
            .
          </p>
          {PLATFORMS.filter((p) => on.has(p)).map((platform) => {
            const def = PLATFORM_DEFINITIONS[platform];
            const level = verificationFor(slug, platform);
            return (
              <div key={platform}>
                <p className="font-mono text-[12px] text-foreground">{def.label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  Package maturity: <span className="capitalize text-foreground">{def.maturity}</span>
                  {" · "}
                  Implementation verification: {level ? <Level level={level} /> : "—"}
                </p>
                <Evidence slug={slug} platform={platform} />
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">
            This platform&rsquo;s whole catalogue is verified to{" "}
            {PLATFORMS.filter((p) => on.has(p))
              .map((p) => `${PLATFORM_DEFINITIONS[p].label} ${CATALOGUE_VERIFICATION[p] ?? "—"}`)
              .join(", ")}
            . The catalogue figure is the weakest component on that platform, not an average.
          </p>
        </div>
      </details>
    </div>
  );
}
