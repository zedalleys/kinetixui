import dimensions from "../../../../../tokens/primitives/dimension.json";
import motion from "../../../../../tokens/contracts/motion.json";
import layouts from "../../../../../docs/create/layout-registry.json";
import manifest from "../../../../../components.manifest.json";
export type Prop = string | number | boolean | null | (string | number | boolean)[];
export type Props = Record<string, Prop>;
export type Control = { label: string; type: "text" | "number" | "boolean" | "select"; values?: readonly string[]; min?: number; max?: number };
export type Adapter = { label: string; container: boolean; defaults: Props; controls: Record<string, Control> };
const text = (label: string): Control => ({ label, type: "text" });
const choice = (label: string, values: readonly string[]): Control => ({ label, type: "select", values });
export const SPACING = Object.fromEntries(Object.entries(dimensions.spacing).map(([key, value]) => [`spacing.${key}`, Number(value.$value)]));
const spacing = Object.keys(SPACING);
export const ADAPTERS: Record<string, Adapter> = {
  "component:Button": { label: "Button", container: false, defaults: { text: "Continue", variant: "Primary", size: "md", disabled: false }, controls: { text: text("Text"), variant: choice("Variant", ["Primary", "Secondary", "Outline", "Destructive", "Ghost", "Link"]), size: choice("Size", ["sm", "md", "lg"]), disabled: { label: "Disabled", type: "boolean" } } },
  "component:Input": { label: "Input", container: false, defaults: { label: "Email address", placeholder: "you@example.com", disabled: false }, controls: { label: text("Label"), placeholder: text("Placeholder"), disabled: { label: "Disabled", type: "boolean" } } },
  "component:Card": { label: "Card", container: true, defaults: { title: "Your next idea", description: "Build something that feels like you." }, controls: { title: text("Title"), description: text("Description") } },
  "component:Badge": { label: "Badge", container: false, defaults: { text: "New", variant: "default" }, controls: { text: text("Text"), variant: choice("Variant", ["default", "secondary", "destructive", "outline", "subtle"]) } },
  "component:Tabs": { label: "Tabs", container: false, defaults: { firstLabel: "Overview", secondLabel: "Details", firstContent: "Start with the big picture.", secondContent: "Make room for the details." }, controls: { firstLabel: text("First tab"), secondLabel: text("Second tab"), firstContent: text("First panel"), secondContent: text("Second panel") } },
  "layout:stack": { label: "Stack", container: true, defaults: { axis: "column", gap: "spacing.4", padding: "spacing.4", align: "stretch" }, controls: { axis: choice("Direction", ["column", "row"]), gap: choice("Gap", spacing), padding: choice("Padding", spacing), align: choice("Align", ["stretch", "start", "center", "end"]) } },
  "layout:grid": { label: "Grid", container: true, defaults: { columns: 2, gap: "spacing.4", padding: "spacing.4" }, controls: { columns: { label: "Columns", type: "number", min: layouts.layouts["layout:grid"].columns.min, max: layouts.layouts["layout:grid"].columns.max }, gap: choice("Gap", spacing), padding: choice("Padding", spacing) } },
  "layout:section": { label: "Frame", container: true, defaults: { name: "Untitled screen", width: 640, gap: "spacing.4", padding: "spacing.6" }, controls: { name: text("Frame name"), width: { label: "Width", type: "number", min: layouts.layouts["layout:section"].width.min, max: layouts.layouts["layout:section"].width.max }, gap: choice("Gap", spacing), padding: choice("Padding", spacing) } },
};
export const MOTION_REFS = new Set(Object.keys(motion.roles).map(key => `motion:${key}`));
export const LAYOUT_REFS = layouts.layouts;
export function adapterFor(ref: string): Adapter {
  if (!Object.hasOwn(ADAPTERS, ref)) throw new Error(`Unsupported component or layout: ${ref}`);
  return ADAPTERS[ref];
}
export function validateProps(ref: string, props: Props): string[] {
  if (!Object.hasOwn(ADAPTERS, ref)) return [`Unsupported component or layout: ${ref}`];
  const adapter = ADAPTERS[ref];
  const errors: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (!Object.hasOwn(adapter.controls, key)) { errors.push(`Unsupported property ${ref}.${key}`); continue; }
    const control = adapter.controls[key];
    if (control.type === "text" && (typeof value !== "string" || value.length > 1000)) errors.push(`Invalid text ${key}`);
    if (control.type === "boolean" && typeof value !== "boolean") errors.push(`Invalid boolean ${key}`);
    if (control.type === "select" && (typeof value !== "string" || !control.values?.includes(value))) errors.push(`Invalid option ${key}`);
    if (control.type === "number" && (typeof value !== "number" || !Number.isInteger(value) || value < control.min! || value > control.max!)) errors.push(`Invalid number ${key}`);
  }
  const effective = { ...adapter.defaults, ...props };
  if (ref === "component:Input" && !String(effective.label).trim()) errors.push("Input requires an accessible label");
  if (ref === "layout:section" && !String(effective.name).trim()) errors.push("Frame requires an accessible name");
  if (ref === "component:Tabs" && (!String(effective.firstLabel).trim() || !String(effective.secondLabel).trim())) errors.push("Tabs require accessible names");
  return errors;
}
export function catalogueContains(ref: string): boolean {
  if (ref.startsWith("layout:")) return Object.hasOwn(LAYOUT_REFS, ref);
  const name = ref.slice("component:".length).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return Object.hasOwn(manifest.components, name);
}

