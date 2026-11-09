/**
 * The blocks runtime gate must decide whose failure it saw by the origin of the request that failed, not by
 * how the console worded it.
 *
 * `scripts/blocks-runtime-browser.mjs` kept every console error except `/^Failed to load resource/`. The
 * header's star-count fetch asks `api.github.com`, which refuses shared CI runners, and it refuses in more
 * than one way:
 *
 *   403 answered   → "Failed to load resource: the server responded with a status of 403" → filtered, pass
 *   CORS refused   → "Access to fetch at … has been blocked by CORS policy"               → kept, FAIL
 *
 * Measured 2026-11-08: `axe` green on `main` `fc848b1f`, red at 12:10Z on #497 head `c4d89913` with that
 * CORS line as its only problem, green again on a re-run with no code change. The first test below is the
 * one that would have caught it: **the same outage must get the same verdict whichever way it is worded.**
 *
 * The risk of a classifier that excuses anything is that it excuses something real, so most of this file is
 * controls in the other direction: a page error, a first-party 500, a CSP refusal, an uncorroborated
 * message and a message that also names one of our own resources must all still fail. Each is asserted on
 * its own, so loosening the classifier fails here rather than going quiet in CI.
 *
 * It lives with the release tests because `pnpm test:release` runs in CI's `build` job, which runs on every
 * change, and that directory already hosts `marketing-stats.test.mjs` and `art001-stale-sweep.test.mjs` for
 * the same reason. `a11y-site.yml` invokes the browser script directly and says why — its path filters cover
 * the script, not `package.json` — so wiring these through the `check:blocks-runtime` wrapper would have put
 * them somewhere CI does not look.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFailureLog, isFirstPartyWhateverItNames, urlsNamedIn } from "../../blocks-runtime-console.mjs";

const BASE = "http://127.0.0.1:3000";
const STAR_COUNT = "https://api.github.com/repos/zedalleys/kinetixui";

/** The message Chromium logged on #497, verbatim from the failing job. */
const CORS_MESSAGE =
  `Access to fetch at '${STAR_COUNT}' from origin '${BASE}' has been blocked by CORS policy: ` +
  "No 'Access-Control-Allow-Origin' header is present on the requested resource.";

const FAILED_TO_LOAD = "Failed to load resource: the server responded with a status of 403 ()";

describe("blocks runtime gate — the same outage gets the same verdict either way", () => {
  /*
   * This is the defect. Both branches are one host refusing one request; the only difference is the words
   * Chromium chose. Before this change the first passed and the second failed.
   */
  const refusal = (text) => {
    const log = createFailureLog(BASE);
    log.response({ url: STAR_COUNT, status: 403 });
    log.consoleError({ url: `${BASE}/blocks`, text });
    return log.report();
  };

  it("a 403 worded as 'Failed to load resource' does not fail the gate", () => {
    const { failures, thirdParty } = refusal(FAILED_TO_LOAD);
    assert.deepEqual(failures, []);
    assert.deepEqual(thirdParty, ["403 https://api.github.com/repos/zedalleys/kinetixui"]);
  });

  it("the same 403 worded as a CORS refusal does not fail the gate either", () => {
    const { failures } = refusal(CORS_MESSAGE);
    assert.deepEqual(failures, [], "a third-party refusal still fails the gate when it is worded differently");
  });

  it("the two wordings agree, which is the property that was broken", () => {
    assert.equal(refusal(FAILED_TO_LOAD).failures.length, refusal(CORS_MESSAGE).failures.length);
  });

  it("a refused request with no response at all is also the third party's", () => {
    const log = createFailureLog(BASE);
    log.requestFailed({ url: STAR_COUNT, errorText: "net::ERR_NAME_NOT_RESOLVED" });
    log.consoleError({ url: `${BASE}/blocks`, text: CORS_MESSAGE });
    const { failures, thirdParty } = log.report();
    assert.deepEqual(failures, []);
    assert.equal(thirdParty.length, 2, `expected the outage and the message, got ${JSON.stringify(thirdParty)}`);
  });

  it("the verdict does not depend on which event arrived first", () => {
    const after = createFailureLog(BASE);
    after.consoleError({ url: `${BASE}/blocks`, text: CORS_MESSAGE });
    after.response({ url: STAR_COUNT, status: 403 });
    assert.deepEqual(after.report().failures, [], "a message seen before its failed request must not fail");
  });
});

describe("blocks runtime gate — controls: a real defect still fails", () => {
  it("an uncaught page error fails", () => {
    const log = createFailureLog(BASE);
    log.pageError({ url: `${BASE}/blocks`, message: "TypeError: x is not a function" });
    assert.deepEqual(log.report().failures, [`${BASE}/blocks: TypeError: x is not a function`]);
  });

  it("a 500 from our own origin fails", () => {
    const log = createFailureLog(BASE);
    log.response({ url: `${BASE}/blocks`, status: 500 });
    const { failures, thirdParty } = log.report();
    assert.deepEqual(failures, ["500 for /blocks"]);
    assert.deepEqual(thirdParty, []);
  });

  it("'Failed to load resource' is deferred to the request, not excused: a first-party 500 still fails", () => {
    const log = createFailureLog(BASE);
    log.response({ url: `${BASE}/_next/static/chunk.js`, status: 500 });
    log.consoleError({ url: `${BASE}/blocks`, text: "Failed to load resource: the server responded with a status of 500 ()" });
    assert.deepEqual(log.report().failures, ["500 for /_next/static/chunk.js"]);
  });

  it("a CSP refusal fails even though it names a foreign origin", () => {
    const log = createFailureLog(BASE);
    log.consoleError({
      url: `${BASE}/blocks`,
      text: `Refused to connect to '${STAR_COUNT}' because it violates the following Content Security Policy directive: "connect-src 'self'".`,
    });
    const { failures, thirdParty } = log.report();
    assert.equal(failures.length, 1, "our own policy blocking our own request is our defect");
    assert.deepEqual(thirdParty, []);
  });

  it("a request our own client blocked fails, foreign origin or not", () => {
    const log = createFailureLog(BASE);
    log.requestFailed({ url: STAR_COUNT, errorText: "net::ERR_BLOCKED_BY_CSP" });
    const { failures, thirdParty } = log.report();
    assert.equal(failures.length, 1);
    assert.deepEqual(thirdParty, []);
  });

  it("a console error naming nothing fails, because nothing excuses it", () => {
    const log = createFailureLog(BASE);
    log.consoleError({ url: `${BASE}/blocks`, text: "Warning: cannot update state on an unmounted component" });
    assert.equal(log.report().failures.length, 1);
  });

  it("a foreign origin in the message is not enough on its own — the request must really have failed", () => {
    const log = createFailureLog(BASE);
    log.consoleError({ url: `${BASE}/blocks`, text: CORS_MESSAGE });
    const { failures, thirdParty } = log.report();
    assert.equal(failures.length, 1, "an unexplained error in our console is ours until a failed request explains it");
    assert.deepEqual(thirdParty, []);
  });

  it("a message that also names one of our own resources fails, however many foreign hosts it names", () => {
    const log = createFailureLog(BASE);
    log.response({ url: STAR_COUNT, status: 403 });
    log.consoleError({ url: `${BASE}/blocks`, text: `Error hydrating ${BASE}/_next/static/chunk.js after ${STAR_COUNT} failed` });
    assert.equal(log.report().failures.length, 1);
  });

  it("a hydration warning fails, which the old filter also caught — no regression there", () => {
    const log = createFailureLog(BASE);
    log.consoleError({ url: `${BASE}/blocks`, text: "Hydration failed because the server HTML did not match" });
    assert.equal(log.report().failures.length, 1);
  });
});

describe("blocks runtime gate — the classifier's own parts", () => {
  it("the first-party list only ever escalates, so every pattern in it must fail a message", () => {
    for (const text of [
      "Refused to load the script because it violates the Content Security Policy",
      "Hydration failed because the server HTML did not match",
      "net::ERR_BLOCKED_BY_CLIENT",
    ]) {
      assert.equal(isFirstPartyWhateverItNames(text), true, `"${text}" should be read as this site's`);
    }
    assert.equal(isFirstPartyWhateverItNames(FAILED_TO_LOAD), false);
    assert.equal(isFirstPartyWhateverItNames(CORS_MESSAGE), false);
  });

  it("origins are read out of prose, quoted or bare", () => {
    assert.deepEqual(
      urlsNamedIn(CORS_MESSAGE).map((u) => u.origin),
      ["https://api.github.com", "http://127.0.0.1:3000"],
    );
    assert.deepEqual(urlsNamedIn("no urls here").length, 0);
  });

  it("our own origin appears in a CORS message as the requester, carrying no path", () => {
    // This is what lets the message be excused while a named first-party *resource* is not.
    const ours = urlsNamedIn(CORS_MESSAGE).find((u) => u.origin === "http://127.0.0.1:3000");
    assert.equal(ours.pathname, "/");
  });

  it("an unparseable URL fails rather than being skipped", () => {
    const log = createFailureLog(BASE);
    log.response({ url: "not a url", status: 502 });
    assert.equal(log.report().failures.length, 1);
  });

  /*
   * The status floor. Raised by the #546 author after reviewing this file: `if (status < 400) return;`
   * was unpinned here, so changing it to `status < 0` left all 19 tests green and was caught only by the
   * browser gate, which runs for 40 minutes and only when a script or apps/web file changes. A floor
   * nothing asserts is a floor that can be removed by accident.
   */
  it("a successful response from another origin records nothing at all", () => {
    const log = createFailureLog(BASE);
    log.response({ url: STAR_COUNT, status: 200 });
    assert.deepEqual(log.report(), { failures: [], thirdParty: [] });
  });

  it("a redirect from our own origin records nothing either, so the floor cannot drift down", () => {
    const log = createFailureLog(BASE);
    log.response({ url: `${BASE}/docs`, status: 304 });
    assert.deepEqual(log.report(), { failures: [], thirdParty: [] });
  });

  it("repeated identical failures are reported once", () => {
    const log = createFailureLog(BASE);
    for (let i = 0; i < 3; i++) log.response({ url: `${BASE}/blocks`, status: 500 });
    assert.deepEqual(log.report().failures, ["500 for /blocks"]);
  });
});
