import { existsSync, readFileSync } from "node:fs";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/docs/tokens" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { AnalyticsProvider } from "@/components/analytics-provider";
import { TokenAcrossPlatforms } from "@/components/token-evidence";
import manifest from "../../../../components.manifest.json";
import publishPackages from "../../../../release/publish-packages.json";
import { analytics } from "./analytics";
import { isAdoptionIntent, isQualifiedEvaluation } from "./analytics-measurement";
import { classifyCommand, componentSlugFor, trackFenceCopy } from "./analytics-surfaces";
import { PACKAGES } from "./packages";
import { publicRoutes } from "./seo";
import { tokenEvidence } from "./token-evidence";

/**
 * /docs/tokens is the ART-002 campaign destination. Its job is to take a technically interested visitor from
 * reading about the token pipeline to inspecting the product — without that page counting as evaluation itself.
 *
 * `marketing/analytics.md` §3 is explicit: a `/docs/tokens` view emits `docs_viewed`, which is neither Qualified
 * Evaluation nor Adoption Intent. So this file proves the journey is real while the definitions stay put:
 *
 *  - the page's own render produces one `docs_viewed` and nothing that qualifies;
 *  - its evaluation link leads to a real component page, where the EXISTING `component_viewed` qualifies;
 *  - its one install command is a real, published package, and copying it is the existing Adoption Intent signal;
 *  - nothing on it offers an install path for a platform that has no distributed package;
 *  - the ART-002 article it serves still agrees with the token source it links to.
 *
 * Campaign attribution across the navigation is proven with the real SDK in a real browser
 * (`scripts/analytics-browser.mjs`, the "tokens bridge" flow), since it depends on PostHog's own persistence.
 */

const PAGE = readFileSync("src/app/docs/tokens/page.mdx", "utf8");
const ARTICLE = readFileSync("../../marketing/content/articles/ART-002-tokens-past-the-web-boundary.md", "utf8");

/** The page with fenced code removed: prose, tables and links only. */
const prose = (mdx: string) => mdx.replace(/```[\s\S]*?```/g, "");
/** Every fenced block: language and body. */
const fences = (md: string) => [...md.matchAll(/```(\w*)\n([\s\S]*?)```/g)].map((m) => ({ language: m[1]!, body: m[2]! }));
/** Markdown link destinations in order of appearance, which is the DOM order the MDX renders. */
const links = (md: string) => [...prose(md).matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]!);
/** The body of one `## heading` section. */
const section = (md: string, heading: string) => {
  const start = md.indexOf(`\n## ${heading}\n`);
  expect(start, `section "${heading}"`).toBeGreaterThanOrEqual(0);
  const end = md.indexOf("\n## ", start + 1);
  return md.slice(start, end < 0 ? undefined : end);
};

const EVALUATION_DESTINATION = "/docs/components/button";

const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
vi.spyOn(analytics, "pageview").mockImplementation(() => {});

beforeEach(() => {
  track.mockClear();
  nav.pathname = "/docs/tokens";
});

/** The events a list of track calls amounts to, in the measurement model's terms. */
const signals = () =>
  track.mock.calls.map(([event, props]) => {
    const e = { event, target: (props as { target?: string } | undefined)?.target };
    return { event, qe: isQualifiedEvaluation(e), intent: isAdoptionIntent(e) };
  });

describe("/docs/tokens — the page view is not evaluation", () => {
  it("rendering the page and its token evidence sends one docs_viewed, which qualifies as neither", () => {
    render(
      <>
        <AnalyticsProvider />
        <TokenAcrossPlatforms />
      </>,
    );
    expect(track.mock.calls).toEqual([["docs_viewed", { page: "/docs/tokens", source: "docs_page" }]]);
    expect(signals()).toEqual([{ event: "docs_viewed", qe: false, intent: false }]);
  });

  it("copying a platform's generated output is not a component-code copy and sends nothing", async () => {
    const user = userEvent.setup();
    render(<TokenAcrossPlatforms />);
    const swift = screen.getByText("iOS").closest("figure")!;
    await user.click(within(swift as HTMLElement).getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(within(swift as HTMLElement).getByText("Copied")).toBeTruthy());
    expect(track).not.toHaveBeenCalled();
  });

  it("the evidence is static: no platform switcher that would emit platform_selected", () => {
    render(<TokenAcrossPlatforms />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    // all four platforms are present at once, in the order the section describes
    expect(screen.getAllByRole("figure").map((f) => f.querySelector("figcaption span")?.textContent?.split(" ")[0])).toEqual(["Web", "iOS", "Android", "Flutter"]);
  });
});

describe("/docs/tokens — the evaluation bridge", () => {
  it("the component section and the first next step both lead to the same real component page", () => {
    expect(links(section(PAGE, "See the tokens in a component"))[0]).toBe(EVALUATION_DESTINATION);
    // CTA hierarchy: the primary next step is first in the list, so first in the DOM and first visually
    const next = links(section(PAGE, "Next steps"));
    expect(next[0]).toBe(EVALUATION_DESTINATION);
    expect(next).toHaveLength(3);
    expect(next.slice(1).every((href) => href.startsWith("https://github.com/zedalleys/kinetixui/"))).toBe(true);
  });

  it("the destination exists, is a public route and is a component the docs know", () => {
    expect(existsSync(`src/app${EVALUATION_DESTINATION}/page.mdx`)).toBe(true);
    expect(publicRoutes()).toContain(EVALUATION_DESTINATION);
    expect(componentSlugFor(EVALUATION_DESTINATION)).toBe("button");
  });

  it("following it produces the existing component_viewed, which is Qualified Evaluation — and only that", () => {
    const { rerender } = render(<AnalyticsProvider />);
    track.mockClear();
    nav.pathname = EVALUATION_DESTINATION;
    rerender(<AnalyticsProvider />);
    expect(track.mock.calls).toEqual([["component_viewed", { component: "button", source: "component_page" }]]);
    expect(signals()).toEqual([{ event: "component_viewed", qe: true, intent: false }]);
  });

  it("the link is a plain link, not a CTA marker: one user action, one semantic event (the destination's)", () => {
    // MDX links render as <Link>; a CTA marker would need ctaAttrs and would add a cta_clicked to the same click
    expect(PAGE).not.toMatch(/data-analytics-cta|ctaAttrs/);
  });

  it("the component it points at really is built on the token the page traces", () => {
    // Button's primary variant fills with `action`, and `action` aliases the evidence token
    const button = readFileSync("../../packages/ui/src/components/button.tsx", "utf8");
    expect(button).toMatch(/Primary:\s*\n?\s*"bg-action text-action-foreground/);
    const action = tokenEvidence("action");
    expect(action.source.find((r) => r.path === "color.action" && r.theme === "light")?.value).toBe("{color.primary}");
    expect(action.resolved).toEqual(tokenEvidence("primary").resolved);
  });
});

describe("/docs/tokens — the adoption bridge only offers what exists", () => {
  const PUBLISHED = new Set(publishPackages.packages.map((p) => p.name));

  it("every install command on the page installs a package KinetixUI publishes to npm", () => {
    const commands = fences(PAGE)
      .filter((f) => ["bash", "sh", "shell"].includes(f.language))
      .flatMap((f) => f.body.split("\n"))
      .filter((l) => /^(npm|pnpm|yarn|bun)\s+(i|install|add)\b/.test(l.trim()));
    expect(commands).toEqual(["npm install @kinetixui/tokens"]);
    for (const c of commands) expect(PUBLISHED.has(c.split(/\s+/).pop()!)).toBe(true);
  });

  it("copying it is the existing Adoption Intent signal, carrying the package and nothing else", () => {
    expect(classifyCommand("npm install @kinetixui/tokens", "bash")).toEqual({ event: "install_command_copied", package: PACKAGES.tokens });
    trackFenceCopy("npm install @kinetixui/tokens", "bash", "/docs/tokens");
    expect(track.mock.calls).toEqual([["install_command_copied", { source: "docs_page", package: PACKAGES.tokens }]]);
    expect(signals()).toEqual([{ event: "install_command_copied", qe: false, intent: true }]);
  });

  it("the repository build command is not mistaken for an install and sends nothing", () => {
    trackFenceCopy("pnpm build:tokens   # node style-dictionary/build.mjs — maintainers, inside this repository", "bash", "/docs/tokens");
    expect(track).not.toHaveBeenCalled();
  });

  it("no native package-manager instruction appears for a platform with no published package", () => {
    const native = Object.entries(manifest.platformDefinitions).filter(([, d]) => "distribution" in d && d.distribution && !d.distribution.published);
    // today: SwiftUI, Compose and Flutter. If one is published, this list shrinks and the page must say so.
    expect(native.map(([p]) => p).sort()).toEqual(["Compose", "Flutter", "SwiftUI"]);
    for (const pattern of [
      /\.package\(url:/, // SwiftPM
      /\bpod ['"]/, // CocoaPods
      /implementation\s*\(?["']com\.kinetixui/, // Gradle
      /\b(flutter|dart) pub add\b/,
      /kinetix_ui:\s*\^/, // a hosted pub.dev version constraint
      /swift package add/i,
    ]) {
      expect(PAGE, String(pattern)).not.toMatch(pattern);
    }
  });

  it("the adoption table says 'None' in the registry column for exactly the unpublished native platforms", () => {
    const rows = section(PAGE, "Using the tokens")
      .split("\n")
      .filter((l) => /^\| (Web|iOS|Android|Flutter)/.test(l))
      .map((l) => l.split("|").map((c) => c.trim()));
    expect(rows.map((r) => r[1])).toEqual(["Web", "iOS (SwiftUI)", "Android (Compose)", "Flutter"]);
    const registry = Object.fromEntries(rows.map((r) => [r[1], r[4]!]));
    expect(registry.Web).toBe("npm");
    const published = (p: "SwiftUI" | "Compose" | "Flutter") => manifest.platformDefinitions[p].distribution.published;
    expect(registry["iOS (SwiftUI)"]!.startsWith("None")).toBe(!published("SwiftUI"));
    expect(registry["Android (Compose)"]!.startsWith("None")).toBe(!published("Compose"));
    expect(registry.Flutter!.startsWith("None")).toBe(!published("Flutter"));
  });
});

describe("ART-002 (the campaign article) agrees with the page it sends readers to", () => {
  const front = Object.fromEntries([...ARTICLE.split("---")[1]!.matchAll(/^(\w+):\s*(.+)$/gm)].map((m) => [m[1]!, m[2]!.trim()]));

  it("links /docs/tokens under its campaign", () => {
    expect(front.cta).toBe("/docs/tokens");
    expect(front.campaign).toBe("kx_p2_b_token_boundary");
    expect(ARTICLE).toContain("https://kinetixui.com/docs/tokens");
  });

  it("every token it names in its primitive/semantic example is defined, with the value it states", () => {
    const light = JSON.parse(readFileSync("../../tokens/semantic/color.light.json", "utf8"));
    const primitives = JSON.parse(readFileSync("../../tokens/primitives/color.json", "utf8"));
    const lookup = (path: string) => path.split(".").reduce((n, k) => n?.[k], { ...primitives, color: { ...primitives.color, ...light.color } })?.$value;
    const example = fences(ARTICLE).find((f) => f.body.includes("primitive:") && f.body.includes("semantic:"));
    expect(example, "the primitive/semantic example block").toBeTruthy();
    const pairs = [...example!.body.matchAll(/(color\.[\w.-]+)\s*=\s*(\S+)/g)].map((m) => [m[1]!, m[2]!] as const);
    expect(pairs.length).toBeGreaterThanOrEqual(3);
    for (const [path, value] of pairs) expect(lookup(path), path).toBe(value);
  });

  it("the theme adapter it shows exists under that name", () => {
    expect(ARTICLE).toContain("KinetixMaterialTheme.light()");
    expect(readFileSync("../../packages/ui-flutter/lib/src/kinetix_material_theme.dart", "utf8")).toMatch(/static ThemeData light\(/);
  });

  it("the page states the platform truth the article's claims rest on", () => {
    const body = prose(PAGE);
    expect(body).toMatch(/Tokens are generated; components are not/);
    expect(body).toMatch(/none of them is on Swift Package Manager, Maven Central or pub\.dev/);
    expect(body).toMatch(/KinetixMaterialTheme/);
  });
});
