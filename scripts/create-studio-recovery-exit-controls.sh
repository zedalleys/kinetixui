#!/usr/bin/env bash
#
# M5.21 — the crash harness and negative controls for the recovery surface's exits.
#
# The route boundary can only be reached by a real render exception: every document the client
# loads is validated (`readProduct` → `migrateDocument`), and an unknown component `ref` is
# rejected by `validateProps`, so no doctored server reply reaches a render. This script therefore
# injects the exception itself, runs the gate, and restores the file.
#
# Usage (local development only):
#   CREATE_BASE=http://127.0.0.1:3137 bash scripts/create-studio-recovery-exit-controls.sh
#
# Restores with `git checkout --`, so it refuses a dirty tree. The preflight runs BEFORE the trap
# is armed, and that order is load-bearing: a trap armed first would discard the very edits the
# check exists to protect the moment the refusal exits (M5.20, Codex P1).
set -uo pipefail
cd "$(dirname "$0")/.."
BASE="${CREATE_BASE:-http://127.0.0.1:3137}"
ARTIFACTS="${CREATE_ARTIFACTS:-.impeccable/review/create-studio}"
NODEVIEW=apps/web/src/components/create-studio/node-view.tsx
ERROR=apps/web/src/app/create/studio/error.tsx
failures=0

if ! git diff --quiet -- "$NODEVIEW" "$ERROR" || ! git diff --cached --quiet -- "$NODEVIEW" "$ERROR"; then
  echo "refusing to run: $NODEVIEW or $ERROR has uncommitted changes, and this script restores by discarding them"
  exit 2
fi

restore_all() { git checkout -- "$NODEVIEW" "$ERROR" 2>/dev/null || true; }
trap 'restore_all' EXIT INT TERM

patch_file() {
  python3 - "$1" "$2" "$3" <<'PY'
import sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
source = open(path, encoding="utf-8").read()
if old not in source:
    raise SystemExit(f"anchor missing in {path}: {old[:70]!r}")
open(path, "w", encoding="utf-8").write(source.replace(old, new, 1))
PY
}

run_gate() {
  CREATE_BASE="$BASE" CREATE_ARTIFACTS="$ARTIFACTS" node scripts/create-studio-recovery-browser.mjs 2>&1
}

# The crash trigger: a Badge whose text is CRASH-NOW throws during render. It is injected, never
# committed, and the gate refuses to report a pass if it is absent.
install_trigger() {
  patch_file "$NODEVIEW" \
    'export function NodeView(' \
    'function m521CrashTrigger(node: Node) {
  const text = node.props?.text ?? node.props?.children ?? node.props?.label;
  if (String(text) === "CRASH-NOW") throw new Error("deliberate adapter render failure (recovery-exit harness)");
}
export function NodeView('
  patch_file "$NODEVIEW" \
    '  const children = (node.children ?? []).map(child =>' \
    '  m521CrashTrigger(node);
  const children = (node.children ?? []).map(child =>'
}

echo "== M5.21 recovery-exit harness =="
install_trigger
output="$(run_gate)"; status=$?
printf '%s\n' "$output" | tail -6
if [ "$status" -ne 0 ]; then
  echo "GATE FAILED with the trigger installed and the source unmodified"
  failures=$((failures + 1))
else
  echo "GATE PASS with a real render exception"
fi

echo "== source negative control =="
# Restore the exits to the M5.20 form — `next/link` to the route the user is already on — and
# require the gate to fail NAMING the exit that stops working. Without this control the repair is
# a one-word change nothing guards.
if patch_file "$ERROR" \
  '<Button variant="Outline" asChild><a href="/create/studio">Reload Create Studio</a></Button>' \
  '<Button variant="Outline" asChild><Link href="/create/studio">Reload Create Studio</Link></Button>'; then
  control_output="$(run_gate)"; control_status=$?
  git checkout -- "$ERROR"
  if [ "$control_status" -eq 0 ]; then
    echo "CONTROL FAILED  the gate PASSED with the soft-navigation link in place"
    failures=$((failures + 1))
  elif printf '%s\n' "$control_output" | grep -qF "Reload Create Studio must leave the recovery surface"; then
    echo "CONTROL PASS    a soft-navigation reload is detected"
    printf '%s\n' "$control_output" | grep -F "Reload Create Studio must leave the recovery surface" | head -1 | cut -c1-200 | sed 's/^/       detected: /'
  else
    echo "CONTROL FAILED  the gate failed, but not naming the reload exit"
    printf '%s\n' "$control_output" | tail -6 | sed 's/^/       /'
    failures=$((failures + 1))
  fi
else
  echo "CONTROL BROKEN  the reload anchor was not found in $ERROR"
  failures=$((failures + 1))
fi

echo "== restored tree =="
restore_all
if git diff --quiet -- "$NODEVIEW" "$ERROR"; then echo "tree restored"; else
  echo "TREE NOT RESTORED"; failures=$((failures + 1)); fi
# With the trigger gone there is no way to crash the editor, so the gate must now refuse rather
# than report a pass: that refusal is itself the proof that the harness, not the editor, supplies
# the exception.
# Captured, not piped: `set -o pipefail` makes a pipeline inherit the FAILING producer's status,
# so `run_gate | grep -q ...` reports failure even when the grep matched — which is how this very
# check first reported a defect that was its own.
no_trigger="$(run_gate)"
if printf '%s\n' "$no_trigger" | grep -qF "the crash trigger is not installed"; then
  echo "without the trigger the gate refuses to report a pass"
else
  echo "THE GATE DID NOT REFUSE WITHOUT ITS TRIGGER"
  printf '%s\n' "$no_trigger" | tail -4 | sed 's/^/       /'
  failures=$((failures + 1))
fi
echo "problems: $failures"
exit $((failures > 0))
