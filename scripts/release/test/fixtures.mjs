/** Synthetic workspaces. Small enough to read in the test that uses them. */

/** The real shape: a `core` cohort that releases in lockstep, and nothing else. */
export const ALLOWLIST_FILE = {
  registry: "https://registry.npmjs.org/",
  releaseGroups: { core: { sameVersion: true } },
  packages: [
    { name: "@kinetixui/tokens", releaseGroup: "core", directory: "packages/tokens", build: ["build:tokens"], requireFiles: [] },
    { name: "@kinetixui/ui", releaseGroup: "core", directory: "packages/ui", build: ["build:ui"], requireFiles: [] },
    { name: "@kinetixui/cli", releaseGroup: "core", directory: "packages/cli", build: ["build:cli"], requireFiles: [] },
  ],
};

/** Two cohorts: `core` in lockstep, `angular` on its own lifecycle and its own artifact. */
export const TWO_COHORT_ALLOWLIST = {
  registry: "https://registry.npmjs.org/",
  releaseGroups: { core: { sameVersion: true }, angular: { sameVersion: true } },
  packages: [
    ...ALLOWLIST_FILE.packages,
    {
      name: "@kinetixui/angular",
      releaseGroup: "angular",
      directory: "packages/ui-angular",
      artifactDirectory: "packages/ui-angular/dist",
      build: ["build:angular"],
      // A package packing from a generated artifact has no `files` to constrain it, so the
      // allowlist must say what that artifact has to contain.
      requireFiles: ["styles.css", "fesm2022/kinetixui-angular.mjs"],
    },
  ],
};

export const ROOT_SCRIPTS = ["build:tokens", "build:ui", "build:cli", "build:angular"];

/** A manifest that satisfies the whole publication contract, before the overrides are applied. */
export function publishable(name, directory, overrides = {}, version = "0.24.0") {
  return {
    name,
    version,
    directory,
    manifest: {
      name,
      version,
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

/** The three published packages, all well-formed and on one version. */
export function healthyWorkspace(version = "0.24.0") {
  return [
    publishable("@kinetixui/cli", "packages/cli", { bin: { kinetixui: "./dist/index.js" } }, version),
    publishable("@kinetixui/tokens", "packages/tokens", {}, version),
    publishable("@kinetixui/ui", "packages/ui", {}, version),
    privatePackage("@kinetixui/web", "apps/web", "0.1.0"),
  ];
}

/** `core` at one version, `angular` independently at another — the shape Strategy B produces. */
export function twoCohortWorkspace({ core = "0.23.0", angular = "0.24.0" } = {}) {
  return [...healthyWorkspace(core), publishable("@kinetixui/angular", "packages/ui-angular", {}, angular)];
}

export function registryStates(entries) {
  return new Map(Object.entries(entries).map(([name, state]) => [name, { state, detail: state }]));
}
