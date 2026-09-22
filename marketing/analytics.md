# Analytics & KPIs

## The funnel

```
Acquisition        landing page (kx_* attribution, privacy-safe)
      ↓
Interest           /docs, /components, /blocks, platform docs
      ↓
Activation         cli_command_copied · install_command_copied · component_code_copied
      ↓
Return             repeat docs/component sessions
```

## Canonical activation — do not redefine casually

Exactly three events count as activation:

| Event | Meaning |
| --- | --- |
| `cli_command_copied` | took the CLI command |
| `install_command_copied` | took a package install command |
| `component_code_copied` | took a real component's source from its own page |

**Protected boundaries** (already enforced in code, keep them):

- Blocks copy fires **nothing**. A block is a composition, not a component.
- The homepage flagship recipe fires **nothing** on copy. `flagship-preferences`
  is not in `components.manifest.json`; counting it would both inflate activation
  and put a non-component in the "Top Components Copied" breakdown.
- `platform_selected` is interest, never activation.
- Do not add a fourth activation event without a deliberate decision recorded here.

## North-star metric

**Weekly Activated Developers** — distinct users firing at least one of the three
activation events in a week.

**Why not stars:** stars measure approval, not use. They ratchet up and never
down, so they cannot tell you a change made things worse. WAD moves in both
directions and is the closest available proxy for "someone is actually building
with this".

**Why not traffic:** an article can double traffic without a single install.

Track stars — just never as the headline.

## KPIs by layer

### Awareness
unique visitors · organic impressions and clicks · social reach ·
GitHub repo views · referral sources

### Interest
docs views · components views · **platform-doc views by platform** (the
highest-signal metric here — it says which platform people actually came for) ·
components per session · flagship `platform_selected` spread

### Activation
the three canonical events · **activation rate from docs sessions** ·
activation by entry path (components / tokens / CLI / platform docs)

### Community
stars · forks · issues opened and closed · discussions · new contributors ·
external PRs

### Retention proxy
returning visitors · repeat docs sessions · changelog views per release

## Privacy

Keep the existing model. `kx_*` first-touch and session-entry attribution,
`respect_dnt`, autocapture and session replay off, `person_profiles:
identified_only`, and a runtime property allowlist that strips anything not
explicitly permitted — including the PostHog-injected
`$session_entry_utm_*`/`gclid`/`ph_keyword` values that leaked before.

**Do not** add invasive tracking, session recording, or any field carrying user
content. The analytics story is itself a credibility asset with this audience.

## Dashboard

Existing PostHog dashboard covers acquisition, activation and the Top Components
Copied breakdown. No changes needed — the guardrails above exist specifically to
keep that breakdown meaningful.
