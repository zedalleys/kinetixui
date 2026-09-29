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
 * Escaping by hand looks like `.replace(/…/g, "\\…")`: a regular expression rewritten with a
 * backslash-prefixed replacement. A line is flagged when it shows both halves.
 *
 * Two small patterns rather than one that spans the whole call, because matching the pattern body is where
 * this gets dangerous. Writing the body as "anything but a slash" silently skipped `.replace(/[/@]/g, …)` —
 * a real call site, whose character class contains a `/`. Adding a bracket-group alternative fixed that and
 * bought an `js/redos` alert of its own, on this very file: `[]` could be read either as the bracket group
 * or as two ordinary characters, so `.replace(/[][][]…` had exponentially many parses.
 *
 * Neither pattern below can backtrack — in both, `\s*` is followed by a character `\s` cannot match — and
 * together they catch the shapes the body-matching version missed, including a class containing `]`.
 * A guard that needs a guard is a guard that is too clever.
 */
const REGEXP_FIRST_ARGUMENT = /\.replace\(\s*\//;
const BACKSLASH_REPLACEMENT = /,\s*"\\\\/;

/** Both halves on one line: something is being escaped into a pattern by hand. */
const escapesInline = (line) => REGEXP_FIRST_ARGUMENT.test(line) && BACKSLASH_REPLACEMENT.test(line);

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
    // Proving the scan below is not vacuous. The first two are the real shapes that were in this directory.
    assert.ok(escapesInline('version.replace(/\\./g, "\\\\.")'));
    assert.ok(escapesInline('name.replace(/[/@]/g, "\\\\$&")'));
    // A character class containing `]`, which the body-matching detector could not reach.
    assert.ok(escapesInline('s.replace(/[\\]]/g, "\\\\$&")'));
    assert.ok(!escapesInline("escapeRegExp(pkg.name)"));
    // Not every `replace` is an escape: path normalisation must not be flagged.
    assert.ok(!escapesInline('p.replace(root, "").replace(/\\\\/g, "/")'));
  });

  it("cannot be made to backtrack", () => {
    // The input that earned this file its own js/redos alert. Linear patterns return immediately; the
    // ambiguous one this replaced did not. A second of headroom is several orders of magnitude of slack.
    const adversarial = `.replace(/${"[]".repeat(40)}`;
    const started = performance.now();
    escapesInline(adversarial);
    assert.ok(performance.now() - started < 1000, "the detector backtracks — it is too clever again");
  });

  it("no release test escapes inline any more", () => {
    const offenders = [];
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".mjs"))) {
      if (EXPLAINS_THE_RULE.has(name)) continue;
      const source = readFileSync(path.join(dir, name), "utf8");
      source.split("\n").forEach((line, i) => {
        if (escapesInline(line)) offenders.push(`${name}:${i + 1}`);
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
