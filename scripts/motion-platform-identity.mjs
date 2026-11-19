import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";

// The published implementation roots are independent of the editable motion contract.
const sources = new Map([
  ["react", /^(?:packages\/ui\/src\/.+\.tsx?|packages\/ui\/tailwind\.config\.ts)$/],
  ["angular", /^packages\/ui-angular\/src\/.+\.(?:ts|css)$/],
  ["swiftui", /^packages\/ui-swiftui\/Sources\/KinetixUI\/.+\.swift$/],
  ["compose", /^packages\/ui-compose\/ui\/src\/main\/kotlin\/.+\.kt$/],
  ["flutter", /^packages\/ui-flutter\/lib\/.+\.dart$/],
]);

// Evidence is role-wide in motion.json. Bind each existing probe to its reviewed roles and
// platforms here, including shared runners outside package roots and the in-flight selection probes.
const evidence = new Map([
  ["scripts/motion.mjs", { react: ["selection-control", "disclosure", "selection-state", "selection-indicator"] }],
  ["apps/web/src/lib/motion-contract.test.ts", { react: ["selection-control", "disclosure", "overlay"] }],
  ["scripts/switch-motion.mjs", { react: ["selection-control"] }],
  ["packages/ui/src/switch-motion.test.tsx", { react: ["selection-control"] }],
  ["scripts/toggle-motion.mjs", { react: ["selection-state", "press-feedback"] }],
  ["packages/ui/src/toggle-motion.test.tsx", { react: ["selection-state", "press-feedback"] }],
  ["scripts/checkbox-radio-motion.mjs", { react: ["selection-state", "press-feedback"] }],
  ["packages/ui/src/checkbox-radio-motion.test.tsx", { react: ["selection-state", "press-feedback"] }],
  ["scripts/angular-selection-motion.mjs", { angular: ["selection-control", "selection-state", "press-feedback"] }],
  ["packages/ui-flutter/test/selection_motion_test.dart", { flutter: ["selection-state"] }],
  ["scripts/loop-motion.mjs", { react: ["loop"] }],
  ["scripts/check-registry-motion.mjs", { react: ["loop"] }],
  ["scripts/check-native-motion.mjs", { swiftui: ["loop"], compose: ["loop"], flutter: ["loop"] }],
  ["scripts/angular-selection-glide.mjs", { angular: ["selection-indicator"] }],
  ["packages/ui-flutter/test/selection_indicator_test.dart", { flutter: ["selection-indicator"] }],
  ["packages/ui-swiftui/Tests/KinetixUITests/SelectionIndicatorTests.swift", { swiftui: ["selection-indicator"] }],
  ["packages/ui-swiftui/Acceptance/Selection/measure-selection.py", { swiftui: ["selection-indicator"] }],
  ["packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/SelectionIndicatorTest.kt", { compose: ["selection-indicator"] }],
]);

// Each platform's reviewed selection suite is required. SwiftUI has two complementary
// probes: direction resolver tests and the mounted pixel analyzer.
const selectionEvidence = [...evidence].flatMap(([file, claims]) =>
  Object.entries(claims)
    .filter(([, roles]) => roles.includes("selection-indicator"))
    .map(([platform]) => [platform, file]));

export function selectionEvidenceErrors(role, isFile) {
  const platforms = new Set((role?.consumers ?? []).map(({ platform }) => platform));
  const paths = new Set(role?.evidence ?? []);
  const errors = [];
  for (const platform of new Set(selectionEvidence.map(([platform]) => platform))) {
    if (!platforms.has(platform)) errors.push("selection-indicator: missing required " + platform + " consumer");
  }
  for (const [platform, file] of selectionEvidence) {
    if (!paths.has(file) || !isFile(file)) {
      errors.push("selection-indicator: missing required " + platform + " evidence: " + file);
    }
  }
  return errors;
}

function repoPath(path) {
  return typeof path === "string" && !path.includes("\0") &&
    path.split("/").every((part) => part && part !== "." && part !== ".." && !part.includes("\\"));
}

export function isRepoFile(root, path) {
  if (!repoPath(path)) return false;
  const base = realpathSync(root);
  const filename = resolve(base, path);
  try {
    return realpathSync(filename) === filename && statSync(filename).isFile();
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}

export function consumerIdentityErrors(name, role, { isFile, read }) {
  const errors = [];
  const validPlatforms = new Set();
  const seen = new Set();
  for (const { platform, file, expects, evidence: claimed } of role.consumers ?? []) {
    const label = `${name}: ${platform} consumer "${file}"`;
    const identity = JSON.stringify([platform, file]);
    if (seen.has(identity)) {
      errors.push(`${label} duplicates a consumer identity`);
      continue;
    }
    seen.add(identity);
    if (!sources.has(platform)) {
      errors.push(`${label} uses an unknown implementation platform`);
      continue;
    }
    if (!repoPath(file) || !sources.get(platform).test(file) ||
        /(?:^|\/)__(?:tests|stories)__\/|\.(?:test|spec|stories)\.[^.]+$/.test(file)) {
      errors.push(`${label} is outside that platform's implementation sources`);
      continue;
    }
    if (!isFile(file)) {
      errors.push(`${label}: implementation file does not exist`);
      continue;
    }
    const source = read(file);
    if (!Array.isArray(expects) || expects.length === 0 ||
        expects.some((marker) => typeof marker !== "string" || !marker.trim() || !source.includes(marker))) {
      errors.push(`${label} is missing declared implementation markers`);
      continue;
    }
    validPlatforms.add(platform);
    for (const path of claimed ?? []) {
      if (!isFile(path) || !evidence.get(path)?.[platform]?.includes(name)) {
        errors.push(`${label}: evidence "${path}" is not registered for this role on this platform`);
      }
    }
  }
  for (const path of role.evidence ?? []) {
    if (!isFile(path)) {
      errors.push(`role "${name}" cites evidence ${path}, which does not exist`);
    } else if (![...validPlatforms].some((platform) => evidence.get(path)?.[platform]?.includes(name))) {
      errors.push(`${name}: evidence "${path}" is not registered for this role on a consuming platform`);
    }
  }
  if (name === "selection-indicator") errors.push(...selectionEvidenceErrors(role, isFile));
  return { errors, platforms: [...validPlatforms].sort() };
}
