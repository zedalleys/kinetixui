#!/usr/bin/env bash
# Candidate integrity gate for Create Studio certification batches (M5.24).
#
# WHY THIS EXISTS. The Create Studio negative-control runners mutate tracked source in the working
# tree and restore it with `git checkout --` from an EXIT trap. On 2026-11-22 one of those runners
# was killed with SIGKILL, which runs no trap, so the deliberate mutation it had just made — the
# recovery Retry `Button` replaced by a bare `<span>` — survived the run, was swept into a commit
# by `git add -A`, pushed, and reddened hosted `verify`. Nothing in the repository could see it:
# the mutation is syntactically valid, typechecks, and only one unit test knows the difference.
#
# This gate is the thing that would have caught it. It records the candidate's exact identity
# before a certification batch and re-checks it afterwards, and it asserts positively that a set of
# load-bearing source lines are PRESENT rather than merely that the tree is clean — because a
# committed mutation IS a clean tree.
#
#   record  <snapshot>   write the candidate's identity and assert the required source
#   verify  <snapshot>   re-check against that snapshot; any drift fails
#   assert               run the source assertions alone (usable on any checkout)
#
# A failed `verify` invalidates that batch's certification evidence. This script never restores
# anything: silently repairing an unexpected change and reporting success is the failure mode it
# exists to prevent.

set -uo pipefail

MODE="${1:-}"
SNAP="${2:-}"
cd "$(git rev-parse --show-toplevel)" || exit 2

fail=0
note() { printf '%s\n' "$*"; }
bad() { printf 'INTEGRITY FAIL  %s\n' "$*"; fail=$((fail + 1)); }

# --- the required source assertions -------------------------------------------------------------
# Each entry is  <file>|<fixed string that must appear>|<what it protects>.
# These are the lines a mutation runner replaces, plus the assertions a gate would stop being able
# to make if its own mutation residue were committed. A missing one means either a killed runner's
# residue or a repair that was reverted; both must stop certification, so neither is tolerated.
assertions() {
  cat <<'ASSERTIONS'
apps/web/src/app/create/studio/error.tsx|<Button onClick={reset}>Try the editor again</Button>|the recovery Retry button (replaced by a bare <span> by the recovery-exit control)
apps/web/src/app/create/studio/error.tsx|<a href="/create/studio">Reload Create Studio</a>|#655's document navigation out of the error boundary (downgraded to next/link by its control)
apps/web/src/components/create-studio/create-studio.tsx|REJECTED_SAVE_CODES.has(error.code) ? "rejected" : "unconfirmed"|the three-outcome save classification (flattened to one outcome by two controls)
apps/web/src/components/create-studio/create-studio.tsx|outcome === "rejected" && earlierOpen|M5.23: a rejection settles nothing about an earlier open save
apps/web/src/components/create-studio/create-studio.tsx|pendingSaves.current = next.slice(-PENDING_SAVE_LIMIT)|the bounded attempt history
apps/web/src/components/create-studio/create-studio.tsx|if (next.length > PENDING_SAVE_LIMIT) pendingTruncated.current = true|the record that the bound dropped an attempt
apps/web/src/components/create-studio/create-studio.tsx|pendingSaves.current = []; pendingTruncated.current = false;|Codex at c0218261: a confirmed save settles the truncation marker too
apps/web/src/components/create-studio/create-studio.tsx|staleDraft|the guard that disables saving over a revision the work was not based on
scripts/create-studio-save-state-browser.mjs|earlier save is still unconfirmed|the gate assertion that a rejected retry keeps earlier uncertainty
scripts/create-studio-save-state-browser.mjs|earlier save may have committed|the gate assertion a corrected control exposed as missing
scripts/create-studio-save-state-browser.mjs|cannot be determined|can no longer account|the gate assertion that a truncated history refuses to conclude
scripts/create-studio-workspace-browser.mjs|after a clean save, before the rejected one|Codex at c0218261: the 413 must announce from a state where nothing is already failed
scripts/create-studio-consumer-build.mjs|the gate makes no assertion about the supported ref|#651: an unrecognised node ref must fail closed
scripts/create-studio-consumer-build.mjs|gotoMounted|#651: a control navigation must be read after React commits
ASSERTIONS
}

run_assertions() {
  local file needle label line
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    file="${line%%|*}"
    label="${line##*|}"
    needle="${line#*|}"; needle="${needle%|*}"
    if [ ! -f "$file" ]; then
      bad "$file is missing — cannot assert: $label"
      continue
    fi
    # An alternation is written as  a|b  inside the needle field; accept either side.
    if printf '%s' "$needle" | grep -q '|'; then
      local a b
      a="${needle%%|*}"; b="${needle##*|}"
      if grep -qF -- "$a" "$file" || grep -qF -- "$b" "$file"; then continue; fi
    elif grep -qF -- "$needle" "$file"; then
      continue
    fi
    bad "$file no longer contains \"$needle\" — $label"
  done < <(assertions)
}

snapshot() {
  printf 'head %s\n' "$(git rev-parse HEAD)"
  printf 'tree %s\n' "$(git rev-parse 'HEAD^{tree}')"
  printf 'index %s\n' "$(git write-tree)"
  printf 'status-lines %s\n' "$(git status --porcelain | wc -l | tr -d ' ')"
  git status --porcelain | sort | sed 's/^/status /'
}

case "$MODE" in
  record)
    [ -n "$SNAP" ] || { note "usage: $0 record <snapshot-file>"; exit 2; }
    run_assertions
    if [ "$fail" -ne 0 ]; then
      note "REFUSING TO RECORD: the candidate does not satisfy its own source assertions."
      note "Certification cannot start from a checkout that may already carry mutation residue."
      exit 1
    fi
    snapshot > "$SNAP"
    note "candidate recorded at $(git rev-parse HEAD)"
    note "  tree  $(git rev-parse 'HEAD^{tree}')"
    note "  index $(git write-tree)"
    note "  working tree: $(git status --porcelain | wc -l | tr -d ' ') changed path(s)"
    note "  $(assertions | grep -c .) source assertions hold"
    ;;
  verify)
    [ -n "$SNAP" ] && [ -f "$SNAP" ] || { note "usage: $0 verify <snapshot-file>"; exit 2; }
    local_now="$(mktemp)"; snapshot > "$local_now"
    if ! diff -u "$SNAP" "$local_now" > /tmp/.integrity-diff 2>&1; then
      bad "the candidate changed during this batch:"
      sed 's/^/       /' /tmp/.integrity-diff
      note ""
      note "This batch's certification evidence is INVALID. The diff above is preserved rather"
      note "than repaired: a runner that restores an unexpected change and reports success is"
      note "precisely what this gate exists to detect."
    fi
    rm -f "$local_now"
    run_assertions
    if [ "$fail" -ne 0 ]; then note "INTEGRITY POSTFLIGHT FAILED ($fail)"; exit 1; fi
    note "candidate unchanged: $(git rev-parse HEAD), $(assertions | grep -c .) assertions hold"
    ;;
  assert)
    run_assertions
    if [ "$fail" -ne 0 ]; then
      note "SOURCE ASSERTIONS FAILED ($fail) in $(pwd)"
      exit 1
    fi
    note "$(assertions | grep -c .) source assertions hold in $(pwd)"
    ;;
  *)
    note "usage: $0 {record <snapshot>|verify <snapshot>|assert}"
    exit 2
    ;;
esac
exit $((fail > 0))
