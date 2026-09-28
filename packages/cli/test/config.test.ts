import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { KinetixConfig } from "../src/lib/config.js";
import {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  DEFAULT_REGISTRY,
  readConfig,
  resolveAliasDir,
  resolveRegistry,
  writeConfig,
} from "../src/lib/config.js";

let cwd: string;
beforeEach(() => {
  cwd = mkdtempSync(path.join(tmpdir(), "kx-cli-config-"));
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

const write = (config: unknown) => writeFileSync(path.join(cwd, CONFIG_FILE), JSON.stringify(config), "utf8");

describe("reading the project config", () => {
  it("returns null rather than throwing when there is no config", async () => {
    expect(await readConfig(cwd)).toBeNull();
  });

  it("round-trips what it wrote", async () => {
    await writeConfig(cwd, DEFAULT_CONFIG);
    expect(await readConfig(cwd)).toEqual(DEFAULT_CONFIG);
  });

  it("does not invent a registry in a freshly written config", async () => {
    await writeConfig(cwd, DEFAULT_CONFIG);
    // Writing the default origin into every project's config would pin it, which is the opposite of the
    // point: the key exists so a project can opt out of the default, not so it can restate it.
    expect(await readConfig(cwd)).not.toHaveProperty("registry");
  });
});

describe("resolveAliasDir", () => {
  it("resolves an @/ alias under the project root", async () => {
    await writeConfig(cwd, DEFAULT_CONFIG);
    const config = (await readConfig(cwd))!;
    expect(resolveAliasDir(cwd, config, "ui")).toBe(path.join(cwd, "components", "ui"));
  });

  it("inserts src/ when srcDir is set", async () => {
    await writeConfig(cwd, { ...DEFAULT_CONFIG, srcDir: true });
    const config = (await readConfig(cwd))!;
    expect(resolveAliasDir(cwd, config, "lib")).toBe(path.join(cwd, "src", "lib"));
  });
});

/**
 * The precedence exists because the default registry origin is a single point of failure for `add`, and
 * `--registry` on every invocation does not survive a CI script.
 */
describe("resolveRegistry precedence", () => {
  it("falls back to the default with no config and no flag", async () => {
    expect(await resolveRegistry(cwd)).toBe(DEFAULT_REGISTRY);
  });

  it("uses the project's registry when the flag is absent", async () => {
    write({ ...DEFAULT_CONFIG, registry: "https://mirror.example.com/r" });
    expect(await resolveRegistry(cwd)).toBe("https://mirror.example.com/r");
  });

  it("uses the project's registry when the flag is only Commander's default", async () => {
    // Commander fills the option in with DEFAULT_REGISTRY, so "not passed" and "passed the default" arrive
    // identical. They mean the same thing, so the project's own value must still win.
    write({ ...DEFAULT_CONFIG, registry: "https://mirror.example.com/r" });
    expect(await resolveRegistry(cwd, DEFAULT_REGISTRY)).toBe("https://mirror.example.com/r");
  });

  it("lets an explicit flag beat the project's registry", async () => {
    write({ ...DEFAULT_CONFIG, registry: "https://mirror.example.com/r" });
    expect(await resolveRegistry(cwd, "https://other.example.com/r")).toBe("https://other.example.com/r");
  });

  it("ignores a blank or whitespace registry rather than fetching from an empty origin", async () => {
    write({ ...DEFAULT_CONFIG, registry: "   " });
    expect(await resolveRegistry(cwd)).toBe(DEFAULT_REGISTRY);
    write({ ...DEFAULT_CONFIG, registry: "" });
    expect(await resolveRegistry(cwd)).toBe(DEFAULT_REGISTRY);
  });

  it("survives a config that is not the shape it expects", async () => {
    mkdirSync(path.join(cwd, "sub"), { recursive: true });
    write({ nonsense: true });
    await expect(resolveRegistry(cwd)).resolves.toBe(DEFAULT_REGISTRY);
  });
});

/**
 * The published schema and the type it describes.
 *
 * `kinetixui.json` carries `"$schema": "https://kinetixui.com/schema/config.json"`, so an editor validates
 * against a file in `apps/web/public/schema/` that nothing previously tied to `KinetixConfig`. Adding the
 * `registry` key made that gap concrete: the type, the writer, the docs and the schema are four places, and
 * three of them are easy to remember. This closes it from the side that ships.
 */
describe("the published JSON schema matches the config type", () => {
  const schema = JSON.parse(
    readFileSync(path.join(import.meta.dirname, "../../../apps/web/public/schema/config.json"), "utf8"),
  ) as { properties: Record<string, unknown>; required: string[] };

  /** Every key the CLI can read. Kept here rather than derived, because a type has no runtime keys. */
  const KNOWN_KEYS = ["$schema", "registry", "tailwind", "aliases", "srcDir"] as const;

  it("describes exactly the keys the CLI knows about", () => {
    expect(Object.keys(schema.properties).sort()).toEqual([...KNOWN_KEYS].sort());
  });

  it("type-checks against KinetixConfig, so this list cannot drift from the interface", () => {
    // If a key is added to KinetixConfig and not to KNOWN_KEYS, or vice versa, this stops compiling.
    const probe: Record<keyof KinetixConfig, true> = {
      $schema: true,
      registry: true,
      tailwind: true,
      aliases: true,
      srcDir: true,
    };
    expect(Object.keys(probe).sort()).toEqual([...KNOWN_KEYS].sort());
  });

  it("does not require the optional registry key", () => {
    expect(schema.required).not.toContain("registry");
    expect(schema.required).toEqual(expect.arrayContaining(["tailwind", "aliases"]));
  });

  it("validates what DEFAULT_CONFIG actually is", () => {
    for (const key of Object.keys(DEFAULT_CONFIG)) {
      expect(Object.keys(schema.properties), `the schema has no "${key}"`).toContain(key);
    }
    for (const key of schema.required) {
      expect(DEFAULT_CONFIG, `DEFAULT_CONFIG omits the required "${key}"`).toHaveProperty(key);
    }
  });
});
