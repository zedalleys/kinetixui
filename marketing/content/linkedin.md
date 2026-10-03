---
type: linkedin assets
month: first 30 days
status: finished copy. Which of these has published is recorded per asset in register.json and
  ../distribution/register.json, never restated here
---

# LinkedIn — finished posts

Seven new posts (**LI-003 … LI-009**). Three more already exist and are reused rather than rewritten:
**LI-001** and **LI-002** in `drafts/a01/linkedin.md`, and **LI-010** in `drafts/a02/linkedin.md`.
**Ten LinkedIn posts in total** for the month; `register.json` is the index.

**Before publishing any of these:** re-run `pnpm marketing:stats` and replace any number that moved. Every
figure below was true at the time of writing and several of them are designed to move.

**House rules** (from `MESSAGING.md` §5): no fake anecdotes, no invented users, no engagement bait, no
"Agree?", at most three hashtags and only if they work, link in the post body. Ziad writes as the person who
built the thing and made the decisions — not as a founder with a growth story.

---

## LI-003 · P2 · Pillar A · Awareness

**Campaign:** `kx_p2_a_drift` · **Destination:** `/docs/platforms` · **Visual:** VIS-001

> Your web app and your mobile app looked identical the day they launched.
>
> Six months later, they don't.
>
> Nobody decided that. It happens one reasonable decision at a time. A designer nudges the card padding on
> web. An iOS engineer picks the system spacing because it felt right next to the nav bar. Someone fixes a
> contrast bug on Android and nowhere else. Each change is correct in isolation. None of them is written
> down anywhere that the other platforms can see.
>
> By the time anyone notices, the fix isn't a fix — it's a project. Somebody has to go and find every place
> the two versions disagree, decide which one is right, and change the other. On three or four codebases,
> by hand, with no list.
>
> The uncomfortable part: this is not a discipline problem. Teams that care a lot still drift, because
> caring is not a mechanism. If the only thing keeping four platforms aligned is that everyone remembers to
> check, they will diverge the first week someone is busy.
>
> What actually helps is making the shared thing a real artifact — one that generates each platform's
> values rather than describing them — and then having something fail loudly when a platform stops matching
> it.
>
> I've been building that for KinetixUI: one token source that generates native output for each platform,
> and CI that refuses a claim a platform can't back with source.
>
> The coverage table, with the gaps in it: https://kinetixui.com/docs/platforms

---

## LI-004 · P1 · Pillar C · Evaluation

**Campaign:** `kx_p1_c_manifest` · **Destination:** `/docs/platforms` · **Visual:** VIS-002

> Most design systems store "which platforms does this component support?" in the worst possible place: a
> human sentence in a docs page.
>
> It's worst because it's write-only. Nothing reads it back. Nothing can tell you when it stops being true.
> The component gets deleted, the platform gets dropped, the port never lands — and the sentence sits there
> being confidently wrong for months.
>
> The alternative is boring and it works: put it in one manifest, generate every surface from it, and check
> the manifest against the filesystem.
>
> In KinetixUI, `components.manifest.json` is the only place a component's platforms are declared. The
> coverage table, the per-component pages, the platform docs and the marketing copy all derive from it. And
> a CI check walks every claim: if an entry says it runs on SwiftUI, there had better be SwiftUI source.
>
> The first time I ran that check it failed. One component claimed three native platforms and had an
> implementation on none of them. The coverage numbers moved down when I fixed it.
>
> That's the part worth stealing, regardless of what you're building: the check is only useful if you're
> willing to publish the number it gives you, including when it goes down.
>
> How the manifest drives everything: https://kinetixui.com/docs/platforms

---

## LI-005 · NEUTRAL · Pillar B · Awareness

**Campaign:** `kx_p2_b_token_boundary` · **Destination:** `/docs/tokens` · **Visual:** VIS-003

> Design tokens have a boundary problem. They usually stop at the web.
>
> The pipeline everyone has: tokens in a JSON file, a build step, CSS custom properties, done. It's good.
> It solves the web.
>
> Then iOS needs the same values. So someone copies them into a Swift file. Android gets a Kotlin object.
> Flutter gets a Dart class. Three copies, made once, maintained never — and now the "single source of
> truth" is a single source of truth for one of your four platforms.
>
> The copies don't drift because anyone is careless. They drift because nothing connects them. A value
> changed on the web has no mechanism to reach a Kotlin constant.
>
> The fix is unglamorous: treat the native outputs as build artifacts, not as files people edit. One DTCG
> source, a generator per target, and the generated files committed so the diff is visible in review.
> Change the source, and Swift, Kotlin, Dart and CSS all move in the same commit.
>
> The nice side effect is that your tokens become adoptable on their own. You don't have to take anyone's
> components to use their spacing scale — on Flutter, a theme adapter means stock Material widgets inherit
> the values without a single custom widget in your tree.
>
> That last part surprised me. It came from a real request, and it turned out to be the smallest useful way
> into a design system.
>
> The token contract: https://kinetixui.com/docs/tokens

---

## LI-006 · P1 · Pillar G · Evaluation

**Campaign:** `kx_p1_g_dependency_list` · **Destination:** `/docs/installation` · **Visual:** VIS-004

> Our install command exited 0 and left people with a project that couldn't build.
>
> Here's the shape of it, because I think the bug class is more interesting than the bug.
>
> The CLI copies a component into your repo and installs the npm packages that component needs. The list of
> packages came from a registry file, generated by a script. That script did two things wrong, and the
> second one hid the first.
>
> It matched dependencies against a hand-written list of package names. And it scanned only the component
> file — then attached a shared `utils.ts` to the same item ten lines later, without scanning it.
>
> `utils.ts` imports two packages. So 91 of 97 components shipped a file whose dependencies they never
> declared. Install one, and npm reported success while your build failed on a missing module.
>
> The fix wasn't to extend the list. A hand-maintained list of package names cannot fail — it can only be
> incomplete, which is a different and much quieter kind of broken. We deleted it, derived the imports from
> the source, and computed dependencies from the full set of files each item delivers, after that set is
> assembled.
>
> Deriving instead of listing immediately caught a second case the list could never have caught.
>
> The general lesson I'd keep: when a check is a list of things to look for, the failure mode isn't a wrong
> answer. It's silence.
>
> What the CLI installs now: https://kinetixui.com/docs/installation

---

## LI-007 · P2 · Pillar F · Evaluation

**Campaign:** `kx_p2_f_two_trades` · **Destination:** `/components` · **Visual:** VIS-005

> "Cross-platform UI" usually means one of two things, and it's worth knowing which one you're being sold.
>
> Option one: a runtime that draws your interface on every platform. One codebase, one implementation, and
> a layer between you and the platform.
>
> Option two: separate native implementations that agree on a contract. More code, no runtime layer, and
> each platform's version behaves the way that platform is supposed to behave.
>
> Neither is a mistake. They're different trades. The runtime buys you one codebase and charges you at the
> edges — the places where a platform has an opinion your abstraction didn't anticipate.
>
> KinetixUI takes the second one. A SwiftUI view is a SwiftUI view. A Compose composable is a composable.
> The Angular components are directives on real HTML elements, not React wrapped in a bridge. Nothing is
> converted from one source into five — the tokens are generated, the components are written.
>
> The honest cost: five implementations to maintain, and coverage that isn't identical everywhere. Today
> React carries the full catalogue and the three native platforms carry most of it, with the gaps written
> down and the reasons given.
>
> The honest benefit: nothing is standing between your design system and the platform.
>
> I'd rather publish the gap than hide it behind an abstraction.
>
> The catalogue, and what runs where: https://kinetixui.com/components

---

## LI-008 · P1 · Pillar D · Evaluation

**Campaign:** `kx_p1_d_partial_evidence` · **Destination:** `/docs/platforms` · **Visual:** VIS-006

> A green tick in an accessibility matrix is one of the least informative things in our industry.
>
> It could mean: every component is tested in a real browser, by an automated tool, on every platform. It
> could also mean: someone checked a few and felt good about it.
>
> When I built KinetixUI's verification data, I had to pick how to report partial evidence. The tempting
> option is a tick with an asterisk. The one I went with is a fraction.
>
> So the published numbers say things like: contrast is gated in CI for everything, accessibility is
> checked in a real browser across the site and every Storybook story — and direction-aware behaviour
> testing sits at a handful of components on some platforms and none at all on one.
>
> That last clause is uncomfortable to publish. It's also the only part a reader can act on. "Has RTL
> support" tells you nothing about whether the component you need has been tested. A fraction tells you the
> shape of the risk.
>
> The rule I ended up with: a partial count is not a tick. If the evidence covers part of the surface, the
> number says which part, and I don't round it up in the summary.
>
> It makes the matrix look worse and makes it worth reading.
>
> The evidence, by platform: https://kinetixui.com/docs/platforms

---

## LI-009 · P2 · Pillar B · Adoption intent

**Campaign:** `kx_p2_b_token_boundary` · **Destination:** `/docs/tokens` · **Visual:** VIS-007

> The reason teams don't adopt a design system isn't that they disagree with the idea. It's that the
> smallest version of it is still too big.
>
> Adopting usually means replacing your components. That's a migration, and a migration needs a quarter and
> someone to own it. So the work doesn't start, and the platforms keep diverging while everyone agrees in
> principle that they shouldn't.
>
> I think the entry point should be smaller than the product.
>
> With KinetixUI you can take the token layer and nothing else. Install the tokens package, generate your
> platform's output, and keep every component you already have. On Flutter, the Material and Cupertino
> adapters mean your existing stock widgets inherit the values — nothing of ours ends up in your widget
> tree.
>
> That's a change one engineer can make in an afternoon, and it's reversible. It also happens to fix the
> thing that actually drifts: the values, not the markup.
>
> If it's useful, the next rung is copying individual components into your repo, where you own and edit
> them. If it isn't, you've still got a shared source for your spacing and colour and you can stop there.
>
> Three ways in, and stopping at the first one is a legitimate outcome.
>
> Start with the tokens: https://kinetixui.com/docs/tokens

---

## Publishing notes

- **Pacing:** one post every 3–4 days. LI-003 and LI-004 are the P1/P2 comparison pair for week 1 — publish
  them in the same week, at least 48 hours apart, and do not cross-link them.
- **Links:** paste the destination with its campaign parameters (see `register.json` for the exact URL per
  asset). The attribution is dropped silently if the campaign name is malformed, so copy rather than retype.
- **Comments:** answer technical questions with specifics and links to source. That is the whole reason this
  channel is primary for P1.
- **Do not** publish LI-006 in the same week as LI-004. Both are engineering-process posts and they blunt
  each other.
