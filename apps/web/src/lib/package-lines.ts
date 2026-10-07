/**
 * The npm packages that release on their own version line, read from the repository at build time.
 *
 * `/docs/changelog` is the curated history of the `core` train (`@kinetixui/tokens`, `ui`, `cli`, which always
 * share a version; see `releases.ts`). Every other release group in `release/publish-packages.json` has its own
 * version and its own Changesets changelog, and used to be invisible from that page: `@kinetixui/iot` shipped
 * 0.3.0, 0.4.0 and 0.5.0 without the changelog naming one of them.
 *
 * Nothing here is written by hand that the repository already knows. The groups come from the release allowlist
 * (the file that grants publication), each version from the package's own `package.json`, and each release from
 * the `## <version>` headings of its Changesets-generated `CHANGELOG.md`, which stays the record and is linked,
 * never copied. The only hand-written part is `LINE_DETAILS` — a reader-facing name and a docs route per group —
 * and `package-lines.test.ts` fails when a release group has none, so a new independent package cannot be
 * published without appearing on the changelog.
 *
 * Server-only (node:fs), like `token-evidence.ts`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** The group whose history `releases.ts` curates. Every other group is listed by this module. */
export const CORE_RELEASE_GROUP = "core";

/** Reader-facing details for each independently versioned release group. Keyed by `releaseGroup`. */
export const LINE_DETAILS: Record<string, { label: string; docs: string }> = {
  angular: { label: "Angular", docs: "/docs/angular" },
  iot: { label: "IoT", docs: "/docs/iot" },
};

const REPO = "https://github.com/zedalleys/kinetixui";

export type PackageRelease = {
  version: string;
  /** From the changelog's own `### Major/Minor/Patch Changes` headings; the highest one present. */
  type: "Major" | "Minor" | "Patch" | "Unclassified";
  /** The version's section in the canonical changelog on GitHub. */
  href: string;
};

export type PackageLine = {
  group: string;
  label: string;
  docs: string;
  name: string;
  /** The workspace version, which is what npm serves once the release pipeline has run. */
  version: string;
  changelog: string;
  npm: string;
  releases: PackageRelease[];
};

type Allowlist = { packages: { name: string; releaseGroup: string; directory: string }[] };

/** The repository root: `next build` and vitest run inside apps/web, the dev server may start at the root. */
export function packageLinesRoot(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "release", "publish-packages.json"))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error(`package-lines: no repository root above ${start}`);
}

/** GitHub's heading anchor for `## 0.5.0`: lower case, punctuation dropped. */
const anchor = (version: string) => version.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");

/** Every `## <version>` section of a Changesets changelog, newest first, with the kind of change it carries. */
export function parseChangelogReleases(markdown: string, changelogHref: string): PackageRelease[] {
  const releases: PackageRelease[] = [];
  let current: PackageRelease | null = null;
  const RANK = { Unclassified: 0, Patch: 1, Minor: 2, Major: 3 } as const;
  for (const line of markdown.split("\n")) {
    const version = /^## (\d+\.\d+\.\d+(?:-[\w.]+)?)\s*$/.exec(line);
    if (version) {
      current = { version: version[1]!, type: "Unclassified", href: `${changelogHref}#${anchor(version[1]!)}` };
      releases.push(current);
      continue;
    }
    const kind = /^### (Major|Minor|Patch) Changes\s*$/.exec(line);
    if (kind && current && RANK[kind[1] as "Major" | "Minor" | "Patch"] > RANK[current.type]) current.type = kind[1] as PackageRelease["type"];
  }
  return releases;
}

/** The independently versioned packages, in allowlist order. */
export function packageLines(root = packageLinesRoot()): PackageLine[] {
  const allowlist = JSON.parse(readFileSync(join(root, "release/publish-packages.json"), "utf8")) as Allowlist;
  return allowlist.packages
    .filter((p) => p.releaseGroup !== CORE_RELEASE_GROUP)
    .map((p) => {
      const details = LINE_DETAILS[p.releaseGroup];
      if (!details) throw new Error(`package-lines: release group "${p.releaseGroup}" (${p.name}) has no LINE_DETAILS entry`);
      const manifest = JSON.parse(readFileSync(join(root, p.directory, "package.json"), "utf8")) as { version: string };
      const changelogPath = join(root, p.directory, "CHANGELOG.md");
      const changelog = `${REPO}/blob/main/${p.directory}/CHANGELOG.md`;
      return {
        group: p.releaseGroup,
        label: details.label,
        docs: details.docs,
        name: p.name,
        version: manifest.version,
        changelog,
        npm: `https://www.npmjs.com/package/${p.name}`,
        releases: existsSync(changelogPath) ? parseChangelogReleases(readFileSync(changelogPath, "utf8"), changelog) : [],
      };
    });
}
