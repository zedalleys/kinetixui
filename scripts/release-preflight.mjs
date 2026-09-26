/**
 * release-preflight.mjs — prove the whole release without touching the registry.
 *
 *   node scripts/release-preflight.mjs
 *   node scripts/release-preflight.mjs --skip-smoke   (contract + pack + tarballs only)
 *
 * Plan, build, pack, validate every tarball's manifest and entry points, install each one into a
 * throwaway consumer and use it, then let the package manager rehearse the upload. Everything
 * `pnpm release` does except the upload itself, run from the same code path — `pnpm release` is
 * this plus `publish(packed)`.
 *
 * This is safe to run on a branch, on a pull request, or by hand. It never publishes.
 */
import { preflight, ReleaseError } from "./release/preflight.mjs";
import { formatPlan } from "./release/report.mjs";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const log = (message) => console.log(`  ${message}`);

try {
  const { plan, packed, outDir } = await preflight({
    root,
    log,
    skipSmokeTests: process.argv.includes("--skip-smoke"),
  });
  console.log("");
  console.log(formatPlan(plan));
  if (outDir) rmSync(outDir, { recursive: true, force: true });
  console.log("");
  console.log(
    packed.length === 0
      ? "release:preflight ok — nothing to publish; every allowlisted version is already on the registry."
      : `release:preflight ok — ${packed.length} package(s) built, packed, validated and proved in a clean consumer. Nothing was published.`,
  );
} catch (error) {
  if (error instanceof ReleaseError) {
    console.error(error.errors.join("\n\n"));
    process.exit(1);
  }
  throw error;
}
