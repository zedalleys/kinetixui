/** Synthetic workspaces. Small enough to read in the test that uses them. */

export const ALLOWLIST_FILE = {
  registry: "https://registry.npmjs.org/",
  packages: [
    { name: "@kinetixui/tokens", directory: "packages/tokens", build: ["build:tokens"], requireFiles: [] },
    { name: "@kinetixui/ui", directory: "packages/ui", build: ["build:ui"], requireFiles: [] },
    { name: "@kinetixui/cli", directory: "packages/cli", build: ["build:cli"], requireFiles: [] },
  ],
};

export const ROOT_SCRIPTS = ["build:tokens", "build:ui", "build:cli"];

/** A manifest that satisfies the whole publication contract, before the overrides are applied. */
export function publishable(name, directory, overrides = {}) {
  return {
    name,
    version: "0.24.0",
    directory,
    manifest: {
      name,
      version: "0.24.0",
      license: "MIT",
      repository: { type: "git", url: "git+https://github.com/zedalleys/kinetixui.git", directory },
      files: ["dist"],
      exports: { ".": "./dist/index.js" },
      publishConfig: { access: "public", provenance: true },
      ...overrides,
    },
  };
}

export function privatePackage(name, directory, version = "0.24.0") {
  return { name, version, directory, manifest: { name, version, private: true } };
}

/** The three published packages, all well-formed. */
export function healthyWorkspace() {
  return [
    publishable("@kinetixui/cli", "packages/cli", { bin: { kinetixui: "./dist/index.js" } }),
    publishable("@kinetixui/tokens", "packages/tokens"),
    publishable("@kinetixui/ui", "packages/ui"),
    privatePackage("@kinetixui/web", "apps/web", "0.1.0"),
  ];
}

export function registryStates(entries) {
  return new Map(Object.entries(entries).map(([name, state]) => [name, { state, detail: state }]));
}
