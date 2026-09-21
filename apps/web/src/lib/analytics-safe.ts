/**
 * The two smallest safety primitives, shared by the event contract (`analytics.ts`) and attribution
 * (`analytics-attribution.ts`). They live in their own module so those two can both depend on them without
 * depending on each other. `analytics.ts` re-exports `cleanPath`, so existing imports are unchanged.
 */

/**
 * A value must look like an identifier: letters, digits and `_ . @ : / -`, at most 100 characters. That admits
 * slugs, paths, package names, hostnames and versions, and rejects whitespace, `?`, `=`, `#`, `&`, quotes and
 * anything else that free text, an email address or a query string needs.
 */
export const SAFE_VALUE = /^[A-Za-z0-9_.@:/-]{1,100}$/;

/** "/components?filter=data" → "/components". Query and hash never reach analytics. */
export function cleanPath(path: string): string | null {
  const bare = path.split(/[?#]/)[0] ?? "";
  return bare.startsWith("/") && SAFE_VALUE.test(bare) ? bare : null;
}
