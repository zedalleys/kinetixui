#!/usr/bin/env bash
# Interruption safety for Create Studio mutation runs (M5.24).
#
# WHAT IS BEING PROVEN. On 2026-11-22 a control runner was killed with SIGKILL while a deliberate
# mutation was in the working tree. SIGKILL runs no trap, so the mutation survived, was committed
# and was pushed. `create-studio-isolated-controls.sh` answers that by making the candidate
# immutable and giving each batch a disposable worktree. This script tries to break that claim.
#
# It interrupts a real isolated batch at six phases, with the same signal that caused the incident,
# and after each one asserts that the candidate's head, tree, index, working tree and fourteen
# source assertions are exactly as they were. Two different things get killed, because they fail
# differently:
#
#   runner       the orchestrator survives, so its post-batch gate MUST notice the residue the
#                killed runner left behind and MUST refuse to report the batch as certified.
#   orchestrator nothing cleans up at all — no trap, no teardown. The candidate must still be
#                pristine, and the leaked worktree must be visible rather than silent.
#
# Phases are reached by watching for real progress, not by sleeping for a guessed interval, so each
# interruption lands where it claims to. The phase a kill actually landed in is read back from the
# log and reported; a phase that could not be reached is reported as not reached, never as passed.

set -uo pipefail

CAND="$(git rev-parse --show-toplevel)" || exit 2
cd "$CAND" || exit 2
INTEGRITY="$CAND/scripts/create-studio-candidate-integrity.sh"
RUNNER="${INTERRUPT_RUNNER:-create-studio-error-boundary-controls.sh}"
WORK="${INTERRUPT_WORK:-/tmp/kinetix-m524/interruption}"
mkdir -p "$WORK"
SNAP="$WORK/candidate.snapshot"
failures=0
reached=0

say() { printf '%s\n' "$*"; }

bash "$INTEGRITY" record "$SNAP" > /dev/null || { say "the candidate does not satisfy its own assertions; refusing"; exit 1; }
say "== interruption safety, candidate $(git rev-parse HEAD) =="
say "   runner under test: $RUNNER"

# Any worktree this script leaks is its own business to clean up, but it is always named first.
# A killed orchestrator leaks its worktree AND its dev server, which runs in its own session and so
# survives the kill. The first version of this harness removed only the worktree, and left a dev
# server running on a deleted directory after every killed phase. The reaper removes both and names
# each, so the leak is part of the evidence rather than a slowdown in whatever runs next.
cleanup_leaks() {
  bash "$CAND/scripts/create-studio-reap-disposable.sh" | sed 's/^/       /'
}

# waits until $1 (a grep -E pattern) appears in the batch log, or until the batch ends
wait_for() {
  local pattern="$1" limit="${2:-240}" i=0
  while [ "$i" -lt "$limit" ]; do
    grep -qE "$pattern" "$LOG" 2>/dev/null && return 0
    kill -0 "$ORCH" 2>/dev/null || return 1
    sleep 1; i=$((i + 1))
  done
  return 1
}

# waits until the disposable worktree actually holds a mutation
wait_for_mutation() {
  local limit="${1:-240}" i=0 dw
  while [ "$i" -lt "$limit" ]; do
    dw="$(grep -oE '/tmp/kinetix-dw\.[A-Za-z0-9]+' "$LOG" 2>/dev/null | head -1)"
    if [ -n "$dw" ] && [ -d "$dw" ] && [ -n "$(git -C "$dw" status --porcelain 2>/dev/null)" ]; then
      printf '%s' "$dw"; return 0
    fi
    kill -0 "$ORCH" 2>/dev/null || return 1
    sleep 1; i=$((i + 1))
  done
  return 1
}

start_batch() {
  LOG="$WORK/$1.log"
  : > "$LOG"
  setsid bash -c "cd '$CAND' && exec bash scripts/create-studio-isolated-controls.sh '$RUNNER'" \
    > "$LOG" 2>&1 &
  ORCH=$!
}

# $1 label, $2 what was killed, $3 phase description
check_candidate() {
  local label="$1" killed="$2" phase="$3"
  wait 2>/dev/null
  if bash "$INTEGRITY" verify "$SNAP" > "$WORK/$label.integrity" 2>&1; then
    say "  CANDIDATE INTACT   $label — killed $killed $phase"
  else
    say "  CANDIDATE DAMAGED  $label — killed $killed $phase"
    sed 's/^/       /' "$WORK/$label.integrity"
    failures=$((failures + 1))
  fi
}

# ---------------------------------------------------------------------------------------------
# P1  before any mutation: the worktree exists, nothing has been changed in it yet
# ---------------------------------------------------------------------------------------------
start_batch p1
if wait_for 'node_modules and built dist hard-linked'; then
  kill -9 -- "-$ORCH" 2>/dev/null
  reached=$((reached + 1))
  check_candidate p1 "the orchestrator" "after the worktree was built, before any mutation"
else
  say "  NOT REACHED        p1 — the batch never reported a built worktree"; failures=$((failures + 1))
fi
cleanup_leaks

# ---------------------------------------------------------------------------------------------
# P2  after a mutation is on disk, before its test has finished — the incident's own moment
# ---------------------------------------------------------------------------------------------
start_batch p2
if DW="$(wait_for_mutation)"; then
  say "       mutation observed in $DW:"
  git -C "$DW" status --porcelain | sed 's/^/         /'
  kill -9 -- "-$ORCH" 2>/dev/null
  reached=$((reached + 1))
  check_candidate p2 "the orchestrator" "with a live mutation on disk (the incident's moment)"
  if [ -n "$(git -C "$DW" status --porcelain 2>/dev/null)" ]; then
    say "       as designed, the residue is in the DISPOSABLE worktree, not the candidate"
  fi
else
  say "  NOT REACHED        p2 — no mutation was observed in the worktree"; failures=$((failures + 1))
fi
cleanup_leaks

# ---------------------------------------------------------------------------------------------
# P3  during the test run, after at least one control has reported
# ---------------------------------------------------------------------------------------------
start_batch p3
if wait_for '^       CONTROL '; then
  kill -9 -- "-$ORCH" 2>/dev/null
  reached=$((reached + 1))
  check_candidate p3 "the orchestrator" "mid-batch, after a control had reported"
else
  say "  NOT REACHED        p3 — no control reported before the batch ended"; failures=$((failures + 1))
fi
cleanup_leaks

# ---------------------------------------------------------------------------------------------
# P4  the runner alone is killed mid-mutation. The orchestrator lives, so its post-batch gate is
#     the thing under test: it must see the residue and refuse to certify.
# ---------------------------------------------------------------------------------------------
start_batch p4
if DW="$(wait_for_mutation)"; then
  pkill -9 -f "$DW/scripts/$RUNNER" 2>/dev/null
  reached=$((reached + 1))
  say "       killed the runner only; the orchestrator continues"
  for _ in $(seq 1 180); do kill -0 "$ORCH" 2>/dev/null || break; sleep 1; done
  if grep -qE 'WORKTREE NOT RESTORED|WORKTREE SOURCE ASSERTIONS FAILED' "$WORK/p4.log"; then
    say "  GATE CAUGHT IT     p4 — the post-batch gate refused the checkout:"
    grep -E 'WORKTREE NOT RESTORED|WORKTREE SOURCE ASSERTIONS FAILED|^ *M ' "$WORK/p4.log" | head -5 | sed 's/^/       /'
  else
    say "  GATE MISSED IT     p4 — a killed runner's residue was NOT reported"
    tail -12 "$WORK/p4.log" | sed 's/^/       /'
    failures=$((failures + 1))
  fi
  if grep -q 'problems       0' "$WORK/p4.log"; then
    say "  CERTIFIED ANYWAY   p4 — the batch reported no problems despite the residue"
    failures=$((failures + 1))
  fi
  check_candidate p4 "the runner only" "leaving residue for the orchestrator's gate to find"
else
  say "  NOT REACHED        p4 — no mutation was observed in the worktree"; failures=$((failures + 1))
fi
cleanup_leaks

# ---------------------------------------------------------------------------------------------
# P5  during cleanup, once the post-batch integrity section has begun
# ---------------------------------------------------------------------------------------------
start_batch p5
if wait_for 'worktree source integrity'; then
  kill -9 -- "-$ORCH" 2>/dev/null
  reached=$((reached + 1))
  check_candidate p5 "the orchestrator" "during teardown, after the batch had finished"
else
  say "  NOT REACHED        p5 — the batch never reached its integrity section"; failures=$((failures + 1))
fi
cleanup_leaks

# ---------------------------------------------------------------------------------------------
# P6  after cleanup has completed: the batch is allowed to finish, and must leave nothing behind
# ---------------------------------------------------------------------------------------------
start_batch p6
for _ in $(seq 1 600); do kill -0 "$ORCH" 2>/dev/null || break; sleep 1; done
reached=$((reached + 1))
if grep -q 'disposable worktree destroyed' "$WORK/p6.log"; then
  say "       the batch destroyed its own worktree"
else
  say "  CLEANUP UNPROVEN   p6 — the batch did not report destroying its worktree"
  failures=$((failures + 1))
fi
leftover="$(git -C "$CAND" worktree list --porcelain | awk '/^worktree /{print $2}' | grep -c '^/tmp/kinetix-dw' || true)"
if [ "$leftover" != "0" ]; then
  say "  WORKTREE LEAKED    p6 — $leftover disposable worktree(s) still registered"
  failures=$((failures + 1))
fi
check_candidate p6 "nothing" "an uninterrupted batch, run to completion"
cleanup_leaks

say ""
say "phases reached: $reached of 6"
say "problems: $failures"
exit $((failures > 0))
