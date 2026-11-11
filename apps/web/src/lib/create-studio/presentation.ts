import { SPACING, adapterFor } from "./registry";
import { walk, type Node } from "./model";
import { BREAKPOINTS, responsiveProps } from "./responsive";

const responsiveStyles = {
  flexDirection: "flex-direction",
  alignItems: "align-items",
  gridTemplateColumns: "grid-template-columns",
  gap: "gap",
  padding: "padding",
  width: "width",
} as const;

function cssValue(value: string | number): string {
  return typeof value === "number" ? `${value}px` : value;
}

/** Shared, data-only style lowering used by the React renderer and compiler. */
export function nodeStyle(node: Node, editWidth?: number): Record<string, string | number> {
  const props = { ...adapterFor(node.ref!).defaults, ...(editWidth === undefined ? node.props : responsiveProps(node, editWidth)) };
  const style: Record<string, string | number> = { minWidth: 0 };
  if (node.kind === "layout") {
    Object.assign(style, { display: node.ref === "layout:grid" ? "grid" : "flex", gap: SPACING[String(props.gap)], padding: SPACING[String(props.padding)] });
    if (node.ref === "layout:grid") style.gridTemplateColumns = `repeat(${props.columns}, minmax(0, 1fr))`;
    else { style.flexDirection = String(props.axis ?? "column"); style.alignItems = String(props.align ?? "stretch"); }
    if (node.ref === "layout:section") { style.width = props.widthMode === "fill" ? "100%" : Number(props.width); style.maxWidth = "100%"; style.minHeight = "22rem"; style.backgroundColor = "hsl(var(--card))"; style.color = "hsl(var(--card-foreground))"; }
  }
  for (const [property, ref] of Object.entries(node.tokenBindings ?? {})) {
    const variable = ref.slice("color.".length);
    style[property === "background" ? "backgroundColor" : "color"] = `hsl(var(--${variable}))`;
  }
  if (editWidth === undefined && node.responsive) {
    for (const property of Object.keys(responsiveStyles)) delete style[property];
  }
  return style;
}

/** Emits only styles lowered by the validated adapter. */
export function responsiveCss(roots: readonly Node[]): string {
  const nodes: Node[] = [];
  for (const root of roots) walk(root, node => { if (node.responsive) nodes.push(node); });
  function rule(node: Node, width: number) {
    const style = nodeStyle(node, width);
    const declarations = Object.entries(responsiveStyles).flatMap(([property, cssProperty]) =>
      property in style ? [`${cssProperty}:${cssValue(style[property])};`] : []);
    return `.kinetix-product [data-kx-layout="${node.id}"]{${declarations.join("")}}`;
  }
  const base = nodes.map(node => rule(node, 0));
  const media = BREAKPOINTS.flatMap(({ id, minWidth }) => {
    const rules = nodes.filter(node => node.responsive?.[id]).map(node => rule(node, minWidth));
    return rules.length ? [`@media (min-width: ${minWidth}px){\n${rules.join("\n")}\n}`] : [];
  });
  return [...base, ...media].join("\n");
}
