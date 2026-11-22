#!/usr/bin/env bash
#
# Source negative controls for the Create Studio resilience gate (M5.20).
#
# A browser gate cannot edit the source it measures, so the implementation controls live here.
# Each entry removes exactly ONE of the M5.20 repairs, runs the real gate, requires it to fail
# NAMING the behaviour that repair protects, and restores the file. The run ends by requiring the
# restored tree to pass.
#
# Usage (local development only; the gate refuses a non-local base):
#   CREATE_BASE=http://127.0.0.1:3137 bash scripts/create-studio-resilience-controls.sh
#
# This script mutates working-tree files while it runs, so it restores them with `git checkout --`:
# the committed state, not a copy in a temporary directory. That matters because an interrupted run
# (a timeout, a Ctrl-C) must not leave a deliberate defect behind in the tree — an earlier version
# of this script kept its backups in a mktemp directory it deleted on exit, and a killed run left
# two mutations in place. Run it only on a clean tree: it refuses otherwise.
set -uo pipefail
cd "$(dirname "$0")/.."
BASE="${CREATE_BASE:-http://127.0.0.1:3137}"
ARTIFACTS="${CREATE_ARTIFACTS:-.impeccable/review/create-studio}"
restore_all() { git checkout -- "$STUDIO" "$CSS" 2>/dev/null || true; }
trap 'restore_all' EXIT INT TERM

STUDIO=apps/web/src/components/create-studio/create-studio.tsx
CSS=apps/web/src/app/create/studio/studio.css
failures=0

if ! git diff --quiet -- "$STUDIO" "$CSS"; then
  echo "refusing to run: $STUDIO or $CSS has uncommitted changes, and this script restores by discarding them"
  exit 2
fi

run_gate() {
  CREATE_BASE="$BASE" CREATE_ARTIFACTS="$ARTIFACTS" node scripts/create-studio-resilience-browser.mjs 2>&1
}

# patch <file> <old> <new>
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

# control <label> <file> <old> <new> <expected substring of the failure>
control() {
  local label="$1" file="$2" old="$3" new="$4" expected="$5"
  if ! patch_file "$file" "$old" "$new"; then
    echo "CONTROL BROKEN   $label (anchor missing)"; failures=$((failures + 1)); return
  fi
  local output; output="$(run_gate)"
  git checkout -- "$file"
  if echo "$output" | grep -qF -- "$expected"; then
    echo "CONTROL PASS     $label"
    echo "$output" | grep -F -- "$expected" | head -1 | cut -c1-200 | sed 's/^/       detected: /'
  else
    echo "CONTROL FAILED   $label — the gate did not fail naming: $expected"
    echo "$output" | tail -6 | sed 's/^/       /'
    failures=$((failures + 1))
  fi
}

echo "== M5.20 source negative controls =="

# With the route recovery surface in place, removing this validation no longer reaches the
# framework's error page — it reaches the recovery surface instead, because the exception is now
# caught. So the behaviour this control proves is the editor staying up, not the error page being
# avoided: the two repairs are layered, and this is the one that keeps the workspace mounted.
control "a loaded document is rendered without being read" "$STUDIO" \
  '  try { return { ...product, doc: migrateDocument(product.doc) }; }' \
  '  try { return product; }' \
  "must stay mounted when a document cannot be read"

control "a transport failure surfaces the browser's own message" "$STUDIO" \
  '    throw new ApiError("NETWORK_UNAVAILABLE", "The local Create Studio server did not answer. Nothing was saved. Check that the development server is still running, then retry, or download your draft.");' \
  '    throw new ApiError("NETWORK_UNAVAILABLE", "Failed to fetch");' \
  "must not surface the browser's own message"

control "Escape leaves the preview without returning focus" "$STUDIO" \
  '      if (event.key === "Escape") { if (preview) exitPreview(); setPan(false); drag.current = null; return; }' \
  '      if (event.key === "Escape") { setPreview(false); setPan(false); drag.current = null; return; }' \
  "must not drop focus to the document body"

control "committing a rename blurs the field" "$STUDIO" \
  'onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); renameProject(); } if (e.key === "Escape") setNameDraft(null); }} />' \
  'onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); renameProject(); (e.target as HTMLInputElement).blur(); } if (e.key === "Escape") setNameDraft(null); }} />' \
  "must keep focus in the project name field"

control "a hidden panel is hidden but still focusable" "$CSS" \
  '.studio-navigator, .studio-inspector { background: hsl(var(--card)); min-width: 0; display: none; }' \
  '.studio-navigator, .studio-inspector { background: hsl(var(--card)); min-width: 0; width: 0; overflow: hidden; }' \
  "must hold no reachable focus"

echo "== restored tree must pass =="
restore_all
if git diff --quiet -- "$STUDIO" "$CSS"; then
  echo "tree restored"
else
  echo "TREE NOT RESTORED — inspect the files above"; failures=$((failures + 1))
fi
if run_gate | tail -1 | grep -q '"passed"'; then
  echo "restored tree passes the gate"
else
  echo "RESTORED TREE DOES NOT PASS"; failures=$((failures + 1))
fi
echo "controls with problems: $failures"
exit $((failures > 0))
