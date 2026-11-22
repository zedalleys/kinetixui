#!/usr/bin/env bash
#
# Unit-level negative controls for the Create Studio route recovery surface (M5.20).
#
# `error.test.tsx` asserts a contract: the surface explains the failure, offers a retry, points at
# the preserved draft, shows no stack trace and takes focus. A test suite that cannot fail on the
# defect it is written for is decoration. Each control below removes exactly ONE part of that
# contract, requires the suite to fail, prints the failing assertion, and restores the file.
#
# Restores are `git checkout --`, not a copy in a temporary directory: an interrupted run must not
# leave a deliberate defect behind. The script therefore refuses to run on a dirty tree, and
# restores on exit however it exits.
#
# Usage:
#   bash scripts/create-studio-error-boundary-controls.sh
set -u

cd "$(dirname "$0")/.."
F=apps/web/src/app/create/studio/error.tsx

if ! git diff --quiet -- "$F" || ! git diff --cached --quiet -- "$F"; then
  echo "refusing to run: $F has uncommitted changes, and this script restores with git checkout --"
  exit 1
fi

restore() { git checkout -- "$F"; }
trap 'restore' EXIT INT TERM

# `--fail-if-no-match` is load-bearing, not decoration: `pnpm --filter <name> exec` exits 0 when
# the filter matches no project, printing only "No projects matched the filters" and running
# nothing. A gate that lost its match — a renamed package, a typo, a misdetected workspace root —
# would then report success having executed no test at all. Measured: without the flag, exit 0;
# with it, exit 1.
run() { pnpm --filter @kinetixui/web --fail-if-no-match exec vitest run src/app/create/studio/error.test.tsx 2>&1; }

failures=0

# control <label> <old> <new>
control() {
  local label="$1" old="$2" new="$3"
  # See the note in create-studio-save-state-controls.sh: DUMP_ANCHORS dumps, runs nothing.
  if [ -n "${DUMP_ANCHORS:-}" ]; then
    printf '%s\t%s\t%s\t%s\n' "apps/web/src/app/create/studio/error.tsx" \
      "$(printf '%s' "$old" | base64 -w0)" "$(printf '%s' "$new" | base64 -w0)" \
      "$(printf '%s' "$label" | base64 -w0)"
    return
  fi
  if ! python3 - "$old" "$new" <<'PY'
import sys
p = "apps/web/src/app/create/studio/error.tsx"
s = open(p, encoding="utf-8").read()
old, new = sys.argv[1], sys.argv[2]
if old not in s:
    sys.exit("anchor missing: " + old[:70])
open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
  then
    echo "CONTROL BROKEN   $label (anchor missing)"; failures=$((failures + 1)); return
  fi
  local out; out="$(run)"
  restore
  if echo "$out" | grep -qE "Tests +[0-9]+ failed"; then
    echo "CONTROL PASS     $label"
    echo "$out" | grep -E "^ *(×|→)" | head -3 | cut -c1-160 | sed 's/^/       /'
  else
    echo "CONTROL FAILED   $label — the suite stayed green with the defect in place"
    failures=$((failures + 1))
  fi
}

echo "== M5.20 route recovery surface controls =="

control "the retry action is not a button" \
  '<Button onClick={reset}>Try the editor again</Button>' \
  '<span>Try the editor again</span>'

control "the raw error message is printed to the user" \
  '<h1 ref={heading} tabIndex={-1}>The editor stopped unexpectedly.</h1>' \
  '<h1 ref={heading} tabIndex={-1}>The editor stopped unexpectedly.</h1><p>{error.message}</p>'

control "the surface does not take focus" \
  'heading.current?.focus();' \
  '/* focus deliberately dropped by the control */;'

control "the server reference line is rendered without a digest" \
  '{error.digest ? <p className="studio-muted">Reference for the server log: {error.digest}</p> : null}' \
  '<p className="studio-muted">Reference for the server log: {error.digest}</p>'

# DUMP_ANCHORS dumped every control's mutation above and ran nothing; there is no restored tree
# to verify, so stop here rather than starting a gate.
[ -n "${DUMP_ANCHORS:-}" ] && exit 0

echo "== restored file must pass =="
if git diff --quiet -- "$F"; then echo "file restored"; else echo "FILE NOT RESTORED"; failures=$((failures + 1)); fi
if run | grep -qE "Tests +[0-9]+ passed"; then
  echo "restored file passes"
else
  echo "RESTORED FILE DOES NOT PASS"; failures=$((failures + 1))
fi

echo "controls with problems: $failures"
exit $((failures > 0))
