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

set -uo pipefail

CAND="$(git rev-parse --show-toplevel)" || exit 2
reaped=0

registered="$(git -C "$CAND" worktree list --porcelain | awk '/^worktree /{print $2}' | grep '^/tmp/kinetix-dw\.' || true)"
keep="${REAP_KEEP:-}"   # a worktree the CALLER is about to use, never reaped

# --- processes serving a disposable worktree that is not the caller's ----------------------------
while IFS= read -r line; do
  [ -n "$line" ] || continue
  pid="${line%% *}"
  rest="${line#* }"; pgid="${rest%% *}"; args="${rest#* }"
  dw="$(printf '%s' "$args" | grep -oE '/tmp/kinetix-dw\.[A-Za-z0-9]+' | head -1)"
  [ -n "$dw" ] || continue
  [ -n "$keep" ] && [ "$dw" = "$keep" ] && continue
  printf 'REAPED   process %s (group %s) serving %s%s\n' "$pid" "$pgid" "$dw" \
    "$([ -d "$dw" ] || printf ' — its worktree is already deleted')"
  kill -TERM -- "-$pgid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
  reaped=$((reaped + 1))
done < <(ps -eo pid=,pgid=,args= | sed 's/^ *//' | grep -E '/tmp/kinetix-dw\.' | grep -v -- "$0" | grep -v 'grep' || true)

if [ "$reaped" -gt 0 ]; then
  sleep 3
  ps -eo pgid=,args= | grep -E '/tmp/kinetix-dw\.' | grep -v grep | awk '{print $1}' | sort -u |
    while read -r g; do kill -9 -- "-$g" 2>/dev/null; done
fi

# --- worktrees left registered or on disk --------------------------------------------------------
for wt in $registered; do
  [ -n "$keep" ] && [ "$wt" = "$keep" ] && continue
  printf 'REAPED   worktree %s\n' "$wt"
  git -C "$CAND" worktree remove --force "$wt" > /dev/null 2>&1 || rm -rf "$wt"
  reaped=$((reaped + 1))
done
for d in /tmp/kinetix-dw.*; do
  [ -d "$d" ] || continue
  [ -n "$keep" ] && [ "$d" = "$keep" ] && continue
  printf 'REAPED   orphaned directory %s\n' "$d"
  rm -rf "$d"
  reaped=$((reaped + 1))
done
git -C "$CAND" worktree prune > /dev/null 2>&1

if [ "$reaped" -eq 0 ]; then
  echo "nothing left behind by earlier batches"
else
  echo "reaped $reaped item(s) left behind by earlier, interrupted batches"
fi
exit 0
