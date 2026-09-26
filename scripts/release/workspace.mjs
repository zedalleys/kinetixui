/**
 * Workspace discovery and publication classification.
 *
 * The discovery half reads the filesystem; the classification half is pure, takes the manifests it
 * was handed, and is where the 0.23.0 rule lives:
 *
 *   every workspace package is either explicitly allowlisted for npm, or explicitly `private: true`
 *
 * A package that is neither is not quietly skipped. `@kinetixui/angular` was exactly that — public
 * only because nobody had said otherwise, versioned by the fixed group, and therefore swept into a
 * workspace-wide publish. Treating "publish-capable but unapproved" as a hard failure is the
 * difference between a config mistake and a registry mutation.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

/** Where pnpm-workspace.yaml points. Kept literal rather than parsed: two globs, and a wrong
 *  answer here would silently shrink the set of packages we classify. */
export const WORKSPACE_DIRS = ["packages", "apps"];

/**
 * Read every workspace package manifest.
 *
 * @param {string} root repository root
 * @returns {{name: string, version: string, directory: string, manifest: object}[]}
 */
export function discoverWorkspace(root, dirs = WORKSPACE_DIRS) {
  const found = [];
  for (const dir of dirs) {
    const abs = path.join(root, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(abs, entry.name, "package.json");
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      found.push({
        name: manifest.name ?? `(unnamed: ${dir}/${entry.name})`,
        version: manifest.version ?? null,
        directory: `${dir}/${entry.name}`,
        manifest,
      });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Split the workspace into "npm publishes this" and "npm must never see this", and report every
 * way that split can be wrong.
 *
 * @param {ReturnType<typeof discoverWorkspace>} packages
 * @param {{name: string, directory: string}[]} allowlist
 * @returns {{allowlisted: object[], private: object[], errors: string[]}}
 */
export function classify(packages, allowlist) {
  const errors = [];
  const byName = new Map(packages.map((p) => [p.name, p]));
  const allowed = new Map(allowlist.map((entry) => [entry.name, entry]));

  for (const entry of allowlist) {
    const pkg = byName.get(entry.name);
    if (!pkg) {
      errors.push(
        `${entry.name} is in release/publish-packages.json but is not a workspace package. ` +
          `Remove it from the allowlist, or fix its name.`,
      );
      continue;
    }
    if (pkg.directory !== entry.directory) {
      errors.push(
        `${entry.name} is at ${pkg.directory} but release/publish-packages.json says ${entry.directory}. ` +
          `Update the allowlist so the build and pack steps act on the right package.`,
      );
    }
    if (pkg.manifest.private === true) {
      errors.push(
        `${entry.name} is allowlisted for npm but its package.json sets "private": true. ` +
          `Either remove it from release/publish-packages.json, or drop the private flag once it is ` +
          `publication-ready.`,
      );
    }
  }

  const allowlisted = [];
  const privatePackages = [];
  for (const pkg of packages) {
    const isAllowlisted = allowed.has(pkg.name);
    const isPrivate = pkg.manifest.private === true;
    if (isAllowlisted && !isPrivate) {
      allowlisted.push({ ...pkg, allowlist: allowed.get(pkg.name) });
      continue;
    }
    if (isPrivate) {
      privatePackages.push(pkg);
      continue;
    }
    if (!isAllowlisted) {
      errors.push(
        `Release preflight failed.\n` +
          `${pkg.name} (${pkg.directory}) is publish-capable but is not present in ` +
          `release/publish-packages.json.\n` +
          `Either:\n` +
          `  - set "private": true in ${pkg.directory}/package.json if it must not be published, or\n` +
          `  - complete publication readiness and add it to the allowlist.\n` +
          `No package was published.`,
      );
    }
  }

  return { allowlisted, private: privatePackages, errors };
}
