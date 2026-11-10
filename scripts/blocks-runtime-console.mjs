/**
 * blocks-runtime-console.mjs — what counts as this site's failure, and what counts as someone else's.
 *
 * A browser check watches three streams: uncaught page errors, console messages, and the requests the page
 * makes. Only the first and third say whose fault a failure is; a console message is prose, and prose is the
 * one thing nobody owns. `blocks-runtime-browser.mjs` used to keep every console error except the ones
 * matching `/^Failed to load resource/`, which made the gate's verdict depend on how a third party happened
 * to word its refusal:
 *
 *   api.github.com answers 403      → "Failed to load resource: …"                    → filtered, pass
 *   api.github.com refuses the CORS → "Access to fetch at … blocked by CORS policy"   → kept, FAIL
 *
 * Same outage, same header star-count fetch in `apps/web/src/components/github-button.tsx`, opposite
 * verdicts. Measured on 2026-11-08: green on `main`, red minutes later on #497, green on a re-run with no
 * code change. A product gate that red-lights on someone else's weather teaches its reader to re-run it,
 * and a gate people re-run by reflex is not a gate.
 *
 * ── How a failure is classified ──────────────────────────────────────────────
 * By the **origin of the request that failed**, taken from the request itself, with the console message used
 * only as corroboration — never as the evidence:
 *
 *   page error                              → always this site's. FAILS.
 *   response ≥ 400 from this origin         → this site's. FAILS.
 *   response ≥ 400 from another origin      → reported, does not fail.
 *   request blocked by our own CSP/client   → this site's, whatever origin it names. FAILS.
 *   other network failure, another origin   → reported, does not fail.
 *   console error naming a foreign origin   → only excused if a request to that origin really did fail
 *                                             (see below). Otherwise FAILS.
 *   anything else                           → FAILS.
 *
 * ── The two asymmetries that keep this honest ───────────────────────────────
 * 1. **Default is failure.** Every branch that excuses something requires positive evidence; every branch
 *    that cannot prove a third party is at fault falls through to failing. A classifier whose unknown case
 *    is "pass" will eventually pass something real.
 * 2. **Wording may only make the gate stricter.** `FIRST_PARTY_WHATEVER_IT_NAMES` is consulted to *escalate*
 *    a message to this site's failure, never to excuse one. Adding a pattern to it can only ever turn a pass
 *    into a failure, so it cannot hide a defect — which is the opposite of the filter this replaces.
 *
 * `scripts/global-search-browser.mjs` already sorts *responses* by origin this way, and this module takes
 * that from it. Its console listener, though, still keys on `/^Failed to load resource/` alone, so the CORS
 * message would fail it too; the pattern was worth copying, the console half was not, and that script is
 * left exactly as it is because it is not this change's subject.
 */

/** Absolute URLs as they appear inside prose: quoted, parenthesised or bare. */
const ABSOLUTE_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s'"<>)]+/gi;

/**
 * Message shapes that are this site's defect no matter which origin they name. A CSP refusal names the
 * foreign origin it blocked, but the decision to block it was ours, and a request our own code makes and
 * our own policy forbids is a defect in one of the two. Hydration and script-evaluation failures are ours
 * by definition. This list only ever escalates — see asymmetry 2 above.
 */
const FIRST_PARTY_WHATEVER_IT_NAMES = [
  /content security policy/i,
  /refused to (connect|load|execute|apply|frame|display)/i,
  /hydrat/i,
  /ERR_BLOCKED_BY_CSP/i,
  /ERR_BLOCKED_BY_CLIENT/i,
];

/**
 * Chromium logs a failed subresource as "Failed to load resource" with no URL in the text, so the message
 * alone cannot say whose it was. The request-level listeners see the same failure *with* its URL and status,
 * and they decide it. Skipping it here defers to better evidence rather than excusing it: a first-party 500
 * still fails, by way of `response`.
 */
const DECIDED_BY_THE_REQUEST_INSTEAD = /^Failed to load resource/;

const parse = (url) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

/** Every origin an absolute URL in `text` points at, with the paths they were named with. */
export function urlsNamedIn(text) {
  const out = [];
  for (const [match] of String(text ?? "").matchAll(ABSOLUTE_URL)) {
    const url = parse(match);
    if (url) out.push(url);
  }
  return out;
}

export const isFirstPartyWhateverItNames = (text) => FIRST_PARTY_WHATEVER_IT_NAMES.some((p) => p.test(String(text ?? "")));

/**
 * A log of everything the browser reported, which decides whose failure each item was once the run is over.
 *
 * Classification is deferred to `report()` on purpose: a console message and the failed request it describes
 * arrive as separate events in no guaranteed order, so deciding the message as it arrives would mean
 * deciding it before the evidence that corroborates it exists.
 */
export function createFailureLog(baseUrl) {
  const origin = new URL(baseUrl).origin;
  const isForeign = (candidate) => candidate !== origin;

  const failures = new Set();
  const thirdParty = new Set();
  /** Foreign origins a request really did fail against — the only thing that can excuse a console message. */
  const foreignOutages = new Set();
  const consoleMessages = [];

  return {
    origin,

    /** An uncaught error in the page's own JavaScript. Never anyone else's. */
    pageError({ url = "", message }) {
      failures.add(`${url}${url ? ": " : ""}${message}`);
    },

    response({ url, status }) {
      if (status < 400) return;
      const parsed = parse(url);
      if (!parsed) {
        failures.add(`${status} for an unparseable URL: ${url}`);
        return;
      }
      if (isForeign(parsed.origin)) {
        foreignOutages.add(parsed.origin);
        thirdParty.add(`${status} ${parsed.origin}${parsed.pathname}`);
      } else {
        failures.add(`${status} for ${parsed.pathname}`);
      }
    },

    /** A request that never got a response: DNS, TLS, a refused connection — or our own CSP. */
    requestFailed({ url, errorText = "" }) {
      const parsed = parse(url);
      if (isFirstPartyWhateverItNames(errorText)) {
        failures.add(`${errorText} for ${parsed ? `${parsed.origin}${parsed.pathname}` : url}`);
        return;
      }
      if (!parsed) {
        failures.add(`${errorText} for an unparseable URL: ${url}`);
        return;
      }
      if (isForeign(parsed.origin)) {
        foreignOutages.add(parsed.origin);
        thirdParty.add(`${errorText || "request failed"} ${parsed.origin}${parsed.pathname}`);
      } else {
        failures.add(`${errorText || "request failed"} for ${parsed.pathname}`);
      }
    },

    consoleError({ url = "", text }) {
      consoleMessages.push({ url, text: String(text ?? "") });
    },

    report() {
      for (const { url, text } of consoleMessages) {
        const where = url ? `${url}: ` : "";
        if (isFirstPartyWhateverItNames(text)) {
          failures.add(`${where}${text}`);
          continue;
        }
        if (DECIDED_BY_THE_REQUEST_INSTEAD.test(text)) continue;

        const named = urlsNamedIn(text);
        // A foreign origin in the message is only an excuse when a request to it really did fail. Without
        // that, the message is unexplained, and an unexplained error in this site's console is this site's.
        const blamed = named.filter((u) => isForeign(u.origin) && foreignOutages.has(u.origin));
        // Our own origin appears in these messages as the *requester* ("from origin 'http://…'"), which
        // carries no path. A first-party URL named with a real path is a first-party resource in the
        // message, and that is not somebody else's outage however many foreign hosts it also names.
        const ourResource = named.some((u) => !isForeign(u.origin) && u.pathname !== "/");

        if (blamed.length && !ourResource) thirdParty.add(`${blamed[0].origin}: ${text}`);
        else failures.add(`${where}${text}`);
      }
      return { failures: [...failures], thirdParty: [...thirdParty] };
    },
  };
}
