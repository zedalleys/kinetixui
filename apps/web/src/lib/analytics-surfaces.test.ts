import { beforeEach, describe, expect, it, vi } from "vitest";
import { analytics } from "./analytics";
import {
  isPersonInput,
  classifyCommand,
  classifyLink,
  componentSlugFor,
  ctaAttrs,
  analyticsPlatformFor,
  platformForLanguage,
  sourceForPath,
  trackFenceCopy,
  trackRouteView,
} from "./analytics-surfaces";
import { PLATFORMS } from "./platform-parity";
import { PACKAGES } from "./packages";
import {
  OPERATIONS,
  OPERATION_IDS,
  PACKAGE_MANAGERS,
  renderCommand,
  type Operation,
  type OperationId,
  type RenderParams,
} from "./pm-commands";
import { componentDocs, siteConfig } from "./site";

const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
beforeEach(() => track.mockClear());

const ORIGIN = "https://kinetixui.com";
const anyComponent = componentDocs[0]!.href.split("/").pop()!;

describe("packages come from the package.json files, not from this test or the site", () => {
  it("are the public packages the site can name", () => {
    expect(Object.values(PACKAGES).sort()).toEqual([
      "@kinetixui/angular",
      "@kinetixui/cli",
      "@kinetixui/iot",
      "@kinetixui/tokens",
      "@kinetixui/ui",
    ]);
  });

  /**
   * The list above is what `classifyCommand` recognises, so a package missing from it makes its install command
   * copy silently untracked. `@kinetixui/iot` joined when /iot shipped an install command; this asserts the
   * consequence rather than the list, so the next package added is caught by a failing classification instead of
   * by someone remembering to look here.
   */
  it("recognises an install command for every one of them", () => {
    for (const pkg of Object.values(PACKAGES)) {
      expect(classifyCommand(`pnpm add ${pkg}`, "bash"), `${pkg} install command should classify`).toMatchObject({
        event: "install_command_copied",
        package: pkg,
      });
    }
  });
});

describe("classifyCommand", () => {
  it.each([
    ["npx @kinetixui/cli init"],
    ["npx @kinetixui/cli add button"],
    ["npx @kinetixui/cli add --all"],
    ["npx --yes @kinetixui/cli@latest add card"],
    ["pnpm dlx @kinetixui/cli add button"],
    ["bunx @kinetixui/cli init"],
    ["$ npx @kinetixui/cli add button"],
    ["cd my-app\nnpx @kinetixui/cli init"],
  ])("recognises %j as a CLI command", (text) => {
    expect(classifyCommand(text, "bash")).toEqual({ event: "cli_command_copied", package: PACKAGES.cli });
  });

  it.each([
    ["npm i @kinetixui/ui", "@kinetixui/ui", "react"],
    ["npm install @kinetixui/tokens", "@kinetixui/tokens", null],
    ["pnpm add @kinetixui/ui", "@kinetixui/ui", "react"],
    ["yarn add @kinetixui/ui", "@kinetixui/ui", "react"],
    ["bun add @kinetixui/tokens", "@kinetixui/tokens", null],
    ["npm i -g @kinetixui/cli", "@kinetixui/cli", null],
    ["npm i @kinetixui/angular @kinetixui/tokens", "@kinetixui/angular", "angular"],
  ])("recognises %j as an install command for %s (platform %s)", (text, pkg, platform) => {
    expect(classifyCommand(text, "sh")).toEqual({ event: "install_command_copied", package: pkg, ...(platform ? { platform } : {}) });
  });

  it("takes a platform only from a platform's own package, never from the package manager", () => {
    // tokens, the CLI and IoT serve every platform: an install of one is not an install of any platform
    for (const pkg of [PACKAGES.tokens, PACKAGES.cli, PACKAGES.iot]) expect(classifyCommand(`pnpm add ${pkg}`, "bash")).not.toHaveProperty("platform");
    expect(classifyCommand("pnpm add @kinetixui/ui", "bash")).toHaveProperty("platform", "react");
  });

  it.each([
    ["npm i lodash", "bash"], // an install, but not ours
    ["npm run build", "bash"],
    ["git clone https://github.com/zedalleys/kinetixui", "bash"],
    ["npx create-next-app", "bash"],
    ["npm i @kinetixui/ui", "tsx"], // not a shell fence
    ["npm i @kinetixui/ui", undefined], // no language
    ["", "bash"],
    ["const install = 'npm i @kinetixui/ui'", "bash"], // mentions the words but isn't the command
  ])("ignores %j (%s)", (text, language) => {
    expect(classifyCommand(text, language)).toBeNull();
  });

  it("never carries anything from the copied text except a known package name", () => {
    const secret = "SUPER-SECRET-FLAG";
    const result = classifyCommand(`npx @kinetixui/cli add button --note ${secret}`, "bash");
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain("button");
    expect(Object.keys(result!).sort()).toEqual(["event", "package"]);
  });
});

describe("classifyLink", () => {
  it.each([
    [siteConfig.repo],
    [`${siteConfig.repo}/blob/main/scripts/check-contrast.mjs?plain=1#L10`],
    [`${siteConfig.repo}/tree/@kinetixui/ui@0.22.1`],
    [`${siteConfig.repo.replace("https://", "https://www.")}`],
  ])("sends our GitHub repository (%s) to github_clicked", (href) => {
    expect(classifyLink(href, ORIGIN)).toEqual({ event: "github_clicked" });
  });

  it("does not treat GitHub in general as ours", () => {
    expect(classifyLink("https://github.com/someone-else/their-repo", ORIGIN)).toBeNull();
    expect(classifyLink("https://github.com/zedalleys/kinetixui-fork", ORIGIN)).toBeNull();
  });

  it("sends the npm page of each known package to npm_clicked", () => {
    for (const name of Object.values(PACKAGES)) {
      expect(classifyLink(`https://www.npmjs.com/package/${name}`, ORIGIN)).toEqual({ event: "npm_clicked", package: name });
      expect(classifyLink(`https://www.npmjs.com/package/${name}/v/1.2.3?activeTab=versions`, ORIGIN)).toEqual({ event: "npm_clicked", package: name });
    }
  });

  it("ignores npm packages that are not ours", () => {
    expect(classifyLink("https://www.npmjs.com/package/react", ORIGIN)).toBeNull();
    expect(classifyLink("https://www.npmjs.com/package/@kinetixui/not-a-package", ORIGIN)).toBeNull();
  });

  it("reports the design source as an external link by hostname only", () => {
    const result = classifyLink(siteConfig.figma, ORIGIN);
    expect(result).toEqual({ event: "external_link_clicked", target: "figma.com" });
    expect(JSON.stringify(result)).not.toContain("node-id");
  });

  it.each([
    ["https://recharts.org"],
    ["https://www.radix-ui.com/primitives"],
    ["https://lucide.dev"],
    ["mailto:someone@example.com"],
    ["javascript:void(0)"],
    ["not a url"],
    [`${ORIGIN}/docs`], // internal
    [`${ORIGIN}/r/button.json`], // internal, even though it opens in a new tab
  ])("produces nothing for %s", (href) => {
    expect(classifyLink(href, ORIGIN)).toBeNull();
  });
});

describe("isPersonInput", () => {
  it("rejects an event a script created, which is how an automated page load would fake engagement", () => {
    for (const type of ["pointerdown", "keydown", "touchstart", "wheel"]) expect(isPersonInput(new Event(type))).toBe(false);
  });
});

describe("sourceForPath / componentSlugFor", () => {
  it.each([
    ["/", "homepage"],
    ["/docs", "docs_page"],
    ["/docs/tokens", "docs_page"],
    ["/docs/installation", "installation_page"],
    ["/docs/changelog", "changelog_page"],
    ["/docs/components/button", "component_page"],
    ["/components", "components_gallery"],
    ["/charts", null],
    ["/create", null],
    ["/capabilities", "use_cases_hub"],
    ["/use-cases/commerce", "use_case_page"],
    // a use-case-shaped URL with no page is a 404, not a use-case page
    ["/use-cases/healthcare", null],
    ["/use-cases/not-a-domain", null],
  ])("%s → %s", (path, source) => {
    expect(sourceForPath(path)).toBe(source);
  });

  it("knows a component only if the docs list it", () => {
    expect(componentSlugFor(`/docs/components/${anyComponent}`)).toBe(anyComponent);
    expect(componentSlugFor("/docs/components/not-a-real-component")).toBeNull();
    expect(componentSlugFor("/docs/components")).toBeNull();
    expect(componentSlugFor("/docs/tokens")).toBeNull();
    expect(componentSlugFor(`/docs/components/${anyComponent}/extra`)).toBeNull();
  });
});

describe("trackRouteView: one semantic view event per route", () => {
  const events = () => track.mock.calls.map((c) => c[0]);

  it("classifies the installation page", () => {
    trackRouteView("/docs/installation");
    expect(track.mock.calls).toEqual([["installation_viewed", { source: "installation_page", platform: "react" }]]);
  });

  it("classifies the changelog page, with no version invented", () => {
    trackRouteView("/docs/changelog");
    expect(track.mock.calls).toEqual([["changelog_viewed", { source: "changelog_page" }]]);
  });

  it("classifies a component page by its real slug", () => {
    trackRouteView(`/docs/components/${anyComponent}`);
    expect(track.mock.calls).toEqual([["component_viewed", { component: anyComponent, source: "component_page" }]]);
  });

  it.each(["/docs", "/docs/tokens", "/docs/foundations", "/docs/cli"])("classifies %s as a docs view with its path", (path) => {
    trackRouteView(path);
    expect(track.mock.calls).toEqual([["docs_viewed", { page: path, source: "docs_page" }]]);
  });

  it.each([
    ["/docs/angular", "angular"],
    ["/docs/swiftui", "swiftui"],
    ["/docs/compose", "compose"],
    ["/docs/flutter", "flutter"],
  ])("classifies the setup page %s as a docs view that names its platform (still neither QE nor AI)", (path, platform) => {
    trackRouteView(path);
    expect(track.mock.calls).toEqual([["docs_viewed", { page: path, source: "docs_page", platform }]]);
    track.mockClear();
    trackRouteView(`${path}?platform=react#setup`);
    expect(track.mock.calls).toEqual([["docs_viewed", { page: path, source: "docs_page", platform }]]);
  });

  it("names no platform on docs pages that serve every platform", () => {
    for (const path of ["/docs/platforms", "/docs/tokens", "/docs/theming"]) {
      track.mockClear();
      trackRouteView(path);
      expect(track.mock.calls[0]?.[1]).not.toHaveProperty("platform");
    }
  });

  it("never fires two semantic events for one page", () => {
    for (const path of ["/docs/installation", "/docs/changelog", `/docs/components/${anyComponent}`, "/docs/tokens"]) {
      track.mockClear();
      trackRouteView(path);
      expect(track).toHaveBeenCalledTimes(1);
    }
  });

  it("strips a query string and hash from the path it reports", () => {
    trackRouteView("/docs/tokens?q=secret-search#section");
    expect(track.mock.calls).toEqual([["docs_viewed", { page: "/docs/tokens", source: "docs_page" }]]);
    track.mockClear();
    trackRouteView("/docs/changelog?filter=cli&q=private#0.22.0");
    expect(events()).toEqual(["changelog_viewed"]);
  });

  it.each(["/", "/components", "/blocks", "/charts", "/docs/nope", "/docs/components/not-a-real-component", "/docs/components", "/create"])(
    "fires nothing for %s (no semantic view event applies, or the page doesn't exist)",
    (path) => {
      trackRouteView(path);
      expect(track).not.toHaveBeenCalled();
    },
  );
});

describe("trackFenceCopy", () => {
  it("reports a CLI command on the installation page, with the page as the source", () => {
    trackFenceCopy("npx @kinetixui/cli init", "bash", "/docs/installation");
    expect(track.mock.calls).toEqual([["cli_command_copied", { source: "installation_page", package: PACKAGES.cli }]]);
  });

  it("reports an npm install as install_command_copied", () => {
    trackFenceCopy("npm i @kinetixui/ui", "bash", "/docs/installation");
    expect(track.mock.calls).toEqual([["install_command_copied", { source: "installation_page", package: PACKAGES.ui, platform: "react" }]]);
  });

  it("reports the CLI command on a component page too", () => {
    trackFenceCopy(`npx @kinetixui/cli add ${anyComponent}`, "bash", `/docs/components/${anyComponent}`);
    expect(track.mock.calls).toEqual([["cli_command_copied", { source: "component_page", package: PACKAGES.cli }]]);
  });

  it("reports component code only on that component's page, in a platform language", () => {
    const path = `/docs/components/${anyComponent}`;
    trackFenceCopy("<Button />", "tsx", path);
    trackFenceCopy("KinetixButton()", "swift", path);
    trackFenceCopy("KinetixButton()", "kotlin", path);
    trackFenceCopy("KinetixButton()", "dart", path);
    expect(track.mock.calls.map((c) => (c[1] as { platform: string }).platform)).toEqual(["react", "swiftui", "compose", "flutter"]);
    expect(track.mock.calls.every((c) => c[0] === "component_code_copied" && (c[1] as { component: string }).component === anyComponent)).toBe(true);
  });

  it.each([
    ["theme CSS on a docs page", ":root { --primary: 1 2 3 }", "css", "/docs/theming"],
    ["tsx on a page that isn't a component", "<Button />", "tsx", "/docs/theming"],
    ["JSON on a component page", "{}", "json", `/docs/components/${anyComponent}`],
    ["an unrelated shell command on a component page", "npm run build", "bash", `/docs/components/${anyComponent}`],
    ["code on a page with no source at all", "<Button />", "tsx", "/charts"],
    ["a fence with no language", "<Button />", undefined, `/docs/components/${anyComponent}`],
  ])("ignores %s", (_what, text, language, path) => {
    trackFenceCopy(text, language, path);
    expect(track).not.toHaveBeenCalled();
  });

  it("never puts the copied text in an event", () => {
    const secret = "PRIVATE-SNIPPET-CONTENT";
    trackFenceCopy(`<Button>${secret}</Button>`, "tsx", `/docs/components/${anyComponent}`);
    trackFenceCopy(`npx @kinetixui/cli add button # ${secret}`, "bash", "/docs/installation");
    expect(JSON.stringify(track.mock.calls)).not.toContain(secret);
  });
});

describe("platformForLanguage", () => {
  it("maps only the four supported implementation languages", () => {
    expect(platformForLanguage("tsx")).toBe("react");
    expect(platformForLanguage("swift")).toBe("swiftui");
    expect(platformForLanguage("kotlin")).toBe("compose");
    expect(platformForLanguage("dart")).toBe("flutter");
  });

  it.each(["css", "json", "bash", "html", "angular", "yaml", undefined])("returns null for %s — no invented platform", (lang) => {
    expect(platformForLanguage(lang)).toBeNull();
  });
});

describe("ctaAttrs", () => {
  it("produces only two plain data attributes, typed to the contract", () => {
    expect(ctaAttrs("homepage_hero", "get_started")).toEqual({ "data-analytics-cta": "get_started", "data-analytics-source": "homepage_hero" });
    // @ts-expect-error — the target is a closed union, not the button's visible label
    ctaAttrs("homepage_hero", "Get started");
    // @ts-expect-error — the source is a closed union
    ctaAttrs("my own place", "get_started");
  });
});

/* ------------------------------------------------------------------ Phase 3: blocks are measurable */

/**
 * `/blocks` was the one rung of the adoption ladder with no instrumentation at all.
 *
 * Phase 2 added an `adopt_blocks` CTA pointing at it, so we could see people reach for blocks and then see
 * nothing they did there: no source, no platform switch, no copy. The gallery is a single page of many
 * blocks, so `$pageview` cannot say which composition held anyone's attention.
 *
 * These assert the contract rather than the implementation: that the route resolves to a source, and that
 * the platform mapper refuses to invent a dimension. The second matters more than it looks — a mapper that
 * silently passed an unknown string through would put an unvalidated value into the event stream, which is
 * exactly what the closed vocabularies exist to prevent.
 */
describe("blocks gallery (Phase 3)", () => {
  it("resolves /blocks to its own source", () => {
    expect(sourceForPath("/blocks")).toBe("blocks_gallery");
  });

  it("does not claim a source for a blocks-shaped path that is not the gallery", () => {
    expect(sourceForPath("/blocks/not-a-real-page")).toBeNull();
  });

  it("maps every manifest platform that has blocks to an analytics platform", () => {
    // Derived from the same list the gallery renders tabs from, so a platform added to the manifest is
    // covered here without an edit — and fails loudly if its name cannot be mapped.
    for (const platform of PLATFORMS) {
      expect(analyticsPlatformFor(platform), `${platform} has no analytics platform`).not.toBeNull();
    }
  });

  it("refuses to invent a platform for anything else", () => {
    for (const notAPlatform of ["", "wearos", "watchos", "html", "Preview", undefined]) {
      expect(analyticsPlatformFor(notAPlatform)).toBeNull();
    }
  });

  it("would notice if the mapper started passing strings through — so the rule above is not vacuous", () => {
    // The failure mode being guarded: `(p) => p?.toLowerCase()` with no membership check.
    const unchecked = (p: string | undefined) => p?.toLowerCase() ?? null;
    expect(unchecked("wearos")).toBe("wearos");
    expect(analyticsPlatformFor("wearos")).toBeNull();
  });
});

describe("the classifier recognises what the command contract actually renders", () => {
  // Two systems that must agree and are connected by nothing: `pm-commands.ts` decides how a command is
  // spelled per manager, `classifyCommand` decides what a copied command was. Before the command contract
  // the site only ever rendered npm, so only npm's spelling had to be recognised. Now a reader on pnpm,
  // Yarn or Bun copies a different string for the same action, and if the classifier knows only some of
  // those prefixes the funnel goes quiet for those readers — silently, because an unrecognised command is
  // indistinguishable from no copy at all. These assert agreement rather than any one spelling.

  /** What the operation IS, independent of how any manager spells it. */
  function expectedEvent(id: OperationId): string | null {
    const op = OPERATIONS[id] as Operation;
    if (op.kind === "execute") return "cli_command_copied";
    if (op.kind === "run") return null; // a package.json script is not an install or a CLI invocation
    const packages = op.packages ?? [];
    return packages.some((p) => p.startsWith("@kinetixui/")) ? "install_command_copied" : null;
  }

  it("classifies every operation the same way under all four managers", () => {
    for (const id of OPERATION_IDS) {
      const expected = expectedEvent(id);
      for (const pm of PACKAGE_MANAGERS) {
        const { command } = renderCommand(id, pm, paramsFor(id));
        const result = classifyCommand(command, "bash");
        expect(result?.event ?? null, `${id} / ${pm}: ${command}`).toBe(expected);
      }
    }
  });

  it("names the same package whichever manager spelled the install", () => {
    for (const id of OPERATION_IDS) {
      if (expectedEvent(id) !== "install_command_copied") continue;
      const packages = PACKAGE_MANAGERS.map(
        (pm) => classifyCommand(renderCommand(id, pm, paramsFor(id)).command, "bash")?.package,
      );
      expect(new Set(packages).size, `${id} classified as ${packages.join(" / ")}`).toBe(1);
      expect(packages[0]).toBeDefined();
    }
  });

  it("would notice a manager the classifier does not know — so the two above are not vacuous", () => {
    // The failure mode being guarded: a prefix added to the contract and not to the classifier. `pnpm dlx`
    // is recognised; the same command under a prefix that is not is not, and that is the silence.
    expect(classifyCommand("pnpm dlx @kinetixui/cli add button", "bash")?.event).toBe("cli_command_copied");
    expect(classifyCommand("deno run -A npm:@kinetixui/cli add button", "bash")).toBeNull();
  });
});

/** Exactly the parameters one operation accepts, mirroring the helper in `pm-commands.test.ts`. */
function paramsFor(id: OperationId): RenderParams {
  const op: Operation = OPERATIONS[id];
  const sample: Record<string, unknown> = {
    components: ["button"],
    component: "button",
    theme: "acme",
    preset: "KX1_ok",
    path: "src",
    symbol: "AcmeTheme",
    output: "theme.css",
  };
  const out: Record<string, unknown> = {};
  if (op.parameter) out[op.parameter] = sample[op.parameter];
  for (const flag of op.flags ?? []) out[flag] = sample[flag];
  return out as RenderParams;
}
