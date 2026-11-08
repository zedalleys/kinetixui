/**
 * ART-001's stale-figure sweep must not accuse a correct figure of being stale.
 *
 * `marketing/content/drafts/a01/verify-package.mjs` re-derives today's figures from the manifest and
 * then sweeps the channel files for figures that used to be current. The sweep was
 * `body.includes(figure)` — a bare substring test — and the current figure for documented exceptions
 * is now **19**, which ends with the characters of the stale **9**. So one run of the verifier
 * asserted the very same paragraph both correct ("today: 19 documented exceptions", ok) and stale
 * ("stale current-state figure \"9 documented exceptions\"", FAIL). A gate that contradicts itself on
 * correct input is worse than no gate, because the reader learns to discount it.
 *
 * The matcher now requires that no digit abuts a figure on either side, which is strictly narrower
 * than `includes`. The risk of a narrower matcher is that it stops detecting something real, so the
 * controls below are the point of this file: every stale figure must still fire, and a genuinely
 * wrong exception count must still be caught.
 *
 * It lives with the release tests because `pnpm test:release` is what CI runs as
 * "Test (release tooling)", and a guard in a suite nobody runs is not a guard. Nothing here touches
 * the network, and the sweep is imported as a pure function rather than by running the verifier,
 * which reads the whole repository and exits.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { STALE, findStaleFigures, staleMatcher } from "../../../marketing/content/drafts/a01/stale-figures.mjs";

const a01 = fileURLToPath(new URL("../../../marketing/content/drafts/a01/", import.meta.url));
const article = readFileSync(path.join(a01, "article.md"), "utf8");

/** The paragraph the defect was found in, as the repository carries it. */
const currentParagraph = (() => {
  const m = article.match(/Ours, as of \d{1,2} \w+ \d{4}:[\s\S]*?flatter the number\./);
  return m ? m[0] : null;
})();

describe("ART-001 stale sweep — the subject exists", () => {
  /*
   * Without this, every assertion below could pass against an article that no longer makes the claim
   * at all: findStaleFigures("") is empty, so "the paragraph is clean" is vacuously true for a
   * missing paragraph. The regression test is only evidence while its subject is there.
   */
  it("the article still carries the dated current-state paragraph", () => {
    assert.ok(
      currentParagraph,
      "could not find the 'Ours, as of <date>: … flatter the number.' paragraph in article.md",
    );
  });

  it("that paragraph states a documented-exception count ending in 9", () => {
    assert.match(
      currentParagraph,
      /\b\d*9 documented exceptions\b/,
      "the paragraph no longer states an exception count ending in 9, so this file is no longer testing the reported defect",
    );
  });
});

describe("ART-001 stale sweep — the false positive is fixed", () => {
  it("the real corrected paragraph carries no stale figure", () => {
    assert.deepEqual(findStaleFigures(currentParagraph), []);
  });

  it("'19 documented exceptions' is not read as the stale '9 documented exceptions'", () => {
    assert.deepEqual(findStaleFigures("with 19 documented exceptions that each carry a written reason"), []);
  });

  it("the whole article is clean of stale figures", () => {
    assert.deepEqual(findStaleFigures(article), []);
  });
});

describe("ART-001 stale sweep — negative controls", () => {
  /*
   * The control the fix has to survive: a genuinely wrong exception count. If the article regressed
   * to the old figure, the sweep must still say so — otherwise this change traded a false positive
   * for a false negative, which is the worse of the two.
   */
  it("a genuinely wrong exception count is still caught", () => {
    assert.deepEqual(findStaleFigures("with 9 documented exceptions that each carry a written reason"), [
      "9 documented exceptions",
    ]);
  });

  it("the real paragraph regressed to the stale count is caught", () => {
    const regressed = currentParagraph
      .replace("109 catalogue entries", "98 catalogue entries")
      .replace("19 documented exceptions", "9 documented exceptions");
    assert.ok(
      findStaleFigures(regressed).includes("9 documented exceptions"),
      "the sweep did not catch the stale count in an otherwise real paragraph",
    );
  });

  /*
   * No figure may be quietly excused by the narrower matcher. Each is asserted to still fire on its
   * own, so a future edit that loosens the guard — or drops an entry — fails here.
   */
  it("every registered stale figure still fires on its own", () => {
    for (const figure of STALE) {
      assert.deepEqual(
        findStaleFigures(`copy that says ${figure} as current state`),
        [figure],
        `"${figure}" is registered as stale but no longer detected`,
      );
    }
    assert.ok(STALE.length >= 6, `expected the registered stale set to be intact, got ${STALE.length}`);
  });

  it("the trailing guard does not create a false negative in the other direction", () => {
    // "Angular 110" is a count this project can genuinely reach, and is not the stale "Angular 11".
    assert.deepEqual(findStaleFigures("React 110, Angular 110 in preview"), []);
    assert.deepEqual(findStaleFigures("Angular 11 in preview"), ["Angular 11"]);
  });

  it("the guard rejects a digit-abutted match and accepts a standalone one", () => {
    /*
     * This is the whole property, asserted directly on the matcher rather than inferred from the
     * sweep: a figure must not match where a digit runs into it, and must match where none does.
     * A `\b` guard would also have fixed the reported case, so this file does not claim otherwise.
     */
    assert.equal(staleMatcher("9 documented exceptions").test("19 documented exceptions"), false);
    assert.equal(staleMatcher("9 documented exceptions").test("9 documented exceptions"), true);
    assert.equal(staleMatcher("Angular 11").test("Angular 110"), false);
    assert.equal(staleMatcher("Angular 11").test("Angular 11"), true);
    // A non-digit on either side is not a boundary the guard objects to.
    assert.equal(staleMatcher("Compose 89").test("(Compose 89)"), true);
  });
});

describe("ART-001 stale sweep — historical evidence survives", () => {
  /*
   * The before/after figures the article rests on are stripped before the sweep. They are owned by
   * verify-evidence.mjs, which pins each to a commit, and correcting today's copy must never be
   * achievable by quietly deleting them.
   */
  it("a historical before/after sentence is not reported as current state", () => {
    assert.deepEqual(findStaleFigures("Coverage moved: SwiftUI 91 → 90, Flutter 91 → 90, full coverage 90 → 89."), []);
  });

  it("a bare stale figure outside a historical sentence is still reported", () => {
    assert.deepEqual(findStaleFigures("Compose 89 today."), ["Compose 89"]);
  });
});
