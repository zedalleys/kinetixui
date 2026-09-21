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
feature-flag requests, person profiles and `identify()`. Campaign parameters (`utm_*`, `gclid`, …) are not saved.
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
