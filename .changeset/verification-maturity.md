---
"@kinetixui/ui": patch
---

Evidence-backed implementation verification, kept separate from package maturity.

Three different things were being said with one word, and the word being
printed was the one nothing backed up: `platformDefinitions` called SwiftUI
stable, and the only thing behind that was a filename.

They are now three fields that never derive from each other — **component
lifecycle** (is the API settled?), **package maturity** (is the offering a
product?) and **verification** (how much automated evidence stands behind this
implementation, on this platform).

Verification is derived from the tests themselves: a marked passage declares
what kind of verification it performs, and the components it covers are read
from the KinetixUI symbols that passage calls. Every positive result carries
the file and line range behind it, so `pnpm platform:matrix --verification`
can answer "why does this say RTL verified?".

Package maturity is unchanged — React stable, Angular preview, SwiftUI,
Compose and Flutter stable. What is new is that the site no longer lets that
word stand in for evidence. `@kinetixui/ui` is a stable, published package
whose catalogue is verified to beta; both are true, and the pages now say both.

`pnpm check:stories` closes the hole that let `direction-provider` go
unchecked: two accessibility suites take their subjects from the story
directory, so a component with no story is a component nothing checks.
