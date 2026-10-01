import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KEYBOARD, KEYBOARD_SOURCE } from "@/registry/keyboard.generated";

/**
 * The keyboard documentation's value rests entirely on one property: every line is something a test
 * actually asserts. These guard that property rather than the formatting.
 *
 * `scripts/gen-keyboard.mjs --check` already fails CI when the generated module or the pages fall out of
 * step. This covers the half a staleness check cannot: that what was generated is well-formed and still
 * traceable to a real file, so a future refactor cannot leave the pages quietly rendering prose with
 * nothing behind it.
 */
const root = join(__dirname, "..", "..", "..", "..");

describe("generated keyboard documentation", () => {
  it("names a test file that exists", () => {
    expect(existsSync(join(root, KEYBOARD_SOURCE))).toBe(true);
  });

  it("documents at least one component, or the pages are rendering nothing", () => {
    expect(Object.keys(KEYBOARD).length).toBeGreaterThan(0);
  });

  it("only documents components that are in the manifest", () => {
    const manifest = JSON.parse(readFileSync(join(root, "components.manifest.json"), "utf8"));
    for (const slug of Object.keys(KEYBOARD)) {
      expect(Object.keys(manifest.components), `${slug} is documented but not a component`).toContain(slug);
    }
  });

  it("gives every behaviour a sentence and at least one key", () => {
    for (const [slug, entries] of Object.entries(KEYBOARD)) {
      for (const e of entries) {
        expect(e.behaviour.trim(), `${slug}: empty behaviour`).not.toBe("");
        expect(e.keys.length, `${slug}: "${e.behaviour}" lists no keys`).toBeGreaterThan(0);
      }
    }
  });

  it("quotes behaviours verbatim from the test titles, so the page cannot paraphrase the evidence", () => {
    const src = readFileSync(join(root, KEYBOARD_SOURCE), "utf8");
    for (const [slug, entries] of Object.entries(KEYBOARD)) {
      for (const e of entries) {
        expect(src, `${slug}: "${e.behaviour}" is not a test title in ${KEYBOARD_SOURCE}`).toContain(e.behaviour);
      }
    }
  });

  it("uses readable key names rather than raw event codes", () => {
    const allowed = /^(Enter|Escape|Tab|Space|Home|End|Backspace|Delete|Page (up|down)|Arrow (up|down|left|right))$/;
    for (const [slug, entries] of Object.entries(KEYBOARD)) {
      for (const k of entries.flatMap((e) => e.keys)) {
        expect(k, `${slug}: ${k} is not a readable key name`).toMatch(allowed);
      }
    }
  });
});
