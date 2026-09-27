import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertAllConfirmed, ReleaseError } from "../preflight.mjs";

/**
 * What happens after the uploads.
 *
 * `pnpm publish` exiting 0 is the package manager's claim; the registry serving the version is the
 * evidence. Until 0.23.1 the release reported "npm: published …" from the exit code alone, which is
 * the same kind of evidence that let 0.23.0 announce a release it had not finished.
 *
 * The rule these pin is deliberately asymmetric. A confirmed version is proof it shipped. An
 * unconfirmed one is *not* proof it did not — npm is not read-your-writes — so the stop has to read
 * as an unfinished release with a recovery, not as a diagnosis.
 */
const ui = { name: "@kinetixui/ui", version: "0.24.0" };
const cli = { name: "@kinetixui/cli", version: "0.24.0" };
const missing = (target) => ({ ...target, detail: "not on the registry" });

const errorFrom = (published, result) => {
  try {
    assertAllConfirmed(published, result);
  } catch (error) {
    return error;
  }
  return null;
};

describe("acting on a confirmation result", () => {
  it("says nothing when the registry confirmed everything", () => {
    assert.equal(assertAllConfirmed([ui, cli], { confirmed: [ui, cli], unconfirmed: [] }), undefined);
  });

  it("stops the release when a version cannot be confirmed", () => {
    const error = errorFrom([ui, cli], { confirmed: [ui], unconfirmed: [missing(cli)] });
    assert.ok(error instanceof ReleaseError);
    assert.match(String(error.message), /@kinetixui\/cli@0\.24\.0/);
  });

  it("names what did land, so a partial release is describable", () => {
    const error = errorFrom([ui, cli], { confirmed: [ui], unconfirmed: [missing(cli)] });
    assert.match(String(error.message), /Confirmed on the registry: @kinetixui\/ui@0\.24\.0/);
  });

  it("says so plainly when nothing was confirmed", () => {
    const error = errorFrom([ui], { confirmed: [], unconfirmed: [missing(ui)] });
    assert.match(String(error.message), /No version was confirmed on the registry/);
  });

  /**
   * The point of the whole change. A message that read "publishing failed" would be wrong about the
   * most likely cause and would push whoever reads it toward bumping the version to retry — which is
   * how a lag turns into a wasted version number.
   */
  it("does not claim the upload failed", () => {
    const message = String(errorFrom([ui], { confirmed: [], unconfirmed: [missing(ui)] }).message);
    assert.match(message, /not proof the upload failed/i);
    assert.match(message, /not read-your-writes/i);
    assert.match(message, /Do not bump the version to retry/i);
  });

  it("points at the recovery, and says no tag was created", () => {
    const message = String(errorFrom([ui], { confirmed: [], unconfirmed: [missing(ui)] }).message);
    assert.match(message, /No release tag was created/i);
    assert.match(message, /re-run the release/i);
    assert.match(message, /RELEASING\.md/);
  });

  it("carries the registry's own reason for each version it could not confirm", () => {
    const error = errorFrom([ui], { confirmed: [], unconfirmed: [{ ...ui, detail: "registry unreachable: ECONNRESET" }] });
    assert.match(String(error.message), /registry unreachable: ECONNRESET/);
  });
});
