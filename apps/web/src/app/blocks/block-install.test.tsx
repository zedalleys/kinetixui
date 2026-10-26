import { readFileSync } from "node:fs";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/blocks" }));

import { BlockReactInstall, BlocksInstallGuide } from "./block-install";
import { analytics } from "@/lib/analytics";
import { INSTALLABLE, blockComponents, componentsFromBlockSource, kebab, kinetixImports } from "@/lib/block-components";
import { blocks } from "@/lib/blocks";
import { renderCommand } from "@/lib/pm-commands";
import { PM_STORAGE_KEY, resetPackageManagerPreferenceForTests } from "@/lib/pm-preference";
import { PLATFORM_STORAGE_KEY } from "@/lib/platform-preference";
import manifest from "../../../../../blocks.manifest.json";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // both preferences live in a module-level store, so a choice made in one test would leak into the next
  window.localStorage.clear();
  resetPackageManagerPreferenceForTests();
});

const SOURCES = manifest.blocks as Record<string, { sources: Record<string, string> }>;
const reactSource = (slug: string) => readFileSync(`../../${SOURCES[slug]!.sources.React}`, "utf8");

describe("the components a block uses, read from its React source", () => {
  const map = blockComponents();

  it("lists at least one installable component for every block", () => {
    for (const b of blocks) {
      expect(map[b.slug]?.length, b.slug).toBeGreaterThan(0);
      for (const slug of map[b.slug]!) expect(INSTALLABLE.has(slug), `${b.slug}: ${slug}`).toBe(true);
    }
  });

  it("misses nothing: every other import is a part of a component it lists (CardHeader → card)", () => {
    for (const b of blocks) {
      const listed = map[b.slug]!;
      for (const name of kinetixImports(reactSource(b.slug))) {
        const slug = kebab(name);
        if (INSTALLABLE.has(slug)) continue;
        expect(listed.some((parent) => slug.startsWith(`${parent}-`)), `${b.slug}: ${name} has no listed parent`).toBe(true);
      }
    }
  });

  it("reads aliases and multi-line imports, and ignores other packages", () => {
    const src = `import {\n  Button as Btn,\n  CardHeader,\n  Card,\n} from "@kinetixui/ui";\nimport { Dialog } from "./local";`;
    expect(componentsFromBlockSource(src)).toEqual(["button", "card"]);
  });

  it("sign-in is built from what its file imports", () => {
    expect(map["sign-in"]).toEqual(["button", "card", "checkbox", "input", "label"]);
  });
});

describe("installing a block on the reader's platform", () => {
  it("opens on React: CLI or npm, and the Tailwind 3 + preset requirement", () => {
    render(<BlocksInstallGuide />);
    const guide = document.querySelector("[data-blocks-install]")!;
    expect(guide.getAttribute("data-blocks-install")).toBe("React");
    expect(guide.textContent).toMatch(/CLI command under that block/);
    expect(guide.textContent).toMatch(/@kinetixui\/ui/);
    expect(guide.textContent).toMatch(/Tailwind CSS 3/);
  });

  it("on Angular, names the npm package and says the React CLI does not install it", () => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, "angular");
    render(<BlocksInstallGuide />);
    const text = document.querySelector("[data-blocks-install]")!.textContent!;
    // derived from the command contract rather than restated, so the two cannot drift apart
    expect(text).toContain(renderCommand("install-angular", "npm").command);
    expect(text).toMatch(/preview/);
    expect(text).toMatch(/React CLI does not install Angular/);
  });

  it("on Angular, spells that install in the reader's own package manager", () => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, "angular");
    window.localStorage.setItem(PM_STORAGE_KEY, "pnpm");
    resetPackageManagerPreferenceForTests();
    render(<BlocksInstallGuide />);
    const text = document.querySelector("[data-blocks-install]")!.textContent!;
    expect(text).toContain("pnpm add @kinetixui/angular @kinetixui/tokens");
    expect(text).not.toContain("npm install @kinetixui/angular");
  });

  it.each([
    ["swiftui", "SwiftUI", "Swift Package Manager", "/docs/swiftui#setup"],
    ["compose", "Jetpack Compose", "Maven Central", "/docs/compose#setup"],
    ["flutter", "Flutter", "pub.dev", "/docs/flutter#setup"],
  ])("on %s, says source only and links the pinned-checkout setup — no registry command", (id, label, channel, href) => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, id);
    render(<BlocksInstallGuide />);
    const guide = document.querySelector("[data-blocks-install]")!;
    expect(guide.textContent).toContain(`source only and not on ${channel} yet`);
    expect(guide.textContent).not.toMatch(/npx|npm i/);
    expect(screen.getByRole("link", { name: `${label} setup` }).getAttribute("href")).toBe(href);
  });
});

describe("a block's React CLI command", () => {
  it("shows exactly the components it uses, and a copy reports the CLI package and nothing else", async () => {
    const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<BlockReactInstall components={["button", "card"]} platforms={["React", "Flutter"]} />);
    expect(screen.getByText("npx @kinetixui/cli add button card")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Copy React CLI command for this block" }));
    await waitFor(() => expect(track).toHaveBeenCalledOnce());
    expect(track.mock.calls).toEqual([["cli_command_copied", { source: "blocks_gallery", package: "@kinetixui/cli" }]]);
  });

  it("is not shown when the reader's platform is not React: it would be the wrong instructions there", () => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, "flutter");
    const { container } = render(<BlockReactInstall components={["button"]} platforms={["React", "Flutter"]} />);
    expect(container.textContent).toBe("");
  });
});
