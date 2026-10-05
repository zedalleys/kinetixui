import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push() {}, prefetch() {} }) }));

import HomePage from "../app/page";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { ANALYTICS_CTA_TARGETS, analytics, resetAnalyticsForTests } from "./analytics";
import {
  ADOPTION_INTENT_SIGNALS,
  QUALIFIED_EVALUATION_SIGNALS,
  isAdoptionIntent,
  isQualifiedEvaluation,
  summarizeSessions,
  type MeasuredEvent,
  type MeasurementSignal,
} from "./analytics-measurement";
import { siteConfig } from "./site";

/**
 * Measurement integrity: the strategy's definitions, the event contract and the emitters agree.
 *
 * `marketing/analytics.md` owns Qualified Evaluation (§3) and Adoption Intent (§4). Those definitions are
 * computed PostHog-side from events the site emits, so nothing in the site would notice if one of them
 * pointed at an event that no longer fires, or at a CTA nobody can click. This file is that notice:
 *
 *  1. the two signal tables in analytics.md equal `analytics-measurement.ts`, which is typed against the
 *     event contract — a renamed event or CTA target fails to compile, a strategy edit fails here;
 *  2. every signal has an emitter in shipped source, and every CTA signal is clicked on the RENDERED
 *     homepage, through the real provider, producing exactly one event;
 *  3. session counting counts sessions, not events.
 *
 * Behaviour of the individual emitters (fires on interaction, not on render; once per action) is proven next
 * to each one — analytics-surfaces, analytics-provider, analytics-instrumentation, showcase.analytics and
 * cross-platform-flagship tests. Campaign survival through navigation is proven with the real SDK in
 * analytics-posthog.attribution.test.ts.
 */

/* ------------------------------------------------------------------ 1. strategy ↔ code */

const SPEC = readFileSync("../../marketing/analytics.md", "utf8");

/** The signal table of one analytics.md section, as `{event, targets?}` — read from the backticked names. */
function specSignals(heading: RegExp): Map<string, Set<string> | null> {
  const start = SPEC.search(heading);
  expect(start, `analytics.md section ${heading} not found`).toBeGreaterThanOrEqual(0);
  const section = SPEC.slice(start, SPEC.indexOf("\n## ", start + 1));
  const found = new Map<string, Set<string> | null>();
  for (const line of section.split("\n")) {
    if (!line.startsWith("|") || /^\|\s*-/.test(line)) continue;
    const signalCell = line.split("|").slice(1, -1).find((cell) => cell.includes("`"));
    const names = [...(signalCell ?? "").matchAll(/`([a-z_$]+)`/g)].map((m) => m[1]!);
    if (names.length === 0) continue;
    if (names[0] === "cta_clicked") {
      const targets = (found.get("cta_clicked") as Set<string> | undefined) ?? new Set<string>();
      for (const t of names.slice(1)) targets.add(t);
      found.set("cta_clicked", targets);
    } else for (const n of names) found.set(n, null);
  }
  return found;
}

function codeSignals(signals: readonly MeasurementSignal[]): Map<string, Set<string> | null> {
  return new Map(signals.map((s) => [s.event, "targets" in s ? new Set<string>(s.targets) : null]));
}

describe("the measurement model matches the strategy", () => {
  it("Qualified Evaluation: analytics.md §3 and the code name the same signals", () => {
    const spec = specSignals(/^## 3\. Qualified Evaluation/m);
    expect(spec.size, "parsed nothing from §3 — this check would pass vacuously").toBeGreaterThanOrEqual(5);
    expect(codeSignals(QUALIFIED_EVALUATION_SIGNALS)).toEqual(spec);
  });

  it("Adoption Intent: analytics.md §4 and the code name the same signals", () => {
    const spec = specSignals(/^## 4\. Adoption Intent/m);
    expect(spec.size, "parsed nothing from §4 — this check would pass vacuously").toBeGreaterThanOrEqual(3);
    expect(codeSignals(ADOPTION_INTENT_SIGNALS)).toEqual(spec);
  });

  it("every CTA target a definition names is in the runtime vocabulary (the listener drops unknown ones)", () => {
    for (const s of [...QUALIFIED_EVALUATION_SIGNALS, ...ADOPTION_INTENT_SIGNALS]) {
      if ("targets" in s) for (const t of s.targets) expect(ANALYTICS_CTA_TARGETS).toContain(t);
    }
  });

  it("keeps generic engagement out of both definitions", () => {
    for (const event of ["$pageview", "docs_viewed", "github_clicked", "external_link_clicked", "changelog_viewed", "preset_shared", "iot_example_copied"]) {
      expect(isQualifiedEvaluation({ event }), event).toBe(false);
      expect(isAdoptionIntent({ event }), event).toBe(false);
    }
    for (const target of ["get_started", "browse_components", "read_docs", "installation", "view_changelog"]) {
      expect(isQualifiedEvaluation({ event: "cta_clicked", target }), target).toBe(false);
      expect(isAdoptionIntent({ event: "cta_clicked", target }), target).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ 2. every signal is emitted somewhere real */

function sourceFiles(dir = "src"): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !name.includes(".test.") ? [relative(process.cwd(), full).split(sep).join("/")] : [];
  });
}

describe("every signal has an emitter in shipped code", () => {
  // Static, and labelled as such: it proves a call site exists, not that it fires. The firing is proven by the
  // emitters' own tests (see the header) and, for CTAs, by the rendered homepage below.
  const shipped = sourceFiles().map((f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""));
  const events = new Set([...QUALIFIED_EVALUATION_SIGNALS, ...ADOPTION_INTENT_SIGNALS].map((s) => s.event));

  it.each([...events])("%s", (event) => {
    const emitted = shipped.some((text) => text.includes(`analytics.track("${event}"`));
    expect(emitted, `${event} is in a measurement definition but no shipped code calls analytics.track("${event}", …)`).toBe(true);
  });
});

/* ------------------------------------------------------------------ the rendered homepage, through the real provider */

describe("homepage CTAs, rendered and clicked", () => {
  const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
  // Links would navigate jsdom; prevent that on `window`, before React sees the click. The provider listens on `document`
  // during bubbling and does not consult defaultPrevented, exactly as in production.
  const noNavigate = (e: Event) => e.preventDefault();
  beforeAll(() => {
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }) as never;
    window.addEventListener("click", noNavigate, true);
  });
  afterAll(() => {
    window.removeEventListener("click", noNavigate, true);
    vi.unstubAllGlobals();
    track.mockRestore();
  });
  beforeEach(() => {
    resetAnalyticsForTests();
    nav.pathname = "/";
    window.history.pushState({}, "", "/");
  });

  const renderHome = () => render(<><AnalyticsProvider /><HomePage /></>);
  const ctaLinks = () => [...document.querySelectorAll<HTMLAnchorElement>("a[data-analytics-cta]")];

  it.each([...QUALIFIED_EVALUATION_SIGNALS, ...ADOPTION_INTENT_SIGNALS].flatMap((s) => ("targets" in s ? [...s.targets] : [])))(
    "a visitor can click the %s CTA, and it produces exactly one cta_clicked carrying it",
    async (target) => {
      renderHome();
      const link = ctaLinks().find((a) => a.dataset.analyticsCta === target);
      expect(link, `no rendered homepage link carries the ${target} CTA — the signal cannot fire`).toBeDefined();
      track.mockClear();
      await userEvent.click(link!);
      expect(track.mock.calls).toEqual([["cta_clicked", { source: link!.dataset.analyticsSource, target }]]);
    },
  );

  it("fires no semantic event on render: the homepage view is $pageview only, and no CTA fires unclicked", () => {
    track.mockClear();
    renderHome();
    expect(track.mock.calls).toEqual([]);
  });

  it("marks only on-site destinations as CTAs, so an outbound click keeps its own event", () => {
    renderHome();
    const offsite = ctaLinks().filter((a) => new URL(a.href).origin !== window.location.origin).map((a) => `${a.dataset.analyticsCta} → ${a.href}`);
    expect(offsite).toEqual([]);
  });

  it("reports the closer's repository link as github_clicked, not as a docs CTA", async () => {
    renderHome();
    const repoLinks = [...document.querySelectorAll<HTMLAnchorElement>("main a, a")].filter((a) => a.href.replace(/\/$/, "") === siteConfig.repo.replace(/\/$/, ""));
    expect(repoLinks.length).toBeGreaterThan(0);
    for (const link of repoLinks) {
      track.mockClear();
      await userEvent.click(link);
      expect(track.mock.calls.map(([e]) => e)).toEqual(["github_clicked"]);
    }
  });
});

/* ------------------------------------------------------------------ 3. sessions, not events */

describe("session-level measurement", () => {
  const ev = (sessionId: string, event: string, timestamp: number, extra: Partial<MeasuredEvent> = {}): MeasuredEvent => ({ sessionId, event, timestamp, ...extra });

  it("counts five qualifying events in one session as one Qualified Evaluation session", () => {
    const s = summarizeSessions([
      ev("a", "$pageview", 0),
      ev("a", "component_viewed", 1),
      ev("a", "component_viewed", 2),
      ev("a", "platform_selected", 3),
      ev("a", "component_code_copied", 4),
      ev("a", "cta_clicked", 5, { target: "view_verification" }),
      ev("b", "$pageview", 0),
    ]);
    expect(s).toEqual({ eligibleSessions: 2, attributedSessions: 0, qualifiedEvaluationSessions: 1, adoptionIntentSessions: 0, progressionSessions: 0 });
  });

  it("separates attributed, evaluating and intending sessions", () => {
    const s = summarizeSessions([
      ev("li", "$pageview", 0, { campaign: "kx_p2_b_token_boundary" }),
      ev("li", "docs_viewed", 1, { campaign: "kx_p2_b_token_boundary" }),
      ev("li", "component_viewed", 2, { campaign: "kx_p2_b_token_boundary" }),
      ev("li", "install_command_copied", 3, { campaign: "kx_p2_b_token_boundary" }),
      ev("direct", "cli_command_copied", 0),
      ev("bounce", "$pageview", 0, { campaign: "kx_p2_b_token_boundary" }),
    ]);
    expect(s).toEqual({ eligibleSessions: 3, attributedSessions: 2, qualifiedEvaluationSessions: 1, adoptionIntentSessions: 2, progressionSessions: 1 });
  });

  it("does not count a campaign landing on a docs page as evaluation or intent by itself", () => {
    // The ART-002 destination is /docs/tokens, which emits docs_viewed. analytics.md §3 does not list it.
    const s = summarizeSessions([ev("x", "$pageview", 0, { campaign: "kx_p2_b_token_boundary" }), ev("x", "docs_viewed", 1, { campaign: "kx_p2_b_token_boundary" })]);
    expect(s).toMatchObject({ attributedSessions: 1, qualifiedEvaluationSessions: 0, adoptionIntentSessions: 0 });
  });

  it("keeps a session attributed when the evaluation happens in a tab that carries no campaign of its own", () => {
    const s = summarizeSessions([ev("s", "docs_viewed", 0, { campaign: "kx_p2_a_drift" }), ev("s", "component_viewed", 5)]);
    expect(s).toMatchObject({ attributedSessions: 1, qualifiedEvaluationSessions: 1 });
    // ...and when the campaign tab is not the session's first event: observed live on 2026-09-30, a PostHog
    // session whose first window was direct and whose campaign landing came half an hour later in another tab.
    const later = summarizeSessions([ev("t", "$pageview", 0), ev("t", "docs_viewed", 1800, { campaign: "kx_p2_a_drift" })]);
    expect(later.attributedSessions).toBe(1);
  });

  it("counts Progression only when intent comes at or after the first evaluation, and installation_viewed as both", () => {
    expect(summarizeSessions([ev("s", "cli_command_copied", 0), ev("s", "component_viewed", 5)]).progressionSessions).toBe(0);
    expect(summarizeSessions([ev("s", "component_viewed", 0), ev("s", "cli_command_copied", 5)]).progressionSessions).toBe(1);
    expect(summarizeSessions([ev("s", "installation_viewed", 0)])).toMatchObject({ qualifiedEvaluationSessions: 1, adoptionIntentSessions: 1, progressionSessions: 1 });
  });

  it("keeps Progression bounded by Qualified Evaluation, and never divides intent by evaluation", () => {
    const s = summarizeSessions([ev("a", "cli_command_copied", 0), ev("b", "install_command_copied", 0), ev("c", "component_viewed", 0)]);
    expect(s.adoptionIntentSessions).toBeGreaterThan(s.qualifiedEvaluationSessions); // why AI ÷ QE is not a rate
    expect(s.progressionSessions).toBeLessThanOrEqual(s.qualifiedEvaluationSessions);
  });
});
