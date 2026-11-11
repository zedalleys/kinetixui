/**
 * The one place a KinetixUI command shown on this site is written down.
 *
 * Before this module, every command was a hand-typed MDX fence: 120 `npx @kinetixui/cli add …` strings, 109
 * of them one per component page. All of them npm. Adding pnpm, Yarn and Bun that way would have meant four
 * hand-typed strings per page and no way to tell a typo from a deliberate difference.
 *
 * So a command is now *derived*: an operation says what it does (install these packages, execute the CLI with
 * these arguments, run this script) and a package manager says how that is spelled. The site renders the
 * product of the two. A command that does not come out of `renderCommand` is not a command this site makes.
 *
 * Three rules this module exists to keep:
 *
 *   1. **Nothing is invented.** Package names come from `./packages`, which reads each package's own
 *      package.json. CLI subcommands are the ones `packages/cli/src/program.ts` actually declares — there is
 *      no `search`, `view`, `diff` or `--dry-run` here because the CLI has none, and `pm-commands.test.ts`
 *      asserts the CLI argument of every operation against that file.
 *   2. **No shell injection.** A component, theme, path or preset supplied by a caller is validated against
 *      the same charset the CLI's own `assertComponentName` / `assertThemeName` / `assertPackageSpec` use, and
 *      a value that fails *throws* rather than rendering. Nothing reaches a reader's terminal through a copy
 *      button that the CLI would itself refuse.
 *   3. **An unsupported combination is explained, never faked.** Yarn Classic has no `dlx`. Rather than emit
 *      `yarn dlx` to a reader whose yarn is 1.x and let it fail, an execute operation under Yarn carries a
 *      `caveat` naming the Classic route. The UI shows it; it is not hidden to keep the four tabs tidy.
 *
 * Deliberately *not* here: anything that would make the reader's choice of package manager an analytics
 * property. `analytics-surfaces.ts` already classifies a copied command by package and platform from the text
 * alone, and that is the whole approved vocabulary. The preference is a convenience, not a measurement.
 */
import { PACKAGES } from "./packages";

/* ------------------------------------------------------------------ package managers */

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export const PACKAGE_MANAGER_LABELS: Record<PackageManager, string> = {
  npm: "npm",
  pnpm: "pnpm",
  yarn: "Yarn",
  bun: "Bun",
};

export const DEFAULT_PACKAGE_MANAGER: PackageManager = "npm";

/** A known package manager, or null. The only door a string from storage or a URL comes in through. */
export function parsePackageManager(value: string | null | undefined): PackageManager | null {
  const v = value?.trim().toLowerCase();
  return v && (PACKAGE_MANAGERS as readonly string[]).includes(v) ? (v as PackageManager) : null;
}

/* ------------------------------------------------------------------ operations */

/**
 * What an operation *is*, which is what decides its syntax:
 *
 *   - `install` / `install-dev` — add a dependency to the project in the current directory.
 *   - `execute` — download and run a package that is not a dependency (npx / dlx / bunx). The package is
 *     fetched for the one run; it is not added to package.json.
 *   - `run` — invoke a script already declared in the project's own package.json.
 *
 * These are different enough that no two share a spelling across all four managers, which is exactly why the
 * kind is part of the model rather than something the renderer guesses from the string.
 */
export type OperationKind = "install" | "install-dev" | "execute" | "run";

/** What a caller must supply for an operation that takes one, and how it is validated. */
export type ParameterKind = "components" | "component" | "theme" | "preset" | "path";

/**
 * Flags an operation accepts after its parameter. Only the preset exporters have any, and only the two the
 * CLI declares: `-n/--name` for the generated symbol and `-o/--output` for a file instead of stdout.
 */
export type OperationFlag = "symbol" | "output";

export interface Operation {
  /** Stable. Referenced from MDX and asserted in tests; renaming one is a breaking change to the docs. */
  readonly id: OperationId;
  readonly kind: OperationKind;
  /** Human sentence for the operation, used as the selector's accessible description. */
  readonly label: string;
  /** `install` / `install-dev`: the specs to add, in order. */
  readonly packages?: readonly string[];
  /** `execute`: the package to fetch and run. Always a real published name. */
  readonly executePackage?: string;
  /** `execute`: the subcommand and flags, before any parameter. */
  readonly args?: readonly string[];
  /** `run`: the package.json script name. */
  readonly script?: string;
  /** The parameter this operation takes, if any. */
  readonly parameter?: ParameterKind;
  /**
   * The parameter is optional by the CLI's own contract, so the bare command is already complete and
   * carries no placeholder. `parity` with no names prints the whole matrix; `lint` with no path falls
   * back to the aliases in `kinetixui.json`. For every other operation, omitting the parameter yields a
   * `<placeholder>` and `placeholder: true`, because the bare command would do the wrong thing.
   */
  readonly parameterOptional?: true;
  /** Optional flags this operation accepts, in the order they are rendered. */
  readonly flags?: readonly OperationFlag[];
  /**
   * A limitation of one manager for this operation, measured rather than assumed. Shown beside the command.
   * `scripts/adoption/pm-matrix.mjs` is where each of these was established, and re-establishes it.
   */
  readonly caveats?: Partial<Record<PackageManager, string>>;
  /** What directory the reader is expected to be in. Every operation here assumes the project root. */
  readonly cwd: "project-root";
  /** The floor the operation's own tooling declares. `@kinetixui/cli` sets `engines.node: ">=18"`. */
  readonly minNode?: string;
}

const CLI = PACKAGES.cli;

/**
 * Measured, 2026-10-26, by `node scripts/adoption/pm-matrix.mjs`: a clean consumer that installs
 * `@kinetixui/ui` with **either** Yarn line typechecks but fails its build on
 * `Rolldown failed to resolve import "react-is"`. npm 10.9.4, pnpm 12.3.1 and bun 1.4.4 all pass.
 *
 * Cause: `recharts@3.10.1` — a dependency of `@kinetixui/ui` — declares `react-is` as a *peer*
 * dependency. npm 7+, pnpm and bun install a transitive peer automatically; Yarn Classic (1.22.22) and
 * Yarn Berry (4.18.1) both only warn. Adding `react-is` to the fixture by hand makes the Yarn build pass,
 * which is how the cause was confirmed rather than inferred.
 *
 * The real fix is for `@kinetixui/ui` to depend on `react-is` itself. That changes a published package and
 * needs a changeset, so it is a separate release-affecting PR; until it ships, the Yarn tab says what a
 * Yarn reader has to do, because the alternative is a reader whose build breaks with no explanation.
 */
const YARN_NEEDS_REACT_IS =
  "Yarn does not install a transitive peer dependency. @kinetixui/ui bundles charts built on recharts, which declares react-is as a peer, so add it too: yarn add react-is. Measured on Yarn Classic 1.22.22 and Yarn 4.18.1; npm, pnpm and Bun install it for you.";


/**
 * Every operation this site can show. The CLI ones mirror `packages/cli/src/program.ts` one-for-one; the
 * install ones mirror what the published packages actually are.
 */
export const OPERATIONS = {
  "install-react": {
    id: "install-react",
    kind: "install",
    label: "Install the React library and tokens",
    packages: [PACKAGES.ui, PACKAGES.tokens],
    caveats: { yarn: YARN_NEEDS_REACT_IS },
    cwd: "project-root",
  },
  "install-tokens": {
    id: "install-tokens",
    kind: "install",
    label: "Install the design tokens",
    packages: [PACKAGES.tokens],
    cwd: "project-root",
  },
  "install-angular": {
    id: "install-angular",
    kind: "install",
    label: "Install the Angular library and tokens",
    packages: [PACKAGES.angular, PACKAGES.tokens],
    cwd: "project-root",
  },
  "install-iot": {
    id: "install-iot",
    kind: "install",
    label: "Install the IoT package",
    packages: [PACKAGES.iot],
    cwd: "project-root",
  },
  "install-iot-react": {
    id: "install-iot-react",
    kind: "install",
    label: "Install the IoT package and React, for the primitives",
    // the functions need no React; the primitives do, and /docs/iot documents both routes
    packages: [PACKAGES.iot, "react"],
    cwd: "project-root",
  },
  "install-tailwind": {
    id: "install-tailwind",
    kind: "install-dev",
    label: "Install Tailwind CSS 3 build tools",
    packages: ["tailwindcss@3", "postcss", "autoprefixer"],
    cwd: "project-root",
  },
  "cli-init": {
    id: "cli-init",
    kind: "execute",
    label: "Set up kinetixui.json and write the token contract",
    executePackage: CLI,
    args: ["init"],
    cwd: "project-root",
    minNode: "18",
  },
  "cli-add": {
    id: "cli-add",
    kind: "execute",
    label: "Add components to your project",
    executePackage: CLI,
    args: ["add"],
    parameter: "components",
    cwd: "project-root",
    minNode: "18",
  },
  "cli-add-all": {
    id: "cli-add-all",
    kind: "execute",
    label: "Add every component in the registry",
    executePackage: CLI,
    args: ["add", "--all"],
    cwd: "project-root",
    minNode: "18",
  },
  "cli-list": {
    id: "cli-list",
    kind: "execute",
    label: "List every component in the registry",
    executePackage: CLI,
    args: ["list"],
    cwd: "project-root",
    minNode: "18",
  },
  "cli-inspect": {
    id: "cli-inspect",
    kind: "execute",
    label: "Show what the registry knows about one component",
    executePackage: CLI,
    args: ["inspect"],
    parameter: "component",
    cwd: "project-root",
    minNode: "18",
  },
  "cli-parity": {
    id: "cli-parity",
    kind: "execute",
    label: "Show which platforms carry each component",
    executePackage: CLI,
    args: ["parity"],
    // `parity` declares `[components...]` — "omit for the full matrix" — so names must reach the command
    // when the page supplies them, and the bare form stays a complete command when it does not.
    parameter: "components",
    parameterOptional: true,
    cwd: "project-root",
    minNode: "18",
  },
  "cli-doctor": {
    id: "cli-doctor",
    kind: "execute",
    label: "Check kinetixui.json and the registry connection",
    executePackage: CLI,
    args: ["doctor"],
    cwd: "project-root",
    minNode: "18",
  },
  "cli-lint": {
    id: "cli-lint",
    kind: "execute",
    label: "Scan for hardcoded colors and spacing",
    executePackage: CLI,
    args: ["lint"],
    // `lint` declares `[path]` — with none it scans the aliases from kinetixui.json, so the bare command
    // is complete rather than a placeholder.
    parameter: "path",
    parameterOptional: true,
    cwd: "project-root",
    minNode: "18",
  },
  "cli-theme-create": {
    id: "cli-theme-create",
    kind: "execute",
    label: "Scaffold a local token override",
    executePackage: CLI,
    args: ["theme", "create"],
    parameter: "theme",
    cwd: "project-root",
    minNode: "18",
  },
  "cli-theme-build": {
    id: "cli-theme-build",
    kind: "execute",
    label: "Compile a local token override to CSS",
    executePackage: CLI,
    args: ["theme", "build"],
    parameter: "theme",
    cwd: "project-root",
    minNode: "18",
  },
  "cli-preset-decode": {
    id: "cli-preset-decode",
    kind: "execute",
    label: "Show what a Kinetix Create preset contains",
    executePackage: CLI,
    args: ["preset", "decode"],
    parameter: "preset",
    cwd: "project-root",
    minNode: "18",
  },
  "cli-preset-css": {
    id: "cli-preset-css",
    kind: "execute",
    label: "Resolve a preset into a web CSS override block",
    executePackage: CLI,
    args: ["preset", "css"],
    parameter: "preset",
    flags: ["output"],
    cwd: "project-root",
    minNode: "18",
  },
  "cli-preset-swiftui": {
    id: "cli-preset-swiftui",
    kind: "execute",
    label: "Resolve a preset into a SwiftUI theme file",
    executePackage: CLI,
    args: ["preset", "swiftui"],
    parameter: "preset",
    flags: ["symbol", "output"],
    cwd: "project-root",
    minNode: "18",
  },
  "cli-preset-compose": {
    id: "cli-preset-compose",
    kind: "execute",
    label: "Resolve a preset into a Jetpack Compose theme file",
    executePackage: CLI,
    args: ["preset", "compose"],
    parameter: "preset",
    flags: ["symbol", "output"],
    cwd: "project-root",
    minNode: "18",
  },
  "cli-preset-flutter": {
    id: "cli-preset-flutter",
    kind: "execute",
    label: "Resolve a preset into a Flutter theme file",
    executePackage: CLI,
    args: ["preset", "flutter"],
    parameter: "preset",
    flags: ["symbol", "output"],
    cwd: "project-root",
    minNode: "18",
  },
  "cli-preset-url": {
    id: "cli-preset-url",
    kind: "execute",
    label: "Print the share URL for a preset",
    executePackage: CLI,
    args: ["preset", "url"],
    parameter: "preset",
    cwd: "project-root",
    minNode: "18",
  },
  "run-dev": {
    id: "run-dev",
    kind: "run",
    label: "Start your app's development server",
    script: "dev",
    cwd: "project-root",
  },
} as const satisfies Record<string, Omit<Operation, "id"> & { id: string }>;

export type OperationId = keyof typeof OPERATIONS;

export const OPERATION_IDS = Object.keys(OPERATIONS) as OperationId[];

/* ------------------------------------------------------------------ validation */

/** The CLI's own charset for a registry item name (`assertComponentName`). */
const NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
/** The CLI's own dependency-spec guard (`assertPackageSpec`): `[@scope/]name[@range]`, nothing else. */
const PKG_SPEC = /^(?:@[a-z0-9-~][a-z0-9._-]*\/)?[a-z0-9-~][a-z0-9._-]*(?:@[a-z0-9.^~*x><=|.-]+)?$/i;
/** A relative path with no shell metacharacters and no walk above the project. */
const PATH = /^[a-z0-9._/-]+$/i;
/** A Kinetix Create preset code, as `@kinetixui/create-preset` emits it. */
const PRESET = /^KX1_[A-Za-z0-9_-]+$/;
/** A generated type name: a Swift enum, a Kotlin object or a Dart class. */
const SYMBOL = /^[A-Za-z_][A-Za-z0-9_]*$/;

function reject(what: string, value: unknown): never {
  throw new Error(`Refusing to render a command with an invalid ${what}: ${JSON.stringify(value)}`);
}

function assertSpec(spec: string): string {
  if (typeof spec !== "string" || spec.startsWith("-") || !PKG_SPEC.test(spec)) reject("package spec", spec);
  return spec;
}

function assertName(name: string, what: string): string {
  if (typeof name !== "string" || !NAME.test(name)) reject(what, name);
  return name;
}

function assertPath(p: string): string {
  if (typeof p !== "string" || !PATH.test(p) || p.split("/").includes("..")) reject("path", p);
  return p;
}

function assertSymbol(name: string): string {
  if (typeof name !== "string" || !SYMBOL.test(name)) reject("symbol name", name);
  return name;
}

function assertPreset(code: string): string {
  if (typeof code !== "string" || !PRESET.test(code)) reject("preset code", code);
  return code;
}

/* ------------------------------------------------------------------ syntax */

/**
 * How each manager spells each kind. Kept as data so the table itself is the thing a test reads, and so a
 * reviewer can see all sixteen cells at once rather than inferring them from branches.
 *
 * `yarn dlx` is Berry (Yarn 2+) only; Classic has no `dlx` at all. That is why `execute` carries a caveat for
 * yarn and nothing else does.
 */
const SYNTAX: Record<OperationKind, Record<PackageManager, readonly string[]>> = {
  install: {
    npm: ["npm", "install"],
    pnpm: ["pnpm", "add"],
    yarn: ["yarn", "add"],
    bun: ["bun", "add"],
  },
  "install-dev": {
    npm: ["npm", "install", "-D"],
    pnpm: ["pnpm", "add", "-D"],
    yarn: ["yarn", "add", "-D"],
    bun: ["bun", "add", "-d"],
  },
  execute: {
    npm: ["npx"],
    pnpm: ["pnpm", "dlx"],
    yarn: ["yarn", "dlx"],
    bun: ["bunx"],
  },
  run: {
    npm: ["npm", "run"],
    pnpm: ["pnpm", "run"],
    yarn: ["yarn", "run"],
    bun: ["bun", "run"],
  },
};

/**
 * Yarn Classic (1.x) is still the yarn a great many machines have, because `npm i -g yarn` installs it. It
 * has no `dlx`. The command shown is Berry's, because that is what "yarn" means on a project created today,
 * and this sentence is shown beside it rather than left for the reader to discover from a failure.
 */
const YARN_CLASSIC_EXECUTE_CAVEAT =
  "yarn dlx needs Yarn 2 or newer. On Yarn Classic (1.x) there is no dlx — use the npm command above, which does not require npm to be your project's package manager.";

/* ------------------------------------------------------------------ rendering */

export interface RenderParams {
  /** `cli-add` / `cli-parity`: one or more component slugs. */
  components?: readonly string[];
  /** `cli-inspect`: one component slug. */
  component?: string;
  /** `cli-theme-create` / `cli-theme-build`: a theme name. */
  theme?: string;
  /** `cli-preset-*`: a `KX1_…` code. */
  preset?: string;
  /** `cli-lint`: a directory to scan. */
  path?: string;
  /** `cli-preset-{swiftui,compose,flutter}`: the type name to generate (`-n`). */
  symbol?: string;
  /** `cli-preset-{css,swiftui,compose,flutter}`: write to this file instead of stdout (`-o`). */
  output?: string;
}

export interface RenderedCommand {
  readonly id: OperationId;
  readonly pm: PackageManager;
  /** The argv the command is, before joining. Tests assert ordering on this rather than on the string. */
  readonly tokens: readonly string[];
  /** What the reader copies. */
  readonly command: string;
  /** True when a required parameter was not supplied and the command carries a `<placeholder>`. */
  readonly placeholder: boolean;
  /** Limitations of this manager for this operation. Shown; never swallowed. */
  readonly caveats: readonly string[];
}

const PLACEHOLDER: Record<ParameterKind, string> = {
  components: "<component…>",
  component: "<component>",
  theme: "<theme>",
  preset: "<KX1_…>",
  path: "<path>",
};

/** The parameter tokens for an operation, validated — or the labelled placeholder when none was supplied. */
function parameterTokens(op: Operation, params: RenderParams): { tokens: string[]; placeholder: boolean } {
  switch (op.parameter) {
    case undefined:
      return { tokens: [], placeholder: false };
    case "components": {
      const list = params.components ?? [];
      if (list.length === 0) {
        return op.parameterOptional
          ? { tokens: [], placeholder: false }
          : { tokens: [PLACEHOLDER.components], placeholder: true };
      }
      return { tokens: list.map((c) => assertName(c, "component name")), placeholder: false };
    }
    case "component":
      return params.component
        ? { tokens: [assertName(params.component, "component name")], placeholder: false }
        : { tokens: [PLACEHOLDER.component], placeholder: true };
    case "theme":
      return params.theme
        ? { tokens: [assertName(params.theme, "theme name")], placeholder: false }
        : { tokens: [PLACEHOLDER.theme], placeholder: true };
    case "preset":
      return params.preset
        ? { tokens: [assertPreset(params.preset)], placeholder: false }
        : { tokens: [PLACEHOLDER.preset], placeholder: true };
    case "path":
      if (params.path) return { tokens: [assertPath(params.path)], placeholder: false };
      return op.parameterOptional
        ? { tokens: [], placeholder: false }
        : { tokens: [PLACEHOLDER.path], placeholder: true };
  }
}

/**
 * Refuse a parameter the operation does not take, rather than dropping it.
 *
 * This is the root cause of a defect Codex caught on this PR's first commit: `/docs/cli` passed
 * `components={["button","card","kanban-board"]}` to `cli-parity`, the operation declared no parameter,
 * and the names were silently discarded — so the page rendered `npx @kinetixui/cli parity`, which prints
 * the entire matrix, under prose promising three components. Every other gate passed: the operation id was
 * real, the component names were real, the command was valid. A command can be valid and still not be the
 * command the page is describing, and silence is what let that through.
 *
 * Throwing makes it a build failure instead, which is the right time to find it.
 */
function assertParamsAccepted(op: Operation, params: RenderParams): void {
  const accepted = new Set<keyof RenderParams>([...(op.parameter ? [op.parameter] : []), ...(op.flags ?? [])]);
  const supplied = (Object.keys(params) as (keyof RenderParams)[]).filter((key) => params[key] !== undefined);
  const extra = supplied.filter((key) => !accepted.has(key));
  if (extra.length > 0) {
    throw new Error(
      `${op.id} does not take ${extra.join(", ")}. It takes ${
        accepted.size > 0 ? [...accepted].join(", ") : "no parameters"
      }. Passing one it does not take would silently drop it from the command.`,
    );
  }
}

/** The flag tokens an operation was given, validated. A flag the operation does not declare is ignored. */
function flagTokens(op: Operation, params: RenderParams): string[] {
  const tokens: string[] = [];
  for (const flag of op.flags ?? []) {
    if (flag === "symbol" && params.symbol) tokens.push("-n", assertSymbol(params.symbol));
    if (flag === "output" && params.output) tokens.push("-o", assertPath(params.output));
  }
  return tokens;
}

/**
 * The command for one operation under one package manager.
 *
 * Throws rather than returning something unusable when a supplied parameter is not a value the CLI would
 * accept. A docs page passing a bad component name is a build-time failure, which is the right time to find it.
 */
export function renderCommand(id: OperationId, pm: PackageManager, params: RenderParams = {}): RenderedCommand {
  const op = OPERATIONS[id] as Operation;
  assertParamsAccepted(op, params);
  const prefix = SYNTAX[op.kind][pm];

  let tokens: string[];
  let placeholder = false;
  const caveats: string[] = [];

  if (op.kind === "install" || op.kind === "install-dev") {
    tokens = [...prefix, ...(op.packages ?? []).map(assertSpec)];
  } else if (op.kind === "run") {
    tokens = [...prefix, assertName(op.script!, "script name")];
  } else {
    const param = parameterTokens(op, params);
    placeholder = param.placeholder;
    tokens = [...prefix, assertSpec(op.executePackage!), ...(op.args ?? []), ...param.tokens, ...flagTokens(op, params)];
    if (pm === "yarn") caveats.push(YARN_CLASSIC_EXECUTE_CAVEAT);
  }

  const declared = op.caveats?.[pm];
  if (declared) caveats.push(declared);

  return { id, pm, tokens, command: tokens.join(" "), placeholder, caveats };
}

/** The same operation across all four managers, in selector order. */
export function renderAll(id: OperationId, params: RenderParams = {}): Record<PackageManager, RenderedCommand> {
  return Object.fromEntries(PACKAGE_MANAGERS.map((pm) => [pm, renderCommand(id, pm, params)])) as Record<
    PackageManager,
    RenderedCommand
  >;
}
