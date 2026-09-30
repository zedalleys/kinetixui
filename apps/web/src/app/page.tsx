import Link from "next/link";
import { ArrowRight, ArrowUpRight, Boxes, Palette, Smartphone, Zap } from "lucide-react";
import { Button } from "@kinetixui/ui";
import { CrossPlatformFlagship } from "@/components/cross-platform-flagship";
import { HeroCommand } from "@/components/hero-command";
import { HeroTokenFan } from "@/components/hero-token-fan";
import { Marquee, Reveal } from "@/components/reveal";
import { SectionHead } from "@/components/section-head";
import { StructuredData } from "@/components/structured-data";
import { ctaAttrs } from "@/lib/analytics-surfaces";
import { IOT_MATURITY_LABEL } from "@/lib/iot";
import { componentCount, componentTotal, recipes } from "@/lib/platform-support";
import { PLATFORMS as COMPONENT_PLATFORMS } from "@/lib/platform-parity";
import { installableSentence, platformSentence, sourceOnlySentence } from "@/lib/platform-prose";
import { componentPlatformCount, projectLicense, projectVersion } from "@/lib/project-stats";
import { siteConfig } from "@/lib/site";

// "Compose" is the manifest's short platform name; the marketing ticker uses the fuller, more recognisable name.
// Any OTHER platform in PLATFORMS renders under its own name — nothing here can silently misname a real platform.
const PLATFORM_DISPLAY_NAME: Partial<Record<string, string>> = { Compose: "Jetpack Compose" };
const PLATFORM_TICKER = COMPONENT_PLATFORMS.map((p) => PLATFORM_DISPLAY_NAME[p] ?? p);

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
    body: "One DTCG source, compiled by Style Dictionary v4. Change a value once — it moves everywhere, in every language.",
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
    body: "Components install through the kinetixui CLI and land in your repo. No runtime dependency, no lock-in — the code is yours to change.",
  },
  {
    icon: Palette,
    title: "Light & dark, verified",
    body: "One semantic contract, two value sets, toggled with a class. Contrast is audited against WCAG AA in CI.",
  },
];

export default function HomePage() {
  return (
    <div>
      <StructuredData />
      {/* ─── hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 kx-grid-bg" />
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          {/*
            Hero vertical rhythm is a mobile-first decision. At 390×800 — a typical iPhone first viewport —
            `py-16` above the headline plus a badge line plus three architecture paragraphs put the primary
            CTA at y≈763 and the install command at y≈939: nothing actionable was on screen at all. The
            padding is smaller below `sm` for the same reason the copy below it is: the first viewport is the
            scarcest space on the site.
          */}
          <div className="grid gap-12 py-12 sm:py-16 md:py-28 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
            {/* headline */}
            <div className="kx-hero-enter max-w-3xl">
              {/*
                Canonical hero, `marketing/MESSAGING.md` §E.

                The previous headline — "One token architecture, in motion across every platform" — led with
                the mechanism and said "every platform", which invites exactly the parity reading the
                positioning rejects. It also spoke only to someone who already believes token architecture is
                the answer. P2 does not: they arrive with two apps that have visibly diverged.

                So the order is outcome, then the problem in their words, then mechanism, then evidence.
                The platform count is derived, never typed.

                The headline is now the first thing in the hero, with no `mt-6`: the beta badge used to sit
                above it and spend a full line of the first viewport on a disclosure that is not the
                visitor's first question. It is not gone — it moved down to the install cluster, where a
                reader who has decided to try this is exactly the reader who needs to know every package is
                0.x. See the comment there.
              */}
              <h1 className="text-balance font-display text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-6xl sm:leading-[1.02] lg:text-[4.5rem]">
                One design language.{" "}
                <br className="hidden sm:block" />
                <span className="kx-underline text-primary">{componentPlatformCount} platforms.</span>{" "}
                <br className="hidden sm:block" />
                Claims you can check.
              </h1>

              {/*
                One supporting paragraph, and only one.

                The hero used to carry three: the drift problem, then the token/implementation architecture,
                then package availability. That is ~130 words of architecture in front of every visitor
                before anything is clickable. None of it is wrong and none of it has been cut — the second
                and third paragraphs now open section 01, which is where a reader who wants the mechanism
                is already heading. What stays here answers only "what is this and why does it matter";
                "what do I do next" is immediately below it.
              */}
              <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
                Your web app and your native apps drift apart the moment they are maintained separately —
                different spacing, a brand colour fixed in one place only. KinetixUI is the design system
                for teams in that position.
              </p>

              {/*
                Primary is the lowest-friction thing that is also evidence: real components, rendered. It
                replaces "Get started → /docs", which asked a visitor who does not yet know what this is to
                begin reading documentation — the highest-friction option on the page, and the one that skips
                both Comprehension and Credibility in the funnel.

                Secondary serves evaluation, which `STRATEGY.md` §7 names as the narrowest point: a sceptic
                who wants the coverage table before anything else. "Get started" moves to the closer, where
                intent is higher. Analytics targets stay semantic, so the labels can change without breaking
                the funnel.
              */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
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
                The install command stays directly behind the CTAs: it is the strongest single piece of
                proof in the hero — a real command for a real package — and on a phone it now lands inside
                the first viewport rather than ~140px below it.
              */}
              <div className="mt-6 w-full max-w-xl">
                <HeroCommand />
                <p className="mt-2 text-[13px] text-muted-foreground sm:whitespace-nowrap">
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

              {/*
                The beta badge, demoted rather than deleted.

                It is honest work — every package really is 0.x and really is MIT, and `marketing-claims`
                asserts this page keeps saying so — but above the headline it was the first focusable
                element and a full wide-tracked mono line of the most valuable space on the site, answering
                a question nobody has yet asked. Attached to the install command instead, it qualifies the
                thing it is actually about: what you get when you run that command. It is still a link to
                the changelog, still keyboard reachable, and now reached after the headline and the CTAs
                rather than before them.
              */}
              <Link
                href="/docs/changelog"
                {...ctaAttrs("homepage_hero", "view_changelog")}
                className="eyebrow group mt-5 inline-flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <span className="text-primary">[00]</span> Beta — every package is 0.x, MIT
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* right rail: token fan-out + spec panel */}
            {/*
              Capped below `lg`, where this column is still full width: the fan is a `w-full` SVG, so at
              tablet widths it was rendering ~690px across with 36px labels — a decorative diagram louder
              than the headline above it. From `lg` the grid's 16rem track constrains it and the cap is
              released. 24rem keeps the tablet fan close to the size it settles at on desktop.
            */}
            <aside className="flex max-w-sm flex-col gap-4 self-start lg:max-w-none">
              <HeroTokenFan />
              <div className="kx-frame hidden border border-border bg-background/60 lg:block">
                <p className="border-b border-border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  spec
                </p>
                <dl className="divide-y divide-border">
                  {SPEC.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
                      <dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="font-display text-sm font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </div>
        </div>

        {/* targets ticker — a hard structural band */}
        <div className="relative border-t border-border">
          <div className="mx-auto flex max-w-screen-2xl items-stretch">
            <span className="hidden shrink-0 items-center border-r border-border px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:flex sm:px-6 lg:px-8">
              Targets&nbsp;→
            </span>
            <Marquee durationSeconds={26} className="flex-1 py-4">
              {PLATFORM_TICKER.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-3 px-6 font-display text-sm text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  {p}
                </span>
              ))}
            </Marquee>
          </div>
        </div>
      </section>

      {/* ─── flagship cross-platform proof ──────────────────────────────── */}
      <section id="flagship" className="border-b border-border bg-muted/20 scroll-mt-24">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHead index="01" label="One interface, four native implementations" meta="live" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              The tokens and component contract stay shared. The implementation stays native.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              One real interface, built from <code className="text-foreground">Card</code>,{" "}
              <code className="text-foreground">Badge</code>, <code className="text-foreground">Switch</code> and{" "}
              <code className="text-foreground">Button</code> — rendered here with the live React implementation, and
              backed by real, CI-compiled source for SwiftUI, Jetpack Compose and Flutter. Switch tabs to read the
              actual platform code, not a mock-up.
            </p>

            {/*
              The architecture, moved down from the hero unchanged in substance.

              Two things share a source and two things do not, and this is the paragraph that keeps them
              apart. It used to be the hero's second paragraph, where it sat between a visitor and every
              action on the page. Here it introduces the tabs that demonstrate exactly what it claims —
              which is where a reader who wants the mechanism was going anyway. Nothing is softened: the
              platform list is still derived, the hand-written claim still stands, CI verification is still
              stated.
            */}
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
              One DTCG token source generates every platform&rsquo;s native token output.{" "}
              {platformSentence} each implement the same component contract natively — hand-written per
              platform, never one source converted into five. And every platform claim is checked against
              real source in CI, so the coverage you read is the coverage that exists.
            </p>

            {/*
              Availability, which is not maturity.

              `platformSentence` above is derived from `maturity`, on which every native port is "stable" —
              and none of them is on a package registry. Naming five platforms and leaving that out is the
              one place this page was misleading: a reader came away expecting five installable things.
              This says which two install and what the other three are, without shrinking them, because the
              implementations are real and compiled in CI.

              It followed the paragraph above out of the hero and has to stay somewhere on this page: both
              sentences are generated from the manifest and `marketing-claims.test.ts` requires this file to
              qualify every undistributed platform it names.
            */}
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              <span className="text-foreground">{installableSentence}</span> install from a package registry
              today. <span className="text-foreground">{sourceOnlySentence}</span> are real implementations,
              compiled in their own CI, that you build from source — not yet distributed as packages.{" "}
              <Link
                href="/docs/platforms"
                {...ctaAttrs("homepage_flagship", "platform_availability")}
                // Always underlined, not just on hover: inside a paragraph that mixes foreground and muted
                // text, colour alone does not separate a link from its surroundings (axe link-in-text-block).
                className="text-primary underline underline-offset-4"
              >
                What ships where
              </Link>
              .
            </p>

            <CrossPlatformFlagship />
          </Reveal>
        </div>
      </section>

      {/* ─── verification: the core position, previously absent from this page ─── */}
      {/*
        `STRATEGY.md` names verification as the position and §7 names Credibility as the funnel's narrowest
        point — yet this page never mentioned it. A visitor could read the whole homepage without learning the
        one thing that separates KinetixUI from every other cross-platform claim.

        Benefit first, mechanism second: the check names are the evidence, not the pitch. Nothing here counts
        anything — the numbers that would date it live on /docs/platforms, generated.
      */}
      <section className="border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal>
            <SectionHead index="02" label="Why you can believe the coverage table" meta="checked in CI" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              A platform badge costs nothing to add. Ours has to compile.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Every design system claims to be cross-platform, and almost none publishes where it falls short.
              That is why coverage tables drift into aspiration — and why you usually find out after migrating.
              KinetixUI derives its coverage from one manifest and fails the build when a claim outruns the
              source behind it.
            </p>

            <dl className="mt-10 grid gap-x-10 gap-y-8 border-t border-border pt-8 sm:grid-cols-2">
              <div>
                <dt className="font-display text-lg font-semibold">A claim without source fails the build</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  If a component says it runs on SwiftUI and no SwiftUI source exists, CI rejects it. This check
                  found <code className="text-foreground">direction-provider</code> claiming three native
                  platforms with no implementation on any of them — our own claim, caught by our own check.
                </dd>
              </div>
              <div>
                <dt className="font-display text-lg font-semibold">Every snippet comes from a compiled file</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  The platform code on this site is extracted from source that platform&rsquo;s CI compiles —
                  not typed into a docs page. It caught a Compose symbol being advertised that had no source
                  file at all.
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
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                See what is verified, platform by platform <ArrowUpRight className="size-3.5" />
              </Link>
              <Link
                href="/docs/component-specs"
                {...ctaAttrs("homepage_verification", "read_docs")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Component specs
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── features ledger ──────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal>
            <SectionHead index="03" label="Why KinetixUI" meta="04 principles" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              A design system that moves with your design, not after it.
            </h2>
          </Reveal>

          <Reveal className="mt-12 border-t border-border">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="group grid gap-4 border-b border-border py-8 md:grid-cols-[5rem_1fr_1.4fr] md:gap-8 md:py-10"
              >
                {/* decorative sequence marker (a 40% tint): generated content, not text — WCAG exempts decoration, and it
                    stays out of the accessibility tree; the heading beside it carries the meaning */}
                <span
                  aria-hidden
                  data-n={String(i + 1).padStart(2, "0")}
                  className="font-display text-4xl font-bold leading-none text-muted-foreground/40 transition-colors before:content-[attr(data-n)] group-hover:text-primary md:text-5xl"
                />
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-1 font-display text-lg font-semibold">{f.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{f.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ─── modules ──────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal>
            <SectionHead index="04" label="Modules" meta="beyond the catalogue" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              Connected-device products
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Models, framework-independent functions and accessible React primitives for device status,
              telemetry, battery, signal, firmware and alerts. A module on top of the token contract — not a sixth
              platform, and not part of the component catalogue.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/iot"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
                {...ctaAttrs("homepage", "read_docs")}
              >
                Explore IoT <ArrowUpRight className="size-3.5" />
              </Link>
              <span className="text-xs text-muted-foreground">{IOT_MATURITY_LABEL}</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── adoption ladder — P2's real blocker ───────────────────────── */}
      {/*
        `PERSONAS.md` P2 objects "we do not have time to adopt a design system", and the answer already existed
        in the product — three genuinely independent entry points — but appeared nowhere a visitor would find
        it. Without this the page implies all-or-nothing adoption, which is the fastest way to lose the audience
        the hero was just written for.

        Each rung is a real capability, not a marketing tier. Rung 1 is the one a team with no design-system
        owner can actually take on a Tuesday afternoon.
      */}
      <section className="border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal>
            <SectionHead index="05" label="Start small" meta="three ways in" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              You do not have to replace your design system to use this one.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Most adoption cost lands before any benefit does. These are three independent entry points — take
              the first and stop, if that is all you need.
            </p>
          </Reveal>

          <Reveal className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="kx-frame flex flex-col border border-border p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Level 01 — tokens
              </p>
              <h3 className="mt-3 font-display text-lg font-semibold">Keep your components</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Install the token package and generate your platform&rsquo;s native output. On Flutter the
                Material and Cupertino adapters style stock widgets, so nothing of ours has to appear in your
                tree. Your components stay exactly as they are.
              </p>
              <Link
                href="/docs/tokens"
                {...ctaAttrs("homepage_adoption", "adopt_tokens")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                Start with tokens <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            <div className="kx-frame flex flex-col border border-border p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Level 02 — components
              </p>
              <h3 className="mt-3 font-display text-lg font-semibold">Copy what you need</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Bring in one component at a time. The CLI writes the source into your repository and resolves
                the npm packages those files import, so what lands is yours to edit — no runtime dependency you
                cannot patch.
              </p>
              <Link
                href="/components"
                {...ctaAttrs("homepage_adoption", "adopt_components")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                Browse the catalogue <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            <div className="kx-frame flex flex-col border border-border p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Level 03 — blocks
              </p>
              <h3 className="mt-3 font-display text-lg font-semibold">Whole patterns</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Composed interface patterns — settings panels, pricing tiers, forms — with real source on every
                platform that lists them. The step past primitives, for when the pattern rather than the button
                is what you are rebuilding.
              </p>
              <Link
                href="/blocks"
                {...ctaAttrs("homepage_adoption", "adopt_blocks")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                See the blocks <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── closer ───────────────────────────────────────────────────── */}
      <section>
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <Reveal className="max-w-3xl">
            <SectionHead index="06" label="Who it's for" />
            <h2 className="mt-6 text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
              Built for teams that ship on more than one platform.
            </h2>
            {/*
              The paid-tier tease is gone. `marketing/CLAIMS.md` F2 prohibits it outright: no such tier exists
              and none is being built, so promising future commercial tooling here was promising a product to
              people deciding whether to depend on this one. MIT is the whole commercial story, stated as such.
              (Deliberately paraphrased: the guard that now enforces F2 reads this file, and a guard that fires
              on the comment explaining its own rule is one that gets deleted.)
            */}
            <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
              Agencies and product teams shipping a consistent design across {platformSentence} — one token
              contract, a native implementation per platform, with documented exceptions where a
              platform-native pattern serves better than a forced port. MIT licensed, all of it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/docs" {...ctaAttrs("homepage", "get_started")}>
                  Get started <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="Outline">
                <Link href={siteConfig.repo} {...ctaAttrs("homepage", "read_docs")}>
                  Read the source
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
