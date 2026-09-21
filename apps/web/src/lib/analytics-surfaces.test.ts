import { beforeEach, describe, expect, it, vi } from "vitest";
import { analytics } from "./analytics";
import {
  classifyCommand,
  classifyLink,
  componentSlugFor,
  ctaAttrs,
  platformForLanguage,
  sourceForPath,
  trackFenceCopy,
  trackRouteView,
} from "./analytics-surfaces";
import { PACKAGES } from "./packages";
import { componentDocs, siteConfig } from "./site";

const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
beforeEach(() => track.mockClear());

const ORIGIN = "https://kinetixui.com";
const anyComponent = componentDocs[0]!.href.split("/").pop()!;

describe("packages come from the package.json files, not from this test or the site", () => {
  it("are the three public packages", () => {
    expect(Object.values(PACKAGES).sort()).toEqual(["@kinetixui/cli", "@kinetixui/tokens", "@kinetixui/ui"]);
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
    ["npm i @kinetixui/ui", "@kinetixui/ui"],
    ["npm install @kinetixui/tokens", "@kinetixui/tokens"],
    ["pnpm add @kinetixui/ui", "@kinetixui/ui"],
    ["yarn add @kinetixui/ui", "@kinetixui/ui"],
    ["bun add @kinetixui/tokens", "@kinetixui/tokens"],
    ["npm i -g @kinetixui/cli", "@kinetixui/cli"],
  ])("recognises %j as an install command for %s", (text, pkg) => {
    expect(classifyCommand(text, "sh")).toEqual({ event: "install_command_copied", package: pkg });
  });

  it("does not treat the package manager as a platform — the result has no platform at all", () => {
    expect(classifyCommand("pnpm add @kinetixui/ui", "bash")).not.toHaveProperty("platform");
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
    ["/theme-builder", null],
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
    expect(track.mock.calls).toEqual([["installation_viewed", { source: "installation_page" }]]);
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

  it.each(["/", "/components", "/blocks", "/charts", "/docs/nope", "/docs/components/not-a-real-component", "/docs/components", "/theme-builder"])(
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
    expect(track.mock.calls).toEqual([["install_command_copied", { source: "installation_page", package: PACKAGES.ui }]]);
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
