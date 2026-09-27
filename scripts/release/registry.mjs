/**
 * Registry state.
 *
 * Reads the packument over HTTP rather than parsing `npm view` output, so "this version exists" is
 * a lookup in a JSON object instead of a guess about console prose.
 *
 * The important rule is in `classifyRegistryResult`: a registry that cannot be reached, cannot be
 * parsed, or refuses us is **not** the same as a version that is unpublished. Treating a network
 * blip as "not published yet" would turn a transient failure into a publish attempt against
 * unknown state — the opposite of what this layer is for. Only a 200 whose `versions` map lacks
 * the version, or an honest 404 for the whole package, counts as unpublished.
 *
 * Public packuments need no credentials, which is what lets `pnpm release:plan` run in pull-request
 * CI with no npm token anywhere near it.
 */

/** @typedef {"published" | "unpublished" | "unknown"} RegistryState */

export class RegistryError extends Error {
  constructor(message, { packageName, cause } = {}) {
    super(message);
    this.name = "RegistryError";
    this.packageName = packageName;
    if (cause) this.cause = cause;
  }
}

/** Build the packument URL. The scope's `/` must survive, so only the name is encoded around it. */
export function packumentUrl(registry, name) {
  const base = registry.endsWith("/") ? registry : `${registry}/`;
  const encoded = name.startsWith("@")
    ? `${encodeURIComponent(name.slice(0, name.indexOf("/")))}%2f${encodeURIComponent(name.slice(name.indexOf("/") + 1))}`
    : encodeURIComponent(name);
  return `${base}${encoded}`;
}

/**
 * Turn one packument fetch into a state. Pure, so every branch below is unit-testable without a
 * network.
 *
 * @param {{status: number, ok: boolean, body: unknown, error?: Error}} result
 * @param {{name: string, version: string}} target
 * @returns {{state: RegistryState, detail: string}}
 */
export function classifyRegistryResult(result, target) {
  if (result.error) {
    return { state: "unknown", detail: `registry unreachable: ${result.error.message}` };
  }
  if (result.status === 404) {
    return { state: "unpublished", detail: "package does not exist on the registry yet" };
  }
  if (result.status === 401 || result.status === 403) {
    return { state: "unknown", detail: `registry refused the request (HTTP ${result.status})` };
  }
  if (!result.ok) {
    return { state: "unknown", detail: `registry returned HTTP ${result.status}` };
  }
  const body = result.body;
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { state: "unknown", detail: "registry returned a malformed packument" };
  }
  const versions = body.versions;
  if (versions === null || typeof versions !== "object" || Array.isArray(versions)) {
    return { state: "unknown", detail: "registry packument has no usable `versions` map" };
  }
  return Object.prototype.hasOwnProperty.call(versions, target.version)
    ? { state: "published", detail: "already published" }
    : { state: "unpublished", detail: "not on the registry" };
}

/** Fetch one packument, never throwing — transport failures come back as `{error}` to classify. */
async function fetchPackument(url, { timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { accept: "application/vnd.npm.install-v1+json, application/json" },
    });
    if (response.status === 404) return { status: 404, ok: false, body: null };
    let body = null;
    if (response.ok) {
      try {
        body = await response.json();
      } catch (error) {
        return { status: response.status, ok: true, body: "<unparseable>", error: undefined, parseError: error };
      }
    }
    return { status: response.status, ok: response.ok, body };
  } catch (error) {
    return { status: 0, ok: false, body: null, error: error instanceof Error ? error : new Error(String(error)) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look up every target's state.
 *
 * @param {{name: string, version: string}[]} targets
 * @param {{registry: string, timeoutMs?: number, fetchImpl?: typeof fetch}} options
 * @returns {Promise<Map<string, {state: RegistryState, detail: string}>>} keyed by package name
 */
export async function lookupRegistryState(targets, { registry, timeoutMs = 20000, fetchImpl = fetch } = {}) {
  const entries = await Promise.all(
    targets.map(async (target) => {
      const raw = await fetchPackument(packumentUrl(registry, target.name), { timeoutMs, fetchImpl });
      if (raw.parseError) {
        return [target.name, { state: "unknown", detail: "registry returned a malformed packument" }];
      }
      return [target.name, classifyRegistryResult(raw, target)];
    }),
  );
  return new Map(entries);
}

/**
 * Wait until the registry can confirm every target, or give up and say which it could not.
 *
 * A publish that exits 0 is the package manager's claim, not the registry's. The 0.23.0 release is
 * the reason that distinction matters: the useful question after an upload is "does the registry
 * serve this version", and until it answers yes nothing downstream should be treated as shipped.
 *
 * The complication is that npm is not read-your-writes. In the 0.23.1 release the three core
 * packages became visible 3, 4 and 7 minutes after their uploads, and a packument fetched in between
 * came back with a `modified` timestamp from the previous day — a stale answer, not a wrong one. So
 * "not there yet" is never treated as failure on its own; it is only reported after the caller's
 * whole window has elapsed, and it is reported as *unconfirmed* rather than as unpublished.
 *
 * `unknown` (unreachable, refused, malformed) keeps polling for the same reason it does everywhere
 * else in this module: it is not evidence of absence.
 *
 * @param {{name: string, version: string}[]} targets
 * @param {{registry: string, timeoutMs?: number, windowMs?: number, intervalMs?: number,
 *          fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>, now?: () => number,
 *          log?: (line: string) => void}} options
 * @returns {Promise<{confirmed: {name: string, version: string}[],
 *                    unconfirmed: {name: string, version: string, detail: string}[], attempts: number}>}
 */
export async function confirmPublished(
  targets,
  {
    registry,
    timeoutMs = 20000,
    windowMs = 10 * 60 * 1000,
    intervalMs = 15000,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = () => Date.now(),
    log = () => {},
  } = {},
) {
  const confirmed = [];
  const detailOf = new Map();
  let waiting = [...targets];
  let attempts = 0;
  const deadline = now() + windowMs;

  while (waiting.length > 0) {
    attempts += 1;
    const states = await lookupRegistryState(waiting, { registry, timeoutMs, fetchImpl });
    const stillWaiting = [];
    for (const target of waiting) {
      const result = states.get(target.name) ?? { state: "unknown", detail: "no result" };
      detailOf.set(target.name, result.detail);
      if (result.state === "published") {
        confirmed.push(target);
        log(`confirm: ${target.name}@${target.version} is on the registry`);
      } else {
        stillWaiting.push(target);
      }
    }
    waiting = stillWaiting;
    if (waiting.length === 0) break;
    // Checked after the attempt, so a window of 0 still buys exactly one look.
    if (now() >= deadline) break;
    log(`confirm: waiting for ${waiting.map((t) => t.name).join(", ")} to appear on the registry`);
    await sleep(intervalMs);
  }

  return {
    confirmed,
    unconfirmed: waiting.map((target) => ({ ...target, detail: detailOf.get(target.name) ?? "no result" })),
    attempts,
  };
}
