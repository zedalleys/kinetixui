#!/usr/bin/env bash
# Run Create Studio mutation runners inside a DISPOSABLE worktree (M5.24).
#
# WHY. The four Create Studio control runners mutate tracked source and restore it with
# `git checkout --` from an EXIT trap. That design is sound until the process dies without running
# its trap. On 2026-11-22 a `SIGKILL` left the recovery Retry button replaced by a bare `<span>`;
# the mutation was committed, pushed, and reddened hosted `verify`. A trap cannot be the last line
# of defence, because the one signal that cannot be trapped is the one that caused the incident.
#
# THE CORRECTION is not to rewrite each runner's mutation logic — that logic is well tested, and
# rewriting it would mean re-earning every control's credibility. It is to change WHERE the runner
# executes. The candidate checkout becomes immutable: nothing runs in it. Each batch gets a
# throwaway `git worktree` at the candidate's exact HEAD, with its own dev server, and the runner
# mutates THAT. A killed runner can then only damage a directory whose entire purpose is to be
# destroyed.
#
#   candidate (immutable)  →  disposable worktree  →  mutate  →  collect evidence  →  destroy
#
# HOW A MIS-WIRED WORKTREE ANNOUNCES ITSELF, rather than passing quietly. If the worktree were not
# the thing being served, the mutations would be invisible to the browser gate, every control would
# report `the gate PASSED with the defect in place`, and the batch would fail loudly. A silent
# fail-open is therefore not available here: the controls' own detections are the proof that the
# disposable copy is what the dev server rendered. The source assertions are additionally run
# INSIDE the worktree before the batch, so a worktree that is not a faithful copy of the candidate
# stops the run before any mutation happens.
#
# Usage:
#   scripts/create-studio-isolated-controls.sh <runner.sh> [more-runners.sh ...]
#   KEEP_WORKTREE=1   leave the disposable worktree in place for diagnosis (printed, never hidden)
#   LEAVE_MUTATION=<file>|<from>|<to>
#                     deliberately leave a mutation behind in the disposable worktree, to prove the
#                     post-batch source-integrity gate rejects that checkout. The mandatory
#                     negative control for this script itself.
#   CONTROL_ONLY=...  passed through to a runner that supports it

set -uo pipefail

CAND="$(git rev-parse --show-toplevel)" || exit 2
cd "$CAND" || exit 2
INTEGRITY="$CAND/scripts/create-studio-candidate-integrity.sh"
EVIDENCE="${ISOLATED_EVIDENCE:-/tmp/kinetix-m524/evidence}"
mkdir -p "$EVIDENCE"

[ "$#" -ge 1 ] || { echo "usage: $0 <runner.sh> [...]"; exit 2; }

HEAD_SHA="$(git rev-parse HEAD)"
SNAP="$(mktemp)"
DW=""
PORT=""
DEV_PID=""
problems=0

say() { printf '%s\n' "$*"; }
rule() { printf '%s\n' "-- $* ------------------------------------------------------------" ; }

# --- teardown ----------------------------------------------------------------------------------
# Cleanup failure is reported, never swallowed: a worktree that would not go away is a finding, and
# a leaked one shares hard-linked node_modules with the candidate.
teardown() {
  if [ -n "$DEV_PID" ] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$DEV_PID" 2>/dev/null || break; sleep 1; done
    kill -9 "$DEV_PID" 2>/dev/null
  fi
  if [ -n "$DW" ] && [ -d "$DW" ]; then
    if [ -n "${KEEP_WORKTREE:-}" ]; then
      say "KEEP_WORKTREE set — disposable worktree LEFT IN PLACE at $DW"
      say "  remove it with: git -C $CAND worktree remove --force $DW"
      return
    fi
    if git -C "$CAND" worktree remove --force "$DW" 2>/dev/null; then
      say "disposable worktree destroyed"
    else
      say "CLEANUP FAILED  could not remove the disposable worktree at $DW"
      say "                it hard-links the candidate's node_modules; remove it by hand."
      problems=$((problems + 1))
    fi
  fi
  rm -f "$SNAP"
}
trap teardown EXIT INT TERM

# --- preflight on the candidate -----------------------------------------------------------------
rule "candidate preflight"
if ! bash "$INTEGRITY" record "$SNAP"; then
  say "ABORTING: the candidate failed its own integrity record."
  exit 1
fi

# --- build the disposable worktree ---------------------------------------------------------------
rule "disposable worktree"
DW="$(mktemp -d /tmp/kinetix-dw.XXXXXXXX)"
rmdir "$DW"
if ! git worktree add --detach "$DW" "$HEAD_SHA" 2>&1 | sed 's/^/       /'; then
  say "ABORTING: could not create the disposable worktree."
  exit 1
fi
say "worktree at $DW, detached at $HEAD_SHA"

# Hard-linked node_modules: same filesystem, so this costs ~1s and ~0 bytes. The relative symlinks
# pnpm writes inside node_modules resolve WITHIN the copy, so the worktree's own packages/** are
# what its app resolves — which is why mutations there would be visible too.
for d in . apps/web packages/ui packages/tokens packages/iot packages/cli packages/create-preset packages/create-theme packages/ui-angular; do
  if [ -d "$CAND/$d/node_modules" ] && [ ! -e "$DW/$d/node_modules" ]; then
    cp -al "$CAND/$d/node_modules" "$DW/$d/node_modules" || {
      say "ABORTING: could not hard-link $d/node_modules into the worktree."; exit 1; }
  fi
done
say "node_modules hard-linked into the worktree"

# A worktree that is not a faithful copy of the candidate must stop the run BEFORE any mutation.
if ! (cd "$DW" && bash "$INTEGRITY" assert); then
  say "ABORTING: the disposable worktree does not satisfy the source assertions, so it is not a"
  say "faithful copy of the candidate and nothing measured in it would mean anything."
  exit 1
fi

# --- its own dev server --------------------------------------------------------------------------
PORT="$(node -e 'const s=require("net").createServer();s.listen(0,()=>{console.log(s.address().port);s.close()})')"
rule "dev server on $PORT (serving the worktree, not the candidate)"
( cd "$DW/apps/web" && exec npx next dev -p "$PORT" ) > "$EVIDENCE/dw-dev-$PORT.log" 2>&1 &
DEV_PID=$!
ready=0
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/create/studio" 2>/dev/null; then ready=1; break; fi
  kill -0 "$DEV_PID" 2>/dev/null || break
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  say "ABORTING: the worktree's dev server never served /create/studio."
  tail -20 "$EVIDENCE/dw-dev-$PORT.log" | sed 's/^/       /'
  exit 1
fi
say "serving /create/studio from the disposable worktree"

# --- run the runners inside the worktree ---------------------------------------------------------
for runner in "$@"; do
  base="$(basename "$runner")"
  log="$EVIDENCE/${base%.sh}-isolated.log"
  rule "$base"
  ( cd "$DW" && CREATE_BASE="http://127.0.0.1:$PORT" KINETIX_CREATE_DEV=1 \
      CONTROL_ONLY="${CONTROL_ONLY:-}" bash "$DW/scripts/$base" ) > "$log" 2>&1
  status=$?
  grep -E '^CONTROL (PASS|FAILED|BROKEN)|^controls with problems|restored tree|tree restored|file restored|CONTROL_ONLY' "$log" | sed 's/^/       /'
  say "       exit=$status   evidence: $log"
  [ "$status" -eq 0 ] || problems=$((problems + 1))
done

# --- the mandatory negative control on THIS script ------------------------------------------------
if [ -n "${LEAVE_MUTATION:-}" ]; then
  rule "deliberate residue left in the disposable worktree"
  lm_file="${LEAVE_MUTATION%%|*}"; lm_rest="${LEAVE_MUTATION#*|}"
  lm_from="${lm_rest%%|*}"; lm_to="${lm_rest##*|}"
  python3 - "$DW/$lm_file" "$lm_from" "$lm_to" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
assert s.count(sys.argv[2]) == 1, f"anchor appears {s.count(sys.argv[2])} times"
p.write_text(s.replace(sys.argv[2], sys.argv[3]))
print(f"       left behind in the worktree: {sys.argv[1]}")
PY
fi

# --- the worktree must be clean before it is trusted ---------------------------------------------
# This is the gate the incident needed. A disposable checkout that still carries a mutation after
# its batch cannot be reported as certified, whether the residue came from a killed runner or was
# planted here on purpose.
rule "worktree source integrity"
dw_dirty="$(git -C "$DW" status --porcelain | sed 's/^/       /')"
if [ -n "$dw_dirty" ]; then
  say "WORKTREE NOT RESTORED — residue after the batch:"
  printf '%s\n' "$dw_dirty"
  problems=$((problems + 1))
fi
if ! (cd "$DW" && bash "$INTEGRITY" assert); then
  say "WORKTREE SOURCE ASSERTIONS FAILED — this checkout CANNOT be reported as certified."
  problems=$((problems + 1))
fi

# --- postflight on the candidate -----------------------------------------------------------------
rule "candidate postflight"
if ! bash "$INTEGRITY" verify "$SNAP"; then
  say "THE CANDIDATE CHANGED. This batch's certification evidence is invalid."
  problems=$((problems + 1))
fi

rule "summary"
say "candidate      $HEAD_SHA (immutable; nothing ran in it)"
say "problems       $problems"
exit $((problems > 0))
