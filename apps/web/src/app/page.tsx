import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Boxes, Palette, Smartphone, Zap } from "lucide-react";
import { Button } from "@kinetixui/ui";
import { HeroCommand } from "@/components/hero-command";
import { PlatformTicker } from "@/components/platform-ticker";
import { Reveal } from "@/components/reveal";
import { SectionHead } from "@/components/section-head";
import { StructuredData } from "@/components/structured-data";
import { ComponentSpotlight, type SpotlightItem } from "@/components/systems/component-spotlight";
import { EditorialMedia } from "@/components/systems/editorial-media";
import { EvidenceColumns } from "@/components/systems/evidence-columns";
import { HeroSystemMap } from "@/components/systems/hero-system-map";
import { PlatformMarkSprite } from "@/components/systems/platform-marks";
import { ImplementationExplorer } from "@/components/systems/implementation-explorer";
import { TokenPipeline } from "@/components/systems/token-pipeline";
import { TraceLayer } from "@/components/systems/trace-layer";
import { routeMetadata } from "@/lib/route-seo";
import { ctaAttrs } from "@/lib/analytics-surfaces";
import { IOT_MATURITY_LABEL } from "@/lib/iot";
import { PLATFORMS, PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import { componentCount, componentTotal, recipes } from "@/lib/platform-support";
import { installableSentence, platformSentence, sourceOnlySentence } from "@/lib/platform-prose";
import {
  catalogPlatformCount,
  componentPlatformCount,
  documentedExceptionCount,
  fullCoverageCount,
  projectLicense,
  projectVersion,
} from "@/lib/project-stats";
import { siteConfig } from "@/lib/site";
import { STORY_COMPONENT, componentStrip, platformEvidence, systemsInMotion } from "@/lib/systems-in-motion";
import { flagshipExampleSource } from "@/registry/flagship-example.generated";

export const metadata: Metadata = routeMetadata("/");

/*
 * The spec panel, derived.
 *
 * "Components" used to read 98, which is the catalogue's *entry* count. One entry — `combobox` — is a
 * documented composition of `Command`, and the manifest says so in its own `platformNote`. So the number was
 * one too many for the label it carried, which `marketing/CLAIMS.md` B2 forbids quoting. Both figures are
 * derived, and the recipe row disappears on its own if the manifest ever stops having one.
 */
const SPEC: [string, string][] = [
  ["Platforms", String(componentPlatformCount)],
  ["Components", String(componentCount)],
  ...(recipes.length > 0
    ? ([["Documented recipes", String(componentTotal - componentCount)]] as [string, string][])
    : []),
  ["Source", "DTCG"],
  /*
   * "Runtime deps: 0" is gone, and it was not a formatting problem.
   *
   * `@kinetixui/ui` declares ~50 runtime dependencies — Radix, cva, clsx, tailwind-merge, recharts,
   * date-fns and the rest. Installing the package brings all of them. The *defensible* version of this claim
   * is the one the "Own your code" principle below already makes: copy the source in and KinetixUI itself is
   * not a dependency of your app. That is a statement about lock-in, not a dependency count, and it does not
   * survive being compressed into a two-word spec row — which is how it came to read as a flat, checkable,
   * false number on the most public surface we have.
   *
   * Found by the strengthened numeric-literal rule in `homepage-truth.test.tsx`, which is the sort of thing
   * that rule is for.
   */
  ["Core version", `v${projectVersion}`],
  ["License", projectLicense],
];

const FEATURES = [
  {
    icon: Zap,
    title: "Dynamic tokens",
    body: "One DTCG source, compiled by Style Dictionary. Change a value once — it moves everywhere, in every language.",
  },
  {
    icon: Smartphone,
    // no count in the title: the body already names the platforms from the manifest, and a hand-typed
    // number here is exactly what went stale when Angular arrived
    title: "Implemented per platform",
    body: `Two different things, deliberately. Tokens are generated — one DTCG source becomes CSS variables and TypeScript for the web, plus Swift, Kotlin and Dart constants. Components are hand-built: ${platformSentence} each implement the same component contract natively, never web code wrapped or converted into a native app.`,
  },
  {
    icon: Boxes,
    title: "Own your code",
    body: "Components install through the kinetixui CLI and land in your repo, with the npm packages they import. No runtime dependency you cannot patch, no lock-in — the code is yours to change.",
  },
  {
    icon: Palette,
    title: "Light & dark, verified",
    body: "One semantic contract, two value sets, toggled with a class. Contrast is audited against WCAG AA in CI.",
  },
];

/*
 * ── Systems in Motion ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * The page follows one real token, `color.action`, from its DTCG source, through the files Style Dictionary
 * writes, across the token boundary, into the `Switch` each platform implements by hand, and finally into
 * evidence. Everything those visuals say is read from the repository at build time (`lib/systems-in-motion.ts`).
 * Every chapter follows the site theme; the header's toggle is the only theme control on the page.
 */

/** "Five", from the platform count — a word in the headline, but never a typed one. */
const COUNT_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

/** The flagship recipe's copies, by manifest platform: the generated registry's keys, not a typed list. */
const RECIPE_PLATFORM: Record<string, string> = { react: "React", swiftui: "SwiftUI", compose: "Compose", flutter: "Flutter" };
const recipePlatforms = new Set(Object.keys(flagshipExampleSource).map((k) => RECIPE_PLATFORM[k]));

/** The homepage's component spotlight: a composed interface first, then three components that differ honestly. */
const SPOTLIGHT: SpotlightItem[] = [
  {
    slug: "flagship-preferences",
    name: "Notification preferences",
    stripLabel: "Compiled copies of this recipe",
    note: "A composed interface — Card, Badge, Switch and Button — rendered live with the React implementation.",
    href: "/docs/components/card",
    strip: PLATFORMS.map((p) => ({
      platform: p,
      short: p,
      state: recipePlatforms.has(p) ? "compiled in CI" : "not written yet",
      kind: recipePlatforms.has(p) ? ("implementation" as const) : ("none" as const),
    })),
  },
  ...(
    [
      ["segmented-control", "Segmented control", "One choice from a few, with the selection carried by shape as well as colour."],
      ["slider", "Slider", "A value on a track, keyboard-adjustable on every platform that implements it."],
      ["native-select", "Native select", "The browser's own select, on the web only. Native platforms compose Select instead, and the manifest says so."],
    ] as const
  ).map(([slug, name, note]) => ({
    slug,
    name,
    note,
    stripLabel: "Verification by platform",
    href: `/docs/components/${slug}`,
    strip: componentStrip(slug),
  })),
];

export default function HomePage() {
  const story = systemsInMotion();
  const mapPlatforms = story.platforms.map((p) => ({
    platform: p.platform,
    label: p.label,
    short: p.short,
    maturity: p.maturity,
    entries: p.entries,
    total: p.total,
    distribution: p.distribution,
    output: p.output,
    reads: p.component.reads,
    href: p.href,
  }));
  const explorer = story.platforms.map((p) => ({
    platform: p.platform,
    label: p.label,
    maturity: p.maturity,
    distribution: p.distribution,
    files: p.component.files,
    verification: p.component.verification,
    evidence: p.component.evidence,
  }));
  const dirs = Object.fromEntries(PLATFORMS.map((p) => [p, PLATFORM_DEFINITIONS[p].dir]));
  const rollingOut = PLATFORMS.filter((p) => !PLATFORM_DEFINITIONS[p].catalogComplete).map(
    (p) => `${PLATFORM_DEFINITIONS[p].label} (${PLATFORM_DEFINITIONS[p].maturity})`,
  );
  const container = "kx-edges relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8";

  return (
    <div>
      <StructuredData />
      <PlatformMarkSprite />

      {/* ─── [01] hero ───────────────────────────────────────────────────────── */}
      <section className="kx-chapter overflow-hidden border-b border-border">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 kx-grid-bg opacity-50" />
        <div aria-hidden="true" className="kx-glow -end-40 -top-32 size-[46rem]" />
        <div className={container}>
          {/*
            Hero vertical rhythm is a mobile-first decision. At 390×800 the primary CTA and the install command
            have to land in the first viewport, so the copy column comes first in the DOM and the system map
            follows it — beside it once there is room, below it on a phone.
          */}
          <div className="grid grid-cols-1 gap-14 py-12 sm:py-16 md:py-24 lg-rem:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg-rem:items-center lg-rem:gap-12 xl-rem:gap-20">
            {/* a size container: the headline is sized against this column, so its longest word always fits it */}
            <div className="max-w-3xl [container-type:inline-size]">
              {/*
                The headline names the architecture rather than counting platforms: one shared language, and an
                implementation per platform written in that platform's idiom (CLAIMS.md A2, A3). The number is
                the manifest's platform count, spelled out. The page title and share card keep
                `siteConfig.tagline` — One design language. N platforms. Claims you can check. — whose last
                sentence now heads the evidence chapter, where it is demonstrated rather than asserted.
              */}
              <h1 className="kx-hero-title min-w-0 font-display font-bold leading-[1.05] tracking-[-0.035em] sm:leading-[1.02]">
                One design language.{" "}
                <br className="hidden sm:block" />
                <span className="kx-underline text-primary">{countWord(componentPlatformCount)} native</span>{" "}
                implementations.
              </h1>

              {/* One supporting paragraph, and only one: what this is and why it matters. The mechanism opens chapter 03. */}
              <p className="mt-6 max-w-xl text-muted-foreground md:text-lg">
                Shared tokens, native components, and platform differences documented instead of hidden — for teams
                whose web and native apps drift apart the moment they are maintained separately.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/components" {...ctaAttrs("homepage_hero", "browse_components")}>
                    Explore components <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="Outline">
                  <Link href="/docs/platforms" {...ctaAttrs("homepage_hero", "platform_coverage")}>
                    See what each platform covers
                  </Link>
                </Button>
              </div>

              {/*
                The platform names, in static text, at every width — derived, with Angular's maturity carried.
                The map beside this names them too, but as a control; this is the sentence.
              */}
              <p data-hero-platforms className="mt-5 max-w-xl text-sm text-muted-foreground">
                {componentPlatformCount} implementations: {platformSentence}.
              </p>

              <div className="mt-7 w-full max-w-xl">
                <HeroCommand />
                <p className="mt-2 text-body-md text-muted-foreground sm:whitespace-nowrap">
                  Example — adds one component.{" "}
                  <Link
                    href="/docs/installation"
                    {...ctaAttrs("homepage_hero", "installation")}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Installation
                  </Link>{" "}
                  covers the full library.
                </p>
              </div>

              {/* The beta disclosure qualifies the install command it sits under: every package is 0.x. */}
              <Link
                href="/docs/changelog"
                {...ctaAttrs("homepage_hero", "view_changelog")}
                className="eyebrow group mt-5 inline-flex min-h-9 items-center gap-2 transition-colors hover:text-foreground"
              >
                <span className="text-primary">[00]</span> Beta — every package is 0.x, MIT
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" />
              </Link>
            </div>

            <HeroSystemMap token={story.token} outputs={story.outputs} platforms={mapPlatforms} />
          </div>
        </div>

        {/* targets ticker — a hard structural band, unchanged */}
        <div className="relative border-t border-border">
          <div className="mx-auto flex max-w-screen-2xl items-stretch">
            <span className="hidden shrink-0 items-center border-e border-border px-4 font-mono text-label-md uppercase tracking-[0.18em] text-muted-foreground sm:flex sm:px-6 lg:px-8">
              Targets&nbsp;→
            </span>
            <PlatformTicker />
          </div>
        </div>
      </section>

      {/* ─── [02] the trade ─────────────────────────────────────────────────────────────────────── */}
      <section className="kx-defer border-b border-border">
        <div className={`${container} py-20 md:py-28`}>
          <Reveal>
            <SectionHead index="02" label="The trade" meta="shared contract, not shared runtime" />
            <div className="mt-10 grid grid-cols-1 gap-12 lg-rem:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg-rem:gap-20">
              <div>
                <h2 className="min-w-0 break-words text-balance font-display text-4xl font-semibold leading-[1.04] tracking-[-0.03em] md:text-6xl">
                  Share the contract. Keep the platform.
                </h2>
                <p className="mt-6 max-w-xl text-muted-foreground md:text-lg">
                  There are two ways to keep one design consistent across platforms. One runtime can draw every screen,
                  and each platform&rsquo;s own behaviour becomes something to imitate. Or a contract is shared and
                  each platform implements it in its own idiom — which means differences exist, and have to be written
                  down. KinetixUI takes the second trade, and writes them down.
                </p>
              </div>
              <dl className="self-end border-t border-border">
                {(
                  [
                    ["Drawn by", "Each platform's own UI toolkit: the DOM, Angular templates, SwiftUI views, Compose and Flutter widgets."],
                    ["Accessibility", "Each platform's own semantics, with test evidence recorded per platform where it exists."],
                    ["Where platforms differ", `In the manifest, with a reason — ${documentedExceptionCount} documented exceptions today.`],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-1 gap-1 border-b border-border py-5 sm-rem:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm-rem:gap-6">
                    <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
                    <dd className="text-sm leading-relaxed">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>

          {/* Why systems drift: the four principles, staggered rather than stacked in equal rows. */}
          <Reveal className="mt-20 grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`group min-w-0 ${i % 2 === 1 ? "md:mt-16" : ""}`}>
                <div className="flex items-center gap-4">
                  {/* decorative sequence marker (a 40% tint): out of the accessibility tree; the heading carries the meaning */}
                  <span
                    aria-hidden
                    data-n={String(i + 1).padStart(2, "0")}
                    className="font-display text-5xl font-bold leading-none text-muted-foreground/40 transition-colors before:content-[attr(data-n)] group-hover:text-primary"
                  />
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                </div>
                <h3 className="min-w-0 break-words mt-5 min-w-0 font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">{f.body}</p>
              </div>
            ))}
          </Reveal>

          {/* An editorial interruption for real photography or video, later. Renders nothing without media. */}
          <EditorialMedia className="mt-20" />
        </div>
      </section>

      {/* ─── [03] token boundary ───────────────────────────────────────────────── */}
      <section className="kx-defer kx-chapter overflow-hidden bg-muted/30 border-b border-border">
        <div aria-hidden="true" className="kx-glow -start-48 top-1/3 size-[40rem]" />
        <div className={`${container} py-20 md:py-28`}>
          <Reveal>
            <SectionHead index="03" label="Token boundary" meta="generated · written per platform" />
            <div className="mt-10 grid grid-cols-1 gap-8 lg-rem:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg-rem:items-end">
              <h2 className="min-w-0 break-words text-balance font-display text-4xl font-semibold leading-[1.04] tracking-[-0.03em] md:text-6xl">
                Generated tokens. Hand-written components.
              </h2>
              {/*
                The architecture paragraph: two things share a source and two things do not. Nothing is softened —
                the platform list is derived, the hand-written claim stands, CI verification is stated.
              */}
              <p className="max-w-xl text-muted-foreground">
                One DTCG token source generates every platform&rsquo;s native token output. {platformSentence} each
                implement the same component contract natively — hand-written per platform, never one source
                converted into five. And every platform claim is checked against real source in CI, so the coverage
                you read is the coverage that exists.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-16">
            <TokenPipeline
              token={story.token}
              outputs={story.outputs}
              platforms={mapPlatforms}
              buildScript="style-dictionary/build.mjs"
              dirs={dirs}
            />
          </Reveal>
        </div>
      </section>

      {/* ─── [04] same contract, different platform ─────────────────────────────────────────────── */}
      <section id="flagship" className="kx-defer scroll-mt-24 border-b border-border">
        <div className={`${container} py-20 md:py-28`}>
          <div className="grid grid-cols-1 gap-12 lg-rem:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg-rem:gap-16">
            <Reveal className="lg-rem:sticky lg-rem:top-28 lg-rem:self-start">
              <SectionHead index="04" label="Implementations" meta={`${STORY_COMPONENT} · ${componentPlatformCount} source trees`} />
              <h2 className="min-w-0 break-words mt-8 text-balance font-display text-4xl font-semibold leading-[1.04] tracking-[-0.03em] md:text-5xl">
                Same contract. Different platform.
              </h2>
              <p className="mt-6 text-muted-foreground md:text-lg">
                KinetixUI does not convert one component implementation into five. The token is shared; the Switch
                beside this is written once per platform, in that platform&rsquo;s own language — and every copy
                reads the same <code className="text-foreground">action</code> colour.
              </p>
              {/*
                Availability, which is not maturity. Both sentences are generated from the manifest, and
                `marketing-claims.test.ts` requires this page to qualify every undistributed platform it names.
              */}
              <p className="mt-5 text-sm text-muted-foreground">
                <span className="text-foreground">{installableSentence}</span> install from a package registry today.{" "}
                <span className="text-foreground">{sourceOnlySentence}</span> are real implementations, compiled in
                their own CI, that you build from source — not yet distributed as packages.{" "}
                <Link
                  href="/docs/platforms"
                  {...ctaAttrs("homepage_flagship", "platform_availability")}
                  // Always underlined: inside mixed foreground/muted text, colour alone does not mark a link.
                  className="text-primary underline underline-offset-4"
                >
                  What ships where
                </Link>
                .
              </p>
            </Reveal>
            <Reveal className="min-w-0">
              <ImplementationExplorer component="Switch" componentHref={`/docs/components/${STORY_COMPONENT}`} platforms={explorer} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── [05] components ────────────────────────────────────────────────────────────────────── */}
      <section className="kx-defer border-b border-border bg-muted/30">
        <div className={`${container} py-20 md:py-28`}>
          <Reveal>
            <SectionHead index="05" label="Components" meta={`${componentTotal} catalogue entries`} />
            <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
              <h2 className="min-w-0 break-words max-w-2xl text-balance font-display text-4xl font-semibold leading-[1.04] tracking-[-0.03em] md:text-5xl">
                Real components, and what is true of each one everywhere.
              </h2>
              <Link
                href="/components"
                {...ctaAttrs("homepage", "browse_components")}
                className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                Browse all {componentTotal} catalogue entries <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </Reveal>
          <Reveal className="mt-12">
            <ComponentSpotlight items={SPOTLIGHT} />
          </Reveal>
        </div>
      </section>

      {/* ─── [06] verification ─────────────────────────────────────────────────── */}
      {/*
        `STRATEGY.md` names verification as the position and §7 names Credibility as the funnel's narrowest point.
        Benefit first, mechanism second; the numbers are the manifest this page was built from, and are labelled so.
      */}
      <section className="kx-defer kx-chapter overflow-hidden bg-muted/30 border-b border-border">
        <div aria-hidden="true" className="kx-glow -end-32 top-10 size-[38rem]" />
        <div className={`${container} py-20 md:py-28`}>
          <Reveal>
            <SectionHead index="06" label="Verification" meta="from the manifest this page was built from" />
            <div className="mt-10 grid grid-cols-1 gap-8 lg-rem:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg-rem:items-end">
              <h2 className="min-w-0 break-words text-balance font-display text-5xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-7xl">
                Claims you can check.
              </h2>
              <div>
                <p className="font-display text-xl font-semibold md:text-2xl">A platform badge costs nothing to add. Ours has to compile.</p>
                <p className="mt-4 max-w-xl text-muted-foreground">
                  Every design system claims to be cross-platform, and almost none publishes where it falls short.
                  That is why coverage tables drift into aspiration — and why you usually find out after migrating.
                  KinetixUI derives its coverage from one manifest and fails the build when a claim outruns the
                  source behind it.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-14">
            <EvidenceColumns platforms={platformEvidence()} />
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              <Link href="/docs/platforms" className="underline-offset-4 hover:text-foreground hover:underline">
                {/* "all 4" under a headline of 5 read as a miscount: these are the catalogue-complete platforms, and
                    the one still rolling out is named rather than left for the reader to subtract. */}
                {fullCoverageCount}/{componentTotal} catalogue entries on all {catalogPlatformCount} catalogue-complete platforms ·{" "}
                {documentedExceptionCount} documented exceptions
                {rollingOut.length > 0 ? ` · ${rollingOut.join(", ")} still rolling out` : ""}
              </Link>
            </p>
          </Reveal>

          <Reveal className="mt-16">
            <dl className="grid grid-cols-1 gap-x-12 gap-y-10 border-t border-border pt-10 md:grid-cols-2">
              <div>
                <dt className="font-display text-lg font-semibold">A claim without source fails the build</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  If a component says it runs on SwiftUI and no SwiftUI source exists, CI rejects it. This check
                  found <code className="text-foreground">direction-provider</code> claiming three native
                  platforms with no implementation on any of them — our own claim, caught by our own check.
                </dd>
              </div>
              <div>
                <dt className="font-display text-lg font-semibold">Platform snippets are checked against real source</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Where a compiled example exists, the snippet is extracted from a file that platform&rsquo;s CI
                  builds. The rest are still written by hand, and every KinetixUI symbol in them must exist in
                  that platform&rsquo;s source. Where a component is not ported, the tab is labelled as guidance
                  instead. This caught a Compose symbol being advertised that had no source file at all.
                </dd>
              </div>
              <div>
                <dt className="font-display text-lg font-semibold">Gaps are published, with reasons</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Where a component is absent on a platform, the manifest records why — usually because a
                  platform-native pattern serves better than a forced port. You can read the exceptions before
                  you commit to anything.
                </dd>
              </div>
              <div>
                <dt className="font-display text-lg font-semibold">Even this page is under test</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  A stale platform list, a blanket parity claim, or an install command for something you
                  cannot install fails CI. The marketing is held to the same standard as the code, because
                  otherwise the standard is decoration.
                </dd>
              </div>
            </dl>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/docs/platforms"
                {...ctaAttrs("homepage_verification", "view_verification")}
                className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                See what is verified, platform by platform <ArrowUpRight className="size-3.5" />
              </Link>
              <Link
                href="/docs/component-specs"
                {...ctaAttrs("homepage_verification", "read_docs")}
                className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Component specs
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── [07] start small — a rising stair, joined by the trace ─────────────────────────────── */}
      {/*
        `PERSONAS.md` P2 objects "we do not have time to adopt a design system". Three independent entry points,
        each a real capability rather than a tier; rung 1 is the one a team with no design-system owner can take.
      */}
      <section className="kx-defer border-b border-border">
        <div className={`${container} py-20 md:py-28`}>
          <Reveal>
            <SectionHead index="07" label="Start small" meta="three ways in" />
            <h2 className="min-w-0 break-words mt-8 max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.04] tracking-[-0.03em] md:text-5xl">
              You do not have to replace your design system to use this one.
            </h2>
            <p className="mt-5 max-w-2xl text-muted-foreground md:text-lg">
              Most adoption cost lands before any benefit does. These are three independent entry points — take the
              first and stop, if that is all you need.
            </p>
          </Reveal>

          {/* `[&>*]:min-w-0`: grid items cannot shrink below min-content otherwise — the 320px/200% overflow fix. */}
          <Reveal className="relative mt-14">
            <TraceLayer
              pairs={[
                { from: "rung-1", to: "rung-2" },
                { from: "rung-2", to: "rung-3" },
              ]}
            />
            <ol className="relative grid grid-cols-1 gap-6 [&>*]:min-w-0 lg-rem:grid-cols-3 lg-rem:gap-10">
              <li className="lg-rem:mt-24">
                <div data-anchor="rung-1" className="flex h-full flex-col rounded-2xl border border-border bg-background p-6">
                  <p className="font-mono text-xs text-muted-foreground">Level 01 — tokens</p>
                  <h3 className="min-w-0 break-words mt-3 font-display text-xl font-semibold">Keep your components</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    Install the token package and generate your platform&rsquo;s native output. On Flutter the
                    Material and Cupertino adapters style stock widgets, so nothing of ours has to appear in your
                    tree. Your components stay exactly as they are.
                  </p>
                  <Link
                    href="/docs/tokens"
                    {...ctaAttrs("homepage_adoption", "adopt_tokens")}
                    className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Start with tokens <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </li>
              <li className="lg-rem:mt-12">
                <div data-anchor="rung-2" className="flex h-full flex-col rounded-2xl border border-border bg-background p-6">
                  <p className="font-mono text-xs text-muted-foreground">Level 02 — components</p>
                  <h3 className="min-w-0 break-words mt-3 font-display text-xl font-semibold">Copy what you need</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    Bring in one component at a time. The CLI writes the source into your repository and resolves
                    the npm packages those files import, so what lands is yours to edit — no runtime dependency you
                    cannot patch.
                  </p>
                  <Link
                    href="/components"
                    {...ctaAttrs("homepage_adoption", "adopt_components")}
                    className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Browse the catalogue <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </li>
              <li>
                <div data-anchor="rung-3" className="flex h-full flex-col rounded-2xl border border-border bg-background p-6">
                  <p className="font-mono text-xs text-muted-foreground">Level 03 — blocks</p>
                  <h3 className="min-w-0 break-words mt-3 font-display text-xl font-semibold">Whole patterns</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    Composed interface patterns — settings panels, pricing tiers, forms — with real source on every
                    platform that lists them. The step past primitives, for when the pattern rather than the button
                    is what you are rebuilding.
                  </p>
                  <Link
                    href="/blocks"
                    {...ctaAttrs("homepage_adoption", "adopt_blocks")}
                    className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
                  >
                    See the blocks <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </li>
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ─── [08] modules ───────────────────────────────────────────────────────────────────────── */}
      <section className="kx-defer border-b border-border bg-muted/30">
        <div className={`${container} grid grid-cols-1 gap-6 py-14 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] md:items-baseline md:gap-12`}>
          <SectionHead index="08" label="Modules" meta="beyond the catalogue" className="md:border-t-0 md:pt-0" />
          <div>
            <h2 className="min-w-0 break-words font-display text-2xl font-semibold tracking-[-0.02em] md:text-3xl">Connected-device products</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Models, framework-independent functions and accessible React primitives for device status,
              telemetry, battery, signal, firmware and alerts. A module on top of the token contract — not a sixth
              platform, and not part of the component catalogue.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/iot"
                className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
                {...ctaAttrs("homepage", "explore_iot")}
              >
                Explore IoT <ArrowUpRight className="size-3.5" />
              </Link>
              <span className="text-xs text-muted-foreground">{IOT_MATURITY_LABEL}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── [09] closer ────────────────────────────────────────────────────────────────────────── */}
      <section className="kx-defer">
        <div className={`${container} py-24 md:py-32`}>
          <Reveal>
            <SectionHead index="09" label="Who it's for" />
            <h2 className="min-w-0 break-words mt-10 max-w-5xl text-balance font-display text-5xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-7xl">
              Built for teams that ship on more than one platform.
            </h2>
            {/*
              The paid-tier tease is gone: `marketing/CLAIMS.md` F2 prohibits it outright. MIT is the whole
              commercial story, stated as such. (Paraphrased: the guard that enforces F2 reads this file.)
            */}
            <div className="mt-10 grid grid-cols-1 gap-10 lg-rem:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg-rem:gap-16">
              <div>
                <p className="max-w-xl text-muted-foreground md:text-lg">
                  Agencies and product teams shipping a consistent design across {platformSentence} — one token
                  contract, a native implementation per platform, with documented exceptions where a
                  platform-native pattern serves better than a forced port. MIT licensed, all of it.
                </p>
                {/* `[&>*]:max-w-full` + `whitespace-normal`: Button is nowrap by design, which at 200% text is wider than a phone. */}
                <div className="mt-8 flex flex-wrap items-center gap-3 [&>*]:max-w-full">
                  {/* Installation, not the Introduction: "get started" here means "how do I set it up". */}
                  <Button asChild size="lg" className="whitespace-normal">
                    <Link href="/docs/installation" {...ctaAttrs("homepage", "get_started")}>
                      Get started <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                  {/* No ctaAttrs: this is the repository, reported as github_clicked, not a docs CTA. */}
                  <Button asChild size="lg" variant="Outline" className="whitespace-normal">
                    <Link href={siteConfig.repo}>Read the source</Link>
                  </Button>
                </div>
              </div>
              {/* The colophon: the spec panel, derived, set as the page's last word rather than a hero sidebar. */}
              <dl className="grid grid-cols-2 self-end border-t border-border sm:grid-cols-3">
                {SPEC.map(([k, v]) => (
                  <div key={k} className="border-b border-border py-4 pe-4">
                    <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-1 font-display text-lg font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
