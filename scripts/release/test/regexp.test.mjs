/**
 * The escape is complete, and no test goes back to escaping inline.
 *
 * CodeQL raised `js/incomplete-sanitization` on five call sites in this directory, each building a matcher
 * from a package name or a version with its own partial escape. `escapeRegExp` replaced all five. Asserting
 * only "the helper works" would leave the sixth call site free to be written by hand next time, which is how
 * five of them appeared in the first place — so the class is what this guards.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { escapeRegExp } from "./regexp.mjs";

const dir = fileURLToPath(new URL(".", import.meta.url));

/**
 * `.replace(/…/g, "\\…")` — a regular expression rewritten with a backslash-prefixed replacement, which is
 * what escaping by hand looks like and what CodeQL flagged.
 *
 * The bracket-group alternative is load-bearing: one of the five real call sites was `.replace(/[/@]/g, …)`,
 * whose character class contains a `/`. Matching the pattern body as "anything but a slash" would have
 * skipped exactly that shape, which the fixture below caught.
 */
const AD_HOC_ESCAPE = /\.replace\(\s*\/(?:\[[^\]\n]*\]|[^/\n])+\/[gimsuy]*\s*,\s*"\\\\/;

/**
 * `regexp.mjs` documents the two bad shapes it replaced, and this file carries the detector and a sample of
 * the thing being detected. A guard that fired on its own explanation would be noise — the wearable-claim
 * rule in `current-truth.test.ts` learned that the hard way — so both are named here rather than pattern-
 * matched around, and the detector is proven against a fixture below instead.
 */
const EXPLAINS_THE_RULE = new Set(["regexp.mjs", "regexp.test.mjs"]);

describe("regular expressions built from real data", () => {
  it("escapes every metacharacter, backslash included", () => {
    // The backslash is the one CodeQL named: unescaped, it turns the next character into syntax.
    for (const char of ["\\", ".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]"]) {
      const escaped = escapeRegExp(char);
      assert.equal(escaped, `\\${char}`, `${char} must be escaped`);
      assert.match(char, new RegExp(`^${escaped}$`), `${char} must match itself once escaped`);
    }
  });

  it("makes a string match itself and nothing else", () => {
    // `.` unescaped would match any character, so `0x23x3` would pass for `0.23.3`.
    assert.match("0.23.3", new RegExp(`^${escapeRegExp("0.23.3")}$`));
    assert.doesNotMatch("0x23x3", new RegExp(`^${escapeRegExp("0.23.3")}$`));
    assert.match("@kinetixui/ui", new RegExp(escapeRegExp("@kinetixui/ui")));
    // A name that would be a character class if it were not escaped.
    assert.match("a[b]c", new RegExp(`^${escapeRegExp("a[b]c")}$`));
  });

  it("leaves ordinary characters alone", () => {
    assert.equal(escapeRegExp("@kinetixui/tokens"), "@kinetixui/tokens");
  });

  it("detects an escape written by hand", () => {
    // Proving the scan below is not vacuous. Both are real shapes that were in this directory.
    assert.match('version.replace(/\\./g, "\\\\.")', AD_HOC_ESCAPE);
    assert.match('name.replace(/[/@]/g, "\\\\$&")', AD_HOC_ESCAPE);
    assert.doesNotMatch("escapeRegExp(pkg.name)", AD_HOC_ESCAPE);
    // Not every `replace` is an escape: path normalisation must not be flagged.
    assert.doesNotMatch('p.replace(root, "").replace(/\\\\/g, "/")', AD_HOC_ESCAPE);
  });

  it("no release test escapes inline any more", () => {
    const offenders = [];
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".mjs"))) {
      if (EXPLAINS_THE_RULE.has(name)) continue;
      const source = readFileSync(path.join(dir, name), "utf8");
      source.split("\n").forEach((line, i) => {
        if (AD_HOC_ESCAPE.test(line)) offenders.push(`${name}:${i + 1}`);
      });
    }
    assert.deepEqual(
      offenders,
      [],
      `escape with escapeRegExp from ./regexp.mjs instead — an inline escape is the one CodeQL flags, and ` +
        `it is incomplete every time:\n  ${offenders.join("\n  ")}`,
    );
  });
});
