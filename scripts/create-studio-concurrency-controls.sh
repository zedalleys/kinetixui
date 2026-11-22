#!/usr/bin/env bash
# DURABLE CONTROLS FOR THE THREE CONCURRENCY AND INTERRUPTION REPAIRS (M5.24, OD-16).
#
# The disposable-worktree harness was proved safe against INTERRUPTION — six SIGKILL phases, the
# candidate pristine after each. It was never proved safe against CONCURRENCY, and when it was
# reviewed, three of six findings were concurrency faults: a reaper that deleted a live batch's
# store while printing that it had spared it; a shared evidence directory that let one batch's
# receipt cite another commit's output; and a signal handler that called cleanup and RETURNED, so
# the batch resumed and recreated everything it had just removed.
#
# Those three were repaired and then demonstrated by hand, in a scratch directory, once. A
# demonstration that lives in a terminal is not a control: nothing re-runs it, and nothing notices
# when the repair is undone. This file is those demonstrations, committed, each arm printing the
# reading that decided it.
#
#   signal     INT and TERM at a sweep of delays. The batch must announce the interruption, exit
#              130 or 143, leave no worktree, no store, no ownership marker and no registration,
#              and must NOT print a clean receipt — an interrupted batch is not a result.
#   ownership  the reaper, run repeatedly against a live batch, must reap nothing; no
#              `/tmp/kinetix-dw.*` may ever be observable without its ownership marker; and an
#              abandoned process sharing a process group with a live one must not take the live
#              batch's processes down with it.
#   index      the candidate's index snapshot must not take `.git/index.lock`: many snapshots at
#              once must all succeed, and two simultaneous batches must both complete and agree on
#              the index tree.
#
# Every arm runs against `git rev-parse --show-toplevel`, so running this from a disposable worktree
# exercises THAT checkout's scripts and mutates nothing else. That is what makes the regression
# prover possible: it reverts one repair inside a throwaway worktree and requires the matching arm
# to redden there, while the candidate is never written to.
#
# Usage:
#   scripts/create-studio-concurrency-controls.sh [signal|ownership|index ...]   (default: all)
#   SIGNAL_DELAYS="0.05 0.3"   override the delay sweep (default seven delays per signal)
#   CONTROL_WORK=<dir>         where logs go (default /tmp/kinetix-m524/concurrency-controls)
#
# It refuses to run while another batch is live, because its readings are about what is on disk.

set -uo pipefail

CAND="$(git rev-parse --show-toplevel)" || exit 2
cd "$CAND" || exit 2
HEAD_SHA="$(git rev-parse HEAD)"
WORK="${CONTROL_WORK:-/tmp/kinetix-m524/concurrency-controls}"
rm -rf "$WORK"; mkdir -p "$WORK" || exit 2
INTEGRITY="$CAND/scripts/create-studio-candidate-integrity.sh"
ISO="$CAND/scripts/create-studio-isolated-controls.sh"
REAPER="$CAND/scripts/create-studio-reap-disposable.sh"
fails=0
arms=0

ok()   { printf 'PASS  %s\n' "$1"; arms=$((arms + 1)); }
bad()  { printf 'FAIL  %s\n' "$1"; arms=$((arms + 1)); fails=$((fails + 1)); }
# A THIRD VERDICT, because "it failed" and "it could not run" are different facts and collapsing
# them is how a regression prover comes to announce a detection for a missing precondition. It did:
# the linkage arm reported FAIL because a disposable worktree has no built dist, and that FAIL was
# counted as evidence the arm sees the defect. An unmeasurable arm exits 2, which the prover
# refuses to read as a detection.
unmeasured=0
cannot() { printf 'CANNOT MEASURE  %s\n' "$1"; unmeasured=$((unmeasured + 1)); }
say()  { printf '%s\n' "$*"; }
# `grep -c` prints the count AND exits 1 when the count is zero, so `grep -c … || printf 0` emits a
# second zero and the integer test that follows fails on "0\n0" — a FAIL reported about an arm that
# passed. Counting goes through this.
count_in() { if [ -f "$2" ]; then grep -c -- "$1" "$2" || true; else printf '0\n'; fi; }

stray() {
  for p in /tmp/kinetix-dw.* /tmp/kinetix-alloc.*; do [ -e "$p" ] && rm -rf "$p"; done
  git -C "$CAND" worktree prune
}

# The checkout's state BEFORE any arm runs. The assertion at the end is that the arms changed
# nothing, and that is not the same as "the tree is clean": this file may itself be uncommitted
# while it is being written, and an uncommitted control reporting the checkout as damaged would be
# a false alarm indistinguishable from the real one it exists to catch.
STATUS_BEFORE="$(git -C "$CAND" status --porcelain)"
live_now="$(ls -1d /tmp/kinetix-dw.*.owner 2>/dev/null | wc -l)"
if [ "$live_now" -gt 0 ]; then
  say "REFUSED  $live_now ownership marker(s) already on disk; another batch is live or was abandoned."
  say "         Run scripts/create-studio-reap-disposable.sh first. These arms read the filesystem,"
  say "         so a foreign batch would be attributed to them."
  exit 2
fi
stray

say "== concurrency and interruption controls, candidate $HEAD_SHA =="
say "   checkout under test: $CAND"
say ""

# =================================================================================================
arm_signal() {
  say "-- signal: an interrupted batch ends, announces itself, and leaves nothing -------"
  # THE LAUNCH MATTERS MORE THAN THE SIGNAL, and getting it wrong reads as a defect in the handler.
  # A command started asynchronously by a non-interactive shell inherits SIGINT as IGNORED, and bash
  # refuses to install a trap for a signal ignored on entry; `trap - INT` then restores that
  # inherited "ignored", so it resets nothing. Two earlier versions of this arm therefore reported
  # exit 0 and a clean receipt for every delay — about a batch that never received the signal. The
  # batch is started in the FOREGROUND, where nothing is ignored, and a timer started beforehand
  # reads its pid from a file. `setsid --wait` returns the script's status, not setsid's.
  local delays="${SIGNAL_DELAYS:-0.05 0.10 0.15 0.20 0.30 0.50 1.0}"
  local out="$WORK/signal" sig d rc said receipt markers registered pidfile
  mkdir -p "$out"
  pidfile="$out/batch.pid"
  local observed=0 good=0
  for sig in TERM INT; do
    local want=143; [ "$sig" = INT ] && want=130
    for d in $delays; do
      rm -rf "$out/w"; mkdir -p "$out/w"; rm -f "$pidfile"
      ( for _ in $(seq 1 200); do [ -s "$pidfile" ] && break; sleep 0.02; done
        sleep "$d"
        local p; p="$(cat "$pidfile" 2>/dev/null)"
        [ -n "$p" ] && kill -"$sig" "$p" 2> /dev/null ) &
      local timer=$!
      ISOLATED_EVIDENCE="$out/w" NO_DEV_SERVER=1 NO_WORKSPACE_INPUTS=1 \
        setsid --wait bash -c 'echo $$ > "$1"; exec bash "$2" "CMD:true"' _ "$pidfile" "$ISO" \
        > "$out/w/run.log" 2>&1
      rc=$?
      wait "$timer" 2> /dev/null
      said="$(count_in 'INTERRUPTED by SIG' "$out/w/run.log")"
      receipt="$(count_in 'candidate unchanged' "$out/w/run.log")"
      markers="$(ls -1 /tmp/kinetix-dw.*.owner 2> /dev/null | wc -l)"
      registered="$(git -C "$CAND" worktree list | grep -c 'kinetix-dw' || true)"
      cp "$out/w/run.log" "$out/$sig-$d.log"
      # A batch that had already finished before the signal arrived is not an observation about the
      # handler. It is counted and named, never scored.
      if [ "$rc" -eq 0 ] && [ "$said" -eq 0 ]; then
        printf '      sig=%-4s delay=%-5s exit=0 — completed before the signal landed (not an observation)\n' "$sig" "$d"
        stray; continue
      fi
      observed=$((observed + 1))
      if [ "$rc" -eq "$want" ] && [ "$said" -ge 1 ] && [ "$receipt" -eq 0 ] \
         && [ "$markers" -eq 0 ] && [ "$registered" -eq 0 ]; then
        good=$((good + 1))
        printf '      sig=%-4s delay=%-5s exit=%-3s announced=%s clean_receipt=%s markers=%s registered=%s\n' \
          "$sig" "$d" "$rc" "$said" "$receipt" "$markers" "$registered"
      else
        printf '      sig=%-4s delay=%-5s exit=%-3s (want %s) announced=%s clean_receipt=%s markers=%s registered=%s  <-- WRONG\n' \
          "$sig" "$d" "$rc" "$want" "$said" "$receipt" "$markers" "$registered"
      fi
      stray
    done
  done
  if [ "$observed" -eq 0 ]; then
    bad "signal: no delay in the sweep delivered a signal to a running batch; this arm measured nothing"
  elif [ "$good" -eq "$observed" ]; then
    ok "signal: $good of $observed delivered signals ended the batch with the right status, an announcement, no clean receipt and no residue"
  else
    bad "signal: only $good of $observed delivered signals behaved correctly"
  fi
}

# =================================================================================================
arm_ownership() {
  say "-- ownership: a live batch is never reaped, and is never observable unowned ------"
  local out="$WORK/ownership"; mkdir -p "$out/b"
  # The reaper runs in a tight loop for the whole life of a real batch, and a second loop watches
  # for the window the repair closed: a `/tmp/kinetix-dw.*` directory on disk with no ownership
  # marker beside it. Before the repair the marker was written after `git worktree add`, so that
  # window existed on every batch and a concurrent reaper could enter it.
  ( for _ in $(seq 1 60); do bash "$REAPER" >> "$out/reaper.log" 2>&1; done ) & local rl=$!
  ( unowned=0
    for _ in $(seq 1 4000); do
      for d in /tmp/kinetix-dw.*; do
        [ -d "$d" ] || continue
        case "$d" in *.store) continue ;; esac
        [ -f "$d.owner" ] || { unowned=$((unowned + 1)); printf 'UNOWNED %s\n' "$d" >> "$out/unowned.log"; }
      done
    done
    printf '%s\n' "$unowned" > "$out/unowned-count" ) & local po=$!
  ISOLATED_EVIDENCE="$out/b" NO_DEV_SERVER=1 bash "$ISO" "CMD:sleep 20" > "$out/batch.log" 2>&1
  local rc=$?
  wait "$po" 2> /dev/null; kill "$rl" 2> /dev/null; wait "$rl" 2> /dev/null
  local unowned reaped_wt reaped_dir skipped runs
  unowned="$(cat "$out/unowned-count" 2> /dev/null || echo '?')"
  reaped_wt="$(count_in 'REAPED   worktree /tmp/kinetix-dw' "$out/reaper.log")"
  reaped_dir="$(count_in 'REAPED   orphaned directory' "$out/reaper.log")"
  skipped="$(count_in 'SKIPPED' "$out/reaper.log")"
  runs="$(count_in 'nothing left behind\|still-active' "$out/reaper.log")"
  printf '      batch exit=%s ; reaper: %s runs, SKIPPED %s, reaped worktrees %s, reaped orphan dirs %s\n' \
    "$rc" "$runs" "$skipped" "$reaped_wt" "$reaped_dir"
  printf '      poller: %s unowned /tmp/kinetix-dw.* sightings\n' "$unowned"
  if [ "$rc" -eq 0 ] && [ "$reaped_wt" -eq 0 ] && [ "$reaped_dir" -eq 0 ]; then
    ok "ownership: the batch completed and no reaper run removed anything of its own"
  else
    bad "ownership: exit=$rc reaped_worktrees=$reaped_wt reaped_dirs=$reaped_dir"
  fi
  if [ "$unowned" = "0" ]; then
    ok "ownership: an unowned /tmp/kinetix-dw.* was never observable, over roughly 4000 polling passes"
  else
    bad "ownership: $unowned unowned sightings — the allocation window is open again"
  fi
  if grep -q 'candidate unchanged' "$out/batch.log"; then
    ok "ownership: the batch's own postflight reports the candidate unchanged"
  else
    bad "ownership: the batch's postflight is not clean"
  fi
  stray

  # The group hazard, separately: the reaper's cleanup of an abandoned batch signals a process
  # group, and two orchestrators started from a non-job-controlling shell SHARE one. `exec -a` is
  # how each decoy genuinely names a worktree in `ps args=`; passing the path as an argument to
  # sleep instead makes both decoys exit at once, and the control then measures nothing.
  local A=/tmp/kinetix-dw.ControlAbandoned B=/tmp/kinetix-dw.ControlLive
  rm -rf "$A" "$B" "$A.owner" "$B.owner"; mkdir -p "$A" "$B"
  setsid bash -c '
    bash -c "exec -a \"node /tmp/kinetix-dw.ControlAbandoned/server.mjs\" sleep 600" & a=$!
    bash -c "exec -a \"node /tmp/kinetix-dw.ControlLive/server.mjs\" sleep 600" & b=$!
    printf "%s %s %s\n" "$(ps -o pgid= -p $$ | tr -d " ")" "$a" "$b" > "$1"
    wait' _ "$out/grp.info" > /dev/null 2>&1 &
  local waited=0
  while [ ! -s "$out/grp.info" ] && [ "$waited" -lt 100 ]; do sleep 0.1; waited=$((waited + 1)); done
  local pgid aban live
  read -r pgid aban live < "$out/grp.info" 2> /dev/null || true
  if [ -z "${live:-}" ]; then
    bad "ownership: the shared-group control could not start its decoys, so it measured nothing"
  else
    printf '%s %s %s\n' "$live" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$CAND" > "$B.owner"
    printf '      shared group %s — abandoned %s, live %s (owner marker written for the live one)\n' "$pgid" "$aban" "$live"
    bash "$REAPER" > "$out/group-reaper.log" 2>&1
    sleep 1
    if kill -0 "$live" 2> /dev/null && [ -d "$B" ]; then
      ok "ownership: an abandoned batch sharing one process group with a live batch was reaped without taking the live batch's process or worktree with it"
    else
      bad "ownership: the live batch did not survive the reaping of its group-mate (process $(kill -0 "$live" 2>/dev/null && echo alive || echo dead), worktree $([ -d "$B" ] && echo present || echo deleted))"
    fi
    pkill -f 'kinetix-dw.ControlAbandoned' 2> /dev/null
    pkill -f 'kinetix-dw.ControlLive' 2> /dev/null
  fi
  rm -rf "$A" "$B" "$A.owner" "$B.owner"
  stray
}

# =================================================================================================
arm_index() {
  say "-- index: the snapshot takes no lock, and two batches can run at once -----------"
  local out="$WORK/index"; mkdir -p "$out"
  # `git write-tree` writes `.git/index.lock`, so two snapshots at once make one of them fail and
  # the batch then reports a clean candidate as CHANGED. Measured on this harness: a passing
  # candidate called dirty, for no reason in the diff. The snapshot now runs write-tree against a
  # COPY of the index. Many at once is the direct reading of that.
  local rounds=3 width=12 round i bad_rounds=0 unreadable=0 failed_total=0
  for round in $(seq 1 "$rounds"); do
    local pids=() statuses=0
    for i in $(seq 1 "$width"); do
      ( bash "$INTEGRITY" record "$out/snap-$round-$i" > "$out/rec-$round-$i.log" 2>&1 ) &
      pids+=($!)
    done
    for p in "${pids[@]}"; do wait "$p" || statuses=$((statuses + 1)); done
    failed_total=$((failed_total + statuses))
    printf '      round %s: %s concurrent snapshots, %s failed\n' "$round" "$width" "$statuses"
    [ "$statuses" -eq 0 ] || bad_rounds=$((bad_rounds + 1))
  done
  # ATTRIBUTING THE FAILURE, and looking where the message actually goes. The first version of this
  # arm grepped the run logs for `index.lock`, found none, and printed "0 logs mention index.lock"
  # beside three rounds of failures — which reads as "the lock was not the cause" when the truth is
  # that neither file could ever have said so. Two reasons, both measured by reverting the repair
  # and reading every file the run touched: the snapshot runs `git write-tree` with `2>/dev/null`,
  # so git's lock message is discarded at the source, and the diagnostic the script prints instead
  # goes to stdout, which for `record` IS the snapshot file.
  unreadable="$(grep -l 'COULD NOT READ THE INDEX' "$out"/snap-* "$out"/rec-*.log 2> /dev/null | wc -l)"
  # And they must agree: a snapshot that succeeded by reading a DIFFERENT tree would be worse than
  # one that failed, because it would be believed.
  # ONLY the index field. Counting every 40-hex token in the snapshots counts the commit SHA too,
  # so this reported "all agreed on one tree (2 distinct)" — a sentence at odds with its own
  # number, about a reading the assertion did not even use.
  local trees
  trees="$(awk '$1 == "index" {print $2}' "$out"/snap-* 2> /dev/null | sort -u | wc -l)"
  if [ "$bad_rounds" -eq 0 ] && [ "$trees" -eq 1 ]; then
    ok "index: $((rounds * width)) concurrent index snapshots all succeeded, and every one recorded the same index tree"
  elif [ "$bad_rounds" -eq 0 ]; then
    # Worse than a failure, because it would be believed: a snapshot that succeeded while reading a
    # different tree.
    bad "index: all $((rounds * width)) concurrent snapshots succeeded but recorded $trees different index trees"
  else
    bad "index: $failed_total of $((rounds * width)) concurrent snapshots failed across $bad_rounds of $rounds rounds; $unreadable of them could not read the index (git's own lock message is discarded by the snapshot, so the lock cannot be named from here)"
  fi

  # Two real batches, started together.
  ISOLATED_EVIDENCE="$out/b1" NO_DEV_SERVER=1 bash "$ISO" "CMD:sleep 30" > "$out/b1.log" 2>&1 & local p1=$!
  ISOLATED_EVIDENCE="$out/b2" NO_DEV_SERVER=1 bash "$ISO" "CMD:sleep 30" > "$out/b2.log" 2>&1 & local p2=$!
  printf '      two batches launched within the same second (pids %s %s)\n' "$p1" "$p2"
  local waited=0
  while [ "$(ls -1 /tmp/kinetix-dw.*.owner 2> /dev/null | wc -l)" -lt 2 ] && [ "$waited" -lt 60 ]; do
    sleep 1; waited=$((waited + 1))
  done
  local markers; markers="$(ls -1 /tmp/kinetix-dw.*.owner 2> /dev/null | wc -l)"
  [ "$markers" -eq 2 ] && ok "index: both live batches wrote their own ownership marker" \
                       || bad "index: expected 2 ownership markers while both batches ran, found $markers"
  wait "$p1"; local r1=$?
  wait "$p2"; local r2=$?
  printf '      batch exits: b1=%s b2=%s\n' "$r1" "$r2"
  if [ "$r1" -eq 0 ] && [ "$r2" -eq 0 ]; then
    ok "index: two simultaneous batches both completed"
  else
    bad "index: simultaneous batches exited b1=$r1 b2=$r2"
  fi
  if grep -q 'candidate unchanged' "$out/b1.log" && grep -q 'candidate unchanged' "$out/b2.log"; then
    ok "index: both postflights report the candidate unchanged"
  else
    bad "index: a postflight did not report the candidate unchanged — b1 $(grep -q 'candidate unchanged' "$out/b1.log" && echo clean || grep -m1 -hE 'COULD NOT|INTEGRITY FAIL|ABORTING' "$out/b1.log" || echo 'not clean, no reason printed'), b2 $(grep -q 'candidate unchanged' "$out/b2.log" && echo clean || grep -m1 -hE 'COULD NOT|INTEGRITY FAIL|ABORTING' "$out/b2.log" || echo 'not clean, no reason printed')"
  fi
  # Evidence must not cross: one batch citing the other's directory is how a receipt comes to
  # present another run's output as its own.
  if grep -q "$out/b2" "$out/b1.log" || grep -q "$out/b1" "$out/b2.log"; then
    bad "index: one batch's log names the other's evidence directory"
  else
    ok "index: neither batch read or wrote the other's evidence directory"
  fi
  stray
}

# =================================================================================================
arm_linkage() {
  say "-- linkage: a write through the worktree must not reach the candidate ----------"
  local out="$WORK/linkage"; mkdir -p "$out/b"
  # THE INPUTS ARE BORROWED, AND BORROWED USED TO MEAN SHARED. `cp -al` gave the worktree the
  # candidate's own inodes for node_modules and packages/*/dist, so an append or a truncation
  # through the worktree's path changed the CANDIDATE's bytes — and since those paths are
  # gitignored, the postflight could not see it and printed `candidate unchanged`. Reported by the
  # owner; reproduced here before the repair: one append changed packages/ui/dist/index.js in the
  # candidate, 63 assertions still "held", exit 0.
  local dist="$CAND/packages/ui/dist/index.js"
  local nm="$CAND/node_modules/.modules.yaml"
  if [ ! -f "$dist" ]; then
    cannot "linkage: $dist is not present, so a write-through has nothing to reach — build the packages, or seed the checkout's dist, before running this arm"
    return
  fi
  local dist_before nm_before dist_after nm_after
  dist_before="$(sha256sum "$dist" | awk '{print $1}')"
  nm_before="$([ -f "$nm" ] && sha256sum "$nm" | awk '{print $1}' || echo absent)"
  printf '      candidate before: dist %s, node_modules %s\n' "${dist_before:0:12}" "${nm_before:0:12}"
  ISOLATED_EVIDENCE="$out/b" NO_DEV_SERVER=1 bash "$ISO" \
    "CMD:printf '/* written through the worktree */\n' >> packages/ui/dist/index.js; printf 'x' >> node_modules/.modules.yaml; true" \
    > "$out/batch.log" 2>&1
  local rc=$?
  dist_after="$(sha256sum "$dist" | awk '{print $1}')"
  nm_after="$([ -f "$nm" ] && sha256sum "$nm" | awk '{print $1}' || echo absent)"
  printf '      candidate after:  dist %s, node_modules %s ; batch exit=%s\n' "${dist_after:0:12}" "${nm_after:0:12}" "$rc"
  if [ "$dist_after" = "$dist_before" ] && [ "$nm_after" = "$nm_before" ]; then
    ok "linkage: a write through the worktree into the built output and into node_modules left the candidate's bytes identical"
  else
    bad "linkage: THE CANDIDATE'S BYTES CHANGED — dist $([ "$dist_after" = "$dist_before" ] && echo same || echo CHANGED), node_modules $([ "$nm_after" = "$nm_before" ] && echo same || echo CHANGED)"
  fi
  # And the batch must have SAID so, because a correct outcome that the receipt cannot vouch for is
  # the same fail-open in a better mood.
  if grep -q 'gitignored inputs unchanged' "$out/batch.log"; then
    ok "linkage: the batch signed the candidate's gitignored inputs and reported them unchanged"
  else
    bad "linkage: the batch's receipt does not vouch for the gitignored inputs — $(grep -m1 'gitignored inputs' "$out/batch.log" || echo 'no signature line at all')"
  fi
  if [ "$rc" -eq 0 ]; then
    ok "linkage: the batch completed (exit 0) — the writes went to private copies, not to the candidate"
  else
    bad "linkage: the batch exited $rc; $(grep -m1 -E 'ABORTING|CHANGED' "$out/batch.log" || echo 'no reason printed')"
  fi
  stray
}

# =================================================================================================
arm_marker() {
  say "-- marker: no ownership marker, no registration, no command --------------------"
  local out="$WORK/marker"; mkdir -p "$out/b"
  # A batch with no ownership marker reads as ABANDONED, so the reaper may destroy its worktree
  # while it runs. The marker write had its status unchecked, so a denied path left the batch
  # registering a worktree, running its command and exiting 0 — reported by the owner. The marker
  # is now published atomically and checked, before registration.
  #
  # DENY_MARKER points the publication at a path that cannot exist, so the real write fails with a
  # real errno on the real code path, rather than the control asserting that a branch exists.
  local sentinel="$out/COMMAND-RAN"
  rm -f "$sentinel"
  local before_reg; before_reg="$(git -C "$CAND" worktree list | grep -c 'kinetix-dw' || true)"
  DENY_MARKER=1 NO_WORKSPACE_INPUTS=1 NO_DEV_SERVER=1 ISOLATED_EVIDENCE="$out/b" \
    bash "$ISO" "CMD:touch $sentinel" > "$out/batch.log" 2>&1
  local rc=$?
  local after_reg markers ran
  after_reg="$(git -C "$CAND" worktree list | grep -c 'kinetix-dw' || true)"
  markers="$(ls -1 /tmp/kinetix-dw.*.owner 2> /dev/null | wc -l)"
  ran="$([ -e "$sentinel" ] && echo yes || echo no)"
  printf '      exit=%s registered=%s->%s markers=%s command_ran=%s\n' "$rc" "$before_reg" "$after_reg" "$markers" "$ran"
  grep -m2 -E 'ABORTING|could not publish' "$out/batch.log" | sed 's/^/      /'
  if [ "$rc" -ne 0 ] && [ "$after_reg" -eq "$before_reg" ] && [ "$ran" = "no" ] && [ "$markers" -eq 0 ]; then
    ok "marker: a denied publication gave exit $rc, no registration, no command execution and no marker left behind"
  else
    bad "marker: exit=$rc registered=$before_reg->$after_reg command_ran=$ran markers=$markers — a batch without an owner got as far as $([ "$ran" = yes ] && echo 'running its command' || echo 'registering a worktree')"
  fi
  rm -f "$sentinel"
  stray
}

requested=("$@")
[ "${#requested[@]}" -eq 0 ] && requested=(signal ownership index linkage marker)
for a in "${requested[@]}"; do
  case "$a" in
    signal) arm_signal ;;
    ownership) arm_ownership ;;
    index) arm_index ;;
    linkage) arm_linkage ;;
    marker) arm_marker ;;
    *) say "unknown arm: $a"; exit 2 ;;
  esac
  say ""
done

say "-- the checkout under test, after every arm -------------------------------------"
bash "$INTEGRITY" assert 2>&1 | tail -1
STATUS_AFTER="$(git -C "$CAND" status --porcelain)"
if [ "$(git -C "$CAND" rev-parse HEAD)" = "$HEAD_SHA" ] && [ "$STATUS_AFTER" = "$STATUS_BEFORE" ]; then
  if [ -n "$STATUS_BEFORE" ]; then
    ok "the arms changed nothing: still $HEAD_SHA, and the $(printf '%s\n' "$STATUS_BEFORE" | wc -l) pre-existing modification(s) are exactly as they were"
  else
    ok "the checkout under test is unchanged: $HEAD_SHA, working tree clean"
  fi
else
  bad "the checkout under test CHANGED while its own controls ran: $(diff <(printf '%s\n' "$STATUS_BEFORE") <(printf '%s\n' "$STATUS_AFTER") | tr '\n' ' ')"
fi

say ""
say "concurrency controls — ${#requested[@]} arm group(s), $arms assertions, $fails failure(s), $unmeasured unmeasurable"
say "evidence: $WORK"
# 2 is "an arm could not run": distinct from 1, which is "an arm ran and found a problem". A caller
# that cannot tell those apart cannot use either.
if [ "$fails" -gt 0 ]; then exit 1; fi
if [ "$unmeasured" -gt 0 ]; then exit 2; fi
exit 0
