import type { Node } from "./model";
import type { Props } from "./registry";

export const BREAKPOINTS = [
  { id: "tablet", label: "Tablet", minWidth: 768 },
  { id: "desktop", label: "Desktop", minWidth: 960 },
] as const;

export type Breakpoint = typeof BREAKPOINTS[number]["id"];
export type ResponsiveValues = Partial<Record<Breakpoint, Props>>;

const layoutProperties: Record<string, readonly string[]> = {
  "layout:stack": ["axis", "align", "gap", "padding"],
  "layout:grid": ["columns", "gap", "padding"],
  "layout:section": ["gap", "padding", "width", "widthMode"],
};

export function canOverride(ref: string, property: string): boolean {
  return layoutProperties[ref]?.includes(property) ?? false;
}

export function responsiveProps(node: Node, width: number): Props {
  const props = { ...node.props };
  for (const breakpoint of BREAKPOINTS) {
    if (width >= breakpoint.minWidth) Object.assign(props, node.responsive?.[breakpoint.id]);
  }
  return props;
}
