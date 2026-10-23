/**
 * check-story-ids.mjs — every story a gate addresses exists in the built Storybook.
 *
 *   pnpm build-storybook && node scripts/check-story-ids.mjs
 *
 * Fourteen gate scripts drive Storybook by story id. The id is derived from the component's category
 * (`story-id.mjs`), so a category rename now moves every id with it — but a derived id can still address
 * nothing: a story can be renamed, a component can be dropped from the catalogue, or a `storyId` call can
 * name a story that was never written.
 *
 * Before CAT-2 each of those was a silent failure outside CI, because a gate that cannot find its story
 * reports a missing story rather than a wrong component, and only three of the 105 call sites were checked
 * by anything (`check:a11y-browser`, and only for its own open-state table). This asserts all of them at
 * once, which is cheap: it reads the call sites out of the scripts and the ids out of the built index, and
 * launches no browser.
 *
 * It is deliberately a reader of source text rather than an importer of each table: several of those
 * scripts start a browser or read a build at import time, and a gate that has to boot Chromium to check a
 * string would not be run.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { storyId } from "./story-id.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const indexPath = `${root}/apps/docs/storybook-static/index.json`;

if (!existsSync(indexPath)) {
  console.error("apps/docs/storybook-static/index.json not found — run `pnpm build-storybook` first.");
  process.exit(1);
}
const entries = JSON.parse(readFileSync(indexPath, "utf8")).entries;
// the component part of an id, as `story-id.mjs` builds it: the slug with its dashes closed up
const componentParts = Object.keys(JSON.parse(readFileSync(`${root}/component-taxonomy.json`, "utf8")).components).map((slug) =>
  slug.replace(/-/g, ""),
);

const problems = [];
let checked = 0;
// This gate and its control harness both quote story ids as examples and as the text the controls edit in.
// They are not gate call sites, so scanning them would make the gate fail on its own documentation.
const META = new Set(["check-story-ids.mjs", "check-story-id-negative-controls.mjs", "story-id.mjs"]);
const scripts = readdirSync(`${root}/scripts`).filter((f) => f.endsWith(".mjs") && !META.has(f));

for (const file of scripts) {
  const src = readFileSync(`${root}/scripts/${file}`, "utf8");
  for (const m of src.matchAll(/storyId\("([a-z0-9-]+)",\s*"([^"]+)"\)/g)) {
    const [, slug, story] = m;
    checked++;
    let id;
    try {
      id = storyId(slug, story);
    } catch (err) {
      problems.push(`${file}: storyId("${slug}", "${story}") — ${err.message}`);
      continue;
    }
    if (!entries[id]) {
      // Found by the component part, not the category prefix: when it is the CATEGORY that is wrong, a
      // prefix search finds nothing and the message would say "no stories at all" for the very failure
      // this gate exists to catch. Searching by component instead prints the real id and the mismatch
      // reads itself.
      const bare = slug.replace(/-/g, "");
      const near = Object.keys(entries).filter((k) => k.includes(`-${bare}--`) || k.startsWith(`${bare}--`));
      problems.push(
        `${file}: storyId("${slug}", "${story}") resolves to "${id}", which is not a story in the built ` +
          `Storybook.${near.length ? ` That component's stories are: ${near.join(", ")}.` : " That component has no stories at all."}`,
      );
    }
  }
  // A literal id is the thing this gate and `story-id.mjs` exist to prevent: it is a third copy of the
  // taxonomy, and it goes stale without anything saying so. So "is this an id that exists" is the wrong
  // test, and it was the test here: it answers yes for a literal that is still valid and no for exactly the
  // one that has rotted, which is the case this comment describes and the only case worth a gate. The test
  // is instead whether the text reads as a story id for a component the catalogue knows, under any category
  // prefix at all, so an id left behind by a rename is caught with the rest. The prefix has to END with the
  // component part rather than be it, because `button--action` and `label--before` are BEM class names and
  // not story ids. Scanned over the raw source and not over whole string literals, because the id that
  // actually rotted was spelled inside a URL in a template string, where no quote sits beside it.
  for (const m of src.matchAll(/(?<![a-z0-9-])((?:[a-z0-9]+-)*[a-z0-9]+--[a-z0-9-]+)(?![a-z0-9-])/g)) {
    const [literal] = m.slice(1);
    const prefix = literal.slice(0, literal.indexOf("--"));
    if (!entries[literal] && !componentParts.some((c) => prefix.endsWith(`-${c}`))) continue;
    problems.push(
      `${file}: "${literal}" is a story id written out in full — use storyId(slug, story).` +
        (entries[literal] ? "" : " It no longer addresses a story, which is what a written-out id does when a category is renamed."),
    );
  }
}

if (problems.length) {
  console.error(problems.map((p) => `  ✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log(`check:story-ids ok — ${checked} derived story ids, every one a story in the built Storybook.`);
