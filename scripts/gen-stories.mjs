/**
 * gen-stories.mjs — generate one Storybook story per component from the
 * canonical demo registry (apps/web/src/registry/demos.tsx).
 *
 *   node scripts/gen-stories.mjs
 *
 * Output: packages/ui/src/stories/<Pascal>.stories.tsx (one per `*-demo` entry).
 * Button / Input / Textarea keep their hand-written stories and are skipped.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEMOS = `${ROOT}/apps/web/src/registry/demos.tsx`;
const OUT = `${ROOT}/packages/ui/src/stories`;

const HANDWRITTEN = new Set(["button", "input", "textarea"]);

const GROUP = {
  "aspect-ratio": "Foundations", separator: "Foundations", skeleton: "Foundations",
  spinner: "Foundations", label: "Foundations", image: "Foundations", "code-block": "Foundations",
  input: "Form Inputs", textarea: "Form Inputs", checkbox: "Form Inputs", "radio-group": "Form Inputs",
  select: "Form Inputs", slider: "Form Inputs", switch: "Form Inputs", "input-otp": "Form Inputs",
  "input-group": "Form Inputs", "password-input": "Form Inputs", "number-input": "Form Inputs",
  field: "Form Inputs", form: "Form Inputs", "file-upload": "Form Inputs", "date-picker": "Form Inputs",
  calendar: "Form Inputs", rating: "Form Inputs",
  button: "Controls & Actions", toggle: "Controls & Actions", "toggle-group": "Controls & Actions",
  fab: "Controls & Actions", pagination: "Controls & Actions", command: "Controls & Actions",
  combobox: "Controls & Actions",
  breadcrumb: "Navigation", tabs: "Navigation", "tab-bar": "Navigation", "navigation-menu": "Navigation",
  "navigation-bar": "Navigation", menubar: "Navigation", sidebar: "Navigation", stepper: "Navigation",
  "table-of-contents": "Navigation",
  dialog: "Overlays", "alert-dialog": "Overlays", sheet: "Overlays", drawer: "Overlays",
  popover: "Overlays", "hover-card": "Overlays", tooltip: "Overlays", "dropdown-menu": "Overlays",
  "context-menu": "Overlays", modal: "Overlays",
  alert: "Feedback", inform: "Feedback", progress: "Feedback", "circular-progress": "Feedback",
  sonner: "Feedback", badge: "Feedback", tag: "Feedback", metric: "Feedback",
  accordion: "Data Display", card: "Data Display", table: "Data Display", "data-table": "Data Display",
  carousel: "Data Display", chart: "Data Display", avatar: "Data Display", "avatar-group": "Data Display",
  collapsible: "Data Display", "scroll-area": "Data Display", resizable: "Data Display", list: "Data Display",
  quote: "Data Display", footer: "Data Display", "audio-player": "Data Display",
};

const PADDED = new Set([
  "chart", "data-table", "table", "footer", "calendar", "resizable", "carousel",
  "sidebar", "stepper", "menubar", "navigation-menu",
]);

const src = readFileSync(DEMOS, "utf8");

/* ---- map every imported identifier to its source module -------------- */
// local name -> { from, spec }  (spec is the import clause, e.g. "Command as Cmd")
const importOf = new Map();
for (const m of src.matchAll(/^import\s+\{([\s\S]+?)\}\s+from\s+"([^"]+)";$/gm)) {
  const from = m[2];
  for (const raw of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
    const local = raw.includes(" as ") ? raw.split(" as ")[1].trim() : raw;
    importOf.set(local, { from, spec: raw });
  }
}

const constDecls = [];
for (const m of src.matchAll(/^const\s+([A-Z0-9_]+)\s*=\s*[^;]+;/gm)) {
  constDecls.push({ name: m[1], code: m[0] });
}

/* ---- string/comment-aware scanner to pull each add(...) call ---------- */
function parseAdds(text) {
  const out = [];
  let i = 0;
  while ((i = text.indexOf("add(", i)) !== -1) {
    // must be a statement start (preceded by whitespace/newline)
    if (i > 0 && /[\w.]/.test(text[i - 1])) { i += 4; continue; }
    let j = i + 4;
    const skipWs = () => { while (/\s/.test(text[j])) j++; };
    const readString = () => {
      const q = text[j++];
      let s = "";
      while (text[j] !== q) { if (text[j] === "\\") s += text[j++]; s += text[j++]; }
      j++;
      return s;
    };
    skipWs();
    if (text[j] !== '"' && text[j] !== "'") { i = j; continue; }
    const key = readString();
    skipWs();
    if (text[j] !== ",") { i = j; continue; }
    j++; skipWs();
    // read arg2: balance () [] {} ; skip strings/backticks/comments; stop at depth-0 comma
    const start = j;
    let depth = 0;
    for (; j < text.length; j++) {
      const c = text[j];
      if (c === '"' || c === "'" || c === "`") {
        const q = c; j++;
        while (j < text.length && text[j] !== q) { if (text[j] === "\\") j++; j++; }
        continue;
      }
      if (c === "/" && text[j + 1] === "/") { while (j < text.length && text[j] !== "\n") j++; continue; }
      if (c === "/" && text[j + 1] === "*") { j += 2; while (j < text.length && !(text[j] === "*" && text[j + 1] === "/")) j++; j++; continue; }
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth--;
      else if (c === "," && depth === 0) break;
    }
    const component = text.slice(start, j).trim();
    j++; skipWs();
    // read arg3: template literal
    let source = "";
    if (text[j] === "`") {
      j++;
      while (text[j] !== "`") { if (text[j] === "\\") source += text[j++]; source += text[j++]; }
      j++;
    }
    out.push({ key, component, source });
    i = j;
  }
  return out;
}

const entries = parseAdds(src).filter((e) => e.key.endsWith("-demo"));

const ACRONYM = { otp: "OTP" };
const title = (slug) =>
  slug.split("-").map((w) => ACRONYM[w] ?? w[0].toUpperCase() + w.slice(1)).join("");

// build the per-story import block: only the identifiers this render body uses
function importsFor(body) {
  const idents = new Set(body.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []);
  const byModule = new Map();
  for (const name of idents) {
    const hit = importOf.get(name);
    if (!hit) continue;
    if (!byModule.has(hit.from)) byModule.set(hit.from, new Set());
    byModule.get(hit.from).add(hit.spec);
  }
  return [...byModule]
    .sort()
    .map(([from, specs]) => `import { ${[...specs].sort().join(", ")} } from "${from}";`)
    .join("\n");
}

mkdirSync(OUT, { recursive: true });
let written = 0;
const generated = [];
for (const { key, component, source } of entries) {
  const slug = key.replace(/-demo$/, "");
  if (HANDWRITTEN.has(slug)) continue;
  const Name = title(slug);
  const group = GROUP[slug] ?? "Components";
  const layout = PADDED.has(slug) ? "padded" : "centered";
  const usedConsts = constDecls.filter((c) => new RegExp(`\\b${c.name}\\b`).test(component));
  const constBlock = usedConsts.map((c) => c.code).join("\n");

  const file = `/* AUTO-GENERATED by scripts/gen-stories.mjs — do not edit.
   Source of truth: apps/web/src/registry/demos.tsx */
import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
${importsFor(component)}
${constBlock ? `\n${constBlock}\n` : ""}
const Demo = ${component};

const meta = {
  title: ${JSON.stringify(`${group}/${Name}`)},
  parameters: {
    layout: ${JSON.stringify(layout)},
    docs: { source: { code: \`${source.replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\`, language: "tsx" } },
  },
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = { render: () => <Demo /> };
`;
  writeFileSync(`${OUT}/${Name}.stories.tsx`, file);
  generated.push(`${Name}.stories.tsx`);
  written++;
}

// prune stale generated files (component removed from demos)
for (const f of readdirSync(OUT)) {
  if (!f.endsWith(".stories.tsx")) continue;
  const body = readFileSync(`${OUT}/${f}`, "utf8");
  if (body.startsWith("/* AUTO-GENERATED") && !generated.includes(f)) {
    console.log("stale (left in place, remove by hand):", f);
  }
}

console.log(`generated ${written} stories → ${OUT}`);
