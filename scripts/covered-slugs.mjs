/**
 * covered-slugs.mjs — which components a piece of text is evidence about.
 *
 * Lifted out of gen-verification.mjs so that more than one caller can use the *same* function rather
 * than a regex that resembles it. That distinction cost a false claim: large-text.mjs had its own
 * `<Component>` matcher to check its claim against its measurements, while the extractor here also reads
 * `Kinetix*` and `Name(`. One word in one comment — "KinetixDirectionProvider" — therefore credited
 * direction-provider with a large-text measurement that had never been taken, and the second opinion in
 * that file was not in a position to notice.
 *
 * This module has no side effects, which is the other half of why it exists: gen-verification.mjs runs
 * its generation on import, so importing the extractor from there would regenerate verification.json as
 * a side effect of asking a question about a string.
 */
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../components.manifest.json", import.meta.url), "utf8"));
const components = manifest.components;

/** "alert-dialog" → "AlertDialog". The same spelling `check-platform-source.mjs` uses. */
export const pascal = (slug) => slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");

/** "AlertDialog.stories.tsx" / "alert_dialog.dart" → "alert-dialog". */
export const slugify = (name) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/\.stories$/, "")
    .replace(/_/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

/**
 * slug → the symbol stems that mean it, longest first.
 *
 * A stem matches by PREFIX, so `KinetixTabsTrigger` counts as coverage of `tabs` — a sub-component is part
 * of its component, and an exact-name rule would report a fully tested Tabs as untested. Longest stem wins,
 * so `KinetixButtonGroup` goes to `button-group` and not also to `button`.
 */
export const STEMS = [];
for (const slug of Object.keys(components)) {
  const names = new Set([pascal(slug), ...Object.values(components[slug].sourceNames ?? {}).map((n) => pascal(n))]);
  for (const stem of names) STEMS.push({ slug, stem });
}
STEMS.sort((a, b) => b.stem.length - a.stem.length);

const PREFIXED_USED = [/\b(?:Kinetix|Kx)([A-Z][A-Za-z0-9]*)/g];
// React is mostly unprefixed, but not entirely — `KinetixDirectionProvider` is its real export name.
const REACT_USED = [/<\s*([A-Z][A-Za-z0-9]*)/g, /\b([A-Z][A-Za-z0-9]*)\s*[({]/g, ...PREFIXED_USED];

export function coveredSlugs(text, platform = "React") {
  const out = new Set();
  for (const re of platform === "React" ? REACT_USED : PREFIXED_USED) {
    for (const m of text.matchAll(re)) {
      const hit = STEMS.find((s) => m[1].startsWith(s.stem));
      if (hit) out.add(hit.slug);
    }
  }
  return out;
}
