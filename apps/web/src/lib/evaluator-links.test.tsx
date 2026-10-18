import { existsSync, readFileSync } from "node:fs";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs/components/button" }));

import { ComponentMeta } from "@/components/component-meta";
import { PlatformSupportTable } from "@/components/foundations-tables";
import { classifyLink } from "./analytics-surfaces";
import { PACKAGES, PACKAGE_NAMES, npmPackageUrl } from "./packages";
import { PLATFORMS, PLATFORM_DEFINITIONS } from "./platform-parity";
import { platforms } from "./platform-support";
import { siteConfig } from "./site";

afterEach(cleanup);

const ROOT = "../..";

/**
 * npm and evidence links (evaluator audit F-21 / F-29 / F-16). Every destination is derived from repository truth:
 * npm links only for package.json files that are public and named in PACKAGES, workflow links only for workflow
 * files that exist, evidence links only to files that exist. None for a native port, which has no registry package.
 */
describe("npm links", () => {
  it("exist only for our public npm packages", () => {
    for (const name of PACKAGE_NAMES) expect(npmPackageUrl(name)).toBe(`https://www.npmjs.com/package/${name}`);
    for (const p of PLATFORMS) {
      const d = PLATFORM_DEFINITIONS[p].distribution;
      // a native coordinate ("kinetix_ui", "com.kinetixui:ui-compose", the SwiftPM mirror) never gets an npm link
      if (d.channel !== "npm") expect(npmPackageUrl(d.coordinate), p).toBeNull();
    }
    expect(npmPackageUrl("@kinetixui/create-preset")).toBeNull(); // private package
  });

  it("point at packages whose package.json is not private", () => {
    const dirs: Record<string, string> = { ui: "ui", angular: "ui-angular", tokens: "tokens", cli: "cli", iot: "iot" };
    for (const [key, dir] of Object.entries(dirs)) {
      const pkg = JSON.parse(readFileSync(`${ROOT}/packages/${dir}/package.json`, "utf8")) as { name: string; private?: boolean };
      expect(pkg.name).toBe(PACKAGES[key as keyof typeof PACKAGES]);
      expect(pkg.private ?? false, pkg.name).toBe(false);
    }
  });

  it("are reported as npm_clicked with the package, so the dead event now has a surface", () => {
    for (const name of PACKAGE_NAMES) expect(classifyLink(npmPackageUrl(name)!, "https://kinetixui.com")).toEqual({ event: "npm_clicked", package: name });
  });

  it("appear in the install strip for the published platforms only", () => {
    render(<ComponentMeta />);
    const strip = screen.getByRole("list", { name: "Install by platform" });
    for (const p of PLATFORMS) {
      const row = strip.querySelector<HTMLElement>(`li[data-platform="${p}"]`)!;
      const npm = within(row).queryAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("https://www.npmjs.com/"));
      const d = PLATFORM_DEFINITIONS[p].distribution;
      if (d.published && d.channel === "npm") {
        expect(npm.map((a) => a.textContent)).toEqual([`${d.coordinate} on npm`, `${PACKAGES.tokens} on npm`]);
      } else {
        expect(npm, p).toEqual([]);
      }
    }
  });

  it("on the docs pages, name only real packages", () => {
    for (const f of ["installation", "cli"]) {
      const text = readFileSync(`src/app/docs/${f}/page.mdx`, "utf8");
      for (const m of text.matchAll(/<NpmLinks names=\{(\[[^\]]*\])\} \/>/g)) {
        for (const name of JSON.parse(m[1]!) as string[]) expect(npmPackageUrl(name), `${f}: ${name}`).not.toBeNull();
      }
    }
  });
});

describe("evidence links", () => {
  it("link every named CI workflow to its runs, and every one exists", () => {
    render(<PlatformSupportTable />);
    const files = platforms.flatMap((p) => p.workflow.split(/,\s*/));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(existsSync(`${ROOT}/.github/workflows/${file}`), file).toBe(true);
      const links = screen.getAllByRole("link", { name: `${file} runs` });
      for (const a of links) expect(a.getAttribute("href")).toBe(`${siteConfig.repo}/actions/workflows/${file}`);
    }
  });

  it("from the platforms and accessibility pages, point at repository files that exist", () => {
    const escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const blob = new RegExp(`${escapeRegExp(siteConfig.repo)}/blob/main/([^)\\s]+)`, "g");
    const linked = ["platforms", "accessibility"].flatMap((f) => [...readFileSync(`src/app/docs/${f}/page.mdx`, "utf8").matchAll(blob)].map((m) => m[1]!));
    expect(linked).toEqual(expect.arrayContaining(["verification.json", "a11y-baseline.json"]));
    for (const file of linked) expect(existsSync(`${ROOT}/${file}`), file).toBe(true);
  });

  it("say the accessibility page is about React, and the A11y row does not speak for all five platforms", () => {
    expect(readFileSync("src/app/docs/accessibility/page.mdx", "utf8")).toMatch(/This page is about the React library/);
    render(<ComponentMeta />);
    expect(screen.getByRole("link", { name: "React: audited in CI →" })).toBeInTheDocument();
  });
});
