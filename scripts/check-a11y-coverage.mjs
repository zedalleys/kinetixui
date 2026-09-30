/**
 * check-a11y-coverage.mjs — every package with stories is inside the accessibility gate.
 *
 *   node scripts/check-a11y-coverage.mjs
 *
 * `a11y-browser.yml` is path-filtered, because the consumer build it runs is expensive and an
 * unrelated pull request should not pay for it. The filter is a hand-maintained list, and the
 * story directory is not: add a package with stories and the filter silently stops covering it.
 *
 * That is not hypothetical. `packages/iot` shipped its stories with no entry here, so the axe
 * pass ran over them only when a change to some *other* package happened to trigger it. Five real
 * violations — three colour-contrast elements on tinted device surfaces and a duplicated
 * `Location` landmark — sat on main until an unrelated `packages/ui` pull request surfaced them.
 * A gate that covers a package only by luck is not covering it.
 *
 * So the filter is checked against the thing it is meant to track: if a package contributes
 * stories to the built Storybook, `packages/<name>/**` must appear in both the `push` and
 * `pull_request` path lists. Failing here means adding the entry, never deleting the stories.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const workflow = ".github/workflows/a11y-browser.yml";

/** Packages that contribute at least one `*.stories.tsx` to Storybook. */
function packagesWithStories() {
  const dir = join(root, "packages");
  const found = [];
  for (const name of readdirSync(dir)) {
    const pkg = join(dir, name);
    if (!statSync(pkg).isDirectory()) continue;
    const stack = [join(pkg, "src")];
    let has = false;
    while (stack.length && !has) {
      const here = stack.pop();
      if (!existsSync(here)) continue;
      for (const entry of readdirSync(here, { withFileTypes: true })) {
        if (entry.name === "node_modules") continue;
        const full = join(here, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.name.endsWith(".stories.tsx")) {
          has = true;
          break;
        }
      }
    }
    if (has) found.push(name);
  }
  return found.sort();
}

/**
 * The `paths:` lists, one per trigger. Read with a narrow parser rather than a YAML dependency:
 * this file only ever has `on.push.paths` and `on.pull_request.paths`, both flat lists of quoted
 * globs, and a wrong answer here fails loudly below rather than passing silently.
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

const text = readFileSync(join(root, workflow), "utf8");
const lists = pathLists(text);
const stories = packagesWithStories();

const errors = [];
if (lists.length < 2) {
  errors.push(`${workflow}: expected a \`paths:\` list for both \`push\` and \`pull_request\`, found ${lists.length}.`);
}
for (const pkg of stories) {
  const glob = `packages/${pkg}/**`;
  const missing = lists.filter((entries) => !entries.includes(glob)).length;
  if (missing > 0) {
    errors.push(
      `packages/${pkg} has stories in Storybook, but "${glob}" is missing from ${missing} of the ` +
        `${lists.length} \`paths:\` list(s) in ${workflow}.\n` +
        `    A change to it would not run the accessibility gate. Add the entry to both triggers.`,
    );
  }
}

if (errors.length) {
  console.error("x accessibility coverage:\n  " + errors.join("\n  "));
  process.exit(1);
}
console.log(
  `check:a11y-coverage ok — ${stories.length} package(s) with stories (${stories.join(", ")}) are inside the accessibility gate.`,
);
