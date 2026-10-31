/**
 * The documentation and the command contract agree.
 *
 * Three things could go quietly wrong once the site renders commands from a model rather than from fences:
 *
 *   1. A page references an operation id that does not exist. `<Command op="cli-ad" />` would render nothing
 *      useful and the install step would simply be missing from the page.
 *   2. A page names a component the registry does not carry. `npx @kinetixui/cli add avatar-group` would fail
 *      for a reader even though the page looks right — the registry item is `avatar`.
 *   3. A hand-typed consumer fence creeps back in, re-introducing a one-manager command. That is the whole
 *      defect this work removed, so it gets a gate rather than a convention.
 *
 * Repo scripts (`pnpm build:tokens`, `pnpm check:*`) are deliberately exempt from (3): those are contributor
 * commands for this repository, which really does use pnpm, and no reader runs them in their own project.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OPERATION_IDS, renderCommand } from "./pm-commands";

const REPO = path.resolve(__dirname, "../../../..");
const APP = path.join(REPO, "apps/web/src/app");

function mdxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) return mdxFiles(p);
    return entry.endsWith(".mdx") ? [p] : [];
  });
}

const PAGES = mdxFiles(APP).map((file) => ({ file: path.relative(REPO, file), text: readFileSync(file, "utf8") }));

/** Registry item names, read from the registry itself. */
const REGISTRY_ITEMS = new Set<string>(
  (() => {
    const raw = JSON.parse(readFileSync(path.join(REPO, "registry/registry.json"), "utf8"));
    const items: Array<{ name: string }> = Array.isArray(raw) ? raw : raw.items;
    return items.map((i) => i.name);
  })(),
);

const BLOCKS = PAGES.flatMap(({ file, text }) =>
  Array.from(text.matchAll(/<Command\s([^>]*?)\/>/g), (m) => ({ file, attrs: m[1] })),
);

describe("the site's command blocks", () => {
  it("found the blocks and the registry (so nothing below passes vacuously)", () => {
    expect(PAGES.length).toBeGreaterThan(100);
    expect(BLOCKS.length).toBeGreaterThan(100);
    expect(REGISTRY_ITEMS.size).toBeGreaterThan(50);
  });

  it("references only operations the contract declares", () => {
    for (const { file, attrs } of BLOCKS) {
      const id = /op="([^"]+)"/.exec(attrs)?.[1];
      expect(id, `${file}: <Command> with no op`).toBeTruthy();
      expect(OPERATION_IDS as string[], `${file} references "${id}"`).toContain(id!);
    }
  });

  it("names only components the registry actually carries", () => {
    for (const { file, attrs } of BLOCKS) {
      const list = /components=\{\[([^\]]*)\]\}/.exec(attrs)?.[1];
      const single = /component="([^"]+)"/.exec(attrs)?.[1];
      const names = [
        ...(list ? Array.from(list.matchAll(/"([^"]+)"/g), (m) => m[1]) : []),
        ...(single ? [single] : []),
      ];
      for (const name of names) {
        expect(REGISTRY_ITEMS, `${file} says "add ${name}", which the registry does not carry`).toContain(name);
      }
    }
  });

  it("renders every block without throwing, under every manager", () => {
    for (const { file, attrs } of BLOCKS) {
      const id = /op="([^"]+)"/.exec(attrs)![1] as (typeof OPERATION_IDS)[number];
      const list = /components=\{\[([^\]]*)\]\}/.exec(attrs)?.[1];
      const params = {
        components: list ? Array.from(list.matchAll(/"([^"]+)"/g), (m) => m[1]) : undefined,
        component: /component="([^"]+)"/.exec(attrs)?.[1],
        theme: /theme="([^"]+)"/.exec(attrs)?.[1],
        path: /path="([^"]+)"/.exec(attrs)?.[1],
        symbol: /symbol="([^"]+)"/.exec(attrs)?.[1],
        output: /output="([^"]+)"/.exec(attrs)?.[1],
      };
      expect(() => renderCommand(id, "pnpm", params), `${file} / ${attrs}`).not.toThrow();
    }
  });
});

describe("no hand-typed consumer command comes back", () => {
  /** A fenced line that installs or executes a KinetixUI package by hand, in any manager. */
  const HAND_TYPED =
    /^(?:npx|bunx|pnpm dlx|yarn dlx|kinetixui|(?:npm|pnpm|yarn|bun)\s+(?:i|install|add))\b.*(?:@kinetixui\/|^kinetixui\b)/m;

  it("has none in any page", () => {
    const offenders: string[] = [];
    for (const { file, text } of PAGES) {
      for (const fence of text.matchAll(/```(?:bash|sh|shell|console|zsh)\n([\s\S]*?)```/g)) {
        for (const line of fence[1].split("\n")) {
          const t = line.trim().replace(/^\$\s*/, "");
          if (!t || t.startsWith("#")) continue;
          if (HAND_TYPED.test(t) || /^kinetixui\s/.test(t)) offenders.push(`${file}: ${t}`);
        }
      }
    }
    expect(offenders, `use <Command op="…" /> instead:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("detects one when it is there (the gate can fail)", () => {
    // negative control: the same matcher, run over a fence that does carry the old form
    const sabotage = "```bash\nnpm i @kinetixui/ui @kinetixui/tokens\n```";
    const line = /```bash\n([\s\S]*?)```/.exec(sabotage)![1].trim();
    expect(HAND_TYPED.test(line)).toBe(true);
    expect(HAND_TYPED.test("pnpm build:tokens")).toBe(false); // a repo script stays allowed
  });
});
