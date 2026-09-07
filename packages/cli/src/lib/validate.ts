/**
 * Guards for values that flow into a URL, the filesystem, or a subprocess.
 * `add` / `init` fetch remote descriptors and shell out to a package manager,
 * so a hostile registry — or a `kinetixui.json` checked into a cloned repo —
 * must not be able to steer where files land or what gets installed.
 */

/** A registry item name. Interpolated into a URL path, so keep it to the
 *  characters a real component slug uses. */
export function assertComponentName(name: string): string {
  if (typeof name !== "string" || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(name)) {
    throw new Error(
      `Invalid component name ${JSON.stringify(name)} — expected letters, digits and dashes.`,
    );
  }
  return name;
}

/** The registry base URL. Must be http(s) so a descriptor can't redirect the
 *  CLI at `file:`, `data:` … */
export function assertRegistryUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid registry URL: ${JSON.stringify(url)}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Registry URL must be http(s), got "${parsed.protocol}".`);
  }
  return parsed.toString();
}

/** An npm dependency spec handed to `<pm> add`. Accepts `[@scope/]name[@range]`
 *  and nothing else — no flags, no whitespace, no git/file/url specifiers, no
 *  shell metacharacters. */
const PKG_SPEC =
  /^(?:@[a-z0-9-~][a-z0-9._-]*\/)?[a-z0-9-~][a-z0-9._-]*(?:@[a-z0-9.^~*x><=|.-]+)?$/i;

export function assertPackageSpec(spec: string): string {
  if (typeof spec !== "string" || spec.startsWith("-") || !PKG_SPEC.test(spec)) {
    throw new Error(`Refusing to install suspicious dependency: ${JSON.stringify(spec)}`);
  }
  return spec;
}
