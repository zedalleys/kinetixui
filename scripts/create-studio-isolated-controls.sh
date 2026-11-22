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
# TEARDOWN_DONE makes this idempotent, because it is now called explicitly BEFORE the result is
# computed as well as from the trap. Codex's P2 on PR #661: the trap ran after
# `exit $((problems > 0))` had already been evaluated, so a `CLEANUP FAILED` incremented a counter
# nobody read and the batch still exited 0 — a leaked worktree, hard-linked to the candidate's
# node_modules, reported as a clean certification.
TEARDOWN_DONE=""
teardown() {
  [ -n "$TEARDOWN_DONE" ] && return
  TEARDOWN_DONE=1
  if [ -n "$DEV_PID" ]; then
    kill -- "-$DEV_PID" 2>/dev/null || kill "$DEV_PID" 2>/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$DEV_PID" 2>/dev/null || break; sleep 1; done
    kill -9 -- "-$DEV_PID" 2>/dev/null
    sleep 1
  fi
  if [ -n "$DW" ] && [ -d "$DW" ]; then
    if [ -n "${KEEP_WORKTREE:-}" ]; then
      say "KEEP_WORKTREE set — disposable worktree LEFT IN PLACE at $DW"
      say "  remove it with: git -C $CAND worktree remove --force $DW"
      return
    fi
    if git -C "$CAND" worktree remove --force "$DW" 2>"$EVIDENCE/cleanup-stderr.log"; then
      say "disposable worktree destroyed"
    else
      say "CLEANUP FAILED  could not remove the disposable worktree at $DW"
      sed 's/^/                /' "$EVIDENCE/cleanup-stderr.log" 2>/dev/null
      say "                it hard-links the candidate's node_modules; remove it by hand."
      problems=$((problems + 1))
    fi
  fi
  [ -n "$DW" ] && rm -rf "$DW.store" "$DW.owner"
  rm -f "$SNAP"
}
trap teardown EXIT INT TERM

# --- reap what interrupted batches left behind --------------------------------------------------
# A killed batch cannot clean up after itself. Its dev server, in its own session, survives, and
# measured leaks held about 8.6 GB of a 15 GB machine — enough that three browser-gate steps timed
# out in a way that read as flaky gates. Each one reaped is named, so a leak is a reported fact
# about the previous batch rather than a silent slowdown in this one.
rule "reap earlier interrupted batches"
bash "$CAND/scripts/create-studio-reap-disposable.sh"

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
# Claim it BEFORE it exists, so there is no window in which a concurrent batch's reaper could see
# an unowned worktree. Codex's P2 on PR #661: the reaper treated every /tmp/kinetix-dw.* as
# abandoned, so two batches running at once would destroy each other's test environment.
printf '%s %s %s\n' "$$" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$CAND" > "$DW.owner"
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
# `packages/*/dist` is gitignored, so a fresh worktree has none — and `apps/web`'s vitest global
# setup refuses to render components from an unstamped dist, which is the right guard and stops the
# suite before a single test runs. The dist is hard-linked from the candidate, which is sound
# because the worktree is at the candidate's exact HEAD: the stamp records a hash of the package
# source, so if a control ever mutated `packages/**` the stamp check would fail loudly rather than
# measure stale output.
for d in packages/ui packages/tokens packages/iot; do
  if [ -d "$CAND/$d/dist" ] && [ ! -e "$DW/$d/dist" ]; then
    cp -al "$CAND/$d/dist" "$DW/$d/dist" || {
      say "ABORTING: could not hard-link $d/dist into the worktree."; exit 1; }
  fi
done
say "node_modules and built dist hard-linked into the worktree"

# A worktree that is not a faithful copy of the candidate must stop the run BEFORE any mutation.
if ! (cd "$DW" && bash "$INTEGRITY" assert); then
  say "ABORTING: the disposable worktree does not satisfy the source assertions, so it is not a"
  say "faithful copy of the candidate and nothing measured in it would mean anything."
  exit 1
fi

# --- its own dev server --------------------------------------------------------------------------
# NO_DEV_SERVER=1 skips it, for steps that must not share `apps/web/.next` with `next dev` — the
# production build above all, which rewrites the directory a running dev server is serving from.
if [ -n "${NO_DEV_SERVER:-}" ]; then
  PORT="none"
  say "NO_DEV_SERVER set — no dev server for this batch"
else
PORT="$(node -e 'const s=require("net").createServer();s.listen(0,()=>{console.log(s.address().port);s.close()})')"
rule "dev server on $PORT (serving the worktree, not the candidate)"
# setsid, so the whole dev server process group can be killed. `npx next dev` spawns `next` as a
# CHILD: killing npx alone leaves next running, and on the first run that surviving process kept
# writing into the worktree while it was being removed, which deleted it halfway and made every
# later reading of that directory meaningless.
# The dev server needs `KINETIX_CREATE_DEV=1` — exactly as `create-studio.yml` starts it. Without
# it `/create/studio` renders an "in development" placeholder, and the API route refuses. Its store
# directory is per-worktree, so two batches cannot share saved product state.
# OUTSIDE the worktree. Inside it, the store showed up as `?? .create-store/` and the residue check
# correctly refused the batch — the harness had written into the disposable tree itself. The right
# answer was to move the store, not to teach the check to ignore untracked files.
DEV_DIR="$DW.store"
mkdir -p "$DEV_DIR"
setsid env KINETIX_CREATE_DEV=1 KINETIX_CREATE_DEV_DIR="$DEV_DIR" \
  bash -c "cd '$DW/apps/web' && exec npx next dev --hostname 127.0.0.1 -p $PORT" \
  > "$EVIDENCE/dw-dev-$PORT.log" 2>&1 &
DEV_PID=$!
# Readiness must require the EDITOR, not a 200. The placeholder page returns 200 too, so the first
# version of this probe reported "serving /create/studio" while serving a page with no editor on
# it, and four browser gates then failed for what looked like four product defects. A probe that
# cannot tell the difference between the thing and its placeholder is not a probe.
ready=0
for _ in $(seq 1 90); do
  body="$(curl -fsS "http://127.0.0.1:$PORT/create/studio" 2>/dev/null)"
  if printf '%s' "$body" | grep -q 'Create Studio is in development'; then
    say "ABORTING: the dev server is serving the placeholder, so KINETIX_CREATE_DEV did not reach it."
    exit 1
  fi
  if printf '%s' "$body" | grep -q 'create-studio'; then ready=1; break; fi
  kill -0 "$DEV_PID" 2>/dev/null || break
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  say "ABORTING: the worktree's dev server never served the Create Studio editor."
  tail -20 "$EVIDENCE/dw-dev-$PORT.log" | sed 's/^/       /'
  exit 1
fi
say "serving the Create Studio editor from the disposable worktree (store: $DEV_DIR)"
fi

# --- run the runners inside the worktree ---------------------------------------------------------
# Each argument is either a runner in `scripts/`, or `CMD:<shell command>` to run in the pristine
# worktree — which is how a regression matrix gets measured on a checkout that nothing has touched.
# Every step writes one line to the matrix receipt: the command, its exit status and its evidence
# file, so a later claim about this batch can be checked against what actually ran.
MATRIX="$EVIDENCE/matrix-$(date -u +%Y%m%dT%H%M%SZ).tsv"
printf 'commit\tstep\tcommand\texit\tevidence\n' > "$MATRIX"
step=0
for runner in "$@"; do
  step=$((step + 1))
  if [ "${runner#CMD:}" != "$runner" ]; then
    cmd="${runner#CMD:}"
    label="$(printf 'step%02d' "$step")"
    log="$EVIDENCE/$label.log"
    rule "$label: $cmd"
    # Both fixture names, deliberately. The vitest step that WRITES the export fixture reads
    # KINETIX_CREATE_EXPORT_FIXTURE; the gates that READ it take CREATE_EXPORT_FIXTURE. Forwarding
    # only the second left the fixture directory empty, the consumer page served 500s, and the M1
    # gate timed out on "Continue" — which I first misattributed to machine load.
    #
    # Forwarded ONLY when non-empty. Setting them to "" is not the same as leaving them unset: the
    # fixture test resolved an empty value as a relative path, wrote a whole consumer project into
    # apps/web and replaced the tracked apps/web/package.json, which then made the error-boundary
    # controls in the SAME batch report "the suite stayed green with the defect in place". A
    # verification step contaminating a later verification step is what this harness exists to stop,
    # and only the worktree integrity gate caught it. Measured both ways: empty -> 14 contaminated
    # paths with vitest still exit 0; unset -> 0 paths.
    fixture_env=()
    if [ -n "${CREATE_EXPORT_FIXTURE:-}" ]; then
      fixture_env+=( "CREATE_EXPORT_FIXTURE=$CREATE_EXPORT_FIXTURE" "KINETIX_CREATE_EXPORT_FIXTURE=$CREATE_EXPORT_FIXTURE" )
    fi
    if [ -n "${CREATE_REQUIRE_FIXTURE:-}" ]; then
      fixture_env+=( "CREATE_REQUIRE_FIXTURE=$CREATE_REQUIRE_FIXTURE" )
    fi
    ( cd "$DW" && env "CREATE_BASE=http://127.0.0.1:$PORT" KINETIX_CREATE_DEV=1 \
        "${fixture_env[@]}" bash -lc "$cmd" ) > "$log" 2>&1
    status=$?
    tail -6 "$log" | sed 's/^/       /'
  else
    base="$(basename "$runner")"
    cmd="scripts/$base"
    log="$EVIDENCE/${base%.sh}-isolated.log"
    rule "$base"
    ( cd "$DW" && CREATE_BASE="http://127.0.0.1:$PORT" KINETIX_CREATE_DEV=1 \
        CONTROL_ONLY="${CONTROL_ONLY:-}" bash "$DW/scripts/$base" ) > "$log" 2>&1
    status=$?
    grep -E '^CONTROL (PASS|FAILED|BROKEN)|^controls with problems|restored tree|tree restored|file restored|CONTROL_ONLY' "$log" | sed 's/^/       /'
  fi
  say "       exit=$status   evidence: $log"
  printf '%s\t%s\t%s\t%s\t%s\n' "$HEAD_SHA" "$step" "$cmd" "$status" "$log" >> "$MATRIX"
  [ "$status" -eq 0 ] || problems=$((problems + 1))
done
say ""
say "matrix receipt: $MATRIX"

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

# Teardown BEFORE the result is computed, so that a cleanup failure is part of the verdict rather
# than a line printed after it. The trap stays for the abnormal paths and is idempotent.
rule "teardown"
teardown

rule "summary"
say "candidate      $HEAD_SHA (immutable; nothing ran in it)"
say "problems       $problems"
exit $((problems > 0))
