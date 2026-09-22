import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import blocksManifest from "../../../../blocks.manifest.json";
import componentsManifest from "../../../../components.manifest.json";
import { BlocksContent } from "../app/blocks/blocks-content";
import { blockCoverage, blockTotal, blocks } from "./blocks";
import { PLATFORMS } from "./platform-parity";
import { blockExampleSource } from "../registry/block-examples.generated";
import { blockPreviews } from "../registry/block-previews";

/**
 * Blocks are the consumer-level regression suite: each one composes real components the way an application
 * would, so a renamed export, a dropped prop or an invalid variant breaks a block before it breaks a user.
 * These tests guard the layer above that — that what the page SHOWS is what the repository actually has.
 */
const root = "../..";
const raw = blocksManifest.blocks as Record<string, { sources: Record<string, string> }>;
const slugs = Object.keys(raw);

describe("blocks.manifest.json", () => {
  it("names only platforms the central definition knows", () => {
    const known = Object.keys(componentsManifest.platformDefinitions);
    for (const slug of slugs) for (const p of Object.keys(raw[slug]!.sources)) expect(known).toContain(p);
  });

  it("has a preview component and generated source for every block, and nothing extra", () => {
    expect(Object.keys(blockPreviews).sort()).toEqual([...slugs].sort());
    expect(Object.keys(blockExampleSource).sort()).toEqual([...slugs].sort());
  });

  it("derives coverage rather than anyone counting it", () => {
    expect(blockTotal).toBe(slugs.length);
    for (const p of PLATFORMS) {
      const expected = slugs.filter((s) => raw[s]!.sources[p]).length;
      expect(blockCoverage[p]).toBe(expected);
    }
  });

  it("keeps a platform with zero blocks present and zero, not missing", () => {
    // Angular and SwiftUI have no block source today. The architecture must say "0", not drop the platform.
    for (const p of PLATFORMS) expect(typeof blockCoverage[p]).toBe("number");
  });
});

describe("generated snippets come from the real source files", () => {
  it("each snippet is the kx-block region of the file the manifest points at", () => {
    for (const slug of slugs) {
      for (const [platform, path] of Object.entries(raw[slug]!.sources)) {
        const file = readFileSync(`${root}/${path}`, "utf8");
        const snippet = (blockExampleSource as Record<string, Record<string, string>>)[slug]![platform]!;
        expect(snippet.length).toBeGreaterThan(20);
        // the snippet must literally appear in the source file, and must not drag the markers along with it
        expect(file).toContain(snippet);
        expect(snippet).not.toContain("kx-block:start");
        expect(snippet).not.toContain("kx-block:end");
      }
    }
  });

  it("orders platforms by the central definition, deterministically", () => {
    for (const slug of slugs) {
      const keys = Object.keys((blockExampleSource as Record<string, Record<string, string>>)[slug]!);
      expect(keys).toEqual(PLATFORMS.filter((p) => keys.includes(p)));
    }
  });

  it("no longer carries the hand-written platform strings the page used to own", () => {
    const page = readFileSync("src/app/blocks/blocks-content.tsx", "utf8");
    expect(page).not.toContain("KinetixCard("); // the old Compose/Flutter template literals
    expect(page).not.toContain("native={");
    expect(page.length).toBeLessThan(4000); // it was 952 lines; it is now a loop
  });

  it("does not repeat the retracted 'from a single source' claim anywhere", () => {
    const all = [readFileSync("src/app/blocks/blocks-content.tsx", "utf8"), ...slugs.flatMap((s) => Object.values(raw[s]!.sources).map((p) => readFileSync(`${root}/${p}`, "utf8")))];
    for (const text of all) expect(text).not.toMatch(/from a single source/i);
  });
});

describe("the /blocks page", () => {
  it("renders every block from the manifest", () => {
    render(<BlocksContent />);
    for (const b of blocks) expect(screen.getByRole("heading", { name: b.title, level: 2 })).toBeInTheDocument();
  });

  it("gives each block an anchor id matching its slug", () => {
    const { container } = render(<BlocksContent />);
    for (const b of blocks) expect(container.querySelector(`section#${b.slug}`)).not.toBeNull();
  });

  it("shows a platform tab for exactly the platforms a block implements — no undeclared tab", async () => {
    const user = userEvent.setup();
    const { container } = render(<BlocksContent />);
    await user.click(screen.getAllByRole("tab", { name: "code" })[0]!);

    for (const block of blocks) {
      const section = container.querySelector(`section#${block.slug}`)!;
      const list = section.querySelector('[role="tablist"][aria-label$="implementation platform"]');
      if (block.platforms.length < 2) {
        // one implementation needs no switcher — a lone tab would imply there is something to switch to
        expect(list).toBeNull();
        continue;
      }
      const tabs = [...list!.querySelectorAll('[role="tab"]')].map((t) => t.textContent);
      expect(tabs).toEqual(block.platforms.map(String));
      // a platform the block does NOT implement must be absent, never a disabled or empty tab
      for (const p of PLATFORMS.filter((x) => !block.platforms.includes(x))) expect(tabs).not.toContain(p);
    }
  });

  it("shows the generated source, not a hand-written copy", async () => {
    const user = userEvent.setup();
    const { container } = render(<BlocksContent />);
    await user.click(screen.getAllByRole("tab", { name: "code" })[0]!);
    const pre = container.querySelector("section#sign-in pre")!;
    expect(pre.textContent).toBe(blockExampleSource["sign-in"].React);
  });

  it("copies exactly the generated snippet", async () => {
    const user = userEvent.setup();
    const { container } = render(<BlocksContent />);
    await user.click(screen.getAllByRole("tab", { name: "code" })[0]!);
    await user.click(container.querySelector("section#sign-in button[aria-label='Copy']") as HTMLElement);
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(blockExampleSource["sign-in"].React));
  });

  it("names the platforms instead of claiming 'all platforms'", () => {
    const { container } = render(<BlocksContent />);
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).not.toContain("all platforms");
    expect(container.querySelector("section#sign-in")!.textContent).toContain("React");
  });

  it("makes each code block reachable by keyboard, since long native lines scroll", async () => {
    const user = userEvent.setup();
    const { container } = render(<BlocksContent />);
    await user.click(screen.getAllByRole("tab", { name: "code" })[0]!);
    const pre = container.querySelector("section#sign-in pre")!;
    expect(pre.getAttribute("tabindex")).toBe("0");
    expect(pre.getAttribute("aria-label")).toContain("source");
  });
});
