/**
 * check-motion-promotion.mjs — `proven` is a decision, not a side effect of adding a consumer.
 *
 *   node scripts/check-motion-promotion.mjs
 *
 * `tokens/contracts/motion.json`'s own selection-indicator note states the rule: "This repository
 * promotes a role to proven on a SECOND platform consuming it." Nothing enforced it. Two mutations
 * were measured on the four-platform reconciliation candidate, with every motion gate in the
 * repository green both times:
 *
 *   - `selection-indicator`'s `status` changed from `observed` to `proven`: `check:motion-tokens`,
 *     `check:native-motion`, `check:motion-ledger-controls` and `check:motion-identity-controls` all
 *     exited 0. A silent promotion passed every gate.
 *   - the sentence recording that the rule is TRIGGERED and the decision left open was deleted from
 *     the note: again all green. The only written trace of the pending decision could be removed by
 *     any branch that touched the note, and four of the open selection-indicator branches do touch it.
 *
 * So the decision moves out of prose and into `tokens/contracts/motion-promotions.json`, and this
 * gate holds the two files to each other:
 *
 *   1. a role consumed by two or more PLATFORMS needs a decision — the rule counts platforms, not
 *      consumer entries, because three React files are still one platform
 *   2. `status: proven` requires that decision to be `approved` with an authority and a basis
 *   3. a decision that is `pending` requires the status to be `observed` or `proposed`
 *   4. the decision's `platforms` must be exactly the platforms motion.json registers, so dropping a
 *      consumer or adding one without revisiting the decision fails
 *   5. counted consumers and evidence must resolve to their registered implementations and probes
 *   6. a decision for a role motion.json does not have, or for a role only one platform consumes,
 *      fails as a contradiction rather than being ignored
 *
 * WHY NOT MATCH THE PROSE
 *
 * An earlier draft of this check asserted that a triggered role's note still contained the word
 * TRIGGERED. That is the fragile form: it passes on a note that says the opposite in the next
 * sentence, it fails on a legitimate rewording, and it gives a branch the wrong instruction — add a
 * word. The record is the artifact. The note remains the place to explain a decision; it is no longer
 * the place where the decision is kept.
 *
 * WHAT THIS DOES NOT DO
 *
 * It does not decide anything, and it cannot stop a determined change: a branch may still set a
 * decision to `approved` and promote in the same commit. What it removes is the SILENT promotion. A
 * promotion is now a visible edit to a file whose only purpose is authorisation, carrying a named
 * authority and a checkable basis, in a diff a reviewer reads as what it is.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { consumerIdentityErrors, isRepoFile } from "./motion-platform-identity.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const readText = (file) => readFileSync(root + "/" + file, "utf8");
const read = (file) => JSON.parse(readText(file));

export const CONTRACT = "tokens/contracts/motion.json";
export const REGISTER = "tokens/contracts/motion-promotions.json";
const PROMOTED = "proven";
const OPEN_STATUSES = new Set(["proposed", "observed"]);
const DECISION_FIELDS = new Set(["state", "platforms", "triggeredBy", "review", "approval"]);

// JSON.parse keeps the last occurrence of a duplicate key. Inspect the original
// tokens so two decisions for the same role cannot collapse into one.
export function parsePromotionRegister(source) {
  const register = JSON.parse(source);
  const scopes = [];
  for (const token of source.matchAll(/"(?:\\.|[^"\\])*"|[{}]/gs)) {
    if (token[0] === "{") {
      scopes.push(new Set());
    } else if (token[0] === "}") {
      scopes.pop();
    } else if (/^\s*:/.test(source.slice(token.index + token[0].length))) {
      const key = JSON.parse(token[0]);
      const scope = scopes.at(-1);
      if (scope.has(key)) throw new Error(REGISTER + ': duplicate key "' + key + '"');
      scope.add(key);
    }
  }
  return register;
}

function validApprovalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

/**
 * The errors this gate finds, with injectable contract and file inputs, so the negative controls can
 * mutate a deep copy in memory instead of writing to the tree. The file inputs let controls model a missing or modified implementation.
 */
export function promotionErrors({ contract = read(CONTRACT), register = parsePromotionRegister(readText(REGISTER)), isFile = (p) => isRepoFile(root, p), readSource = (p) => readFileSync(`${root}/${p}`, "utf8") } = {}) {
const errors = [];
const roles = contract.roles ?? {};
const decisions = register.decisions ?? {};

if (Object.keys(roles).length === 0) errors.push(`${CONTRACT} declares no roles, so this check would pass by having nothing to hold`);

const triggered = [];
for (const [name, role] of Object.entries(roles)) {
  const identity = consumerIdentityErrors(name, role, { isFile, read: readSource });
  errors.push(...identity.errors);
  const { platforms } = identity;
  const status = role.status;

  if (platforms.length >= 2) triggered.push(name);
  const decision = decisions[name];

  if (platforms.length < 2) {
    // Not triggered. One platform cannot satisfy a two-platform rule, so `proven` is unreachable.
    if (status === PROMOTED) {
      errors.push(`${name}: status is "${PROMOTED}" but only ${platforms.length === 0 ? "no platform" : `"${platforms[0]}"`} consumes it — the rule promotes on a SECOND platform`);
    }
    if (decision) {
      errors.push(`${name}: ${REGISTER} holds a decision for it, but ${CONTRACT} registers ${platforms.length} platform(s) — a decision with nothing to decide contradicts the contract. Remove the decision or register the consumer it assumes.`);
    }
    continue;
  }

  if (!decision) {
    errors.push(
      `${name}: consumed by ${platforms.length} platforms (${platforms.join(", ")}) with no entry in ${REGISTER}.\n` +
        `      The promotion rule is triggered, so a decision is owed — "pending" with a \`review\` saying what it waits on\n` +
        `      is a complete and valid answer. A deleted or never-written entry is not.`,
    );
    continue;
  }

  const { state, platforms: recorded, approval, review, triggeredBy } = decision;
  if (!["pending", "deferred", "approved"].includes(state)) {
    errors.push(name + ': invalid decision state "' + state + '" (see $states in ' + REGISTER + ")");
    continue;
  }

  for (const field of Object.keys(decision)) {
    if (!DECISION_FIELDS.has(field)) errors.push(name + ": unsupported decision field " + field);
  }

  if (state !== "approved" || Object.hasOwn(decision, "triggeredBy")) {
    const triggerMatches = triggeredBy && platforms.includes(triggeredBy.platform) &&
      isFile(triggeredBy.reference) && (role.consumers ?? []).some(({ platform, file }) =>
        platform === triggeredBy.platform && file === triggeredBy.reference);
    if (!triggerMatches) {
      errors.push(name + ": promotion trigger must reference a registered implementation for its platform and role");
    }
  }

  if (!Array.isArray(recorded) || recorded.length !== platforms.length ||
      platforms.some((platform, index) => recorded[index] !== platform)) {
    errors.push(
      `${name}: the decision records platforms [${Array.isArray(recorded) ? recorded.join(", ") : String(recorded)}] but ${CONTRACT} registers [${platforms.join(", ")}].\n` +
        `      A consumer was added or dropped without revisiting the decision. If the change is intended, update the\n` +
        `      decision in the same commit so the diff shows that the promotion question was looked at again.`,
    );
  }

  if (state === "approved") {
    if (status !== PROMOTED) errors.push(name + ': approved decision requires role status "proven"');
    if (!validApprovalDate(approval?.recordedAt)) {
      errors.push(name + ": approved decision requires a valid approval.recordedAt date (YYYY-MM-DD)");
    }
    if (!approval || typeof approval.authority !== "string" || !approval.authority.trim()) {
      errors.push(`${name}: an approved promotion needs \`approval.authority\` — who authorised it`);
    }
    if (!approval || typeof approval.basis !== "string" || approval.basis.trim().length < 40) {
      errors.push(`${name}: an approved promotion needs \`approval.basis\` — a reference a reviewer can check, not a restatement of the status`);
    }
  } else {
    if (Object.hasOwn(decision, "approval")) {
      errors.push(name + ": " + state + " decision must not contain approval metadata");
    }
    if (typeof review !== "string" || !review.trim()) {
      errors.push(`${name}: a pending decision needs \`review\` — what the decision is waiting on. An empty one records nothing.`);
    }
    if (status === PROMOTED) {
      errors.push(
        `${name}: status is "${PROMOTED}" while ${REGISTER} still records the decision as "${state}".\n` +
          `      This is the promotion this check exists to refuse. To promote it legitimately, set the decision to\n` +
          `      "approved" with an authority and a basis in the same change, and say in the role's note what proved it.`,
      );
    } else if (!OPEN_STATUSES.has(status)) {
      errors.push(`${name}: status "${status}" is neither "${PROMOTED}" nor an open status (${[...OPEN_STATUSES].join(", ")})`);
    }
  }
}

for (const name of Object.keys(decisions)) {
  if (!roles[name]) errors.push(`${REGISTER} decides "${name}", which ${CONTRACT} does not define — a decision about a role that does not exist`);
}

return { errors, triggered, decisions };
}

/** The counts the CLI reports, kept with the gate so the controls can assert on them too. */
export const summarise = ({ triggered, decisions }) => {
  const approved = Object.values(decisions).filter((d) => d.state === "approved").length;
  const deferred = Object.values(decisions).filter((d) => d.state === "deferred").length;
  const status = approved + " approved, " + (triggered.length - approved - deferred) + " pending, " + deferred + " deferred";
  return `check:motion-promotion ok — ${triggered.length} role${triggered.length === 1 ? "" : "s"} consumed by two or more platforms, ${status}.`;
};

if (import.meta.url === `file://${process.argv[1]}`) {
let result;
try {
  result = promotionErrors();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const errors = result.errors;
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  console.error(`\ncheck:motion-promotion failed (${errors.length}).`);
  process.exit(1);
}
console.log(summarise(result));
}
