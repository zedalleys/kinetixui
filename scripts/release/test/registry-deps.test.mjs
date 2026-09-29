/**
 * A registry item must declare every npm package the files it delivers import.
 *
 * The defect: dependencies were matched against a hand-written list of names, over the component file only,
 * while `lib/utils.ts` was attached to the same item unscanned. 91 of 97 items shipped a file importing
 * `clsx` and `tailwind-merge` without declaring either, so `add card` exited 0 and left a project that
 * could not build. Nothing caught it because nothing compared the declaration against the *delivered set*.
 *
 * These tests are about that architecture, not about `card`. The real-registry assertions are derived from
 * the payloads, so they keep holding as components are added; the fixture assertions prove the auditor
 * actually detects the two ways the invariant can break, without mutating anything real.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { auditServedRegistry, auditSourceParity, npmImportsOf, packageOf, RUNTIME_PROVIDED } from "../../check-registry-deps.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));

describe("the served registry declares what it imports", () => {
  const audit = auditServedRegistry();

  it("has items to check, so nothing below passes vacuously", () => {
    assert.ok(audit.items.length > 50, `expected the full catalogue, got ${audit.items.length} items`);
  });

  it("reports no problems at all", () => {
    assert.deepEqual(audit.problems, [], `registry dependency problems:\n  ${audit.problems.join("\n  ")}`);
  });

  it("agrees with registry/registry.json, so the served output is not stale", () => {
    assert.deepEqual(auditSourceParity(), []);
  });

  /**
   * The specific class of file that caused this, expressed as a rule rather than a list: whatever an item
   * delivers alongside the component, its imports are declared too.
   */
  it("declares the dependencies of every auxiliary file, not just the component", () => {
    const auxiliary = audit.items.filter((i) => i.targets.length > 1);
    assert.ok(auxiliary.length > 0, "no item delivers more than one file — this rule would test nothing");
    for (const item of auxiliary) {
      const undeclared = item.required.filter((p) => !item.declared.includes(p));
      assert.deepEqual(undeclared, [], `${item.name} delivers ${item.targets.join(", ")} but omits ${undeclared.join(", ")}`);
    }
  });

  it("never declares a package nothing it delivers imports", () => {
    for (const item of audit.items) {
      const unused = item.declared.filter((p) => !item.required.includes(p));
      assert.deepEqual(unused, [], `${item.name} declares unused ${unused.join(", ")}`);
    }
  });
});

describe("the auditor detects both ways the invariant breaks", () => {
  /** A minimal served-registry shape in memory, written to a temp dir by the helper below. */
  const fixture = (deps, extraFileContent) => ({
    "registry.json": { items: [{ name: "widget", type: "registry:ui" }] },
    "widget.json": {
      name: "widget",
      type: "registry:ui",
      dependencies: deps,
      files: [
        { target: "components/ui/widget.tsx", content: 'import * as React from "react";\nimport { cva } from "class-variance-authority";\n' },
        ...(extraFileContent ? [{ target: "lib/utils.ts", content: extraFileContent }] : []),
      ],
    },
  });

  const writeFixture = (files) => {
    const dir = mkdtempSync(path.join(tmpdir(), "kx-regdeps-"));
    for (const [name, value] of Object.entries(files)) writeFileSync(path.join(dir, name), JSON.stringify(value));
    return dir;
  };

  it("fails when a delivered file imports something undeclared", () => {
    const dir = writeFixture(fixture(["class-variance-authority"], 'import { clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\n'));
    const { problems } = auditServedRegistry(dir);
    assert.equal(problems.length, 1, `expected one problem, got: ${problems.join(" | ")}`);
    assert.match(problems[0], /clsx, tailwind-merge/);
    assert.match(problems[0], /would not be able to build/);
  });

  it("passes the same fixture once the imports are declared", () => {
    const dir = writeFixture(
      fixture(["class-variance-authority", "clsx", "tailwind-merge"], 'import { clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\n'),
    );
    assert.deepEqual(auditServedRegistry(dir).problems, []);
  });

  it("fails when a package is declared that nothing imports", () => {
    const dir = writeFixture(fixture(["class-variance-authority", "left-over-package"], null));
    const { problems } = auditServedRegistry(dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /left-over-package/);
    assert.match(problems[0], /hand-edited/);
  });

  it("does not ask a consumer to install react", () => {
    const dir = writeFixture(fixture(["class-variance-authority"], null));
    assert.deepEqual(auditServedRegistry(dir).problems, [], "react and react-dom must never be required");
  });
});

describe("import extraction", () => {
  it("reduces a subpath import to the installable package name", () => {
    assert.equal(packageOf("@radix-ui/react-slot"), "@radix-ui/react-slot");
    assert.equal(packageOf("date-fns/locale/en-US"), "date-fns");
    assert.equal(packageOf("@scope/pkg/deep/path"), "@scope/pkg");
    assert.equal(packageOf("lucide-react"), "lucide-react");
  });

  it("ignores relative, consumer-alias and builtin specifiers", () => {
    const code = [
      'import { a } from "./sibling";',
      'import { b } from "../lib/utils";',
      'import { cn } from "@/lib/utils";',
      'import { readFileSync } from "node:fs";',
      'import { real } from "a-real-package";',
    ].join("\n");
    assert.deepEqual([...npmImportsOf(code)], ["a-real-package"]);
  });

  it("catches type-only and side-effect imports, which still have to resolve", () => {
    assert.deepEqual([...npmImportsOf('import type { T } from "types-pkg";')], ["types-pkg"]);
    assert.deepEqual([...npmImportsOf('import "styles-pkg/dist/x.css";')], ["styles-pkg"]);
  });

  /** The checker must never be more permissive than the writer, or it stops being a check. */
  it("shares its exclusion set with the generator", () => {
    const generator = readFileSync(path.join(root, "scripts/gen-registry.mjs"), "utf8");
    const declared = /const RUNTIME_PROVIDED = new Set\(\[([^\]]*)\]\)/.exec(generator);
    assert.ok(declared, "gen-registry.mjs no longer declares RUNTIME_PROVIDED — the two have diverged");
    const fromGenerator = declared[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    assert.deepEqual(fromGenerator.sort(), [...RUNTIME_PROVIDED].sort());
  });

  it("no longer matches dependencies against a hand-written package list", () => {
    const generator = readFileSync(path.join(root, "scripts/gen-registry.mjs"), "utf8");
    assert.ok(
      !/class-variance-authority\|clsx\|tailwind-merge/.test(generator),
      "gen-registry.mjs has a hand-written dependency allowlist again. A list cannot fail; it can only be " +
        "incomplete, which is how clsx and tailwind-merge went undeclared on 91 items.",
    );
  });
});
