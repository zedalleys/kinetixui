#!/usr/bin/env bash
#
# Source negative controls for the Create Studio save-acknowledgement gate (M5.22).
#
# Eleven controls. Nine were written with the model; two more were added after Codex's exact-head
# review of `3927a8c7` found that a non-conflict rejection settled an earlier uncertain save, and
# that overflowing the bounded attempt list let the check blame a writer that never existed.
#
# A browser gate cannot edit the source it measures, so the implementation controls live here.
# Each entry removes exactly ONE part of the save-outcome model, runs the real gate, requires it to
# fail NAMING the behaviour that part protects, and restores the file. The run ends by requiring the
# restored tree to pass.
#
# Two of these are the controls the owner's brief asks for by name: a FALSE SUCCESS claim and a
# FALSE FAILURE claim must each be detected. They are separate controls on purpose. Before M5.22 a
# control existed for the false success — the chip was perturbed to "Saved locally" and the gate
# caught it — while the false failure ("Save failed" after a save that had committed) was what the
# gate ASSERTED. One control standing in for both is how that shipped.
#
# Usage (local development only; the gate refuses a non-local base):
#   CREATE_BASE=http://127.0.0.1:3137 bash scripts/create-studio-save-state-controls.sh
#
# This script mutates working-tree files and restores them with `git checkout --`: the committed
# state, not a copy in a temporary directory, so an interrupted run cannot leave a deliberate defect
# behind. Run it only on a clean tree; it refuses otherwise.
set -uo pipefail
cd "$(dirname "$0")/.."
BASE="${CREATE_BASE:-http://127.0.0.1:3137}"
ARTIFACTS="${CREATE_ARTIFACTS:-.impeccable/review/create-studio}"
STUDIO=apps/web/src/components/create-studio/create-studio.tsx
failures=0

# The preflight runs BEFORE the restoring trap is installed, and that order is load-bearing: the
# trap discards working-tree changes to this file, so a trap armed before this check would destroy
# the very edits the check exists to protect the moment the refusal exits.
if ! git diff --quiet -- "$STUDIO" || ! git diff --cached --quiet -- "$STUDIO"; then
  echo "refusing to run: $STUDIO has uncommitted changes, and this script restores by discarding them"
  exit 2
fi

restore_all() { git checkout -- "$STUDIO" 2>/dev/null || true; }
trap 'restore_all' EXIT INT TERM

run_gate() {
  CREATE_BASE="$BASE" CREATE_ARTIFACTS="$ARTIFACTS" node scripts/create-studio-save-state-browser.mjs 2>&1
}

# The gate prints the diagnostic of each of its own reading-controls, and those diagnostics quote
# the assertion message the reading-control deliberately induced. So a SUCCESSFUL gate run already
# contains strings like "must never read as saved". Searching the whole output would therefore
# report a source control as passing even when the source mutation reproduced nothing. Two things
# fix that: the gate must EXIT NONZERO, and the substring must appear in the terminal failure — the
# part of the output after the last reading-control line.
terminal_failure() {
  awk '/^CONTROL /{last = NR} {line[NR] = $0} END {for (i = last + 1; i <= NR; i++) print line[i]}'
}

patch_file() {
  python3 - "$1" "$2" "$3" <<'PY'
import sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
source = open(path, encoding="utf-8").read()
if old not in source:
    raise SystemExit(f"control anchor missing in {path}: {old[:70]!r}")
open(path, "w", encoding="utf-8").write(source.replace(old, new, 1))
PY
}

# control <label> <old> <new> <expected substring of the failure>
control() {
  local label="$1" old="$2" new="$3" expected="$4"
  if ! patch_file "$STUDIO" "$old" "$new"; then
    echo "CONTROL BROKEN   $label (anchor missing)"; failures=$((failures + 1)); return
  fi
  local output status
  output="$(run_gate)"; status=$?
  git checkout -- "$STUDIO"
  if [ "$status" -eq 0 ]; then
    echo "CONTROL FAILED   $label — the gate PASSED with the defect in place"
    failures=$((failures + 1)); return
  fi
  if printf '%s\n' "$output" | terminal_failure | grep -qF -- "$expected"; then
    echo "CONTROL PASS     $label"
    printf '%s\n' "$output" | terminal_failure | grep -F -- "$expected" | head -1 | cut -c1-200 | sed 's/^/       detected: /'
  else
    echo "CONTROL FAILED   $label — the gate failed, but its terminal failure did not name: $expected"
    printf '%s\n' "$output" | tail -6 | sed 's/^/       /'
    failures=$((failures + 1))
  fi
}

echo "== M5.22 save-acknowledgement source negative controls =="

CLASSIFY='  return error instanceof ApiError && REJECTED_SAVE_CODES.has(error.code) ? "rejected" : "unconfirmed";'

# THE FALSE FAILURE CONTROL. This restores exactly what the editor did before M5.22: every failed
# save, transport failures included, read as a definite failure. The lost-acknowledgement case
# commits for real, so this is the editor telling the user their work was lost when it was stored.
control "every failure is treated as a definite rejection (the false-failure claim)" \
  "$CLASSIFY" \
  '  return "rejected";' \
  "must not be reported as a definite failure"

# The mirror image: nothing is ever a settled failure, so a rejection the service raised before
# touching the store — provably no write — is reported as "it may have been stored". Claiming less
# than is known is milder than claiming more, but it is still not the truth, and it would leave the
# user checking a store that cannot have changed.
control "every failure is treated as unconfirmed, including coded rejections" \
  "$CLASSIFY" \
  '  return "unconfirmed";' \
  "must read as a failure"

CHIP='    : saveOutcome === "unconfirmed" ? "Save unconfirmed · Check the stored version"'

# THE FALSE SUCCESS CONTROL.
control "an unconfirmed save is presented as saved (the false-success claim)" \
  "$CHIP" \
  '    : saveOutcome === "unconfirmed" ? "Saved locally"' \
  "must never read as saved"

# Saying nothing is not the same as saying what is true: with this branch gone the chip falls
# through to "Unsaved changes", which asserts the write did not happen.
control "the unconfirmed state has no reading of its own" \
  "$CHIP" \
  '' \
  "must report the save as unconfirmed"

# Reconciliation is the only thing that can settle the question, so a reconciliation that answers
# without looking is worse than none: it converts "I do not know" into a confident wrong answer.
control "reconciliation reports a commit without comparing the stored document" \
  '      const committed = attempts.find(item => item.serialized === storedSerialized);' \
  '      const committed = attempts[0];' \
  "must report that this save did not commit"

# THE CONTROL FOR CODEX'S FIRST FINDING AT `3927a8c7`, and the reason the condition is no longer
# written in terms of a particular code. A rejection of the latest request proves the store was not
# touched BY THAT REQUEST and establishes nothing about the ones before it. Narrowing the condition
# back to REVISION_CONFLICT — which is what shipped at `3927a8c7` — makes a retry refused for any
# other reason declare the earlier, still-unresolved save a settled failure and take the check away.
control "a non-conflict rejection of a retry settles an earlier unconfirmed save" \
  '    const keepUnconfirmed = outcome === "rejected" && earlierOpen;' \
  '    const keepUnconfirmed = outcome === "rejected" && earlierOpen && e instanceof ApiError && e.code === "REVISION_CONFLICT";' \
  "after a rejected retry"

# A conflict on a retry is evidence the earlier attempt landed, which is worth saying in its own
# words. Without that sentence the user is told the revision moved but not that this is the one
# refusal which suggests their earlier save is what moved it.
control "a conflict on a retry loses the sentence that explains it" \
  '    const conflictOnRetry = earlierOpen && e instanceof ApiError && e.code === "REVISION_CONFLICT";' \
  '    const conflictOnRetry = false;' \
  "must say the earlier save may be what moved the revision"

# The verdict in the status bar's shared announcement slot, which is what it did first. Several
# unrelated effects write there — the draft-storage one fires repeatedly when storage is refusing
# writes — and the answer the user had just asked for removed itself within seconds.
control "the reconciliation verdict shares the volatile announcement slot" \
  '        setChecked(`Checked: that save did not commit.' \
  '        setNotice(`Checked: that save did not commit.' \
  "must not be overwritten by an unrelated notice"

# Codex's P1 at `1e21261e`. Adopting a foreign writer's revision while keeping the local document on
# screen leaves Save enabled against a revision this work was never based on, and the next save
# overwrites that writer silently. Removing the conflict base is removing the only thing that stops
# it.
# The anchor reaches the foreign branch through the one line that is unique to it. Both that branch
# and the truncation branch above contain the same `setProduct` / `setDraftBase(floor)` /
# `setSaveOutcome("unconfirmed")` triple, so a bare `setDraftBase(floor);` anchor matched the
# truncation branch first: the control perturbed the wrong code and the gate failed in case 11
# instead of case 9. A control that fires for the wrong reason proves nothing.
control "a foreign write during uncertainty leaves saving enabled over it" \
  '        setDraftBase(floor);
        setSaveOutcome("unconfirmed");
        setChecked(`Checked: the stored version is revision ${stored.revision}, and it is not what that save sent.`);' \
  '        setSaveOutcome("unconfirmed");
        setChecked(`Checked: the stored version is revision ${stored.revision}, and it is not what that save sent.`);' \
  "saving over a foreign write must be unavailable"

# Codex's P2 at `1e21261e`. Keeping only the latest attempt makes reconciliation compare the store
# against the refused retry, so it reports another writer where there was none and cannot confirm
# the save that actually committed.
control "only the latest uncertain attempt is remembered" \
  '        pendingSaves.current = next.slice(-PENDING_SAVE_LIMIT);' \
  '        pendingSaves.current = [attempt];' \
  "the check must report that the earlier save committed"

# THE CONTROL FOR CODEX'S SECOND FINDING AT `3927a8c7`. The list is bounded, so it can stop being
# exhaustive — and a check that treats a bounded list as exhaustive converts "an attempt I no longer
# hold may be what is stored" into "somebody else wrote", which then blocks saving against a writer
# who does not exist. Not recording the overflow is what makes that fabrication possible.
control "overflowing the attempt list goes unrecorded, so the check blames a foreign writer" \
  '        if (next.length > PENDING_SAVE_LIMIT) pendingTruncated.current = true;' \
  '' \
  "must not blame a writer it cannot have observed"

# The brief asks separately for a control that reintroduces OVERWRITING a competing writer's
# document, and for one that reintroduces ENABLING Save after an unresolved conflicting revision.
# In this code those are one mechanism — `staleDraft` is what blocks the save and what the
# reconciliation branch arms — so the control above and this one approach it from the two ends:
# that one stops the state being recorded, this one stops the recorded state having any effect.
# Removing the guard leaves Save enabled against a revision the work was never based on, and the
# next save carries the adopted revision and overwrites that writer. Recorded rather than claimed
# as two independent protections.
control "the stale-draft guard no longer disables saving over a superseded revision" \
  '  const staleDraft = draftBase !== null && draftBase !== product?.revision;' \
  '  const staleDraft = false;' \
  "must be unavailable"

# THE CONTROL FOR CODEX'S FINDING ON THIS PR'S OWN HEAD. A confirmed save clears the attempts; if
# it does not also clear the record that the list once dropped one, the next uncertainty inherits it
# and a genuine competing write is reported as unknowable instead of being named. That is the
# mirror of case 11's defect: there the editor claimed more than it knew, here it claims less.
control "a confirmed save leaves the truncation record behind" \
  '      pendingSaves.current = []; pendingTruncated.current = false;
      setRecovered(false); setNotice("Saved to this computer'"'"'s local server.");' \
  '      pendingSaves.current = [];
      setRecovered(false); setNotice("Saved to this computer'"'"'s local server.");' \
  "with an exhaustive list the check must not plead ignorance"

echo "== restored tree must pass =="
restore_all
if git diff --quiet -- "$STUDIO"; then
  echo "tree restored"
else
  echo "TREE NOT RESTORED — inspect the file above"; failures=$((failures + 1))
fi
# Captured, not piped: `set -o pipefail` makes a pipeline inherit the FAILING producer's status, so
# `run_gate | tail -1 | grep -q ...` reports failure even when the grep matched.
final="$(run_gate)"
if printf '%s\n' "$final" | tail -1 | grep -q '"passed"'; then
  echo "restored tree passes the gate"
else
  echo "RESTORED TREE DOES NOT PASS"; printf '%s\n' "$final" | tail -6 | sed 's/^/       /'; failures=$((failures + 1))
fi
echo "controls with problems: $failures"
exit $((failures > 0))
