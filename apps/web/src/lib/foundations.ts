/**
 * Data for /docs/foundations — read from the token source files, never re-typed, so the page cannot drift
 * from the tokens. (The elevation table is the one measured-by-hand table; its source is noted there.)
 */
import dimension from "../../../../tokens/primitives/dimension.json";
import motion from "../../../../tokens/primitives/motion.json";

type Token = { $value: string | number | number[]; $description?: string };
const entries = (group: Record<string, unknown>) => Object.entries(group) as [string, Token][];

export type SpacingStep = { step: string; px: number; role: "base" | "half"; description?: string };

/**
 * KinetixUI's spatial grid is an 8-unit base with a 4-unit half-step. Every value is a multiple of 4;
 * a multiple of 8 is a base step, any other multiple of 4 is a half-step.
 */
export const spacingScale: SpacingStep[] = entries(dimension.spacing).map(([step, t]) => {
  const px = Number(t.$value);
  return { step, px, role: px % 8 === 0 ? "base" : "half", description: t.$description };
});

/** Role aliases point at a size step (`{radius.md}`); everything else in `radius` is a step. */
const RADIUS_ROLES = ["field", "control", "container", "surface"];

export const radiusScale = entries(dimension.radius)
  .filter(([name]) => !RADIUS_ROLES.includes(name))
  .map(([name, t]) => ({ name, px: Number(t.$value), description: t.$description }));

/** Each role and the step it currently resolves to — read from the token file, never re-typed. */
export const radiusRoles = RADIUS_ROLES.map((role) => {
  const t = (dimension.radius as unknown as Record<string, Token>)[role]!;
  const target = String(t.$value).replace(/[{}]/g, "").split(".")[1]!;
  return { role, target, px: radiusScale.find((s) => s.name === target)?.px ?? NaN, description: t.$description };
});

export const durations = entries(motion.duration).map(([name, t]) => ({ name, ms: parseInt(String(t.$value), 10), description: t.$description }));

export const easings = entries(motion.easing).map(([name, t]) => ({
  name,
  curve: `cubic-bezier(${(t.$value as number[]).join(", ")})`,
  description: t.$description,
}));

/**
 * Elevation as the components actually use it today — measured from `packages/ui/src/components`
 * (`shadow-sm` / `shadow-md` / `shadow-lg` / `shadow-xl` utilities). The semantic names are documentation,
 * not tokens (yet): the shadows themselves are the `--shadow-*` tokens.
 */
export const elevation = [
  { level: "Surface", token: "none", used: "Page and inline surfaces — no shadow." },
  { level: "Raised", token: "--shadow-sm", used: "Card, SegmentedControl, Toggle, InputOTP, KanbanBoard." },
  { level: "Popover", token: "--shadow-md", used: "Popover, DropdownMenu, ContextMenu, Menubar, Select, HoverCard, NavigationMenu." },
  { level: "Modal", token: "--shadow-lg", used: "Dialog, AlertDialog, Sheet, Sonner (toast), Fab, Tour." },
  { level: "(unused tier)", token: "--shadow-xl", used: "Only the Chart tooltip. Kept for larger surfaces." },
] as const;

/** What one unit means on each platform the repository actually supports. */
export const platformUnits = [
  { platform: "Web (React)", unit: "px / rem", how: "`--spacing-n` are px; Tailwind steps are 0.25rem (4px at the default root size)." },
  { platform: "SwiftUI", unit: "points", how: "`KinetixSpacing.spaceN` (Double, points). Text follows Dynamic Type, not the grid." },
  { platform: "Jetpack Compose", unit: "dp", how: "`KinetixSpacing.spaceN` (Float — use `.dp`) and `spacing_n` in `dimens.xml`. Text uses sp." },
  { platform: "Flutter", unit: "logical pixels", how: "`KinetixSpacing.spaceN` (double). Text follows the platform text scaler." },
] as const;
