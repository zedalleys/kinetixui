import { SPACING, adapterFor } from "./registry";
import type { Node } from "./model";
/** Shared, data-only style lowering used by the React renderer and compiler. */
export function nodeStyle(node: Node): Record<string, string | number> {
  const props = { ...adapterFor(node.ref!).defaults, ...node.props };
  const style: Record<string, string | number> = { minWidth: 0 };
  if (node.kind === "layout") {
    Object.assign(style, { display: node.ref === "layout:grid" ? "grid" : "flex", gap: SPACING[String(props.gap)], padding: SPACING[String(props.padding)] });
    if (node.ref === "layout:grid") style.gridTemplateColumns = `repeat(${props.columns}, minmax(0, 1fr))`;
    else { style.flexDirection = String(props.axis ?? "column"); style.alignItems = String(props.align ?? "stretch"); }
    if (node.ref === "layout:section") { style.width = Number(props.width); style.maxWidth = "100%"; style.minHeight = "22rem"; style.backgroundColor = "hsl(var(--card))"; style.color = "hsl(var(--card-foreground))"; }
  }
  for (const [property, ref] of Object.entries(node.tokenBindings ?? {})) {
    const variable = ref.slice("color.".length);
    style[property === "background" ? "backgroundColor" : "color"] = `hsl(var(--${variable}))`;
  }
  return style;
}
