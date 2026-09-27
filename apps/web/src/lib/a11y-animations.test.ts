// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeAnimation,
  harnessAnimations,
  isHarnessAnimationName,
  LOOPING_MOTION_LIMIT_MS,
  reducedMotionViolations,
} from "../../../../scripts/a11y-animations.mjs";

/**
 * The reduced-motion check has to police KinetixUI's motion and nothing else.
 *
 * The defect these exist for: `scripts/a11y-browser.mjs` gathered its evidence with
 * `document.getAnimations()`, which returns every animation on the page. Storybook's preview shell
 * displays a spinner over the story while it prepares —
 *
 *     .sb-loader { animation: sb-rotate360 0.7s linear infinite; }
 *
 * — which is infinite, running, and 0.7s: the rule's exact shape. The check waited for
 * `sb-show-main` plus a fixed 300ms, so whenever that spinner outlived the wait, an arbitrary story
 * failed with `reduced-motion: still looping: div:sb-rotate360`. It fired on #235, whose entire diff
 * was three version fields and three changelogs, while main was green on all eight preceding runs.
 *
 * So the risk being guarded here is not "does the filter work". It is the opposite: that a filter
 * written to quieten a flake grows until it quietens the subject too. The load-bearing assertion is
 * "cannot ignore anything KinetixUI ships", and it reads the names out of
 * `packages/ui/tailwind.config.ts` rather than listing them, because the ones that matter —
 * `caret-blink` at 1.25s and `typing-dot` at 1.2s — are infinite loops under this limit and are
 * precisely what the check exists to catch.
 *
 * These live in the web app's suite for the same reason `launch-config.test.ts` does: the
 * repository's script-level rules are tested here because it needs no new test wiring.
 */

/** The only two keyframes Storybook's shell defines. Not committed — `storybook-static/` is ignored. */
const STORYBOOK_KEYFRAMES = ["sb-rotate360", "sb-glow"];

const repoRoot = path.resolve("../..");

/** Every animation name KinetixUI ships, read from the config that defines them. */
function kinetixAnimationNames(): string[] {
  const source = readFileSync(path.join(repoRoot, "packages/ui/tailwind.config.ts"), "utf8");
  const names = new Set<string>();
  for (const block of ["keyframes", "animation"]) {
    const start = source.indexOf(block + ": {");
    expect(start, "packages/ui/tailwind.config.ts has no " + block + " block").toBeGreaterThan(-1);
    // Keys down to the matching close: quoted ("accordion-down") or bare (marquee).
    const body = source.slice(start, source.indexOf("\n      },", start));
    for (const match of body.matchAll(/^ {8}(?:"([a-z0-9-]+)"|([a-z0-9-]+)):/gm)) {
      names.add(match[1] ?? match[2]);
    }
  }
  return [...names];
}

const running = (name: string | null, durationMs: number | string | null, loops = true) => ({
  name,
  target: "div.probe",
  durationMs,
  loops,
  playState: "running",
});

describe("isHarnessAnimationName", () => {
  it("ignores the keyframes Storybook's own shell defines", () => {
    for (const name of STORYBOOK_KEYFRAMES) {
      expect(isHarnessAnimationName(name), name + " belongs to Storybook").toBe(true);
    }
  });

  it("ignores any other sb- prefixed name, because the whole prefix is Storybook's", () => {
    expect(isHarnessAnimationName("sb-fade-in")).toBe(true);
    expect(isHarnessAnimationName("sb-")).toBe(true);
  });

  it("does not ignore component or app animations", () => {
    for (const name of ["kinetix-fade-in", "spin", "caret-blink", "typing-dot", "marquee", "enter", "exit"]) {
      expect(isHarnessAnimationName(name), name + " must stay in scope").toBe(false);
    }
  });

  /** It must not key on "contains sb-", or `kx-sb-pulse` would walk straight through it. */
  it("matches a prefix, not a substring", () => {
    expect(isHarnessAnimationName("kx-sb-pulse")).toBe(false);
    expect(isHarnessAnimationName("not-sb-rotate360")).toBe(false);
    expect(isHarnessAnimationName("SB-ROTATE360")).toBe(false);
  });

  it("does not ignore an animation it cannot identify", () => {
    for (const name of [null, undefined, "", "   ", ",", "none", 0, {}]) {
      expect(isHarnessAnimationName(name as never), JSON.stringify(name) + " is not provably Storybook's").toBe(false);
    }
  });

  /** A declaration carrying both is not Storybook's — the component animation in it still counts. */
  it("ignores a comma-separated list only when every name in it is Storybook's", () => {
    expect(isHarnessAnimationName("sb-glow, sb-rotate360")).toBe(true);
    expect(isHarnessAnimationName("sb-glow,caret-blink")).toBe(false);
    expect(isHarnessAnimationName("caret-blink, sb-glow")).toBe(false);
  });

  /** The assertion that stops this filter growing into the subject it is supposed to leave alone. */
  it("cannot ignore anything KinetixUI ships", () => {
    const names = kinetixAnimationNames();
    expect(names.length, "read no animation names out of the Tailwind config").toBeGreaterThan(3);
    expect(names).toContain("caret-blink");
    expect(names).toContain("typing-dot");
    for (const name of names) {
      expect(isHarnessAnimationName(name), name + " is KinetixUI's own and must be checked").toBe(false);
    }
  });
});

describe("reducedMotionViolations", () => {
  const spinner = { name: "sb-rotate360", target: "div.sb-loader", durationMs: 700, loops: true, playState: "running" };
  const caret = { name: "caret-blink", target: "span.kx-caret", durationMs: 1250, loops: true, playState: "running" };

  /** The exact page state that failed #235: the harness spinner, and nothing else. */
  it("passes a page whose only fast loop is Storybook's spinner", () => {
    expect(reducedMotionViolations([spinner])).toEqual([]);
    expect(harnessAnimations([spinner])).toHaveLength(1);
  });

  it("still fails a component loop, spinner present or not", () => {
    expect(reducedMotionViolations([caret])).toEqual([caret]);
    expect(reducedMotionViolations([spinner, caret])).toEqual([caret]);
  });

  it("does not report an empty page as a violation, or a violation as empty", () => {
    expect(reducedMotionViolations([])).toEqual([]);
    expect(harnessAnimations([])).toEqual([]);
  });

  it("keeps the rule it had: only infinite, only running, only under the limit", () => {
    expect(reducedMotionViolations([running("caret-blink", 1250, false)]), "finite animations are fine").toEqual([]);
    expect(reducedMotionViolations([{ ...caret, playState: "paused" }]), "paused is not motion").toEqual([]);
    expect(reducedMotionViolations([running("marquee", 32000)]), "32s is slower than the limit").toEqual([]);
    expect(reducedMotionViolations([running("slow", LOOPING_MOTION_LIMIT_MS)]), "the limit is exclusive").toEqual([]);
    expect(reducedMotionViolations([running("fast", LOOPING_MOTION_LIMIT_MS - 1)])).toHaveLength(1);
  });

  /** `getComputedTiming().duration` can report `"auto"`; it compared false before and must still. */
  it("does not invent a violation out of a duration it cannot read", () => {
    expect(reducedMotionViolations([running("mystery", "auto")])).toEqual([]);
  });
});

describe("describeAnimation", () => {
  it("names the element, the animation, the duration and the state", () => {
    const message = describeAnimation({
      name: "caret-blink",
      target: "span.kx-caret",
      durationMs: 1250,
      loops: true,
      playState: "running",
    });
    expect(message).toBe("span.kx-caret:caret-blink (1250ms, running)");
  });

  it("stays readable when the page could not tell us everything", () => {
    expect(describeAnimation({ name: null, target: null, durationMs: "auto", playState: "running" })).toBe(
      "?:animation (auto, running)",
    );
  });
});
