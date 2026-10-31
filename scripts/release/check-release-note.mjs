/** Fail a pull request whose merge would publish a core version that has no curated note yet.
 *
 * `scripts/version-release-meta.mjs` refuses to finish `changeset version` unless
 * `release/notes/<core-version>.json` exists and describes that exact version. That check runs only
 * on push to `main`, inside the Release workflow, so it is invisible to every pull request and fires
 * after the merge — at which point `main` is red on every subsequent push and no Version PR can be
 * generated until someone authors the note. That has now happened twice in one day: #442 for 0.26.0
 * and #455 for 0.26.1.
 *
 * This asks the same question one step earlier, from the changesets the merge would actually carry.
 * It is an early warning, not a replacement: the post-merge throw stays exactly as it is.
 *
 *   - It does not require a note for a release-inert change. No pending changeset moves
 *     `@kinetixui/ui`, no note is wanted, and the check passes.
 * It also validates the schema of *every* curated note in `release/notes/`, not only the one the
 * projection asks for. A note is authored in its own pull request, usually one carrying no
 * changeset at all, so at the moment it is written nothing moves `@kinetixui/ui` and the projection
 * half has nothing to look at. That is how the 0.27.0 note reached `main` classifying three changes
 * outside the `ChangeArea` union: inert JSON on `main`, so `main` stayed green, and a TypeScript
 * error in `releases.ts` the moment `version-release-meta.mjs` activated it into the Version PR.
 * The sweep is unconditional because a note is only ever wrong in one direction — it either
 * typechecks once injected or it does not, whatever is pending when it is written.
 *
 * Two things it deliberately does not do:
 *
 *   - It does not fail a pull request for a breakage that is already on the base branch. If `main`
 *     itself projects a core version whose note is missing, every open pull request inherits that
 *     through the merge commit, and failing all of them would say nothing about any of them. The
 *     check reports it and passes, naming the base as the cause. Only a pull request that *changes*
 *     the projected version to one lacking a note fails.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { plannedVersions, parseChangeset } from "./peers.mjs";
import { offSite } from "./links.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const CORE = "@kinetixui/ui";

/** The vocabulary `apps/web/src/lib/releases.ts` declares. Kept in step with the `ChangeKind` and
 *  `ChangeArea` unions there: a note that fails to typecheck once injected is a note that breaks the
 *  Version PR, which is the failure this file exists to move earlier. */
const KINDS = ["new", "improved", "fixed", "security", "accessibility", "breaking", "deprecated"];
const AREAS = ["components", "tokens", "cli", "platforms", "release"];
const RELEASE_URL = "https://github.com/zedalleys/kinetixui/releases/tag/";

/** Reads a path either from the working tree or from a git ref, so the same planner runs on both. */
const readTree = (p) => (existsSync(path.join(root, p)) ? readFileSync(path.join(root, p), "utf8") : null);
const listTree = (dir) => (existsSync(path.join(root, dir)) ? readdirSync(path.join(root, dir)) : []);

function fromRef(ref) {
  const show = (p) => {
    const r = spawnSync("git", ["show", `${ref}:${p}`], { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout : null;
  };
  const list = (dir) => {
    const r = spawnSync("git", ["ls-tree", "--name-only", `${ref}:${dir}`], { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout.split("\n").filter(Boolean).map((s) => s.replace(/\/$/, "")) : [];
  };
  return { show, list };
}

/** The core version a tree's pending changesets would publish, or undefined for a release-inert tree. */
export function projectedCore({ show, list }) {
  const config = JSON.parse(show(".changeset/config.json") ?? "{}");
  const changesets = [];
  for (const name of list(".changeset")) {
    if (!name.endsWith(".md") || name.toLowerCase() === "readme.md") continue;
    const text = show(`.changeset/${name}`);
    if (text === null) continue;
    const releases = parseChangeset(text);
    if (releases.length) changesets.push({ id: name.replace(/\.md$/, ""), releases });
  }
  const packages = [];
  for (const base of ["packages", "apps"]) {
    for (const name of list(base)) {
      const text = show(`${base}/${name}/package.json`);
      if (text !== null) packages.push(JSON.parse(text));
    }
  }
  const planned = plannedVersions({
    packages,
    changesets,
    fixed: config.fixed ?? [],
    linked: config.linked ?? [],
    ignore: config.ignore ?? [],
  });
  return planned.get(CORE);
}

/** Everything wrong with a curated note, as a list. Empty means it is fit to be injected. */
export function noteErrors(note, version, rel) {
  const e = [];
  const at = (what) => `${rel}: ${what}`;
  if (note.version !== version) e.push(at(`describes version "${note.version}", not ${version} — version-release-meta.mjs asserts these match and throws after the merge`));
  if (typeof note.summary !== "string" || note.summary.trim() === "") e.push(at("`summary` is required and must be a non-empty string"));
  if (!Array.isArray(note.breaking)) e.push(at("`breaking` is required — use [] to state \"none, and I checked\""));
  if (!Array.isArray(note.changes) || note.changes.length === 0) e.push(at("`changes` is required and must list at least one change"));
  if ("date" in note) e.push(at("remove `date` — version-release-meta.mjs stamps it with the UTC day of the run that versions the packages, and a date written here is either overwritten or misleading"));

  for (const [i, c] of (Array.isArray(note.changes) ? note.changes : []).entries()) {
    const where = `${rel}: changes[${i}]`;
    // Report a non-object element rather than throwing on it: `"body" in 42` is a TypeError, and a
    // gate that dies with a stack trace naming its own source tells the author nothing about theirs.
    if (c === null || typeof c !== "object" || Array.isArray(c)) {
      e.push(`${where}: must be an object, not ${Array.isArray(c) ? "an array" : JSON.stringify(c)}`);
      continue;
    }
    if (typeof c?.title !== "string" || c.title.trim() === "") e.push(`${where}: \`title\` is required`);
    if ("body" in c && typeof c.body !== "string") e.push(`${where}: \`body\` must be a string`);
    if ("kind" in c && !KINDS.includes(c.kind)) e.push(`${where}: kind "${c.kind}" is not one of ${KINDS.join(", ")}`);
    for (const a of [c?.area].flat().filter((x) => x !== undefined)) {
      if (!AREAS.includes(a)) e.push(`${where}: area "${a}" is not one of ${AREAS.join(", ")}`);
    }
    if ("href" in c) e.push(...linkErrors(c.href, `${where}: href`));
  }
  // `Release` in apps/web/src/lib/releases.ts types these as `string[]` and
  // `{ group: string; slugs: string[] }[]`, and version-release-meta.mjs copies them verbatim, so a
  // malformed *element* fails the generated TypeScript exactly as a malformed `area` does. Measured:
  // `breaking: [42]`, `limitations: [{}]` and `newComponents: [{ group: "Forms" }]` each produce
  // their own `error TS` in releases.ts under the site's own tsconfig.
  for (const key of ["breaking", "limitations"]) {
    if (!(key in note) || !Array.isArray(note[key])) continue;
    for (const [i, v] of note[key].entries()) {
      if (typeof v !== "string") e.push(at(`\`${key}[${i}]\` must be a string, not ${JSON.stringify(v)} — releases.ts types ${key} as string[]`));
    }
  }
  if ("newComponents" in note) {
    if (!Array.isArray(note.newComponents)) {
      e.push(at("`newComponents`, when present, must be an array"));
    } else {
      for (const [i, g] of note.newComponents.entries()) {
        const where = `\`newComponents[${i}]\``;
        if (g === null || typeof g !== "object" || Array.isArray(g)) {
          e.push(at(`${where} must be an object with \`group\` and \`slugs\``));
          continue;
        }
        if (typeof g.group !== "string" || g.group.trim() === "") e.push(at(`${where}.group must be a non-empty string`));
        if (!Array.isArray(g.slugs)) {
          e.push(at(`${where}.slugs is required and must be an array of strings`));
          continue;
        }
        for (const [j, slug] of g.slugs.entries()) {
          if (typeof slug !== "string") e.push(at(`${where}.slugs[${j}] must be a string, not ${JSON.stringify(slug)}`));
        }
      }
    }
  }
  if ("limitations" in note && !Array.isArray(note.limitations)) e.push(at("`limitations`, when present, must be an array"));
  if ("migration" in note && typeof note.migration !== "string") e.push(at("`migration`, when present, must be a string"));
  if ("githubReleaseUrl" in note) {
    const url = note.githubReleaseUrl;
    if (typeof url !== "string" || !url.startsWith(RELEASE_URL) || !url.includes(version)) {
      e.push(at(`githubReleaseUrl must start with ${RELEASE_URL} and name ${version} (got ${JSON.stringify(url)})`));
    }
  }
  return e;
}

/** A link is either a site-absolute docs route or a destination that names no route on this site.
 *
 *  The second half is `offSite` from `links.mjs`, the same predicate `check:release-links` uses, and
 *  it is imported rather than restated. An earlier version of this function allowed only `http(s):`,
 *  which rejected `mailto:` and `tel:` — destinations `changelog-view.tsx` renders straight into an
 *  anchor and `check:release-links` deliberately leaves alone, with coverage in
 *  `release-links.test.mjs`. A note that passes one of the two gates and fails the other is the
 *  failure mode worth most guarding against here, so the policy lives in one place.
 *
 *  What is still rejected is a *relative* href — `./docs/motion`, `docs/motion`, a padded value.
 *  The browser resolves those against whatever page the reader is on, so they are a 404 in a
 *  different spelling, and root-relative is the required spelling for a route on this site.
 *
 *  Nothing here resolves a route to a page: that is `check:release-links`, which needs a built site. */
export function linkErrors(href, where) {
  if (typeof href !== "string" || href.trim() === "") return [`${where} must be a non-empty string`];
  if (href !== href.trim()) return [`${where}: "${href}" has leading or trailing whitespace`];
  if (href.startsWith("/")) return [];
  if (offSite(href)) return [];
  return [`${where}: "${href}" is neither a site-absolute route ("/docs/...") nor an off-site destination (an absolute URL, mailto:, tel:, //host/path or #anchor). A relative href resolves against the reader's page, not the site root.`];
}

// ---------------------------------------------------------------------------------------------

/** The check itself. Returns the exit code rather than taking it, so a test can call it. */
/** Every schema error across `release/notes/`, keyed on each file's own version. Independent of what
 *  is pending: see the header for why the projection half cannot cover this. */
export function allNoteErrors(list, readFile) {
  const errors = [];
  for (const name of list("release/notes").filter((n) => n.endsWith(".json")).sort()) {
    const rel = `release/notes/${name}`;
    const text = readFile(rel);
    if (text === null) continue;
    let note;
    try {
      note = JSON.parse(text);
    } catch (err) {
      errors.push(`${rel}: is not valid JSON — ${err.message}`);
      continue;
    }
    errors.push(...noteErrors(note, name.replace(/\.json$/, ""), rel));
  }
  return errors;
}

export function main() {
  // Validate every note first, whatever this pull request is otherwise doing. A note-only pull
  // request carries no changeset, so the projection below would pass it unread.
  const schema = allNoteErrors(listTree, readTree);
  if (schema.length) {
    console.error(`check:release-note — FAIL

    A curated note is copied verbatim into apps/web/src/lib/releases.ts by
    scripts/version-release-meta.mjs. These values do not satisfy the unions declared there, so the
    Version PR generated from them would fail to typecheck and build:

${schema.map((e) => `  ✗ ${e}`).join("\n")}
`);
    return 1;
  }

  const core = projectedCore({ show: readTree, list: listTree });

  if (!core) {
    console.log("check:release-note — ok, no pending changeset moves @kinetixui/ui; no curated note is wanted.");
    return 0;
  }

  // version-release-meta.mjs reads the note only when releases.ts does not already carry an entry
  // for that version. Mirror that condition exactly, or this gate fails a pull request the real
  // step would wave through — a version already written into the changelog needs no note file.
  // This condition comes from #463, which found it independently.
  const releases = readTree("apps/web/src/lib/releases.ts") ?? "";
  if (releases.includes(`version: "${core}"`)) {
    console.log(`check:release-note — ok, apps/web/src/lib/releases.ts already carries ${core}; version-release-meta.mjs needs no curated note for it.`);
    return 0;
  }

  const rel = `release/notes/${core}.json`;
  const abs = path.join(root, rel);

  if (!existsSync(abs)) {
    // Is this the pull request's doing, or is the base branch already in this state?
    const baseRef = process.env.RELEASE_NOTE_BASE_REF || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main");
    const resolved = spawnSync("git", ["rev-parse", "--verify", `${baseRef}^{commit}`], { cwd: root, encoding: "utf8" });
    if (resolved.status === 0) {
      const baseCore = projectedCore(fromRef(baseRef));
      const baseHasNote = baseCore
        ? spawnSync("git", ["cat-file", "-e", `${baseRef}:release/notes/${baseCore}.json`], { cwd: root }).status === 0
        : true;
      if (baseCore === core && !baseHasNote) {
        console.log(`check:release-note — ${baseRef} already projects ${CORE} ${core} with no ${rel}.

    This pull request inherits that through the merge, it did not cause it, and failing here would say
    nothing about this change. ${baseRef} is red on every push until that note is authored.

    Passing.`);
        return 0;
      }
    } else {
      console.log(`check:release-note — note: ${baseRef} could not be resolved, so this result is not attributed to a base. Checking strictly.`);
    }

    console.error(`check:release-note — FAIL

    Merging this would publish ${CORE} ${core}, and ${rel} does not exist.

    scripts/version-release-meta.mjs throws "Missing curated release notes" on the first push to main
    after the merge. No Version PR can be generated, and main stays red until the note is authored.

    Author ${rel} and have its public copy approved before merging this.
    release/notes/0.26.0.json is the shape to follow; omit \`date\`.`);
    return 1;
  }

  const errors = noteErrors(read(abs), core, rel);
  if (errors.length) {
    console.error(`check:release-note — FAIL\n\n${errors.map((e) => `  ✗ ${e}`).join("\n")}\n`);
    return 1;
  }

  console.log(`check:release-note — ok, ${rel} is present and describes ${core}.`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main());
