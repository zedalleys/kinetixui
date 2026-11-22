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
STUDIO=apps/web/src/components/create-studio/create-studio.tsx
CSS=apps/web/src/app/create/studio/studio.css
failures=0

# The preflight runs BEFORE the restoring trap is installed, and that order is load-bearing: the
# trap discards working-tree changes to these two files, so a trap armed before this check would
# destroy the very edits the check exists to protect the moment the refusal exits.
if ! git diff --quiet -- "$STUDIO" "$CSS" || ! git diff --cached --quiet -- "$STUDIO" "$CSS"; then
  echo "refusing to run: $STUDIO or $CSS has uncommitted changes, and this script restores by discarding them"
  exit 2
fi

restore_all() { git checkout -- "$STUDIO" "$CSS" 2>/dev/null || true; }
trap 'restore_all' EXIT INT TERM

run_gate() {
  CREATE_BASE="$BASE" CREATE_ARTIFACTS="$ARTIFACTS" node scripts/create-studio-resilience-browser.mjs 2>&1
}

# The gate prints the diagnostic of each of its own reading-controls, and those diagnostics quote
# the assertion message the reading-control deliberately induced. So a SUCCESSFUL gate run already
# contains strings like "must not drop focus to the document body". Searching the whole output for
# the expected substring would therefore report a source control as passing even when the source
# mutation reproduced nothing. Two things fix that: the gate must EXIT NONZERO, and the substring
# must appear in the terminal failure — the part of the output after the last reading-control line.
terminal_failure() {
  awk '/^CONTROL /{last = NR} {line[NR] = $0} END {for (i = last + 1; i <= NR; i++) print line[i]}'
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
  local output status
  output="$(run_gate)"; status=$?
  git checkout -- "$file"
  if [ "$status" -eq 0 ]; then
    echo "CONTROL FAILED   $label — the gate PASSED with the defect in place"
    failures=$((failures + 1)); return
  fi
  if printf '%s\n' "$output" | terminal_failure | grep -qF -- "$expected"; then
    echo "CONTROL PASS     $label"
    printf '%s\n' "$output" | terminal_failure | grep -F -- "$expected" | head -1 | cut -c1-200 | sed 's/^/       detected: /'
  else
    echo "CONTROL FAILED   $label — the gate failed, but its terminal failure did not name: $expected"
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

TRANSPORT='    throw new ApiError("NETWORK_UNAVAILABLE", "The local Create Studio server did not answer, so this save could not be confirmed — it may or may not have been stored. Your work is still open in this editor. Download your draft before reopening the product, because reopening replaces what is on screen. Then check that the development server is still running and retry.");'

control "a transport failure surfaces the browser's own message" "$STUDIO" \
  "$TRANSPORT" \
  '    throw new ApiError("NETWORK_UNAVAILABLE", "Failed to fetch");' \
  "must not surface the browser's own message"

# The server commits before it builds its reply, so a connection lost after the commit leaves the
# write DONE and only the acknowledgement lost. This control restores the sentence this PR shipped
# with first — "Nothing was saved" — which is a false statement about the user's data in exactly
# that case, and is the mirror image of reporting an unconfirmed save as saved.
control "a lost acknowledgement is reported as a save that did not happen" "$STUDIO" \
  "$TRANSPORT" \
  '    throw new ApiError("NETWORK_UNAVAILABLE", "The local Create Studio server did not answer. Nothing was saved. Retry, or download your draft.");' \
  "must not claim nothing was saved"

# Browser storage can refuse the write — the draft effect catches that and carries on without
# persisting — so promising the draft is in the browser, and telling the user to reopen, can discard
# the only current copy. Found by Codex at 031960b3: the third iteration on this one sentence.
control "an unverifiable browser draft is promised to the user" "$STUDIO" \
  "$TRANSPORT" \
  '    throw new ApiError("NETWORK_UNAVAILABLE", "The local Create Studio server did not answer, so this save could not be confirmed. Your draft is still in this browser. Reopen the product to see what was stored.");' \
  "must not promise browser persistence it cannot verify"

control "Escape leaves the preview without returning focus" "$STUDIO" \
  '      if (event.key === "Escape") { if (preview) exitPreview(); setPan(false); drag.current = null; return; }' \
  '      if (event.key === "Escape") { setPreview(false); setPan(false); drag.current = null; return; }' \
  "must not drop focus to the document body"

control "committing a rename blurs the field" "$STUDIO" \
  'onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); renameProject(); } if (e.key === "Escape") setNameDraft(null); }} />' \
  'onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); renameProject(); (e.target as HTMLInputElement).blur(); } if (e.key === "Escape") setNameDraft(null); }} />' \
  "must keep focus in the project name field"

# Codex's exact-head review of #653 found this; measured at 1440x1000, the defect took the canvas
# from 864px to 378px when both panels were hidden, so hiding a panel to gain room lost more than
# half of it. Removing the column assignments must redden the gate, or the repair is unguarded.
control "the canvas has no column of its own when a panel is hidden" "$CSS" \
  '.studio-center { grid-column: 2; }' \
  '.studio-center { min-width: 0; }' \
  "must not shrink the canvas"

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
