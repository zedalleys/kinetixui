// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { analytics } from "./analytics";
import { isAdoptionIntent, isQualifiedEvaluation, summarizeSessions } from "./analytics-measurement";
import { trackRouteView } from "./analytics-surfaces";
import { PLATFORMS, type Platform } from "./platform-parity";
import { SETUP_HREF } from "./platform-tabs";

/**
 * Every platform's setup page answers the five first-use questions, in order (BD-W4 F-02, F-03):
 *   1. what do I install       a fence a reader pastes to add the package
 *   2. what do I import        a fence with the platform's KinetixUI import
 *   3. what code do I copy     that same fence is the first-use sample
 *   4. what should I see       a "You should see" sentence after it
 *   5. what is next            a next-step list after that
 * and says no more than the evidence does: a sample CI compiles names the gate that compiles it, a sample nothing
 * compiles says so, and no page claims an install succeeded, or more verification than exists.
 */
const read = (p: string) => readFileSync(`../../${p}`, "utf8");
const pagePath = (p: Platform) => `apps/web/src/app/docs${SETUP_HREF[p].replace("/docs", "")}/page.mdx`;

type Contract = {
  install: RegExp;
  imports: RegExp;
  next: RegExp;
  /** The CI step that compiles the first-use sample, or null when nothing does (and the page must say so). */
  compiledBy: { workflow: string; run: string } | null;
};

const CONTRACT: Record<Platform, Contract> = {
  React: {
    install: /```bash\nnpm i @kinetixui\/ui @kinetixui\/tokens\n```/,
    imports: /^import \{ Button \} from "@kinetixui\/ui";$/m,
    next: /^## Next steps$/m,
    compiledBy: { workflow: ".github/workflows/ci.yml", run: "node scripts/adoption/react-consumer.mjs" },
  },
  Angular: {
    install: /```bash\nnpm i @kinetixui\/angular @kinetixui\/tokens\n```/,
    imports: /^import \{ KxButton, KxSwitch \} from '@kinetixui\/angular';$/m,
    next: /<FirstUseNextSteps platform="Angular" \/>/,
    // the template is compiled by the package spec, and the page's copy is held equal to it by angular-docs.test.ts
    compiledBy: { workflow: ".github/workflows/ci.yml", run: "pnpm test:angular" },
  },
  SwiftUI: {
    install: /\.package\(path: "[^"]*packages\/ui-swiftui"\)/,
    imports: /^import KinetixUI$/m,
    next: /<FirstUseNextSteps platform="SwiftUI" \/>/,
    compiledBy: null,
  },
  Compose: {
    install: /include\(":kinetixui-ui"\)/,
    imports: /^import com\.kinetixui\.ui\.\*$/m,
    next: /<FirstUseNextSteps platform="Compose" \/>/,
    compiledBy: { workflow: ".github/workflows/native-compose.yml", run: "node scripts/adoption/compose-consumer.mjs" },
  },
  Flutter: {
    install: /^\s+kinetix_ui:\s*$/m,
    imports: /^import 'package:kinetix_ui\/kinetix_ui\.dart';$/m,
    next: /<FirstUseNextSteps platform="Flutter" \/>/,
    compiledBy: null,
  },
};

/** A first-use page claiming more than any gate here can show. */
const FALSE_SUCCESS = [
  /successfully installed/i,
  /installation (?:is )?complete/i,
  /you(?:'re| are) (?:all )?(?:set|done)\b/i,
  /production[- ]ready/i,
  /verified on (?:a |an )?(?:real )?(?:device|simulator|emulator)/i,
  /works (?:on|across) every (?:platform|device)/i,
  /fully accessible/i,
];

function firstUseViolations(platform: Platform, text: string, workflows: Record<string, string>): string[] {
  const c = CONTRACT[platform];
  const out: string[] = [];
  const at = (re: RegExp) => text.search(re);
  const install = at(c.install);
  const imports = at(c.imports);
  const see = text.indexOf("You should see", imports);
  const next = at(c.next);
  if (install < 0) out.push("1 install: no install snippet");
  if (imports < 0) out.push("2/3 import: no first-use sample with the KinetixUI import");
  if (imports >= 0 && see < 0) out.push("4 expect: no \"You should see\" after the sample");
  if (next < 0) out.push("5 next: no next step");
  else if (see >= 0 && next < see) out.push("5 next: the next step comes before the expected result");
  if (c.compiledBy) {
    if (!(workflows[c.compiledBy.workflow] ?? "").includes(`run: ${c.compiledBy.run}`)) out.push(`compiled claim: ${c.compiledBy.workflow} no longer runs ${c.compiledBy.run}`);
  } else if (!/This sample is not compiled in CI/.test(text)) {
    out.push("compiled claim: nothing compiles this sample and the page does not say so");
  }
  for (const re of FALSE_SUCCESS) if (re.test(text)) out.push(`false success claim ${re}`);
  return out;
}

const workflows = Object.fromEntries(
  [...new Set(PLATFORMS.flatMap((p) => (CONTRACT[p].compiledBy ? [CONTRACT[p].compiledBy!.workflow] : [])))].map((w) => [w, read(w)]),
);

describe("first-use contract on every setup page", () => {
  it("covers every manifest platform", () => {
    expect(Object.keys(CONTRACT).sort()).toEqual([...PLATFORMS].sort());
  });

  it.each(PLATFORMS)("%s answers install, import, copy, expect and next, and claims no more than CI shows", (p) => {
    expect(firstUseViolations(p, read(pagePath(p)), workflows)).toEqual([]);
  });

  /* Negative controls, each against the real page. */
  const page = (p: Platform) => read(pagePath(p));

  it("catches the Angular page as it was before BD-W4 (no expected result, no next step)", () => {
    const before = page("Angular").replace(/\nPut the five `@import`[\s\S]*?<FirstUseNextSteps platform="Angular" \/>\n/, "\n");
    const v = firstUseViolations("Angular", before, workflows).join("\n");
    expect(v).toMatch(/4 expect/);
    expect(v).toMatch(/5 next/);
  });

  it.each(PLATFORMS)("catches %s losing its install snippet or its import", (p) => {
    const c = CONTRACT[p];
    expect(firstUseViolations(p, page(p).replace(new RegExp(c.install.source, "gm"), ""), workflows).join()).toMatch(/1 install/);
    expect(firstUseViolations(p, page(p).replace(new RegExp(c.imports.source, "gm"), ""), workflows).join()).toMatch(/2\/3 import/);
  });

  it.each(["SwiftUI", "Flutter"] as const)("catches %s dropping the statement that CI does not compile its sample", (p) => {
    expect(firstUseViolations(p, page(p).replace("This sample is not compiled in CI", "This sample is checked"), workflows).join()).toMatch(/does not say so/);
  });

  it("catches a compiled claim whose CI step was removed", () => {
    const gone = { ...workflows, ".github/workflows/native-compose.yml": "" };
    expect(firstUseViolations("Compose", page("Compose"), gone).join()).toMatch(/no longer runs/);
  });

  it.each([
    ["React", "\nKinetixUI is now successfully installed.\n"],
    ["Compose", "\nThis screen is verified on a real device.\n"],
    ["Flutter", "\nYou're all set: it works across every platform.\n"],
  ] as const)("catches a false success claim on %s", (p, claim) => {
    expect(firstUseViolations(p, page(p) + claim, workflows).join()).toMatch(/false success claim/);
  });
});

/**
 * Reading a setup page is evaluation of the docs, not adoption, and not proof of an install. The platform it now
 * carries must not move it into either measure: QER stays defined as analytics.md §2-§4 say.
 */
describe("a setup page view is not counted as adoption", () => {
  it.each(PLATFORMS)("%s setup view stays outside QE and Adoption Intent", (p) => {
    const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
    trackRouteView(SETUP_HREF[p]);
    const [event] = track.mock.calls[0]!;
    track.mockRestore();
    const counted = { qe: isQualifiedEvaluation({ event }), intent: isAdoptionIntent({ event }) };
    // React's setup page is /docs/installation, whose installation_viewed has been a QE and AI signal since §3/§4
    // were written; the four platform pages send docs_viewed, which is neither.
    expect(counted).toEqual(p === "React" ? { qe: true, intent: true } : { qe: false, intent: false });
  });

  it("a session that only read native setup pages has no QE and no intent (negative control for counting it)", () => {
    const s = summarizeSessions([
      { sessionId: "s", event: "docs_viewed", timestamp: 0 },
      { sessionId: "s", event: "docs_viewed", timestamp: 5 },
    ]);
    expect(s.eligibleSessions).toBe(1);
    expect(s.qualifiedEvaluationSessions).toBe(0);
    expect(s.adoptionIntentSessions).toBe(0);
  });
});
