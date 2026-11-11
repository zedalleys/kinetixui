// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { commandStringsOnPage } from "./pm-commands-mdx";

/**
 * The component pages the evaluator audit sampled (§7: button, input, select, dialog, tabs, breadcrumb, data-table)
 * read as KinetixUI's own pages, and their React install route matches the import their usage shows (F-02, F-17).
 * Deliberately these seven, not all 98: the rest share the generated template and are a separate, larger change.
 */
const SAMPLED = ["button", "input", "select", "dialog", "tabs", "breadcrumb", "data-table"] as const;
const page = (slug: string) => readFileSync(`src/app/docs/components/${slug}/page.mdx`, "utf8");

/** What is wrong with a sampled page. Empty means it passes. */
function problems(slug: string, text: string): string[] {
  const out: string[] = [];
  const description = /description:\s*"([^"]*)"/.exec(text)?.[1] ?? "";
  const lead = text.split("<ComponentMeta />")[1]?.split(/\n\n/).find((p) => p.trim()) ?? "";
  for (const [where, s] of [["metadata description", description], ["lead paragraph", lead]] as const) {
    if (/\b5\d{4}:\d+\b|Reconciled|Figma/.test(s)) out.push(`${where} carries an internal design-source reference`);
    if (/^Powerful\b/i.test(s.trim())) out.push(`${where} is upstream marketing copy`);
  }
  const install = text.split("## React installation")[1]?.split("## React usage")[0] ?? "";
  const usage = text.split("## React usage")[1]?.split(/\n## /)[0] ?? "";
  // Both routes are now rendered from the command contract rather than typed into the page, so the two
  // checks resolve the page's `<Command>` blocks instead of reading for one manager's spelling. The check is
  // the same one — install must match import, and the registry route must still be offered — and it now also
  // fails if the page names an operation or a component the contract cannot render.
  const commands = commandStringsOnPage(install);
  if (/from "@kinetixui\/ui"/.test(usage) && !commands.some((c) => /@kinetixui\/ui\b/.test(c)))
    out.push("usage imports @kinetixui/ui but installation never installs it");
  if (!commands.some((c) => new RegExp(`@kinetixui/cli add (?:[a-z0-9-]+ )*${slug}\\b`).test(c)))
    out.push("the CLI route is gone");
  if (/DataGrid, TreeView,\s*ColorPicker/.test(text)) out.push("boilerplate naming unrelated widgets");
  return out;
}

describe("sampled component pages", () => {
  it.each(SAMPLED)("%s", (slug) => expect(problems(slug, page(slug))).toEqual([]));

  it("would catch the pages as they were", () => {
    const before = `export const metadata = {\n  title: "Data Table",\n  description: "Powerful table and datagrid built with TanStack Table.",\n};\n\n# Data Table\n\n<ComponentMeta />\n\nPowerful table and datagrid built with TanStack Table.\n\n## React installation\n\n<Command op="cli-add" components={["data-table"]} />\n\n## React usage\n\n\`\`\`tsx\nimport { DataTable } from "@kinetixui/ui";\n\`\`\`\n\nKeyboard and ARIA behaviour is inherited from Radix; the hand-built widgets (DataGrid, TreeView,\nColorPicker, MultiSelect) …`;
    expect(problems("data-table", before)).toEqual([
      "metadata description is upstream marketing copy",
      "lead paragraph is upstream marketing copy",
      "usage imports @kinetixui/ui but installation never installs it",
      "boilerplate naming unrelated widgets",
    ]);
    expect(problems("button", `  description:\n    "Trigger an action — reconciled 1:1 with design source node 54863:351.",\n<ComponentMeta />\n\nTrigger. Reconciled 1:1 with design source node \`54863:351\`\n\n## React installation\n<Command op="cli-add" components={["button"]} />\n## React usage\n`)).toEqual([
      "metadata description carries an internal design-source reference",
      "lead paragraph carries an internal design-source reference",
    ]);
  });
});
