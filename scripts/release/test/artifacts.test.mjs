import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gzipSync } from "node:zlib";
import { validatePackedArtifact } from "../artifacts.mjs";
import { describePackage, readTarball } from "../tar.mjs";

const includes = (haystack, needle, label = "") =>
  assert.ok(haystack.includes(needle), `${label}expected to find ${JSON.stringify(needle)} in:\n${haystack}`);

const manifest = {
  name: "@kinetixui/ui",
  version: "0.24.0",
  license: "MIT",
  files: ["dist"],
  exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } },
  publishConfig: { access: "public", provenance: true },
  dependencies: { "@kinetixui/tokens": "0.24.0" },
};

const artifact = (overrides = {}) => ({
  name: "@kinetixui/ui",
  version: "0.24.0",
  requireFiles: [],
  paths: ["dist/index.d.ts", "dist/index.js", "package.json"],
  manifest,
  ...overrides,
});
const errorsFor = (overrides) => validatePackedArtifact(artifact(overrides)).join("\n");

describe("a packed tarball", () => {
  it("passes when everything it declares is inside it", () => {
    assert.deepEqual(validatePackedArtifact(artifact()), []);
  });

  it("fails when a declared export is missing, which a source-tree check would not catch", () => {
    includes(errorsFor({ paths: ["dist/index.d.ts", "package.json"] }), 'exports["."].import points at "dist/index.js", which is not in the tarball');
  });

  it("fails when a declared bin is missing", () => {
    const errors = errorsFor({
      name: "@kinetixui/cli",
      manifest: { ...manifest, name: "@kinetixui/cli", bin: { kinetixui: "./dist/index.js" }, exports: undefined },
      paths: ["package.json"],
    });
    includes(errors, 'bin.kinetixui points at "dist/index.js"');
  });

  it("fails when the allowlist requires a file the tarball does not have", () => {
    includes(errorsFor({ requireFiles: ["dist/web/globals.css"] }), 'requires "dist/web/globals.css"');
  });

  /**
   * The source manifest legitimately says `workspace:*` — pnpm rewrites it while packing. Only the
   * packed form can tell whether that rewrite happened, and an unrewritten spec is unresolvable
   * for anyone installing from npm.
   */
  it("fails when a workspace protocol survives into the packed manifest", () => {
    for (const spec of ["workspace:*", "workspace:^", "workspace:~", "workspace:0.24.0"]) {
      const errors = errorsFor({ manifest: { ...manifest, dependencies: { "@kinetixui/tokens": spec } } });
      includes(errors, "The workspace protocol did not get rewritten", `${spec}: `);
    }
  });

  it("checks peer and optional dependencies too", () => {
    includes(errorsFor({ manifest: { ...manifest, peerDependencies: { "@kinetixui/tokens": "workspace:*" } } }), "peerDependencies.@kinetixui/tokens");
    includes(errorsFor({ manifest: { ...manifest, optionalDependencies: { "@kinetixui/tokens": "workspace:*" } } }), "optionalDependencies.@kinetixui/tokens");
  });

  it("fails when the tarball's own name or version is not the one being released", () => {
    includes(errorsFor({ version: "0.25.0" }), 'is version "0.24.0", expected 0.25.0');
    includes(errorsFor({ name: "@kinetixui/tokens" }), "calls itself");
  });

  it("fails when the packed manifest lost its public access", () => {
    const errors = errorsFor({ manifest: { ...manifest, publishConfig: { provenance: true } } });
    includes(errors, "restricted");
  });

  it("fails when the packed manifest is private or unreadable", () => {
    includes(errorsFor({ manifest: { ...manifest, private: true } }), '"private": true');
    assert.deepEqual(validatePackedArtifact(artifact({ manifest: null, manifestError: "tarball contains no package/package.json" })), [
      "@kinetixui/ui: tarball contains no package/package.json",
    ]);
  });

  it("fails on an empty tarball", () => {
    includes(errorsFor({ paths: [], manifest: { ...manifest, exports: undefined } }), "tarball is empty");
  });
});

/** A tar writer, so the reader is exercised against real bytes rather than a mock. */
const pad = (data) => Buffer.concat([data, Buffer.alloc((512 - (data.length % 512)) % 512)]);

function paxRecord(key, value) {
  const withoutDigits = Buffer.byteLength(key) + Buffer.byteLength(value) + 3; // " " "=" "\n"
  let total = withoutDigits + String(withoutDigits).length;
  if (String(total).length !== String(withoutDigits).length) total = withoutDigits + String(total).length;
  return `${total} ${key}=${value}\n`;
}

function tar(files) {
  const blocks = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, "utf8");
    const header = Buffer.alloc(512);
    if (Buffer.byteLength(name) > 100) {
      // A PAX extended header carrying the real path, exactly as npm emits for deep paths.
      const paxData = Buffer.from(paxRecord("path", name), "utf8");
      const paxHeader = Buffer.alloc(512);
      paxHeader.write("PaxHeader", 0);
      paxHeader.write(`${paxData.length.toString(8).padStart(11, "0")}\0`, 124);
      paxHeader.write("x", 156);
      blocks.push(paxHeader, pad(paxData));
      header.write("PaxHeader/truncated-name", 0);
    } else {
      header.write(name, 0);
    }
    header.write(`${data.length.toString(8).padStart(11, "0")}\0`, 124);
    header.write("0", 156);
    blocks.push(header, pad(data));
  }
  blocks.push(Buffer.alloc(1024)); // end of archive
  return gzipSync(Buffer.concat(blocks));
}

describe("reading a tarball", () => {
  it("returns the files under package/ with the prefix stripped, and parses the manifest", () => {
    const bytes = tar({
      "package/package.json": JSON.stringify({ name: "@kinetixui/ui", version: "0.24.0" }),
      "package/dist/index.js": "export const a = 1;",
    });
    const { paths, manifest: packed, manifestError } = describePackage(readTarball(bytes));
    assert.equal(manifestError, null);
    assert.equal(packed.name, "@kinetixui/ui");
    assert.deepEqual(paths, ["dist/index.js", "package.json"]);
  });

  it("reads a PAX long path, which @kinetixui/ui's deep source paths need", () => {
    const deep = `package/src/components/${"a".repeat(90)}/very-deeply-nested-component.tsx`;
    const { paths } = describePackage(readTarball(tar({ "package/package.json": "{}", [deep]: "x" })));
    assert.ok(paths.includes(deep.slice("package/".length)), `expected the long path, got ${JSON.stringify(paths)}`);
  });

  it("reports a tarball with no manifest rather than throwing", () => {
    const { manifest: packed, manifestError } = describePackage(readTarball(tar({ "package/dist/index.js": "x" })));
    assert.equal(packed, null);
    includes(manifestError, "no package/package.json");
  });

  it("reports an unparseable manifest rather than throwing", () => {
    const { manifestError } = describePackage(readTarball(tar({ "package/package.json": "{ not json" })));
    includes(manifestError, "not valid JSON");
  });
});
