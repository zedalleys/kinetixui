import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { targetPath, writeItems } from "../src/lib/apply.js";
import { DEFAULT_CONFIG, type KinetixConfig } from "../src/lib/config.js";
import type { RegistryItem } from "../src/lib/registry.js";

let cwd: string;
beforeEach(() => {
  cwd = mkdtempSync(path.join(tmpdir(), "kx-cli-apply-"));
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

const file = (name: string, type = "registry:ui", content = `// ${name}`) => ({
  path: `ui/${name}.tsx`,
  content,
  type,
  target: `components/ui/${name}.tsx`,
});

const item = (name: string, files = [file(name)], deps: string[] = []): RegistryItem => ({
  name,
  type: "registry:ui",
  files,
  dependencies: deps,
});

describe("targetPath", () => {
  it("sends a registry:ui file to the ui alias", () => {
    expect(targetPath(cwd, DEFAULT_CONFIG, file("button"))).toBe(path.join(cwd, "components", "ui", "button.tsx"));
  });

  it("sends a registry:lib file to the lib alias", () => {
    expect(targetPath(cwd, DEFAULT_CONFIG, file("utils", "registry:lib"))).toBe(path.join(cwd, "lib", "utils.tsx"));
  });

  it("sends the globals stylesheet to the configured css path", () => {
    const css = { ...file("globals", "registry:style"), target: "app/globals.css" };
    expect(targetPath(cwd, DEFAULT_CONFIG, css)).toBe(path.join(cwd, "app", "globals.css"));
  });

  it("basenames the registry-supplied target, so a nested path cannot be smuggled in", () => {
    const sneaky = { ...file("button"), target: "../../../../tmp/button.tsx" };
    expect(targetPath(cwd, DEFAULT_CONFIG, sneaky)).toBe(path.join(cwd, "components", "ui", "button.tsx"));
  });
});

describe("writeItems", () => {
  it("writes each file and reports it relative to the project", async () => {
    const result = await writeItems(cwd, DEFAULT_CONFIG, [item("button")], false);
    expect(result.written).toEqual([path.join("components", "ui", "button.tsx")]);
    expect(readFileSync(path.join(cwd, "components/ui/button.tsx"), "utf8")).toBe("// button");
    expect(result.skipped).toEqual([]);
  });

  it("creates intermediate directories", async () => {
    await writeItems(cwd, { ...DEFAULT_CONFIG, srcDir: true }, [item("card")], false);
    expect(existsSync(path.join(cwd, "src/components/ui/card.tsx"))).toBe(true);
  });

  it("collects npm dependencies across every item, de-duplicated", async () => {
    const result = await writeItems(
      cwd,
      DEFAULT_CONFIG,
      [item("a", [file("a")], ["clsx", "lucide-react"]), item("b", [file("b")], ["clsx"])],
      false,
    );
    expect([...result.deps].sort()).toEqual(["clsx", "lucide-react"]);
  });

  /** The property that makes `add` safe to re-run: your edits are not silently replaced. */
  it("skips a file that already exists, and does not touch its contents", async () => {
    mkdirSync(path.join(cwd, "components/ui"), { recursive: true });
    writeFileSync(path.join(cwd, "components/ui/button.tsx"), "// MINE", "utf8");
    const result = await writeItems(cwd, DEFAULT_CONFIG, [item("button")], false);
    expect(result.skipped).toEqual([path.join("components", "ui", "button.tsx")]);
    expect(result.written).toEqual([]);
    expect(readFileSync(path.join(cwd, "components/ui/button.tsx"), "utf8")).toBe("// MINE");
  });

  it("replaces it when overwrite is asked for", async () => {
    mkdirSync(path.join(cwd, "components/ui"), { recursive: true });
    writeFileSync(path.join(cwd, "components/ui/button.tsx"), "// MINE", "utf8");
    const result = await writeItems(cwd, DEFAULT_CONFIG, [item("button")], true);
    expect(result.written).toEqual([path.join("components", "ui", "button.tsx")]);
    expect(readFileSync(path.join(cwd, "components/ui/button.tsx"), "utf8")).toBe("// button");
  });

  /**
   * The registry-supplied filename is already basenamed by `targetPath`, so the remaining way out of the
   * project is a `kinetixui.json` whose own aliases or css path escape it. That is a local file, but it can
   * arrive with a cloned repository, and the failure mode is writing over something outside the project.
   */
  describe("refuses to write outside the project", () => {
    it("via an escaping ui alias", async () => {
      const config: KinetixConfig = { ...DEFAULT_CONFIG, aliases: { ...DEFAULT_CONFIG.aliases, ui: "@/../../../../tmp/evil" } };
      await expect(writeItems(cwd, config, [item("button")], false)).rejects.toThrow(/Refusing to write outside the project/);
    });

    it("via an escaping css path", async () => {
      const config: KinetixConfig = { ...DEFAULT_CONFIG, tailwind: { css: "../../../../tmp/evil.css" } };
      const css = { ...file("globals", "registry:style"), target: "app/globals.css" };
      await expect(writeItems(cwd, config, [{ ...item("tokens"), files: [css] }], false)).rejects.toThrow(
        /Refusing to write outside the project/,
      );
    });

    it("and writes nothing at all when it refuses", async () => {
      const config: KinetixConfig = { ...DEFAULT_CONFIG, aliases: { ...DEFAULT_CONFIG.aliases, ui: "@/../../../../tmp/evil" } };
      await writeItems(cwd, config, [item("button")], false).catch(() => {});
      expect(existsSync(path.join(cwd, "components"))).toBe(false);
    });
  });

  it("writes nothing and asks for nothing when given no items", async () => {
    const result = await writeItems(cwd, DEFAULT_CONFIG, [], false);
    expect(result).toEqual({ deps: new Set(), written: [], skipped: [] });
  });
});
