import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { motionErrors } from "./check-motion-tokens.mjs";
import { CONTRACT, REGISTER, parsePromotionRegister, promotionErrors } from "./check-motion-promotion.mjs";
import { composeLedger, selectionMembershipErrors } from "./native-motion-ledger.mjs";
import { PLATFORMS } from "./native-motion-spec.mjs";

const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");
const inputs = { read, list: (dir) => readdirSync(new URL(dir, root)) };
const contract = () => JSON.parse(read(CONTRACT));
const register = () => parsePromotionRegister(read(REGISTER));
const role = "selection-indicator";

let refusals = 0;
let allowances = 0;
function rejects(label, errors, diagnosis) {
  assert(errors.some((e) => e.includes(diagnosis)), label + ": expected " + diagnosis + ", got " + errors.join("; "));
  refusals++;
  console.log("REFUSED " + label + " — " + diagnosis);
}
function accepts(label, errors) {
  assert.deepEqual(errors, [], label);
  allowances++;
  console.log("ALLOWED " + label);
}

for (const platformName of ["SwiftUI", "Compose", "Flutter"]) {
  for (const member of PLATFORMS[platformName].families.selectionIndicator.members) {
    const platforms = structuredClone(PLATFORMS);
    const family = platforms[platformName].families.selectionIndicator;
    family.members = family.members.filter((name) => name !== member);
    const diagnosis = platformName + "/" + member + ": selectionIndicator helper calls disagree";
    rejects("native ledger omits " + member, selectionMembershipErrors(composeLedger({ platforms }).platforms, inputs), diagnosis);
    rejects("token ledger omits " + member, motionErrors({}, platforms), diagnosis);
  }
}
for (const path of contract().roles[role].evidence.filter((file) => file.includes("/ui-swiftui/"))) {
  const candidate = contract();
  candidate.roles[role].evidence = candidate.roles[role].evidence.filter((file) => file !== path);
  for (const [gate, errors] of [
    ["promotion", promotionErrors({ contract: candidate }).errors],
    ["tokens", motionErrors({ [CONTRACT]: JSON.stringify(candidate) })],
  ]) {
    rejects(gate + " omits " + path, errors, "missing required swiftui evidence: " + path);
  }
}

const pending = register().decisions[role];
function rejectsDecision(label, change, diagnosis) {
  const mutated = register();
  change(mutated.decisions[role]);
  rejects(label, promotionErrors({ register: mutated }).errors, diagnosis);
}
for (const field of ["recordedAt", "authority", "id"]) {
  rejectsDecision("pending carries approval." + field, (d) => { d.approval = { [field]: "sample" }; },
    "pending decision must not contain approval metadata");
}
rejectsDecision("pending carries a top-level approval identifier", (d) => { d.approvalId = "sample"; },
  "unsupported decision field approvalId");
rejectsDecision("trigger path missing", (d) => { d.triggeredBy.reference = "packages/ui-flutter/lib/src/missing.dart"; },
  "promotion trigger must reference a registered implementation");
rejectsDecision("trigger points to another Flutter role", (d) => {
  d.triggeredBy.reference = contract().roles["selection-control"].consumers.find((c) => c.platform === "flutter").file;
}, "promotion trigger must reference a registered implementation");
rejectsDecision("invalid approval date", (d) => {
  d.state = "approved";
  d.approval = { authority: "test fixture", basis: "A complete reference for the test fixture, with evidence.", recordedAt: "2026-02-30" };
}, "requires a valid approval.recordedAt");
rejectsDecision("approved metadata contradicts observed status", (d) => {
  d.state = "approved";
  d.approval = { authority: "test fixture", basis: "A complete reference for the test fixture, with evidence.", recordedAt: "2026-11-19" };
}, 'approved decision requires role status "proven"');
rejectsDecision("approved has no evidence", (d) => { d.state = "approved"; }, "needs `approval.authority`");
rejectsDecision("rejected masquerades as approved", (d) => { d.state = "rejected"; }, 'invalid decision state "rejected"');
const copy = read(REGISTER).replace(/"decisions": \{/, '"decisions": {"selection-indicator":' + JSON.stringify(pending) + ',');
assert.throws(() => parsePromotionRegister(copy), /duplicate key "selection-indicator"/);
refusals++;
console.log("REFUSED duplicate promotion decision key");

const deferred = register();
deferred.decisions[role].state = "deferred";
accepts("explicit deferred review remains observed", promotionErrors({ register: deferred }).errors);
accepts("current policy, all registered implementations and shared tokens", [...promotionErrors().errors, ...motionErrors()]);
console.log("selection verification controls — " + refusals + " refusals, " + allowances + " allowances.");
