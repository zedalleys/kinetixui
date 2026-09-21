# Analytics (website)

Product analytics for kinetixui.com use PostHog, behind one interface: [`src/lib/analytics.ts`](src/lib/analytics.ts).

## Configuration

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | the project's public `phc_…` key |
| `NEXT_PUBLIC_POSTHOG_HOST` | an https origin, e.g. `https://us.i.posthog.com` (US) or `https://eu.i.posthog.com` (EU) |

Set them in `apps/web/.env.local` locally (git-ignored; template in [`.env.example`](.env.example)) and in the
Vercel project's environment variables for production. `NEXT_PUBLIC_*` values are baked in at **build** time, so
change them, then redeploy.

## When it runs

Analytics sends only when **all** of these hold; otherwise every call is a silent no-op and the SDK is never downloaded:

- both variables are set and valid (a missing or malformed value disables analytics — it never throws);
- it is a production build (`next dev` and the test runner never send);
- the page is on `kinetixui.com`. Vercel preview deployments are production builds too, so this is checked
  against the hostname at runtime rather than trusting which environment the variables were scoped to.

## Rules for UI code

- Call `analytics.track("event_name", { … })`. **Never** call `posthog.capture` (or import `posthog-js`) from a
  component — only `src/lib/analytics-posthog.ts` may.
- Events and their properties are the typed contract `AnalyticsEvents`. Add a new event there; an unknown event or
  property is a compile error. `source` is a closed union — extend it rather than passing free text.
- **No PII, ever.** Property values must be identifiers: a slug, a package name, a hostname, a version. Never an
  email, a name, form or search text, clipboard contents, a full URL or a query string. Anything that is not
  identifier-shaped is dropped at runtime, and query strings and hashes are stripped from every URL sent.
- Do not call `analytics.pageview` from a page: `AnalyticsProvider` (mounted in the root layout) reports one page
  view per route change.

## What is deliberately off

Session recording, autocapture, heatmaps, dead/rage-click capture, surveys, exception capture, web vitals,
feature-flag requests, person profiles and `identify()`. The SDK's own campaign parsing is off and everything it
derives from a URL or referrer (`utm_*`, click ids, `$referrer`, `$referring_domain`, the search keyword) is deleted
before sending; acquisition is reported only through the `kx_*` properties below.
Change these in `analytics-posthog.ts` only, with a reason.

## One thing only the PostHog project can do

Client IP capture can't be disabled from the browser. In the PostHog project settings, turn on
**Discard client IP data**.

## The funnel: what fires, and where

One user action produces one semantic event. `$pageview` (navigation, from `AnalyticsProvider`) is separate and
unchanged. Rules live in [`src/lib/analytics-surfaces.ts`](src/lib/analytics-surfaces.ts), which is where to look
first — and to change — when a surface changes.

**High-intent activation events** (Developer Activation Rate = visitors with at least one of these ÷ visitors;
there is deliberately no `activated` event, derive it in PostHog):

| Event | Fires when | Owner |
| --- | --- | --- |
| `cli_command_copied` | a `npx @kinetixui/cli …` command is copied | `HeroCommand` (homepage) and `CodePre` (any docs fence) |
| `install_command_copied` | an `npm i @kinetixui/…` (or pnpm / yarn / bun add) command is copied | `CodePre` |
| `component_code_copied` | a component's code is copied, with its component and platform | `ComponentPreview` code tabs and `CodePre` on a component page |

**Supporting events** (never count as activation):

| Event | Fires when | Owner |
| --- | --- | --- |
| `docs_viewed` | a listed `/docs/*` page is viewed (not installation, changelog or a component page) | `AnalyticsProvider` |
| `installation_viewed` | `/docs/installation` is viewed | `AnalyticsProvider` |
| `component_viewed` | a component's docs page is viewed | `AnalyticsProvider` |
| `changelog_viewed` | `/docs/changelog` is viewed | `AnalyticsProvider` |
| `cta_clicked` | a link marked with `ctaAttrs(source, target)` is clicked | `AnalyticsProvider` listener; markup on the homepage |
| `platform_selected` | the user switches the platform tab in a component's code view | `ComponentPreview` |
| `github_clicked` | a link into our GitHub repository is clicked | `AnalyticsProvider` listener |
| `npm_clicked` | a link to one of our npm packages is clicked | `AnalyticsProvider` listener |
| `external_link_clicked` | a link to a listed external host with no more specific event (today: the Figma file) | `AnalyticsProvider` listener |

The view events are mutually exclusive: a page produces exactly one of `installation_viewed`,
`changelog_viewed`, `component_viewed` or `docs_viewed`. The more specific event wins, so a funnel step for
"read the docs" is `docs_viewed` OR `installation_viewed` OR `component_viewed`. The same rule applies to links: a
GitHub click is `github_clicked` and never also `external_link_clicked` or `cta_clicked`.

### Adding or changing instrumentation

- **A product CTA** (server-rendered page, no client component needed): `<Link href="/docs" {...ctaAttrs("homepage_hero", "get_started")}>`.
  `source` and `target` are closed unions in `analytics.ts`; extend them for a new surface, never pass a label.
  Ordinary navigation links are **not** CTAs.
- **A copy button**: pass `onCopy` to `CopyButton`. It runs only after the clipboard write succeeded and receives
  nothing, so the copied text can't reach an event. Never read the value into `analytics.track`.
- **Packages** come from `lib/packages.ts` (each package's own `package.json`); components come from the docs'
  own component list. Don't hand-type either.
- **`platform` means an implementation platform** (`react`, `swiftui`, `compose`, `flutter`). A package manager
  (npm/pnpm/yarn/bun) is not a platform; if it ever needs measuring, add a typed property instead.
- Tests in `analytics-surfaces.test.ts`, `analytics-provider.test.tsx` and `analytics-instrumentation.test.tsx`
  show each pattern; `analytics.architecture.test.ts` guards the rules above.

### Not instrumented on purpose

Copy buttons on `/blocks`, `/charts`, `/colors`, `/theme-builder` and "copy page as markdown" (no component +
platform to attribute, or not code); ordinary navigation, the docs search palette, gallery search and filters
(their text must never be sent); attribution links (Radix, Lucide, Recharts); `platform_selected` on the
homepage (there is no platform selector there). `npm_clicked` has no surface yet — the site links to no npm page —
but any link to one of our packages on npmjs.com is reported the moment it is added.

## Acquisition attribution

Where did a developer come from, what did they do, and did they activate? Attribution answers the first part
with a deliberately simple, inspectable model. **It is directional evidence, not causal truth**: referrers are
stripped by many apps and privacy tools, a link can be shared beyond the audience it was made for, and a visit is
credited to a channel, not to the effect of a post. Use it to compare channels, not to prove one caused an install.

It lives in [`src/lib/analytics-attribution.ts`](src/lib/analytics-attribution.ts). No cookies, no server, no
dependency, no identification — the anonymous PostHog id is unchanged. UI code knows nothing about it: the adapter
adds the attribution to **every** event (including `$pageview`) centrally.

### Session entry vs first touch

| | Answers | Stored in | Lifetime | Rule |
| --- | --- | --- | --- | --- |
| `kx_*` (session entry) | How did *this browsing session* begin? | `sessionStorage` (`kx_analytics_session_v1`) | the tab | derived on the first page of the session, then reused. A later page, a later UTM in the same tab, and every client-side navigation leave it alone |
| `kx_first_*` (first touch) | How was this *browser* first acquired? | `localStorage` (`kx_analytics_first_touch_v1`) | until cleared | **write-once**. Never overwritten, and never replaced by `direct` |

Properties (each present only when known): `kx_source`, `kx_medium`, `kx_campaign`, `kx_content`, `kx_referrer`,
`kx_landing_page`, and the same six as `kx_first_*`. Only normalised values are ever stored or sent — never a query
string, a referrer, a click id or a full URL. Storage is re-validated when read (it is user-editable).

### Source taxonomy (closed)

`direct`, `google`, `bing`, `duckduckgo`, `github`, `linkedin`, `x`, `reddit`, `devto`, `hashnode`, `producthunt`,
`youtube`, `newsletter`, `other`.

`utm_source` is normalised, never forwarded: `twitter` / `x.com` / `t.co` → `x`; `dev.to` / `dev_to` → `devto`;
`google`, `google.com`, `google_search` → `google`; **anything unrecognised → `other`**, and the raw value is
discarded. `kx_referrer` uses the same list without `newsletter`, classified from the referrer's *hostname only*.

### Medium taxonomy (closed)

`organic`, `social`, `community`, `referral`, `email`, `launch`, `video`, `direct`, `other`.

A known `utm_medium` is used. An unknown one is ignored (never forwarded), and the medium is inferred from the
source: google / bing / duckduckgo → `organic`; linkedin / x → `social`; reddit / devto / hashnode → `community`;
producthunt → `launch`; youtube → `video`; newsletter → `email`; github → `referral`; direct → `direct`; an
unrecognised external site → `referral`; otherwise `other`.

### Campaign and content

`utm_campaign` is kept **only** if it matches `kx_[a-z0-9][a-z0-9_-]{0,62}` — a KinetixUI campaign. `utm_content`
is kept only if it is a slug `[a-z0-9][a-z0-9_-]{0,63}` **and** a valid campaign is present. Anything else is
omitted, never "cleaned" into a different value. A campaign is never inferred.

### Precedence

- **Source:** (1) a `utm_source` that maps to a known source; (2) a recognised external referrer; (3) `other` if a
  tag or an unrecognised external site existed; (4) `direct`.
- **Medium:** (1) a known `utm_medium`; (2) inferred from the source.
- **Referrer:** our own site (or a subdomain), no referrer, or a non-web referrer is `direct`. An internal referrer
  never creates or overwrites acquisition.
- **Landing page:** the clean pathname of the session's first page.

### Campaign links

Use `utm_*` on **external** links only, never on links inside kinetixui.com. Campaigns must use the `kx_` prefix.

```
LinkedIn      ?utm_source=linkedin&utm_medium=social&utm_campaign=kx_launch_2026&utm_content=component_demo
Reddit        ?utm_source=reddit&utm_medium=community&utm_campaign=kx_launch_2026&utm_content=designsystems_post
DEV           ?utm_source=devto&utm_medium=community&utm_campaign=kx_design_tokens_article
Product Hunt  ?utm_source=producthunt&utm_medium=launch&utm_campaign=kx_producthunt_launch
```

Spaces, `@`, dots, slashes, colons, uppercase or any URL characters in a campaign or content value cause it to be
omitted (the source and medium still count).

### Privacy rules

- The query string is read in one place (`analytics-attribution.ts`); each value is normalised at once and the raw
  text discarded. Click ids (`gclid`, `fbclid`, `msclkid`, `li_fat_id`, …) are never read, stored or sent.
- `document.referrer` is never sent or stored: it becomes a category (`kx_referrer`), and an unknown hostname
  becomes `other` without being kept.
- The SDK derives its own `$referrer`, `$referring_domain`, `$search_engine` and search keyword
  (`$session_entry_ph_keyword` is the visitor's search text) and its own `utm_*` copies. All are deleted in
  `before_send`, and every `kx_*` value is re-validated there, so nothing can carry acquisition out except the
  validated `kx_*` set. `$current_url` remains origin + clean pathname.
- Attribution starts only after analytics is enabled (production, real hostname, valid config) and Do Not Track
  is off; otherwise nothing is written to storage.
- **Storage blocked?** Nothing throws and no console noise. The session's attribution is kept in memory for the
  page's life; first touch is omitted (it could not be persisted, so claiming it would be wrong). Product events
  are unaffected.

### Limitations

- A tab that stays open keeps its session attribution however long it lives, and a first visit that arrives with
  no referrer (typed URL, a privacy-stripped click) locks first touch as `direct` — write-once means it is never
  upgraded.
- Referrers are often absent or trimmed to an origin; `direct` overstates typed visits.
- Clearing site data, private windows and another browser or device all start a new "first touch".
- Only KinetixUI-tagged campaigns are named. Untagged shares appear as their referrer or as `other`/`direct`.

### Developer Activation Rate

Derived in PostHog — never in application code, and there is deliberately no `activated` event:

```
Developer Activation Rate
  = unique anonymous visitors with at least one of
      cli_command_copied, install_command_copied, component_code_copied
  ÷ unique anonymous visitors
```

Break it down by `kx_source`, `kx_medium`, `kx_campaign`, or `kx_first_source` to compare channels.
