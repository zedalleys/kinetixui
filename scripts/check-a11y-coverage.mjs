/**
 * check-a11y-coverage.mjs — every package with stories is really inside the accessibility gate.
 *
 *   node scripts/check-a11y-coverage.mjs
 *
 * Reaching the browser axe pass takes two things, and either one alone is a silent hole:
 *
 *   1. `apps/docs/.storybook/main.ts` must glob the package, or its stories are not in the built
 *      index and `scripts/a11y-browser.mjs` has nothing to open. Its `stories` list names packages
 *      one by one; it does not discover them.
 *   2. `a11y-browser.yml` must path-filter on the package, or a change to it never starts a run.
 *      That list is hand-maintained too.
 *
 * `packages/iot` satisfied (1) and not (2), so its stories were scanned only when a change to some
 * *other* package happened to trigger a run. Five real violations — three colour-contrast elements
 * on tinted device surfaces and a duplicated `Location` landmark — sat on main until an unrelated
 * `packages/ui` pull request surfaced them. A gate that covers a package only by luck is not
 * covering it.
 *
 * So both links are checked against the thing they are meant to track: the story files on disk.
 * Failing here means adding the package to the Storybook globs or the path filter, never deleting
 * the stories.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const WORKFLOW = ".github/workflows/a11y-browser.yml";
const STORYBOOK = "apps/docs/.storybook/main.ts";

/**
 * Packages that contribute at least one story file.
 *
 * Both extensions Storybook is configured to load — `*.stories.@(ts|tsx)`. Matching only `.tsx`
 * would let a package that writes non-JSX CSF disappear from this check while its stories stayed
 * in the built index, which is the same hole one level down.
 */
function packagesWithStories() {
  const dir = join(root, "packages");
  const found = [];
  for (const name of readdirSync(dir)) {
    if (!statSync(join(dir, name)).isDirectory()) continue;
    const stack = [join(dir, name, "src")];
    let has = false;
    while (stack.length && !has) {
      const here = stack.pop();
      if (!existsSync(here)) continue;
      for (const entry of readdirSync(here, { withFileTypes: true })) {
        if (entry.name === "node_modules") continue;
        const full = join(here, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (/\.stories\.tsx?$/.test(entry.name)) {
          has = true;
          break;
        }
      }
    }
    if (has) found.push(name);
  }
  return found.sort();
}

/** The packages named in Storybook's `stories` globs. */
function storybookPackages(text) {
  const block = text.match(/stories:\s*\[([\s\S]*?)\n\s*\]/);
  if (!block) return null;
  const names = new Set();
  for (const m of block[1].matchAll(/packages\/([^/"'`\s]+)\//g)) names.add(m[1]);
  return names;
}

/**
 * The `paths:` lists, one per trigger. Read with a narrow parser rather than a YAML dependency:
 * this workflow only ever has `on.push.paths` and `on.pull_request.paths`, both flat lists of
 * quoted globs, and a wrong answer here fails loudly below rather than passing silently.
 */
function pathLists(text) {
  const lists = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*paths:\s*$/.test(lines[i])) continue;
    const entries = [];
    for (let j = i + 1; j < lines.length; j++) {
      const m = lines[j].match(/^\s*-\s*"([^"]+)"\s*$/);
      if (!m) break;
      entries.push(m[1]);
    }
    lists.push(entries);
  }
  return lists;
}

const workflowText = readFileSync(join(root, WORKFLOW), "utf8");
const storybookText = readFileSync(join(root, STORYBOOK), "utf8");
const lists = pathLists(workflowText);
const built = storybookPackages(storybookText);
const stories = packagesWithStories();

const errors = [];
if (lists.length < 2) {
  errors.push(`${WORKFLOW}: expected a \`paths:\` list for both \`push\` and \`pull_request\`, found ${lists.length}.`);
}
if (built === null) {
  errors.push(`${STORYBOOK}: could not read the \`stories\` array, so Storybook coverage cannot be checked.`);
}

for (const pkg of stories) {
  // Link 1 — is it in the built Storybook at all?
  if (built && !built.has(pkg)) {
    errors.push(
      `packages/${pkg} has story files, but ${STORYBOOK} does not glob it.\n` +
        `    Its stories never reach the built index, so the axe pass cannot open them. Add\n` +
        `    "../../../packages/${pkg}/src/**/*.stories.@(ts|tsx)" to \`stories\`.`,
    );
  }
  // Link 2 — does changing it start a run?
  const glob = `packages/${pkg}/**`;
  const missing = lists.filter((entries) => !entries.includes(glob)).length;
  if (missing > 0) {
    errors.push(
      `packages/${pkg} has story files, but "${glob}" is missing from ${missing} of the ` +
        `${lists.length} \`paths:\` list(s) in ${WORKFLOW}.\n` +
        `    A change to it would not run the accessibility gate. Add the entry to both triggers.`,
    );
  }
}

if (errors.length) {
  console.error("x accessibility coverage:\n  " + errors.join("\n  "));
  process.exit(1);
}
console.log(
  `check:a11y-coverage ok — ${stories.length} package(s) with stories (${stories.join(", ")}) are globbed by ` +
    `Storybook and path-filtered by the accessibility workflow.`,
);
