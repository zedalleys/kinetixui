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
MANIFEST="scripts/create-studio-mutation-anchors.json"
ASSERTION_COUNT="?"

fail=0
note() { printf '%s\n' "$*"; }
bad() { printf 'INTEGRITY FAIL  %s\n' "$*"; fail=$((fail + 1)); }

# --- the required source assertions -------------------------------------------------------------
# Each entry is  <file>|<fixed string that must appear>|<what it protects>.
# These are the lines a mutation runner replaces, plus the assertions a gate would stop being able
# to make if its own mutation residue were committed. A missing one means either a killed runner's
# residue or a repair that was reverted; both must stop certification, so neither is tolerated.
#
# THIS LIST IS NO LONGER THE ONLY PROTECTION, and Codex was right that on its own it was not
# enough: a hand-curated set of substrings missed three real runner mutations, because
# `staleDraft` survives `const staleDraft = false;`, because one anchor's text appears at six
# sites and a control changes one of them, and because one mutation had no anchor at all.
# `scripts/create-studio-mutation-anchors.json` is now generated FROM the runners themselves
# (`DUMP_ANCHORS=1`), covers every control mechanically, and is proved able to reject each
# mutation by `scripts/create-studio-anchor-manifest.mjs --check`. The list below remains for the
# gate assertions, which are not runner mutations and cannot be derived.
assertions() {
  cat <<'ASSERTIONS'
apps/web/src/app/create/studio/error.tsx|<Button onClick={reset}>Try the editor again</Button>|the recovery Retry button (replaced by a bare <span> by the recovery-exit control)
apps/web/src/app/create/studio/error.tsx|<a href="/create/studio">Reload Create Studio</a>|#655's document navigation out of the error boundary (downgraded to next/link by its control)
apps/web/src/components/create-studio/create-studio.tsx|REJECTED_SAVE_CODES.has(error.code) ? "rejected" : "unconfirmed"|the three-outcome save classification (flattened to one outcome by two controls)
apps/web/src/components/create-studio/create-studio.tsx|outcome === "rejected" && earlierOpen|M5.23: a rejection settles nothing about an earlier open save
apps/web/src/components/create-studio/create-studio.tsx|pendingSaves.current = next.slice(-PENDING_SAVE_LIMIT)|the bounded attempt history
apps/web/src/components/create-studio/create-studio.tsx|if (next.length > PENDING_SAVE_LIMIT) pendingTruncated.current = true|the record that the bound dropped an attempt
apps/web/src/components/create-studio/create-studio.tsx|pendingSaves.current = []; pendingTruncated.current = false;|Codex at c0218261: a confirmed save settles the truncation marker too
apps/web/src/components/create-studio/create-studio.tsx|const staleDraft = draftBase !== null && draftBase !== product?.revision;|the guard that disables saving over a revision the work was not based on
scripts/create-studio-save-state-browser.mjs|earlier save is still unconfirmed|the gate assertion that a rejected retry keeps earlier uncertainty
scripts/create-studio-save-state-browser.mjs|earlier save may have committed|the gate assertion a corrected control exposed as missing
scripts/create-studio-save-state-browser.mjs|cannot be determined|can no longer account|the gate assertion that a truncated history refuses to conclude
scripts/create-studio-workspace-browser.mjs|after a clean save, before the rejected one|Codex at c0218261: the 413 must announce from a state where nothing is already failed
scripts/create-studio-consumer-build.mjs|the gate makes no assertion about the supported ref|#651: an unrecognised node ref must fail closed
scripts/create-studio-consumer-build.mjs|gotoMounted|#651: a control navigation must be read after React commits
ASSERTIONS
}

run_assertions() {
  # The curated list above is a fixed-string substring test; the generated manifest
  # (scripts/create-studio-mutation-anchors.json) is checked as PRESENT and/or ABSENT per entry.
  # Both run in one python pass, because a multi-line anchor cannot be matched with grep, and
  # because an ABSENCE assertion is the only thing that can catch a purely ADDITIVE mutation —
  # the crash trigger the recovery harness injects, for instance, which adds code and removes
  # nothing. Codex's P2 on PR #661 was that the curated list alone missed three real mutations;
  # the manifest is derived from the runners so it cannot fall behind them unnoticed.
  local out status curated
  curated="$(mktemp)"
  assertions > "$curated"
  out="$(python3 -I - "$MANIFEST" "$curated" <<'ENGINE'
import json, os, sys

manifest_path, curated_path = sys.argv[1], sys.argv[2]
problems = []
cache = {}
checked = 0


def read(path):
    if path not in cache:
        try:
            cache[path] = open(path, encoding="utf-8").read()
        except OSError:
            cache[path] = None
    return cache[path]


for line in open(curated_path, encoding="utf-8").read().splitlines():
    if not line.strip():
        continue
    parts = line.split("|")
    path, label = parts[0], parts[-1]
    needles = parts[1:-1]          # an alternation is written as  a|b  in the needle field
    content = read(path)
    if content is None:
        problems.append("%s is missing - cannot assert: %s" % (path, label))
        continue
    checked += 1
    if not any(n in content for n in needles):
        problems.append('%s no longer contains "%s" - %s' % (path, needles[0], label))

if manifest_path and os.path.exists(manifest_path):
    for entry in json.load(open(manifest_path, encoding="utf-8")).get("entries", []):
        content = read(entry["file"])
        if content is None:
            problems.append("%s is missing - cannot assert: %s" % (entry["file"], entry["label"]))
            continue
        if entry.get("present") is not None:
            checked += 1
            if entry["present"] not in content:
                problems.append(
                    "%s no longer contains the anchor a control replaces - residue of: %s"
                    % (entry["file"], entry["label"])
                )
        if entry.get("absent") is not None:
            checked += 1
            if entry["absent"] in content:
                problems.append(
                    "%s CONTAINS a control mutation - residue of: %s" % (entry["file"], entry["label"])
                )
else:
    problems.append(
        "the generated anchor manifest is missing at %r - run scripts/create-studio-anchor-manifest.mjs --write"
        % (manifest_path,)
    )

for problem in problems:
    print("INTEGRITY FAIL  " + problem)
print("ASSERTIONS %d" % checked)
sys.exit(1 if problems else 0)
ENGINE
)"
  status=$?
  rm -f "$curated"
  ASSERTION_COUNT="$(printf '%s\n' "$out" | awk '/^ASSERTIONS /{print $2}')"
  printf '%s\n' "$out" | grep -v '^ASSERTIONS ' || true
  [ "$status" -ne 0 ] && fail=$((fail + 1))
  return 0
}

# THE INDEX TREE IS READ THROUGH A PRIVATE INDEX, and that is a correctness property rather than
# tidiness. `git write-tree` on the candidate's own index takes `.git/index.lock`, and two batches
# cannot both hold it. Measured at 461148f5 with two batches started together: the loser printed
# `fatal: Unable to create '…/.git/index.lock': File exists.`, the command substitution yielded an
# EMPTY string, and the snapshot recorded `index ` with no value. The postflight then compared an
# empty field against a populated one and announced `THE CANDIDATE CHANGED` about a candidate whose
# head, tree, porcelain lines and diff hash were all identical. That is fail-closed, and it is still
# a defect: a gate that can accuse a clean candidate teaches its reader to discount it, and the next
# accusation may be true.
#
# Copying the index and pointing GIT_INDEX_FILE at the copy takes no lock in the candidate at all,
# so the claim this harness already prints — "candidate (immutable; nothing ran in it)" — becomes
# literally true of the snapshot as well as of the runners. A failure to read it is now an ERROR
# that stops the batch, never an empty field that flows into a comparison.
index_tree() {
  local src copy tree
  src="$(git rev-parse --git-path index)" || return 1
  copy="$(mktemp /tmp/kinetix-idx.XXXXXXXX)" || return 1
  if [ -f "$src" ] && ! cp "$src" "$copy"; then rm -f "$copy"; return 1; fi
  tree="$(GIT_INDEX_FILE="$copy" git write-tree 2>/dev/null)" || { rm -f "$copy"; return 1; }
  rm -f "$copy"
  case "$tree" in
    "" | *[!0-9a-f]*) return 1 ;;
  esac
  printf '%s\n' "$tree"
}

read_index_tree_or_die() {
  if ! INDEX_TREE="$(index_tree)"; then
    note "COULD NOT READ THE INDEX  writing a tree through a private index copy failed."
    note "  This batch is NOT a certification result. An unreadable field is an error here,"
    note "  never a value, because an empty field would read as a change to the candidate."
    exit 2
  fi
}

# Assigned in the caller's own shell, deliberately. `printf '%s' "$(f)"` where f calls `exit` exits
# only the subshell, so a refusal written that way would still print an empty field and let the
# batch continue — the original defect wearing the repair's clothes.
INDEX_TREE=""

snapshot() {
  read_index_tree_or_die
  printf 'head %s\n' "$(git rev-parse HEAD)"
  printf 'tree %s\n' "$(git rev-parse 'HEAD^{tree}')"
  printf 'index %s\n' "$INDEX_TREE"
  printf 'status-lines %s\n' "$(git status --porcelain | wc -l | tr -d ' ')"
  git status --porcelain | sort | sed 's/^/status /'
  # CONTENTS, not just paths. Codex's P2 on PR #661: if the candidate already carries an unstaged
  # edit or an untracked file, changing THAT file's contents during a batch moves neither HEAD, nor
  # the index tree, nor a single porcelain line — so the old snapshot reported the candidate
  # unchanged while its working files had drifted. `git diff HEAD` hashes every tracked
  # modification, staged or not, and each untracked file is hashed by content.
  printf 'tracked-diff %s\n' "$(git diff HEAD | sha256sum | cut -d' ' -f1)"
  git ls-files --others --exclude-standard -z |
    sort -z |
    while IFS= read -r -d '' path; do
      printf 'untracked %s %s\n' "$(sha256sum < "$path" | cut -d' ' -f1)" "$path"
    done
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
    note "  index $INDEX_TREE"
    note "  working tree: $(git status --porcelain | wc -l | tr -d ' ') changed path(s)"
    note "  $ASSERTION_COUNT source assertions hold"
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
    note "candidate unchanged: $(git rev-parse HEAD), $ASSERTION_COUNT assertions hold"
    ;;
  assert)
    run_assertions
    if [ "$fail" -ne 0 ]; then
      note "SOURCE ASSERTIONS FAILED ($fail) in $(pwd)"
      exit 1
    fi
    note "$ASSERTION_COUNT source assertions hold in $(pwd)"
    ;;
  *)
    note "usage: $0 {record <snapshot>|verify <snapshot>|assert}"
    exit 2
    ;;
esac
exit $((fail > 0))
