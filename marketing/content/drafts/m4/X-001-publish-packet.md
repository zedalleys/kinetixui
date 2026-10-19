---
id: X-001
type: manual publish packet
status: READY FOR OWNER APPROVAL. Not approved, not published. Editorial approval is a separate owner decision
target: Tuesday 20 October 2026, 15:00 UTC / 18:00 Riyadh, posted by hand by the owner
---

# X-001 — manual publish packet

Nothing in this repository posts to X. This packet prepares the thread so that posting it is mechanical; the copy
still needs the owner's explicit approval before it goes out, and that approval is not recorded here.

## 1. The copy

- File: [`../a01/x-thread.md`](../a01/x-thread.md), the whole file after its front matter: posts **1–9** and the
  standalone posts **A–D**.
- Length 3,197 characters, sha256 `38796bd1c88e715812769ec50fc1a406efe30e331e6cb2dac9f0fe538d3d2642`, computed
  2026-10-19 on `main`. If the owner approves, that hash is what goes in `register.json` → `X-001.approval.copy`,
  and `check:content` then fails on any edit to the file, standalone posts included.
- The register carries **no `approval` block for X-001** today, so its status stays `ready`. That is deliberate:
  nothing is approved on the owner's behalf.

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
| reply | The tracked `/docs/platforms` link, as the first reply under post 9 | §3 |

The standalone posts A–D are **not** part of this thread. They are spaced across the following week and are not
covered by Tuesday's approval beyond the hash.

## 3. The tracked link

```
https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=x_thread
```

- It goes in **a reply under post 9**, not in the thread body: post 9 already carries the dev.to article, and X
  demotes posts carrying a second outbound link.
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

## 8. What the owner has to do

1. Approve or decline the copy as written. If approved, say so explicitly and the approval, its evidence and the
   `38796bd…2642` pin go into the content register that day.
2. Decide the visual: text-only post 6 (recommended) or hold the thread for asset D.
3. Post the nine posts in order at about 15:00 UTC, then the tracked link as the first reply under post 9.
4. Send the thread's own URL and the posting time, and the row is closed out the same way LI-001's was.

Until step 1 happens, X-001 stays `ready`, not approved. Nothing here advances that on its own.
