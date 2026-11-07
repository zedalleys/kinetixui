---
id: X-001
type: manual publish packet
status: COPY APPROVED 2026-10-26 (recorded on `main` by #477). Not published. Publication is a separate owner decision and is not authorized here
target: the 20 October 2026 slot passed unapproved and unpublished; a new slot is proposed in §7a and needs the owner's word
---

# X-001 — manual publish packet

Nothing in this repository posts to X. This packet prepares the thread so that posting it is mechanical. The
owner approved the copy on 2026-10-26, by its SHA-256; that approval is recorded in
[`../../register.json`](../../register.json) and reached `main` in #477. It covers the copy only. Posting remains
the owner's own manual act and is not authorized here.

## 1. The copy

- File: [`../a01/x-thread.md`](../a01/x-thread.md), the whole file after its front matter: posts **1–9** and the
  standalone posts **A–D**.
- Length **3,141 characters**, sha256 `f6455e380c72b1cb5c4a4fb474b29327d35da4fcf1ee6bcaa19fcd58fe3a7d6c`,
  recomputed 2026-11-06 on this tree. This is the **fitted** copy, which brought posts 2, 6, 7 and 9 within X's
  280-character limit. An earlier revision of this packet pinned `38796bd…2642` (3,197 characters), the pre-fitting
  copy; that hash is superseded and must not be recorded anywhere.
- `register.json` → `X-001.approval.copy` already carries the `f6455e38…7d6c` pin, approved by the owner on
  2026-10-26, so `check:content` now fails on any edit to the file, standalone posts included. The asset's status
  stays `ready` because approval is not publication: the row moves to `published` only once the thread is posted
  and its URL is recorded.

## 2. Posting order

Posts 1 to 9 in order, as one thread, each one a reply to the previous. Post 1 has to stand alone: there is no
"🧵👇" and no promise of a thread, by design.

| Post | What it is | Notes when posting |
| --- | --- | --- |
| 1 | The script found a component claimed on three platforms with no implementation | Stands alone if nobody reads on |
| 2 | `direction-provider` is React-only by design | Three framework APIs quoted; no link |
| 3 | The historical before/after (SwiftUI 91→90, Compose 90→89, Flutter 91→90, all-four 90→89) | **Historical by construction.** Keep the arrows: they are what makes the numbers read as a past event |
| 4 | A platform matrix decays toward optimism | |
| 5 | The three levels of verification | |
| 6 | The Chart page quoted a component that did not exist | Carries `*[attach: code card, visual-brief asset D]*`. **No such asset has been produced** — see §5 |
| 7 | Symbol checking misses what only a compiler catches | Contains a Kotlin block; check X renders it as plain text before posting |
| 8 | The rule: ask what would have caught it | |
| 9 | Examples migrating into compiled files, "six of a hundred-odd so far", dev.to link | The **article** link lives here, in the post body |
| 9 | The tracked `/docs/platforms` link goes **in post 9's own body**, in place of the bare URL the draft carries, with the dev.to article URL below it in the same post | §3 |

The standalone posts A–D are **not** part of this thread. They are spaced across the following week and are not
covered by Tuesday's approval beyond the hash.

## 3. The tracked link

```
https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=x_thread
```

- It goes **in post 9's own body**, in place of the bare URL the draft carries, with the dev.to article URL below
  it in the same post. That is what `marketing/distribution/register.json` → `X-001.linkPlacement` requires on
  `main`. An earlier revision of this packet directed it into a reply under post 9, on the reasoning that X demotes
  a post with a second outbound link; the owner settled the placement the other way and the register is the record.
- Copy it character for character. Never shorten it, and never append `kx_traffic=diagnostic`: that mark belongs
  only to the owner's own test visits and would exclude real readers from every count.
- Same campaign as LI-001 (`kx_p1_a_parity_proof`), different content tag (`x_thread` against LI-001's
  `li_primary`). That tag is the only thing separating the two posts' arrivals, which is why it must not be edited.
- `check:distribution` rebuilds this URL from the content register and verifies `/docs/platforms` is a real route
  and `x` a source the runtime does not normalise to `other`. It passed on 2026-10-19.

## 4. Truth check, 2026-10-19 on `main`

Run: `node marketing/content/drafts/a01/verify-package.mjs`.

- **Every figure in the thread is historical.** The script's current-state check reports
  `no stale current-state figures (historical before/after left intact)`. Posts 3, 6 and 7 describe one commit and
  are pinned by `verify-evidence.mjs`; they do not go stale when the catalogue moves.
- **Post 2 is accurate today.** `components.manifest.json` has `direction-provider` with `platforms: ["React"]` and
  a `platformNote` naming exactly the three framework APIs the post quotes — `environment(\.layoutDirection)`,
  `LocalLayoutDirection`, `Directionality`.
- **Post 9's "six of a hundred-odd"** is 6 of **113** compiled demo keys today. The script flags it only against
  its own `< 110` bound for the words "a hundred-odd"; 113 is still fairly a hundred-odd. This is the one judgement
  call in the thread, and the alternative is re-pinning approved copy over a word.
- **No unsupported parity claim.** The thread makes no current coverage claim at all: it never says how many
  components exist, never calls any platform complete, and never implies anything was tested rather than written.
- The nine `verify-package.mjs` problems are all pre-existing and none of them is in this file: six are the live
  dev.to article's stale "today" paragraph (the ART-001 correction the owner has not yet applied), one is the
  `< 110` bound above, and two are `0.25.0` version strings inside dated 2026-10-09 snapshots in `sources.md` and
  `publish-checklist.md`.

## 5. The visual

Post 6 carries `*[attach: code card, visual-brief asset D]*`. Asset **D — The Chart snippet** is listed in
[`../a01/visual-brief.md`](../a01/visual-brief.md) as an *optional derivative*, and it has not been produced: it has
no `VIS-` id in the content register and no file. So there is no approved visual for this thread.

Recommended: post 6 as text. It reads correctly without an image, and producing D on the morning of the post is how
an unreviewed asset ends up public. If the owner wants the card, it needs its own brief-to-asset pass first and the
thread waits.

## 6. Timing, and LI-001

- **Tuesday 20 October, 15:00 UTC / 18:00 Riyadh**, per the execution calendar (day 17).
- Post nothing else on any channel in the same hour, so arrivals stay attributable to one post.
- LI-001 went live on 19 October on the **same campaign**. Its T+24h read falls on 20 October after about
  18:30 UTC, which is *after* this thread posts. Read LI-001's `li_primary` rows before X-001 posts, or filter on
  `kx_content` in every query from Tuesday onward. Nothing is ambiguous as long as the content tag is used; a query
  on campaign alone will mix the two posts.

## 7. Measurement checkpoints

Same workflow as LI-001, in [`../../measurement/M4-POST-PUBLICATION-CHECKLIST.md`](../../measurement/M4-POST-PUBLICATION-CHECKLIST.md),
with `kx_content = 'x_thread'`:

- **T+1h** — whether any tagged arrival exists at all. If none: "no tagged arrival observed", never "no clicks". X
  wraps and previews links, and the article link in post 9 goes to dev.to where first-party analytics cannot follow.
- **T+24h, Wednesday 21 October** — close the distribution row out with the live post URL, the real date, and
  absolute counts only, audience cohort only.
- **T+7d, Monday 26 October** — the weekly read, cumulative from 19 October (`--arms-from 2026-10-19`).

## 7a. The 20 October slot passed, 2026-10-21

The scheduled slot — Tuesday 20 October, 15:00 UTC — came and went while the copy was still unapproved. Nothing
here was published: no approval existed on that date — it came later, on 2026-10-26, and covers the copy only —
this thread posts nothing by design, and the registers are unchanged (`X-001` is `ready` in the content register, `planned` with a null date in the distribution register).

**Whether the thread exists on X is not something this environment can see.** X is unreachable from here, and
first-party analytics would not settle it either: PostHog holds no session carrying `kx_content=x_thread` at any
point since 19 October, but a thread whose tracked reply nobody opens looks exactly the same as a thread that was
never posted. If it was in fact posted by hand, say so with its URL and the posting time and the row is closed out
on that; nothing is backdated and nothing is marked published on a planned date alone.

**Proposed new slots**, both the same weekday-afternoon shape as the original, for the owner to pick one:

| Option | When | Why |
| --- | --- | --- |
| **Recommended** | Thursday 22 October, 15:00 UTC / 18:00 Riyadh | Keeps X-001 ahead of LI-008 on the 22nd by an hour or two at most — so move LI-008 to Friday if both are approved, rather than posting two in one afternoon |
| | Monday 26 October, 15:00 UTC / 18:00 Riyadh | A clean week boundary: it lands after the T+7d LI-001 read, so the thread posts with the first week's figures already in hand |

Either way the rule in §6 holds: nothing else posts on any channel in the same hour, and every query from then on
filters on `kx_content`.

## 8. What the owner has to do

1. ~~Approve or decline the copy as written.~~ **Done 2026-10-26**: the copy is approved by its
   `f6455e38…7d6c` pin and that approval is on `main`. Nothing further is needed here.
2. Decide the visual: text-only post 6 (recommended) or hold the thread for asset D.
3. Post the nine posts in order at about 15:00 UTC, with the tracked link inside post 9's body as §3 describes.
4. Send the thread's own URL and the posting time, and the row is closed out the same way LI-001's was.

X-001 stays `ready` until the thread is actually posted and its URL recorded. Nothing here advances that on its own.
