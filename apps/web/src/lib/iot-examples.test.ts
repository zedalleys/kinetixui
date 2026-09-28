import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { IOT_EXAMPLES, IOT_EXAMPLE_COMPONENTS, iotExample } from "./iot-examples";
import { iotPreviews } from "@/registry/iot-previews";
import * as iot from "@kinetixui/iot/react";

/**
 * The IoT examples layer, checked against itself.
 *
 * Three things can drift here and none of them fails a build on its own: an example with no preview,
 * a preview with no example, and a manifest that names a component the composition does not use. The
 * generator catches the third at `pnpm check:iot-examples`; this catches all three on an ordinary
 * test run, and additionally checks the one thing the generator cannot — that the components the
 * examples claim to compose are actually exported by the package.
 */
describe("the IoT examples manifest", () => {
  it("publishes examples", () => {
    expect(IOT_EXAMPLES.length).toBeGreaterThan(0);
  });

  it("gives every example a preview, and every preview an example", () => {
    expect(Object.keys(iotPreviews).sort()).toEqual(IOT_EXAMPLES.map((e) => e.slug).sort());
  });

  it("carries extracted source for every example", () => {
    for (const example of IOT_EXAMPLES) {
      expect(example.source.length, `${example.slug} has no extracted source`).toBeGreaterThan(0);
      // The marker lines themselves must not survive into the snippet a reader copies.
      expect(example.source).not.toContain("kx-iot:start");
      expect(example.source).not.toContain("kx-iot:end");
    }
  });

  /**
   * The snippet has to be the file, not a paraphrase of it. Compared by content rather than by
   * regenerating, so this fails for a hand-edited generated file as well as for a stale one.
   */
  it("extracts the snippet from the file it says it does", () => {
    for (const example of IOT_EXAMPLES) {
      const file = readFileSync(`${process.cwd()}/../../${example.path}`, "utf8");
      expect(file, `${example.slug}: ${example.path}`).toContain(example.source);
    }
  });

  it("only names components @kinetixui/iot actually exports", () => {
    const exported = new Set(Object.keys(iot));
    for (const name of IOT_EXAMPLE_COMPONENTS) {
      expect(exported.has(name), `${name} is named by an example but is not exported from @kinetixui/iot/react`).toBe(true);
    }
  });

  /**
   * IoT examples are NOT Blocks, and must not leak into the Blocks catalogue. The parity rule there
   * requires every platform for a published block; this module is React-only.
   */
  it("declares one React source per example, never a platform map", () => {
    const raw = JSON.parse(readFileSync(`${process.cwd()}/../../iot-examples.manifest.json`, "utf8"));
    for (const [slug, entry] of Object.entries(raw.examples as Record<string, Record<string, unknown>>)) {
      expect(typeof entry.source, `${slug}`).toBe("string");
      expect(entry, `${slug} must not claim platform coverage`).not.toHaveProperty("sources");
      expect(String(entry.source)).toMatch(/^apps\/web\/src\/examples\/iot\/[\w-]+\.tsx$/);
    }
  });

  it("looks an example up by slug", () => {
    expect(iotExample(IOT_EXAMPLES[0]!.slug)?.title).toBe(IOT_EXAMPLES[0]!.title);
    expect(iotExample("not-a-real-example")).toBeUndefined();
  });
});
