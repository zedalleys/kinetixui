# Phase 0.9 — Live Production Verification

**Nothing was published, released, deployed or merged.** No npm package, no GitHub Release, no tag, no PR,
no deploy. One documentation correction was made, for a claim proven false — see
[Marketing Claim Verification](#marketing-claim-verification).

> **Status update — F1 has since been fixed in source.** Everything from here to
> [Phase 1 Gate](#phase-1-gate-fail) is the verification as it stood on the date above and is left
> unedited as the record. What changed afterwards is in
> [Remediation — Phase 0.9.1](#remediation--phase-091-f1-fixed-in-source) at the end, and in
> [`PHASE-0.9.1-REGISTRY-FIX.md`](./PHASE-0.9.1-REGISTRY-FIX.md). **F1: FIXED IN SOURCE — AWAITING
> DEPLOYMENT.** F3 is unchanged and still blocking. **Phase 0 is still BLOCKED.**

## Executive Summary

**The live production origin could not be reached, and a separate, real activation defect was found that
does not depend on production at all.**

Two independent findings, and they must not be conflated:

1. **`kinetixui.com` is blocked by this container's egress policy.** Every path returns the same proxy
   403 carrying `x-deny-reason: host_not_allowed` and the body *"Host not in allowlist: kinetixui.com."*
   DNS resolves and points at Vercel, but **no HTTP request has reached the origin**, so production status
   for the registry, robots, sitemap and specs remains **UNVERIFIED**. Per the brief, nothing about
   production is inferred from source.

2. **The registry under-declares npm dependencies, and the documented activation journey produces code
   that does not build.** This was found with the *published* CLI from npm and is provable from canonical
   repository source, so it is **independent of the network block**. `npx @kinetixui/cli add card` exits
   0, prints "Done.", installs nothing, and the generated files import `clsx` and `tailwind-merge`, which
   are absent. **91 of 97 registry items ship `lib/utils.ts`; none declares its two npm dependencies; 70
   of those also lack `class-variance-authority`, so both packages are missing for them.**

A trap worth recording: the CLI reported *"Could not find 'button' in the registry (403 at
https://kinetixui.com/r/button.json)"*. That 403 came from the egress gateway, **not** from
kinetixui.com. Reported at face value it would have been a false production defect. It was disambiguated
by dumping the response headers.

What *was* proven: the published CLI resolves from npm, starts, targets production and nothing else,
resolves a component, writes non-empty files, installs declared dependencies, exits 0 — and the generated
Button compiles and server-renders correctly **once the undeclared dependency is installed by hand**.

---

## Environment

| | |
| --- | --- |
| Timestamp (start) | **2026-09-29T06:27:42Z** |
| Timestamp (proxy denial recorded) | 2026-09-29T06:28:16Z (15 entries for `kinetixui.com:443`) |
| Production origin | `https://kinetixui.com` |
| DNS | `kinetixui.com` → `216.198.79.1`; `www.kinetixui.com` → `66.33.60.34`, `76.76.21.164` (Vercel ranges) |
| Published CLI tested | **`@kinetixui/cli@0.23.3`**, published 2026-09-28T11:20:30Z, shasum `dc311a28…446eb`, npm provenance attestation **present** |
| CLI source | `https://registry.npmjs.org/@kinetixui/cli/-/cli-0.23.3.tgz` — real directory in the consumer, **not** a workspace symlink |
| Other package versions | `@kinetixui/{ui,tokens}` 0.23.3 · `@kinetixui/angular` 0.24.0 · `@kinetixui/iot` 0.2.0 |
| Node | v22.22.2 · npm used as the consumer package manager |
| Consumer directories | Temporary, outside the repository. Verified not under the repo path |
| Repo commit | `ded39f7` on `claude/last-changes-report-7m50v3` |

### Why production could not be reached

| Layer | Result |
| --- | --- |
| DNS | **Resolves.** Not the failure |
| TCP/TLS to origin | Never attempted — the proxy refused the tunnel first |
| Proxy `CONNECT kinetixui.com:443` | **`HTTP/1.1 403 Forbidden`** |
| Deny reason header | **`x-deny-reason: host_not_allowed`** |
| Deny body | `Host not in allowlist: kinetixui.com. Add this host to your network egress settings to allow access.` |
| Scope | **Host-level.** `/`, `/r/registry.json`, `/r/button.json`, `/specs/button.json`, `/sitemap.xml`, `/robots.txt` all identical |
| Control | `registry.npmjs.org` → **200**. Egress works; this host is denied |
| Proxy guidance | `/root/.ccr/README.md`: *"403 / 407 … Do not retry or route around it — report the blocked host."* Followed |

**To clear it:** add `kinetixui.com` to the environment's allowed domains (cloud environment menu in the
session title bar → Edit → Network access), or widen the access level. Then re-run the checklist in
`PHASE-0.75-PUBLIC-SURFACE.md`; it asserts every expected value below.

---

## Production Registry

| Field | Value |
| --- | --- |
| URL | `https://kinetixui.com/r/registry.json` |
| HTTP result | **No response.** Proxy 403 on CONNECT; origin never contacted |
| Schema result | **Not observed** |
| Item count | **Not observed** |
| Source parity | **Cannot be determined** |
| Status | **UNAVAILABLE (to this environment) — production state UNVERIFIED** |
| Cache/version headers | None obtained — no response from the origin |

**Status classification:** none of `IN SYNC` / `STALE` / `INVALID` can be assigned. `UNAVAILABLE` here
describes *this environment's access*, not the origin. Nothing observed suggests production is broken;
nothing observed suggests it is working.

### Canonical source, measured now — the values to compare against

Derived from the repository at `ded39f7`, so production can be compared against **current** source rather
than Phase 0.75's frozen numbers.

| Check | Current canonical value | Phase 0.75 | Drift |
| --- | --- | --- | --- |
| `registry.json` item count | **97** | 97 | **none** |
| Top-level keys | `homepage`, `items`, `name` | — | — |
| `name` / `homepage` | `kinetixui` / `https://kinetixui.com` | — | — |
| Duplicate item names | **none** | — | — |
| Items missing `name`/`type` | **none** | — | — |
| Item types | 96 `registry:ui` + 1 `registry:style` (`tokens`) | — | — |
| Per-item payload files in `/r` | **97** (+ `registry.json` = 98 files) | 98 | none |
| Index entries with no payload | **none** | — | — |
| Payloads not in the index | **none** | — | — |
| Payloads failing required-field checks (`name`, non-empty `files[]`, each file's `content` + `target`) | **none** | — | — |
| Spec files in `/specs` | **97** | 97 | none |

So **97 remains the correct expectation** — not because Phase 0.75 said so, but because current source
still produces it.

---

## robots.txt

| Field | Value |
| --- | --- |
| URL | `https://kinetixui.com/robots.txt` |
| Result | **No response** — proxy 403, host-level |
| `/r/` status | **Not observed in production** |
| Sitemap status | **Not observed in production** |

**Canonical source** (`apps/web/src/app/robots.ts`), which is what a deploy serves:

```
rules:   [{ userAgent: "*", allow: "/", disallow: "/r/" }]
sitemap: https://kinetixui.com/sitemap.xml
host:    https://kinetixui.com
```

- `Disallow: /r/` — matches the Phase 0.75 expectation, **in source**.
- `Allow: /` — no public marketing or docs route is blocked. Verified against the derived route list: no
  rule touches `/`, `/docs/*`, `/components`, `/blocks`, `/iot` or any other public path.
- **Observation (P2, unchanged from Phase 0.75):** `/specs/` is **not** disallowed, so 97 machine-readable
  spec payloads are crawlable. Not an activation issue; a minor index-hygiene point.

---

## Sitemap

| Field | Value |
| --- | --- |
| URL | `https://kinetixui.com/sitemap.xml` |
| Result | **No response** — proxy 403, host-level |
| Production URL count | **Not observed** |
| Current canonical count | **127** |
| Phase 0.75 count | 127 |
| Difference | **none — source has not drifted** |

Canonical properties, derived by executing `publicRoutes()` and `absoluteUrl()` from source now:

| Property | Result |
| --- | --- |
| URL count | **127** |
| Duplicates | **none** |
| All on `https://kinetixui.com` | **yes** |
| Any `localhost` / `*.vercel.app` / `127.0.0.1` | **no** |
| Any `/r/` path advertised | **no** |
| Any `/specs/` path advertised | **no** |
| Key public routes present (`/`, `/docs`, `/components`, `/blocks`, `/docs/installation`, `/docs/cli`, `/iot`, `/docs/components/button`) | **8 / 8** |

---

## Specs

**Canonical paths, from source rather than invented:** `apps/web/public/specs/<component>.json`, served at
`https://kinetixui.com/specs/<component>.json`. The consumer is `@kinetixui/cli inspect`, via
`fetchComponentSpec`, which derives the specs base by replacing a trailing `/r` on the registry URL with
`/specs` — a **sibling** of the registry root, not a child.

| Tested path | Production result | Source result |
| --- | --- | --- |
| `https://kinetixui.com/specs/button.json` | **No response** — proxy 403 | Exists; valid JSON with `name: "button"` |
| `https://kinetixui.com/specs/<missing>.json` | **Not observed** | Expected `404`, and `fetchComponentSpec` returns `null` — a missing spec is normal, not an error |

97 spec files exist in source. One extra file, `specs/index.json`, has no registry index entry — it is a
specs index rather than a component, and is expected. **Programmatic usability in production is
unverified**; against a reachable mirror of the same payloads, `inspect`'s consumer contract held.

---

## CLI End-to-End Test

### The exact public journey attempted, against production

Clean temporary directory outside the repository, `npm init -y`, published CLI installed from npm, then
the flow documented at `/docs/installation` and in `README.md`:

```
npx @kinetixui/cli init
npx @kinetixui/cli add button
```

(`--yes` was passed to `init` to avoid an interactive prompt; it is a documented flag. No other
configuration was supplied.)

```
✔ Created kinetixui.json
✖ Could not find "tokens" in the registry (403 at https://kinetixui.com/r/tokens.json).
  [exit=1]

Resolving button…
✖ Could not find "button" in the registry (403 at https://kinetixui.com/r/button.json).
  [exit=1]
```

**That 403 is the egress gateway, not kinetixui.com.** Established by requesting the same URL and dumping
the response: `x-deny-reason: host_not_allowed`, body *"Host not in allowlist: kinetixui.com."* The origin
was never reached, so this output is **not evidence about production**.

| Check | Result |
| --- | --- |
| 1. npm package resolves | **PASS** — `@kinetixui/cli@0.23.3` from `registry.npmjs.org`, provenance attestation present |
| 2. CLI starts | **PASS** — `--version` → `0.23.3`; `--help` lists the documented commands |
| 3. Production registry contacted | **BLOCKED** — the request was made and denied before leaving the container |
| 4. `button` resolves | **BLOCKED** against production |
| 5. Expected files written | **BLOCKED** against production |
| 6. Files non-empty | **BLOCKED** against production |
| 7. Source matches current structure | **BLOCKED** against production |
| 8. Exits successfully | **FAIL against production** (exit 1), cause external to the product |
| 9. No hidden repository dependency | **PASS** — zero occurrences of the repo path in the published bundle; the installed package is a real directory, not a workspace link |
| 10. No localhost/preview endpoint | **PASS** — the only origin in the published bundle is `https://kinetixui.com` (7 occurrences, including `DEFAULT_REGISTRY = "https://kinetixui.com/r"`). Zero `localhost`, `127.0.0.1`, `*.vercel.app`, `ngrok`. The two `.local` matches are `localeCompare` |

Checks 9 and 10 are the important ones that **did** pass: the published CLI depends on production and
nothing else. If production serves the registry, this journey works — subject to the defect below.

### CLI mechanics, isolated — explicitly NOT production verification

To narrow the unknown to exactly one variable, the **same published CLI** was run against a reachable
mirror of the built payloads (`apps/web/public`, served on loopback). This proves the CLI's protocol,
resolution and file writing; it proves **nothing** about production and is not offered as such.

```
✔ Created kinetixui.json
✔ Wrote app/globals.css                 21,393 bytes · 357 CSS custom properties · :root + .dark
✔ Added components/ui/button.tsx         6,612 bytes
✔ Added lib/utils.ts                       941 bytes
  Installing @radix-ui/react-slot, class-variance-authority with npm…
  Done.                                  [exit=0]
```

Registry resolution worked (`tokens` pulled first as a registry dependency), files were written non-empty,
declared npm dependencies were installed with the consumer's own package manager, and both commands
exited 0.

---

## Consumer Activation Test

Following the pattern of the repository's existing `smokeTest` in `scripts/release/artifacts.mjs` — install
into a clean consumer, then import and assert — the generated component was bundled and **server-rendered**
rather than merely compiled.

### Result: the generated Button is consumable, but only after installing a dependency the CLI did not

**First attempt — build failed:**

```
✘ [ERROR] Could not resolve "tailwind-merge"   (imported by lib/utils.ts)
```

**After `npm i tailwind-merge` — nothing else changed:**

```
RENDER:   <button data-slot="button" data-variant="Primary" data-size="lg" class="inline-flex items-center …">
ASCHILD:  <a href="/docs" data-slot="button" data-variant="Primary" data-size="md" class="inline-flex …">
VARIANTS_FN: function  inline-flex items-center justify-center gap-1 shrink-0 font-…
```

Variants, sizes, `asChild` polymorphism and the exported `buttonVariants()` all behave correctly. The
component itself is sound.

### The worst case, measured

`button` is the mild case: `clsx` arrives transitively because `class-variance-authority` depends on it.
For a component that does not declare `cva`, **both** are missing:

```
$ npx @kinetixui/cli add card
✔ Added components/ui/card.tsx
✔ Added lib/utils.ts
  Done.                                   [exit=0]      ← installs nothing at all

$ (build)
✘ [ERROR] Could not resolve "clsx"
✘ [ERROR] Could not resolve "tailwind-merge"
```

| Measure | Value |
| --- | --- |
| Registry items total | 97 |
| Items shipping `lib/utils.ts` | **91** |
| Of those, declaring `tailwind-merge` | **0** |
| Of those, also missing `class-variance-authority` (so `clsx` is missing too) | **70** |

### Classification

| Dimension | Verdict |
| --- | --- |
| Production reachability | **VERIFICATION BLOCKED** — environment, not product |
| CLI retrieves and writes a component | **CLI SUCCESS** (against a reachable registry) |
| Generated output consumable as shipped, following only documented commands | **ACTIVATION FAILURE** |
| Generated output consumable after one manual install | **Yes** — component code is correct |

---

## Marketing Claim Verification

| # | Claim | Where | Evidence | Status |
| --- | --- | --- | --- | --- |
| 1 | *"Copy a component, own the code"* | homepage `page.tsx:87` | The CLI does copy the component and the user does own it. Mechanism verified against a reachable registry; **production path unverified** | **UNVERIFIED** (mechanism sound, production unconfirmed) |
| 2 | *"Copy a component in via the CLI"* | `README.md:13` | As above | **UNVERIFIED** |
| 3 | *"npx @kinetixui/cli add \<name\>"* as the install path | `/docs/installation`, `README.md` quick start | Command exists, resolves, writes files, exits 0 | **UNVERIFIED** against production; verified as a mechanism |
| 4 | *"The CLI … installs `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, then drops `button.tsx`…"* | `/docs/installation` | It installs **two** of the four for `button` and **none** for `card`. `tailwind-merge` is never installed for any component | **FALSE** |
| 5 | *"`add` … installs the npm packages it needs"* | `/docs/cli:36` | It installs the packages the **item declares**, which is not all the generated code needs | **QUALIFICATION REQUIRED** |
| 6 | *"`add` resolves a component's registry dependencies, installs the npm packages it needs"* | `packages/cli/README.md:19` | Same | **QUALIFICATION REQUIRED** |

### The one correction made

Claim 4 is demonstrably false and leaving it would be actively misleading — a reader concludes their build
is taken care of, and it is not. `/docs/installation` now states what the CLI actually installs and adds a
callout telling the reader to `npm i clsx tailwind-merge`, saying plainly that this is a registry-metadata
gap rather than something they should have to know.

**Claims 5 and 6 were deliberately not rewritten.** Both become true the moment the registry declares the
missing dependencies, so the correct fix is the generator, not the prose. Rewording them now would bake a
defect into the documentation of three surfaces instead of one.

> **Superseded.** Phase 0.9.1 fixed the generator, so the `npm i clsx tailwind-merge` callout described
> above has been **removed** from `/docs/installation` — keeping a workaround for a fixed defect would
> have made the defect permanent documentation. Claims 5 and 6 are now true as written, which is why they
> were left alone. All three claims are accurate **in source**; production still serves the old metadata.


---

## Failures

### F1 — Registry items under-declare npm dependencies · **P0**

> **Now FIXED IN SOURCE — AWAITING DEPLOYMENT.** See [Remediation](#remediation--phase-091-f1-fixed-in-source). The diagnosis below stands; the root cause turned out to have a second half (a hand-maintained package allowlist) that this entry did not identify.

| | |
| --- | --- |
| **Failing command** | `npx @kinetixui/cli add card` (and `add button`, in a project without `tailwind-merge`) |
| **Observed** | Exit 0, "Done.", no dependencies installed. Build fails: `Could not resolve "clsx"`, `Could not resolve "tailwind-merge"` |
| **Expected** | The generated code builds, as `/docs/installation` promised |
| **Is source correct?** | **No.** `registry/registry.json`'s `button` entry declares `["@radix-ui/react-slot","class-variance-authority"]` while its `files` include `registry/kinetixui/lib/utils.ts`, which imports `clsx` and `tailwind-merge` |
| **Root cause** | `scripts/gen-registry.mjs`. The dependency scan (`depRe`, lines 48–51) runs over `code` — the **component file only**. Line 55 then adds `lib/utils.ts` to the same item whenever the component imports `@/lib/utils`, but that file's imports are never scanned. The regex already recognises `clsx` and `tailwind-merge`; it is simply never pointed at the file that uses them |
| **Deployment stale?** | Irrelevant. The defect is in canonical source, so any deploy of any vintage carries it |
| **Implicated** | **Application/build code** — the registry generator. Not DNS, CDN, Vercel or routing |
| **Severity** | **P0 — blocks activation.** The documented first-run journey yields code that does not build |
| **Effect on marketing** | Claim 4 was false. Any campaign driving developers to `npx @kinetixui/cli add …` sends them to a failing build |
| **Effect on users** | First-run failure for 91 of 97 components; for 70 of them, two missing packages. The error is legible (`Cannot find module 'tailwind-merge'`) and one install fixes it, which limits the damage to a bad first impression rather than a dead end |
| **Mitigations already true** | Many real projects (Next.js + Tailwind starters, existing shadcn users) already have both packages, so some users never see it |

**Proposed fix — not applied, needs authorization and a deploy to reach production.** Scan every file the
item ships, not just the component:

```js
// scripts/gen-registry.mjs — after filesArr is assembled, before items.push
for (const f of filesArr) {
  const src = readFileSync(path.join(ROOT, f.path), "utf8");
  for (const m of src.matchAll(depRe)) deps.add(m[1]);
}
```

Then `pnpm build:registry` and deploy. Expected effect: `clsx` and `tailwind-merge` appear on all 91
items, and claims 4–6 become true without further prose changes. A test asserting that every dependency
imported by a shipped file is declared would stop it recurring — the same shape as the existing drift
checks.

### F2 — The CLI reports a network denial as "component not found" · **P2**

| | |
| --- | --- |
| **Observed** | `✖ Could not find "button" in the registry (403 at …/r/button.json)` |
| **Expected** | A 403 means "not allowed to look", not "does not exist" |
| **Is source correct?** | Partly. `fetchRegistryItem` maps any non-OK response to "Could not find". A corporate proxy or egress policy — precisely the situation where a mirror is wanted — tells the developer the component does not exist |
| **Implicated** | Application code (`packages/cli/src/lib/registry.ts`) |
| **Severity** | **P2 — non-blocking.** The URL and status are printed, so the cause is recoverable by a careful reader |
| **Effect on marketing** | None directly. It cost real time in this verification, which is a fair proxy for a developer's experience |
| **Effect on users** | Misdiagnosis behind a restrictive network |
| **Proposed fix (not applied)** | Distinguish 401/403 from 404 in `fetchRegistryItem`: for 403, say the registry refused the request and name `--registry` / the `registry` config key, as the unreachable-host path already does |

### F3 — Production verification blocked · **P1 as a verification gap, not a defect**

| | |
| --- | --- |
| **Observed** | Proxy 403, `x-deny-reason: host_not_allowed`, on every path |
| **Expected** | 200s per the Phase 0.75 checklist |
| **Is source correct?** | Yes — robots, sitemap and registry all derive correctly from source |
| **Deployment stale?** | Unknown. Cannot be assessed |
| **Implicated** | **This container's egress policy.** Not DNS (resolves), not TLS (never attempted), not the origin |
| **Severity** | **P1** — it does not damage the product, but it leaves the single most important activation claim unconfirmed |
| **Effect on marketing** | Phase 1 cannot honestly assert the activation path works end to end in production |
| **Effect on users** | None known |

---

## Release Version Surfaces Encountered

Observed only in passing, as instructed — no new audit.

| Surface | Observation |
| --- | --- |
| `@kinetixui/cli` on npm | `0.23.3`, published 2026-09-28. Matches the workspace and the core cohort |
| `kinetixui --version` | `0.23.3` — agrees with the package it came from |
| `DEFAULT_REGISTRY` in the published bundle | `https://kinetixui.com/r` — production, no preview |
| Token contract written by `init` | 357 CSS custom properties, matching the 357 DTCG definitions in source |
| GitHub Releases | Still `v0.5.0` / `v0.4.1` from 2026-09-06 — the known Phase 0.75 gap, unchanged. It was **not** encountered in the activation journey and does not affect it |

**No production surface was found contradicting current published package state.**

---

## Phase 0 Final Status

**PHASE 0 BLOCKED**

Two reasons, of different kinds:

1. **A P0 activation defect is open and unfixed.** The documented journey — `npx @kinetixui/cli add …` —
   produces code that does not build for 91 of 97 components, because the registry omits `clsx` and
   `tailwind-merge` from every item that ships `lib/utils.ts`. This was found with the published CLI and
   is provable from canonical source; it is real regardless of what production serves. Per the failure
   protocol it is documented, not fixed, and the fix needs authorization plus a deploy.

2. **Production has still never been reached.** The question Phase 0.9 exists to answer — *can a real user
   discover KinetixUI today and successfully use the documented CLI against the live production system?* —
   cannot be answered from here. The answer to the first half is **no, not as documented**, because of
   F1. The second half remains unknown.

The honest summary: **the product is closer than the documentation said, and further than the documentation
said.** The component code is correct and renders. The packaging metadata around it is not, and that gap
sits squarely on the activation path a campaign would drive traffic to.

---

## PHASE 1 GATE: FAIL

Only the issues that genuinely block Phase 1:

### 1. F1 — the registry dependency omission (**P0**)

Phase 1 will write copy driving developers to `npx @kinetixui/cli add button`. Today that command produces
a project that does not build. This is not a theoretical improvement or deferred technical debt: it is the
tested journey failing. It blocks on claim accuracy and on activation simultaneously.

**Smallest concrete blocker:** point the existing dependency scan in `scripts/gen-registry.mjs` at every
file an item ships — roughly five lines — then `pnpm build:registry` and deploy. Awaiting your
authorization; I have not applied it, and I will not deploy.

### 2. F3 — production activation still unverified (**P1**)

Even with F1 fixed, no one has confirmed that `kinetixui.com/r/registry.json` serves. Add `kinetixui.com`
to the environment's allowed domains and I can close this in one pass, or run the Phase 0.75 checklist
yourself — it asserts every expected value in this report.

### Explicitly NOT blocking

Consistent with the scope control in the brief, none of these blocks Phase 1 and none is a reason to delay
marketing: the deferred `@kinetixui/ui` subpath exports; visual-regression infrastructure; interaction
coverage; native package publication; registry fallback architecture; the three missing GitHub Releases;
repository description and topics; Discussions; `/specs/` being crawlable; F2's error wording. None of them
prevented the journey tested here.

---
---

# Remediation — Phase 0.9.1 (F1 fixed in source)

**2026-09-29.** Everything above this line is the Phase 0.9 verification, unedited. This section records
what changed afterwards. Full detail: [`PHASE-0.9.1-REGISTRY-FIX.md`](./PHASE-0.9.1-REGISTRY-FIX.md).

**Still nothing published, released, deployed or merged.**

## F1 — FIXED IN SOURCE — AWAITING DEPLOYMENT

| | |
| --- | --- |
| **Fixed in source** | ✅ Yes |
| **Verified against production** | ❌ No — production still serves the defective metadata |
| **Deployment required** | **YES** — website only (`apps/web`) |
| **npm publication required** | **NO** — proven, see below |
| **Status** | **FIXED IN SOURCE — AWAITING DEPLOYMENT** — not closed |

### The root cause had a second half this report missed

Phase 0.9 named the scan running over the component file only. Correct, but incomplete: dependencies were
also matched against a **hand-written list of package names**. A list cannot fail, only be incomplete —
`@kinetixui/tokens` was never on it, so `kanban-board`'s real runtime import of it was undeclared too, and
two entries on it matched nothing at all.

So the fix was not the "roughly five lines" this report estimated. The allowlist was **removed** and imports
are now derived from source, and dependencies are computed from the **delivered set after it is assembled** —
which is what makes the class of bug structurally unavailable rather than merely patched.

### What changed

| | |
| --- | --- |
| `scripts/gen-registry.mjs` | Allowlist deleted; imports derived; every delivered file scanned |
| `scripts/check-registry-deps.mjs` | **New.** `pnpm check:registry-deps` — fails if any item omits an import of any file it delivers, or declares one nothing imports |
| `.github/workflows/ci.yml` | Runs that check straight after `Build registry` |
| `scripts/release/test/registry-deps.test.mjs` | **New**, 14 tests, written against the architecture rather than this incident |
| `registry/registry.json`, `apps/web/public/r/*.json` | Regenerated: `clsx` +91, `tailwind-merge` +91, `@kinetixui/tokens` +1; **nothing removed**; still 97 items |
| `apps/web/src/app/docs/installation/page.mdx` | Workaround callout removed; now describes verified behaviour |

### Evidence

- **All 97 items audited programmatically:** 0 with unresolved external imports, 0 over-declarations.
- **Clean-consumer builds** with the **unmodified published** `@kinetixui/cli@0.23.3` and no manual
  installs: `button`, `card` and `kanban-board` each installed their full set, built, and server-rendered.
- **Mutation test:** reverting the generator produced exactly 91 checker problems and 2 test failures;
  restored output is byte-identical.

### Why deployment is website-only

`apps/web/public/r/*.json` *is* the registry — `DEPLOY.md`: *"There is no separate 'registry' deployment."*
No published package's contents changed (verified by diffing the change set against every allowlisted
package directory: zero hits), and the same unmodified CLI 0.23.3 now installs the complete set. So one
`apps/web` deploy fixes every existing installation, with no new CLI version and no user action.

## F3 — unchanged

`kinetixui.com` is still denied by this container's egress policy (`403`,
`x-deny-reason: host_not_allowed`). Production remains unverified. Remedy is unchanged: add the host to the
environment's allowed domains, or run the `PHASE-0.75-PUBLIC-SURFACE.md` checklist yourself.

## Phase 0 status: still BLOCKED

Of the two Phase 1 gate blockers, one is fixed in source and awaiting a deploy; the other is untouched.
Neither has been verified against production, which is the question Phase 0.9 exists to answer.

**Next action:** deploy `apps/web`, then verify `/r/card.json` declares `clsx` and `tailwind-merge` and run
the end-to-end `add` test against production.
