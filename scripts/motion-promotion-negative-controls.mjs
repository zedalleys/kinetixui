/**
 * Negative controls for `scripts/check-motion-promotion.mjs`.
 *
 *   node scripts/motion-promotion-negative-controls.mjs
 *
 * Two of these controls exist because the arrangement they describe was measured PASSING on the
 * four-platform selection-indicator reconciliation, with every motion gate in the repository green:
 *
 *   - `selection-indicator`'s `status` changed from `observed` to `proven` — a silent promotion;
 *   - the sentence recording that the promotion rule is TRIGGERED deleted from the role's note.
 *
 * Both are reproduced below as controls that FAILED BEFORE and fail correctly now, which is the only
 * evidence that the register is a fix rather than a file. The two PASS controls matter as much: a
 * gate that refuses an unchanged `observed` role, or that fires on roles the rule does not reach,
 * would be removed within a release and protect nothing.
 *
 * Every control mutates a deep copy IN MEMORY through `promotionErrors`' injected inputs. Nothing on
 * disk is touched, so this is safe to run over a dirty tree and nothing needs restoring.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { isRepoFile } from "./motion-platform-identity.mjs";
import { motionErrors } from "./check-motion-tokens.mjs";
import { CONTRACT, REGISTER, promotionErrors } from "./check-motion-promotion.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const load = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const contract = () => structuredClone(load(CONTRACT));
const register = () => structuredClone(load(REGISTER));

/**
 * The anchors every control below mutates, asserted present before anything runs. Derived from the
 * files rather than written out, so a contract that has moved on makes this suite say so instead of
 * quietly testing nothing — the failure mode that let the silent promotion through in the first place.
 */
const ANCHOR = (() => {
  const c = load(CONTRACT);
  const r = load(REGISTER);
  const platformsOf = (role) => [...new Set((role.consumers ?? []).map((x) => x.platform))];
  const pending = Object.entries(r.decisions).find(([name, d]) => d.state === "pending" && platformsOf(c.roles[name]).length >= 2);
  const approved = Object.entries(r.decisions).find(([, d]) => d.state === "approved");
  const single = Object.entries(c.roles).find(([name, role]) => platformsOf(role).length < 2 && !r.decisions[name]);
  const withEvidence = Object.entries(c.roles).find(([, role]) => (role.evidence ?? []).length > 0);
  const problems = [];
  if (!pending) problems.push(`no role is both consumed by two platforms and recorded as "pending" — the promotion controls have nothing to act on`);
  if (!approved) problems.push(`no decision is recorded as "approved" — the dropped-consumer control has nothing to act on`);
  if (!single) problems.push(`every role is consumed by two or more platforms — the "unrelated role" control cannot be distinguished from the others`);
  if (!withEvidence) problems.push(`no role names any evidence — the invalid-evidence control has nothing to act on`);
  if (problems.length) {
    console.error(problems.map((p) => `  ✗ ${p}`).join("\n"));
    console.error("\nmotion-promotion negative controls cannot run against this tree.");
    process.exit(1);
  }
  return { pending: pending[0], approved: approved[0], single: single[0], withEvidence: withEvidence[0] };
})();

const results = [];
/** `expect` is "fail" when the arrangement must be refused, "pass" when it must be allowed. */
function control(name, expect, mutate) {
  const input = { contract: contract(), register: register() };
  mutate(input);
  const { errors } = promotionErrors(input);
  const got = errors.length > 0 ? "fail" : "pass";
  results.push({ name, expect, got, first: errors[0]?.split("\n")[0] ?? "" });
}

// ─── must FAIL ────────────────────────────────────────────────────────────────────────────────────

control(`unauthorised promotion: ${ANCHOR.pending} observed → proven while its decision is pending`, "fail", ({ contract: c }) => {
  c.roles[ANCHOR.pending].status = "proven";
});

control(`the pending decision for ${ANCHOR.pending} is deleted`, "fail", ({ register: r }) => {
  delete r.decisions[ANCHOR.pending];
});

control(`the whole register is emptied`, "fail", ({ register: r }) => {
  r.decisions = {};
});

control(`a registered consumer is dropped from ${ANCHOR.approved}`, "fail", ({ contract: c }) => {
  const role = c.roles[ANCHOR.approved];
  const platforms = [...new Set(role.consumers.map((x) => x.platform))];
  const doomed = platforms[platforms.length - 1];
  role.consumers = role.consumers.filter((x) => x.platform !== doomed);
});

control(`a consumer is ADDED to ${ANCHOR.approved} without revisiting the decision`, "fail", ({ contract: c }) => {
  c.roles[ANCHOR.approved].consumers.push({ platform: "zzz-new-platform", file: "packages/ui-zzz/x", expects: [] });
});

control(`${ANCHOR.withEvidence} cites an evidence file that does not exist`, "fail", ({ contract: c }) => {
  c.roles[ANCHOR.withEvidence].evidence = [...(c.roles[ANCHOR.withEvidence].evidence ?? []), "packages/ui/src/no-such-evidence.test.tsx"];
});

control(`an approved promotion carries no authority`, "fail", ({ register: r }) => {
  delete r.decisions[ANCHOR.approved].approval.authority;
});

control(`an approved promotion's basis is a restatement rather than a reference`, "fail", ({ register: r }) => {
  r.decisions[ANCHOR.approved].approval.basis = "It is proven.";
});

control(`a pending decision records no review`, "fail", ({ register: r }) => {
  r.decisions[ANCHOR.pending].review = "";
});

control(`the register decides a role the contract does not define`, "fail", ({ register: r }) => {
  r.decisions["no-such-role"] = { state: "pending", platforms: ["react", "angular"], review: "x" };
});

control(`a decision exists for ${ANCHOR.single}, which only one platform consumes`, "fail", ({ register: r }) => {
  r.decisions[ANCHOR.single] = { state: "approved", platforms: ["react"], approval: { authority: "someone", basis: "x".repeat(50) } };
});

control(`${ANCHOR.single} is promoted on its single platform`, "fail", ({ contract: c }) => {
  c.roles[ANCHOR.single].status = "proven";
});

// ─── must PASS ────────────────────────────────────────────────────────────────────────────────────

control(`the tree as it stands`, "pass", () => {});

control(`${ANCHOR.pending} stays observed with its decision pending — the legitimate resting state`, "pass", ({ contract: c, register: r }) => {
  c.roles[ANCHOR.pending].status = "observed";
  r.decisions[ANCHOR.pending].state = "pending";
});

control(`the TRIGGERED sentence is removed from ${ANCHOR.pending}'s note`, "pass", ({ contract: c }) => {
  // Deliberately a PASS. The register, not the prose, is where the decision is kept; a note may be
  // reworded freely. This control is here because the previous draft of this gate matched the
  // sentence, which made a legitimate rewording fail and gave a branch the wrong instruction.
  c.roles[ANCHOR.pending].note = (c.roles[ANCHOR.pending].note ?? "").replace(/TRIGGERED/g, "triggered");
});

control(`${ANCHOR.pending} is promoted legitimately — decision approved in the same change`, "pass", ({ contract: c, register: r }) => {
  c.roles[ANCHOR.pending].status = "proven";
  r.decisions[ANCHOR.pending] = {
    state: "approved",
    platforms: [...new Set(c.roles[ANCHOR.pending].consumers.map((x) => x.platform))].sort(),
    approval: { authority: "owner", basis: "A named forward/reverse test pair exists on every consuming platform; see the per-platform evidence listed on the role." },
  };
});

control(`an unrelated single-platform role is added`, "pass", ({ contract: c }) => {
  c.roles["zzz-unrelated"] = { status: "observed", consumers: [c.roles[ANCHOR.pending].consumers.find((x) => x.platform === "react")], evidence: [] };
});

control(`an unrelated role is added with two platforms AND its decision`, "pass", ({ contract: c, register: r }) => {
  c.roles["zzz-unrelated-pair"] = {
    status: "observed",
    consumers: c.roles[ANCHOR.pending].consumers.filter((x) => ["react", "angular"].includes(x.platform)),
    evidence: [],
  };
  r.decisions["zzz-unrelated-pair"] = { state: "pending", platforms: ["angular", "react"], review: "Newly triggered; nothing decided." };
});

// Keep the consumer and promotion registers in sync, so they cannot mask an ownership failure.
const identitiesPath = "tokens/contracts/motion-consumers.json";
const indicator = "selection-indicator";
const otherPlatform = "fabricated-platform";
const identityCases = [
  ["fabricated platform copies the React source and token references", ({ consumers }) => {
    consumers.push({ ...consumers.find((c) => c.platform === "react"), platform: otherPlatform });
  }, "uses an unknown implementation platform"],
  ["fabricated platform claims a separate file with copied React tokens", ({ consumers }, files) => {
    const react = consumers.find((c) => c.platform === "react");
    const file = "packages/ui-fabricated/src/indicator.tsx";
    consumers.push({ ...react, platform: otherPlatform, file });
    files[file] = readFileSync(join(ROOT, react.file), "utf8");
  }, "uses an unknown implementation platform"],
  ["Angular claims React's implementation alongside React", ({ consumers }) => {
    consumers.push({ ...consumers.find((c) => c.platform === "react"), platform: "angular" });
  }, "is outside that platform's implementation sources"],
  ["known platform declares a missing source", ({ consumers }) => {
    consumers.find((c) => c.platform === "react").file = "packages/ui/src/components/missing-indicator.tsx";
  }, "implementation file does not exist"],
  ["role cites an existing but unrelated React probe", (role) => {
    role.evidence.push("scripts/switch-motion.mjs");
  }, "is not registered for this role on a consuming platform"],
  ["another platform claims React's test evidence", ({ consumers }, files) => {
    const file = "packages/ui-angular/src/indicator-control.css";
    const expects = ["var(--duration-base)", "var(--easing-emphasized)"];
    files[file] = ".probe { transition: transform var(--duration-base) var(--easing-emphasized); }";
    consumers.push({ platform: "angular", file, expects, evidence: ["scripts/motion.mjs"] });
  }, "is not registered for this role on this platform"],
  ["actual implementation is removed", ({ consumers }, files) => {
    files[consumers.find((c) => c.platform === "react").file] = "";
  }, "is missing declared implementation markers"],
  ["real platform is renamed in both registrations", ({ consumers }) => {
    consumers.find((c) => c.platform === "react").platform = otherPlatform;
  }, "uses an unknown implementation platform"],
];

for (const [name, mutate, diagnostic] of identityCases) {
  const c = contract();
  const r = register();
  const role = c.roles[indicator];
  const files = {};
  mutate(role, files);
  const platforms = [...new Set(role.consumers.map((consumer) => consumer.platform))].sort();
  if (platforms.length >= 2) {
    r.decisions[indicator] = { state: "pending", platforms, review: "Synthetic ownership control." };
  } else {
    delete r.decisions[indicator];
  }
  const identities = load(identitiesPath);
  identities.identities = [
    ...identities.identities.filter((id) => !id.startsWith(`${indicator}|`)),
    ...role.consumers.map(({ platform, file }) => `${indicator}|${platform}|${file}`),
  ].sort();

  const ownsFile = (file) => Object.hasOwn(files, file);
  const errors = {
    promotion: promotionErrors({
      contract: c,
      register: r,
      isFile: (file) => ownsFile(file) || isRepoFile(ROOT, file),
      readSource: (file) => ownsFile(file) ? files[file] : readFileSync(join(ROOT, file), "utf8"),
    }).errors,
    tokens: motionErrors({
      [CONTRACT]: JSON.stringify(c),
      [identitiesPath]: JSON.stringify(identities),
      ...files,
    }),
  };
  const matched = Object.values(errors).every((messages) =>
    messages.some((message) => message.startsWith(`${indicator}:`) && message.includes(diagnostic)),
  );
  results.push({ name, expect: "fail", got: matched ? "fail" : "pass",
    first: matched ? `Both gates: ${diagnostic}` : JSON.stringify(errors) });
}

const five = ["angular", "compose", "flutter", "react", "swiftui"];
const base = contract();
const registered = new Set(Object.values(base.roles).flatMap((role) => role.consumers.map((c) => c.platform)));
const clean = five.every((platform) => registered.has(platform)) &&
  promotionErrors().errors.length === 0 && motionErrors().length === 0;
results.push({ name: "all five legitimate platforms pass both gates after the controls",
  expect: "pass", got: clean ? "pass" : "fail", first: "" });

// ─── report ───────────────────────────────────────────────────────────────────────────────────────

const bad = results.filter((r) => r.expect !== r.got);
for (const r of results) {
  const mark = r.expect === r.got ? "✓" : "✗";
  console.log(`  ${mark} must ${r.expect.toUpperCase()}  ${r.name}`);
  if (r.expect === "fail" && r.got === "fail") console.log(`      → ${r.first.replace(/^\s*/, "").slice(0, 120)}`);
  if (r.expect !== r.got) console.log(`      → expected ${r.expect}, got ${r.got}${r.first ? `: ${r.first.slice(0, 120)}` : ""}`);
}
if (bad.length) {
  console.error(`\nmotion-promotion negative controls failed (${bad.length} of ${results.length}).`);
  process.exit(1);
}
console.log(`\ncheck:motion-promotion-controls ok — ${results.length} controls, ${results.filter((r) => r.expect === "fail").length} refusals and ${results.filter((r) => r.expect === "pass").length} allowances.`);
