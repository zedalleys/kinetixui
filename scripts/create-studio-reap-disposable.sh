#!/usr/bin/env bash
# Reap what killed disposable-worktree batches leave behind (M5.24).
#
# A batch killed with SIGKILL cannot clean up after itself — that is inherent, and it is the same
# property that makes the isolation trustworthy: nothing the batch does depends on it being allowed
# to finish. But it means a killed batch can leave two things running or registered:
#
#   - its dev server, started under its own session so it can be killed as a group, which
#     therefore SURVIVES a kill of the orchestrator's group. Measured: two survived, serving deleted
#     worktrees, and with a stale server from an earlier session they held about 8.6 GB of a 15 GB
#     machine. Three browser-gate steps then timed out in a way that read as flaky gates.
#   - its worktree registration, and its directory.
#
# This script finds both and removes them, and it NAMES every one it removes. A leak that is
# cleaned up silently is a leak nobody learns from; one that is reported at the start of the next
# batch is a fact about the previous one.
#
# It only ever touches processes whose command line names a `/tmp/kinetix-dw.*` directory, and
# worktrees under that prefix. Nothing else on the machine is in scope.
#
# OWNERSHIP AND LIVENESS. Codex's P2 on PR #661: this reaped by prefix alone, so a batch started
# while another was running treated the running one as abandoned and destroyed its worktree and
# dev server. Each orchestrator now writes `<worktree>.owner` holding its own PID before creating
# the worktree, and a worktree whose owner process is still alive is SKIPPED and named. An
# abandoned batch has no live owner, which is exactly the case this script exists for.

set -uo pipefail

CAND="$(git rev-parse --show-toplevel)" || exit 2
reaped=0

registered="$(git -C "$CAND" worktree list --porcelain | awk '/^worktree /{print $2}' | grep '^/tmp/kinetix-dw\.' || true)"
keep="${REAP_KEEP:-}"   # a worktree the CALLER is about to use, never reaped
skipped=0

# A worktree is ACTIVE if its .owner file names a process that still exists. Anything else — no
# owner file, an owner that has gone, or a PID that has been reused by an unrelated process, which
# only ever makes this MORE conservative — is treated as abandoned.
announced=" "
active() {
  local dw="$1" owner pid
  [ -n "$keep" ] && [ "$dw" = "$keep" ] && return 0
  owner="$dw.owner"
  [ -f "$owner" ] || return 1
  pid="$(awk 'NR==1{print $1}' "$owner" 2>/dev/null)"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  # Announce each live batch once, however many of the sweeps below ask about it.
  case "$announced" in
    *" $dw "*) : ;;
    *)
      printf 'SKIPPED  %s — still owned by a live batch (pid %s, started %s)\n' \
        "$dw" "$pid" "$(awk 'NR==1{print $2}' "$owner" 2>/dev/null)"
      announced="$announced$dw "
      skipped=$((skipped + 1))
      ;;
  esac
  return 0
}

# --- processes serving a disposable worktree that is not the caller's ----------------------------
while IFS= read -r line; do
  [ -n "$line" ] || continue
  pid="${line%% *}"
  rest="${line#* }"; pgid="${rest%% *}"; args="${rest#* }"
  dw="$(printf '%s' "$args" | grep -oE '/tmp/kinetix-dw\.[A-Za-z0-9]+' | head -1)"
  [ -n "$dw" ] || continue
  active "$dw" && continue
  printf 'REAPED   process %s (group %s) serving %s%s\n' "$pid" "$pgid" "$dw" \
    "$([ -d "$dw" ] || printf ' — its worktree is already deleted')"
  kill -TERM -- "-$pgid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
  reaped=$((reaped + 1))
done < <(ps -eo pid=,pgid=,args= | sed 's/^ *//' | grep -E '/tmp/kinetix-dw\.' | grep -v -- "$0" | grep -v 'grep' || true)

if [ "$reaped" -gt 0 ]; then
  sleep 3
  # The SIGKILL sweep is per-process-group and must skip the groups of live batches, or it would
  # undo the liveness check above.
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    g="${line%% *}"; rest="${line#* }"
    dw="$(printf '%s' "$rest" | grep -oE '/tmp/kinetix-dw\.[A-Za-z0-9]+' | head -1)"
    [ -n "$dw" ] && active "$dw" > /dev/null && continue
    kill -9 -- "-$g" 2>/dev/null
  done < <(ps -eo pgid=,args= | sed 's/^ *//' | grep -E '/tmp/kinetix-dw\.' | grep -v grep || true)
fi

# --- worktrees left registered or on disk --------------------------------------------------------
for wt in $registered; do
  active "$wt" && continue
  printf 'REAPED   worktree %s\n' "$wt"
  git -C "$CAND" worktree remove --force "$wt" > /dev/null 2>&1 || rm -rf "$wt"
  reaped=$((reaped + 1))
done
for d in /tmp/kinetix-dw.*; do
  [ -d "$d" ] || continue
  active "$d" && continue
  printf 'REAPED   orphaned directory %s\n' "$d"
  rm -rf "$d"
  reaped=$((reaped + 1))
done
git -C "$CAND" worktree prune > /dev/null 2>&1

# An owner file whose batch is gone is itself residue.
for o in /tmp/kinetix-dw.*.owner; do
  [ -f "$o" ] || continue
  d="${o%.owner}"
  [ -d "$d" ] && continue
  pid="$(awk 'NR==1{print $1}' "$o" 2>/dev/null)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && continue
  printf 'REAPED   stale ownership marker %s\n' "$o"
  rm -f "$o"
  reaped=$((reaped + 1))
done

note=""
[ "$skipped" -gt 0 ] && note=" ($skipped still-active batch(es) left alone)"
if [ "$reaped" -eq 0 ]; then
  echo "nothing left behind by earlier batches$note"
else
  echo "reaped $reaped item(s) left behind by earlier, interrupted batches$note"
fi
exit 0
