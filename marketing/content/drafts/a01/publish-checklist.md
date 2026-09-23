---
id: a01
type: publish checklist
status: not scheduled
---

# a01 — publish checklist

Work top to bottom on publication day. Nothing here is automated, and nothing
should be: every step is a human deciding the claim still holds.

**Editorial freeze:** 2026-09-23, against `main` @ `e29184c`, v0.22.1.
Anything below marked ⏱ ages and must be re-derived.

## 1. Refresh the facts ⏱

- [ ] `pnpm marketing:stats` — components, per-platform coverage, catalogue
      denominator, exceptions, version, npm publication state
- [ ] Re-run the snippet audit (`sources.md` → "Current state") for migrated vs
      hand-written counts
- [ ] Compare each against the article. **Most likely to have moved:**
  - [ ] "Three of a hundred demo examples have moved so far" — article + X 9 + LinkedIn B
  - [ ] "98 components. React 98, SwiftUI 90, Compose 89, Flutter 90, Angular 11"
  - [ ] "89 of 98 … 9 documented exceptions"
- [ ] Angular still `maturity: "preview"` and `catalogComplete: false`
- [ ] `@kinetixui/angular` still unpublished — if it has shipped, the article
      does not change, but check nothing elsewhere implies it was installable

**Historical numbers must NOT be refreshed.** 91/90/91 → 90/89/90, the 300
snippets and 164/182/175 symbol counts are tied to specific commits and stay in
past tense. See `sources.md`.

## 2. Verify the piece

- [ ] Title matches across `article.md` front matter, the DEV file and
      `backlog.json`
- [ ] No "all platforms" anywhere the 89/98 figure appears — must read
      "all four catalogue-complete platforms"
- [ ] Angular appears only with "preview"
- [ ] No competitor named
- [ ] No install-focused CTA; primary CTA is the platform-coverage page
- [ ] Every link resolves (`/docs/platforms`, any repo link)
- [ ] Proofread aloud — the opening three lines especially
- [ ] Spellcheck, en-dashes, code fences render on DEV preview

## 3. DEV

- [ ] `devto.md` front matter: title, description, tags, `published: false`
      until the moment of posting
- [ ] **`canonical_url` omitted.** DEV is the original location; there is no
      KinetixUI article URL, and pointing canonical at `/docs/platforms` would
      be wrong — that is not this article
- [ ] Code blocks have language hints (`kotlin`, `json`)
- [ ] Preview on DEV before publishing
- [ ] Publish → capture the real URL

## 4. Replace the placeholder

- [ ] `<DEV_ARTICLE_URL>` → the real URL in `linkedin.md` (A and B) and
      `x-thread.md` (post 9)
- [ ] Append the campaign parameters from `measurement.md` per channel
- [ ] Click every link once, from a phone

## 5. Visual

- [ ] Primary asset built to `visual-brief.md` spec
- [ ] Numbers on it re-read from `marketing:stats`, not copied from the brief
- [ ] Light + dark exports; 1200×675 and 1200×1200
- [ ] Legible at 400px wide
- [ ] Caption says "what has to be true", not "our pipeline"

## 6. Sequence — manual, one at a time

| When | Channel | Prereq |
| --- | --- | --- |
| Day 0 | DEV article | steps 1–3 complete |
| Day 0 or 1 | LinkedIn post A + primary visual | real DEV URL in hand |
| Day 1 | X thread | LinkedIn already posted |
| Day 2–3 | One standalone post or derivative visual | thread has settled |

Do not schedule. Do not post two channels in the same hour — it makes the
response impossible to attribute.

## 7. After

- [ ] Set `a01.status` → `published` in `backlog.json`, with the URL
- [ ] Start the 14-day window in `measurement.md`
- [ ] Note anything that surprised you in `marketing/research/`

## Status rules

`a01` stays **`drafted`** until a real publication date is chosen. Move to
`scheduled` only when a date exists; `published` only after it is live with a
URL. Do not skip states — the backlog is the only record of what actually went
out.
