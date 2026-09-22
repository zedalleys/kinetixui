import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../app/page";

// <Reveal> (used throughout the homepage) observes its own mount with IntersectionObserver, which jsdom does
// not implement. A minimal stub is enough — this test cares about rendered content, not scroll-triggered reveal.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    disconnect() {}
    unobserve() {}
  },
);
// HeroCommand checks prefers-reduced-motion on mount; jsdom has no matchMedia. `true` also keeps its typing
// animation static, which is irrelevant to what this file asserts.
window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }) as never;
import { componentTotal } from "./platform-support";
import { documentedExceptionCount, fullCoverageCount, projectLicense, projectVersion } from "./project-stats";

/**
 * The homepage is marketing copy read by prospective adopters — it is exactly the surface that drifted before
 * (a hand-typed "72" component count, "License: Beta"). This file guards two things: that the source has no
 * literal digits for a derivable fact, and that what actually renders matches the repository's current truth.
 */
// Vitest runs with apps/web as the root.
const source = readFileSync("src/app/page.tsx", "utf8");

describe("homepage source: no hand-typed facts", () => {
  it("derives its numbers from project-stats / platform-support, not from a literal SPEC array", () => {
    expect(source).toMatch(/from "@\/lib\/project-stats"/);
    expect(source).toMatch(/componentPlatformCount|componentTotal/);
  });

  it("never claims HTML/CSS as a fifth component implementation platform", () => {
    expect(source).not.toMatch(/HTML\s*\+\s*CSS/);
  });

  it("never writes a bare numeric literal next to the old SPEC labels (the exact shape of the drift this guards)", () => {
    // the literals that were wrong when this was audited: 72 components, a "05" platform-target count, "Beta" as
    // a license value. None of these should appear as quoted string literals in the source at all.
    for (const banned of ['"72"', '"05"', '"Beta"']) expect(source).not.toContain(banned);
  });
});

/**
 * The cross-platform claim is easy to overstate. Two things share a source and two things do not: the DTCG token
 * file generates every platform's token artefacts, while React, SwiftUI, Jetpack Compose and Flutter each hold a
 * separate, hand-written implementation of the same component contract. Copy that says or implies the React source
 * is compiled/transpiled into the native ones is simply false, and it is the kind of claim a reader checks.
 */
const TRANSPILATION_CLAIMS: [RegExp, string][] = [
  [/transpil/i, "nothing here transpiles anything"],
  [/\bsource compiles\b/i, "the retracted 'the same source compiles to …' claim"],
  [/compil\w* (?:in)?to (?:real |native )*(?:swiftui|jetpack compose|compose|flutter|kotlin|swift|dart)\b/i, "components are not compiled into a native framework"],
  [/components? for (?:\w+, )*swiftui/i, "'… into tokens and components for React, SwiftUI …' — components are not generated per platform"],
];

describe("architecture wording: token generation vs native implementation", () => {
  const readme = readFileSync("../../README.md", "utf8");
  const flagship = readFileSync("src/components/cross-platform-flagship.tsx", "utf8");

  it("never claims, in the homepage or flagship source, that component code is compiled into a native framework", () => {
    for (const [pattern, why] of TRANSPILATION_CLAIMS) {
      expect(source, why).not.toMatch(pattern);
      expect(flagship, why).not.toMatch(pattern);
    }
  });

  it("never makes that claim in the README's flagship pitch either", () => {
    for (const [pattern, why] of TRANSPILATION_CLAIMS) expect(readme, why).not.toMatch(pattern);
  });

  it("states the real architecture: tokens generated, components implemented natively", () => {
    expect(source).toMatch(/tokens are generated/i);
    expect(source).toMatch(/implement the same component contract natively/i);
  });
});

describe("homepage rendering: matches the repository's current truth", () => {
  // fresh render per test: @testing-library/react's auto-cleanup unmounts after each test, so a render captured
  // once at describe-body scope would leave later tests reading an empty, unmounted container.
  let text: () => string;
  beforeEach(() => {
    const { container } = render(<HomePage />);
    text = () => container.textContent ?? "";
  });

  it("shows the real component total and platform count, not a stale figure", () => {
    expect(text()).toContain(String(componentTotal));
    expect(text()).toContain("4"); // four component platforms
  });

  it("shows the real package version and MIT as the license — and never 'Beta' as a license value", () => {
    expect(text()).toContain(`v${projectVersion}`);
    expect(text()).toContain(projectLicense);
    expect(projectLicense).toBe("MIT");
  });

  it("shows the derived platform-parity trust line, not a hand-typed one", () => {
    expect(text()).toContain(`${fullCoverageCount}/${componentTotal}`);
    expect(text()).toContain(`${documentedExceptionCount} documented`);
  });

  it("does not claim the design is 'identical everywhere'", () => {
    expect(text().toLowerCase()).not.toContain("identical everywhere");
  });

  it("never renders HTML/CSS as a platform name in the marquee", () => {
    expect(text()).not.toMatch(/HTML\s*\+\s*CSS/);
  });

  it("renders the flagship cross-platform demo, not the old static button/input strip", () => {
    expect(text()).toContain("Notifications"); // the flagship preview's real content
    expect(text()).not.toContain("Rendered by @kinetixui/ui");
  });
});
