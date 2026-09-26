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
