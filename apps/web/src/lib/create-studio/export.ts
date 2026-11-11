import { decodePreset } from "@kinetixui/create-preset";
import { resolveCreateTheme, exportCss } from "@kinetixui/create-theme";
import { assertDocument, type Document, type Node } from "./model";
import { adapterFor } from "./registry";
import { nodeStyle, responsiveCss } from "./presentation";
export type ReactExport = { source: string; theme: string; readme: string };
const expression = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
export function exportReact(doc: Document): ReactExport {
  assertDocument(doc);
  const imports = new Set<string>();
  const renderContent = (node: Node): string => {
    if (node.kind === "slot") return `<React.Fragment>${(node.children ?? []).map(render).join("\n")}</React.Fragment>`;
    const adapter = adapterFor(node.ref!);
    const p = { ...adapter.defaults, ...node.props };
    const style = `style={${expression(nodeStyle(node))}}${node.responsive ? ` data-kx-layout={${expression(node.id)}}` : ""}`;
    const children = (node.children ?? []).map(render).join("\n");
    const requireImports = (...symbols: string[]) => symbols.forEach(symbol => imports.add(symbol));
    switch (node.ref) {
      case "layout:section": return `<section aria-label={${expression(p.name)}} ${style}>${children}</section>`;
      case "layout:stack": case "layout:grid": return `<div ${style}>${children}</div>`;
      case "component:Button": requireImports("Button"); return `<Button variant={${expression(p.variant)}} size={${expression(p.size)}} disabled={${expression(p.disabled)}} ${style}>{${expression(p.text)}}</Button>`;
      case "component:Badge": requireImports("Badge"); return `<Badge variant={${expression(p.variant)}} ${style}>{${expression(p.text)}}</Badge>`;
      case "component:Input": requireImports("Input", "Label"); return `<div ${style}><Label htmlFor={${expression(node.id)}}>{${expression(p.label)}}</Label><Input id={${expression(node.id)}} placeholder={${expression(p.placeholder)}} disabled={${expression(p.disabled)}} /></div>`;
      case "component:Card": requireImports("Card", "CardHeader", "CardTitle", "CardDescription", "CardContent"); return `<Card ${style}><CardHeader><CardTitle>{${expression(p.title)}}</CardTitle><CardDescription>{${expression(p.description)}}</CardDescription></CardHeader><CardContent>${children}</CardContent></Card>`;
      case "component:Tabs": requireImports("Tabs", "TabsList", "TabsTrigger", "TabsContent"); return `<Tabs defaultValue="first" ${style}><TabsList aria-label="Content views"><TabsTrigger value="first">{${expression(p.firstLabel)}}</TabsTrigger><TabsTrigger value="second">{${expression(p.secondLabel)}}</TabsTrigger></TabsList><TabsContent value="first">{${expression(p.firstContent)}}</TabsContent><TabsContent value="second">{${expression(p.secondContent)}}</TabsContent></Tabs>`;
      default: throw new Error(`Cannot export ${node.id}: unsupported ${node.ref}`);
    }
  };
  const render = (node: Node): string => node.kind === "slot" ? renderContent(node) : `<div style={{minWidth:0}}><div>${renderContent(node)}</div></div>`;
  const pages = doc.pages.map((page, i) => `export function Screen${i + 1}() { return (<div className="kinetix-product">\n${render(page.root)}\n</div>); }`);
  const decoded = decodePreset(doc.designSystem.preset);
  if (!decoded.ok) throw new Error("Preset cannot be exported");
  return {
    source: `"use client";\nimport * as React from "react";\n${imports.size ? `import { ${[...imports].sort().join(", ")} } from "@kinetixui/ui";` : ""}\nimport "./theme.css";\n\n${pages.join("\n\n")}\n\nexport default Screen1;\n`,
    theme: (exportCss(resolveCreateTheme(decoded.config)) || "/* Uses the shipped KinetixUI theme; import the token stylesheet. */\n") + "\n.kinetix-product { --font-sans: Inter, system-ui, sans-serif; font-family: var(--font-sans); }\n" + responsiveCss(doc.pages.map(page => page.root)),
    readme: `# ${doc.name}\n\nGenerated from CreateProject v3. React only.\n\nUse @kinetixui/ui and @kinetixui/tokens with the repository Tailwind preset and content scan covering library dist. Import the token light/dark/extras styles before theme.css. This source contains Screen1…Screen${doc.pages.length}; wire them to your own router:\n${doc.pages.map((p,i) => `- Screen${i+1}: ${p.route}`).join("\n")}\n\nMotion references remain library-owned defaults; no custom motion is generated. This is source output, not a hosted build or five-platform parity claim. See docs/create/m1/EXPORT.md for the clean consumer fixture.\n`
  };
}
