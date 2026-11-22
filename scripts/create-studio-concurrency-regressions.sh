#!/usr/bin/env bash
# DO THE CONCURRENCY CONTROLS DETECT THE DEFECTS THEY WERE WRITTEN FOR? (M5.24, OD-16)
#
# A control that passes on a repaired tree has shown one thing: that it passes. It has not shown
# that it would have failed before the repair, and a control which cannot fail is indistinguishable
# from no control at all. Codex found exactly that shape in an earlier gate of mine: a control that
# RECORDED its rule's expected failure instead of INJECTING the defect, so it passed with the rule
# deleted.
#
# So each of the three repairs is REVERTED here, one at a time, and the matching arm must redden.
#
#   signal     the handler is put back to `trap teardown INT|TERM` — cleanup is called and then
#              RETURNS, so the batch resumes and recreates the worktree, store and marker it just
#              removed, and exits 0 as though nothing had happened.
#   ownership  the reaper's liveness predicate is put back to reaping by prefix alone, so a batch
#              started while another is running treats the running one as abandoned.
#   index      the index snapshot is put back to running `git write-tree` against the checkout's
#              own index, which takes `.git/index.lock`.
#
# WHERE IT RUNS. Every revert is applied inside a disposable `git worktree` detached at the
# candidate's HEAD, and the arm is run from THERE, so the mutated scripts under test are the
# worktree's own. The candidate is read (to create the worktree) and never written. Its HEAD, index
# and working-tree status are recorded before and asserted after, because "it cannot damage the
# candidate" is a claim that has to be measured too — a verification runner contaminated a
# candidate commit once already in this milestone.
#
# Usage: scripts/create-studio-concurrency-regressions.sh [signal|ownership|index ...]
#        REGRESSION_KEEP=1   leave each disposable worktree for inspection (always named)

set -uo pipefail

CAND="$(git rev-parse --show-toplevel)" || exit 2
cd "$CAND" || exit 2
HEAD_SHA="$(git rev-parse HEAD)"
STATUS_BEFORE="$(git status --porcelain)"
WORK="${REGRESSION_WORK:-/tmp/kinetix-m524/regressions}"
rm -rf "$WORK"; mkdir -p "$WORK" || exit 2
fails=0
checked=0

say() { printf '%s\n' "$*"; }
ok()  { printf 'REGRESSION DETECTED      %s\n' "$1"; checked=$((checked + 1)); }
bad() { printf 'REGRESSION NOT DETECTED  %s\n' "$1"; checked=$((checked + 1)); fails=$((fails + 1)); }

say "== do the controls detect their own defects? candidate $HEAD_SHA =="
say ""

# Each case: a label, the file to mutate, a python edit that must change the file, the arm to run,
# and the delays to use (the signal sweep is cut down here — the question is whether the arm fires
# at all, and a defect that survives seven delays survives two).
revert_signal() {
  python3 - "$1" <<'PY'
import sys
p = sys.argv[1] + "/scripts/create-studio-isolated-controls.sh"
s = open(p).read()
for want in ("trap 'on_signal INT 130' INT", "trap 'on_signal TERM 143' TERM"):
    assert want in s, f"anchor missing, cannot revert: {want}"
s = s.replace("trap 'on_signal INT 130' INT", "trap teardown INT")
s = s.replace("trap 'on_signal TERM 143' TERM", "trap teardown TERM")
open(p, "w").write(s)
PY
}

revert_ownership_group() {
  python3 - "$1" <<'PY'
import sys
p = sys.argv[1] + "/scripts/create-studio-reap-disposable.sh"
s = open(p).read()
want = '''owner_alive() {
  local base owner pid
  base="${1%.store}"
  owner="$base.owner"
  [ -f "$owner" ] || return 1'''
assert want in s, "anchor missing, cannot revert owner_alive"
# Reaping by prefix alone: every /tmp/kinetix-dw.* looks abandoned, live or not.
s = s.replace(want, '''owner_alive() {
  local base owner pid
  base="${1%.store}"
  owner="$base.owner"
  return 1
  [ -f "$owner" ] || return 1''')
open(p, "w").write(s)
PY
}

# THE REAPER HAS TWO INDEPENDENT DEFENCES, and one revert reaches only one of them. `owner_alive`
# is called ONLY by `group_is_wholly_abandoned`; the sweep carries its own copy of the liveness
# test inside `active()`. The first version of this prover reverted `owner_alive` alone and
# reported a detection on the group assertion while the sixty-reaper-run arm stayed green — which
# would have read as "the loop arm controls the ownership repair". It does not. Each defence gets
# its own case, so a detection names which one it is about.
revert_ownership_sweep() {
  python3 - "$1" <<'EDIT'
import sys
p = sys.argv[1] + "/scripts/create-studio-reap-disposable.sh"
s = open(p).read()
want = """  owner="$base.owner"
  [ -f "$owner" ] || return 1
  pid="$(awk 'NR==1{print $1}' "$owner" 2>/dev/null)"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1"""
assert want in s, "anchor missing, cannot revert active()'s liveness test"
# Reaping by prefix alone, as it did before the repair: a live batch looks abandoned. REAP_KEEP is
# left in place, because that mechanism predates the repair and removing it too would make this a
# stronger defect than the one that happened.
s = s.replace(want, '  owner="$base.owner"\n  return 1')
open(p, "w").write(s)
EDIT
}

revert_index() {
  python3 - "$1" <<'PY'
import sys
p = sys.argv[1] + "/scripts/create-studio-candidate-integrity.sh"
s = open(p).read()
want = 'tree="$(GIT_INDEX_FILE="$copy" git write-tree 2>/dev/null)" || { rm -f "$copy"; return 1; }'
assert want in s, "anchor missing, cannot revert index_tree"
# Back to write-tree against the checkout's own index, which takes .git/index.lock.
s = s.replace(want, 'tree="$(git write-tree 2>/dev/null)" || { rm -f "$copy"; return 1; }')
open(p, "w").write(s)
PY
}

# Back to `cp -al`: the worktree gets the candidate's own inodes, so a write through it reaches the
# candidate. The inputs signature goes too, because it was added in the same repair and leaving it
# would test only half of what was reverted.
revert_linkage() {
  python3 - "$1" <<'EDIT'
import sys
p = sys.argv[1] + "/scripts/create-studio-isolated-controls.sh"
s = open(p).read()
for want in ('cp -a "$CAND/$d/node_modules"', 'cp -a "$CAND/$d/dist"', 'INPUTS_AFTER="$(inputs_signature)"'):
    assert want in s, f"anchor missing, cannot revert: {want}"
s = s.replace('cp -a "$CAND/$d/node_modules"', 'cp -al "$CAND/$d/node_modules"')
s = s.replace('cp -a "$CAND/$d/dist"', 'cp -al "$CAND/$d/dist"')
s = s.replace('INPUTS_AFTER="$(inputs_signature)"', 'INPUTS_AFTER="$INPUTS_BEFORE"  # reverted: the inputs are not re-read')
open(p, "w").write(s)
EDIT
}

# Back to a single unchecked write. DENY_MARKER still resolves the path, so the denial is injectable
# in both versions — otherwise the reverted code could not be put in the failing situation at all,
# and the case would measure nothing.
revert_marker() {
  python3 - "$1" <<'EDIT'
import sys
p = sys.argv[1] + "/scripts/create-studio-isolated-controls.sh"
s = open(p).read()
start = s.index("publish_marker() {")
end = s.index("rmdir \"$ALLOC\" ||", start)
assert start < end, "anchors missing, cannot revert the marker publication"
s = s[:start] + 'printf \'%s %s %s\\n\' "$$" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$CAND" > "$MARKER" 2> /dev/null\n' + s[end:]
open(p, "w").write(s)
EDIT
}

run_case() {
  local label="$1" arm="$2" revert="$3" extra="${4:-}"
  local dw="$WORK/wt-$label" log="$WORK/$label.log"
  say "-- $label ---------------------------------------------------------------------"
  if ! git worktree add --detach "$dw" "$HEAD_SHA" > "$WORK/$label.worktree.log" 2>&1; then
    bad "$label: could not create the disposable worktree, so nothing was measured"
    sed 's/^/      /' "$WORK/$label.worktree.log"
    return
  fi
  if ! "$revert" "$dw" > "$WORK/$label.revert.log" 2>&1; then
    bad "$label: the revert did not apply — the anchor it edits has moved, so this case is stale"
    sed 's/^/      /' "$WORK/$label.revert.log"
    git worktree remove --force "$dw" > /dev/null 2>&1; return
  fi
  # The revert must be VISIBLE as a change to the worktree, and must be the only one. A no-op edit
  # would leave the arm testing the repaired code and reporting a pass as a detection.
  local changed
  changed="$(git -C "$dw" status --porcelain | wc -l)"
  printf '      disposable worktree %s — %s file(s) changed by the revert:\n' "$dw" "$changed"
  git -C "$dw" diff --stat | sed 's/^/        /'
  if [ "$changed" -ne 1 ]; then
    bad "$label: the revert changed $changed files, expected exactly 1"
    git worktree remove --force "$dw" > /dev/null 2>&1; return
  fi
  # And the integrity gate must already object, because the reverted line is one of the anchors.
  local anchors
  anchors="$(cd "$dw" && bash scripts/create-studio-candidate-integrity.sh assert 2>&1 | tail -1)"
  printf '      integrity gate in the worktree: %s\n' "$anchors"

  # The control must be present in the worktree, which means it must be COMMITTED. A missing
  # script exits 127, and a prover that read 127 as "the arm failed" would announce a detection for
  # a control that never ran — the precise fault this file exists to catch. Measured, first run.
  if [ ! -f "$dw/scripts/create-studio-concurrency-controls.sh" ]; then
    bad "$label: the controls script is not in the worktree at $HEAD_SHA — commit it first; nothing was measured"
    git worktree remove --force "$dw" > /dev/null 2>&1; return
  fi
  # A disposable worktree has no built dist, because dist is gitignored — and an arm with nothing
  # to write through cannot say anything about writing through. The candidate's dist is seeded into
  # the worktree so the arm has a real target, and the seeding is named, because a setup step that
  # happens silently is a setup step nobody checks.
  local seeded=0
  for d in packages/ui packages/tokens packages/iot; do
    if [ -d "$CAND/$d/dist" ] && [ ! -e "$dw/$d/dist" ]; then
      cp -a "$CAND/$d/dist" "$dw/$d/dist" && seeded=$((seeded + 1))
    fi
  done
  [ "$seeded" -gt 0 ] && printf '      seeded %s built dist tree(s) into the worktree, so the arm has a real target\n' "$seeded"
  local rc assertions_failed arm_ran unmeasurable
  ( cd "$dw" && eval "$extra" CONTROL_WORK="$WORK/work-$label" \
      timeout 900 bash scripts/create-studio-concurrency-controls.sh "$arm" ) > "$log" 2>&1
  rc=$?
  grep -E '^(PASS|FAIL)|exit=|round |sig=|batch exit|reaper:|poller:' "$log" | sed 's/^/      /' | tail -14
  assertions_failed="$(grep -c '^FAIL' "$log" || true)"
  arm_ran="$(grep -cE '^(PASS|FAIL)' "$log" || true)"
  unmeasurable="$(grep -c '^CANNOT MEASURE' "$log" || true)"
  # A detection is a FAILING ASSERTION, not a non-zero exit status. Non-zero can also mean the arm
  # could not start, refused, or timed out, and none of those is evidence that the control sees the
  # defect.
  if [ "$unmeasurable" -gt 0 ]; then
    # "It could not run" is not "it detected the defect", however red it looks.
    bad "$label: the '$arm' arm could not measure (exit $rc) — $(grep -m1 '^CANNOT MEASURE' "$log")"
  elif [ "$arm_ran" -eq 0 ]; then
    bad "$label: the '$arm' arm printed no assertion at all (exit $rc); it did not run, so nothing was measured"
  elif [ "$assertions_failed" -ge 1 ]; then
    ok "$label: $assertions_failed of $arm_ran assertion(s) in the '$arm' arm FAILED with the repair reverted (exit $rc)"
    grep '^FAIL' "$log" | sed 's/^/        /'
  else
    bad "$label: all $arm_ran assertion(s) in the '$arm' arm still passed with the repair reverted; it does not test this defect"
  fi
  if [ "${REGRESSION_KEEP:-}" = "1" ]; then
    printf '      kept: %s\n' "$dw"
  else
    git worktree remove --force "$dw" > /dev/null 2>&1 || rm -rf "$dw"
  fi
  git worktree prune
  say ""
}

requested=("$@")
[ "${#requested[@]}" -eq 0 ] && requested=(signal ownership-sweep ownership-group index linkage marker)
for a in "${requested[@]}"; do
  case "$a" in
    signal)    run_case signal    signal    revert_signal    'SIGNAL_DELAYS="0.15 0.50"' ;;
    ownership-sweep) run_case ownership-sweep ownership revert_ownership_sweep ;;
    ownership-group) run_case ownership-group ownership revert_ownership_group ;;
    index)     run_case index     index     revert_index ;;
    linkage)   run_case linkage   linkage   revert_linkage ;;
    marker)    run_case marker    marker    revert_marker ;;
    *) say "unknown case: $a"; exit 2 ;;
  esac
done

say "-- the candidate, after every case ----------------------------------------------"
bash scripts/create-studio-candidate-integrity.sh assert 2>&1 | tail -1
if [ "$(git rev-parse HEAD)" = "$HEAD_SHA" ] && [ "$(git status --porcelain)" = "$STATUS_BEFORE" ]; then
  say "PASS  the candidate is untouched: $HEAD_SHA, and its pre-existing modifications are unchanged"
else
  say "FAIL  the candidate CHANGED while the regression cases ran"
  fails=$((fails + 1))
fi

say ""
say "regression detection — $checked case(s), $fails not detected"
say "evidence: $WORK"
exit $((fails > 0))
