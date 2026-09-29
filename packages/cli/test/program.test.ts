import { describe, expect, it } from "vitest";
import { createProgram } from "../src/program.js";
import { DEFAULT_REGISTRY } from "../src/lib/config.js";
import pkg from "../package.json" with { type: "json" };

/**
 * Parsing, checked without running anything.
 *
 * `createProgram()` exists for this: the tree used to be built at module scope in `index.ts`, which ends in
 * `parseAsync()`, so there was no way to look at the parser without invoking the CLI. Every assertion here
 * inspects the built tree or parses with `exitOverride`, so no action handler ever fires.
 */
const silence = { writeOut: () => {}, writeErr: () => {} };

const program = () => {
  const p = createProgram();
  // Commander applies neither exitOverride nor configureOutput to subcommands, so both are set on every
  // command in the tree — otherwise a parse-failure test exits the worker or prints to the suite's stderr.
  const all = (c: ReturnType<typeof createProgram>): void => {
    c.exitOverride();
    c.configureOutput(silence);
    for (const child of c.commands) all(child as ReturnType<typeof createProgram>);
  };
  all(p);
  return p;
};

const commandNames = () => program().commands.map((c) => c.name());

describe("the command tree", () => {
  it("registers every documented command", () => {
    expect(commandNames().sort()).toEqual(
      ["add", "doctor", "init", "inspect", "lint", "list", "parity", "preset", "theme"].sort(),
    );
  });

  it("reports the package's own version, so --version cannot drift", () => {
    expect(program().version()).toBe(pkg.version);
  });

  it("is named kinetixui, which is what the bin field installs", () => {
    expect(program().name()).toBe("kinetixui");
  });

  it("gives every command a description, because --help is the only docs some people read", () => {
    for (const command of program().commands) {
      expect(command.description(), `${command.name()} has no description`).toBeTruthy();
    }
  });
});

describe("the registry option", () => {
  const withRegistry = ["init", "add", "list", "inspect"];

  it.each(withRegistry)("%s accepts -r / --registry", (name) => {
    const command = program().commands.find((c) => c.name() === name)!;
    const flags = command.options.map((o) => o.flags);
    expect(flags).toContain("-r, --registry <url>");
  });

  it.each(withRegistry)("%s defaults to the hosted registry", (name) => {
    const command = program().commands.find((c) => c.name() === name)!;
    const option = command.options.find((o) => o.long === "--registry")!;
    expect(option.defaultValue).toBe(DEFAULT_REGISTRY);
  });

  it("uses https for the default, so a plain-http registry is never the out-of-the-box behaviour", () => {
    expect(DEFAULT_REGISTRY.startsWith("https://")).toBe(true);
  });
});

describe("add's own options", () => {
  const add = () => program().commands.find((c) => c.name() === "add")!;

  it("takes a variadic list of components", () => {
    expect(add().registeredArguments.map((a) => a.name())).toEqual(["components"]);
    expect(add().registeredArguments[0]!.variadic).toBe(true);
    expect(add().registeredArguments[0]!.required).toBe(false);
  });

  it("has --overwrite and --all, both defaulting to off", () => {
    for (const long of ["--overwrite", "--all"]) {
      const option = add().options.find((o) => o.long === long)!;
      expect(option, `add is missing ${long}`).toBeTruthy();
      expect(option.defaultValue).toBe(false);
    }
  });
});

describe("parsing arguments", () => {
  it("rejects an unknown command rather than doing something surprising", () => {
    expect(() => program().parse(["definitely-not-a-command"], { from: "user" })).toThrow();
  });

  it("rejects an unknown option on a known command", () => {
    expect(() => program().parse(["add", "button", "--nope"], { from: "user" })).toThrow();
  });

  it("rejects --registry with no value", () => {
    expect(() => program().parse(["add", "button", "--registry"], { from: "user" })).toThrow();
  });

  it("exposes nested subcommands for theme and preset", () => {
    const names = (parent: string) =>
      program().commands.find((c) => c.name() === parent)!.commands.map((c) => c.name()).sort();
    expect(names("theme")).toEqual(["build", "create"]);
    expect(names("preset")).toEqual(["compose", "css", "decode", "flutter", "swiftui", "url"]);
  });
});
