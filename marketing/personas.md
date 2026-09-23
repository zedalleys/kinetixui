# ICPs

Ordered by how well KinetixUI currently serves them. Serving A and D well is
worth more than being vaguely interesting to everyone.

## A — Design-system engineer (primary)

Maintains tokens and components across more than one platform. Has felt platform
drift personally.

- **Believes already:** design tokens are the right abstraction; keeping four
  implementations in sync by hand is miserable.
- **Sceptical of:** anything promising parity, because they have been burned.
- **Wins them:** the verification story. Show a CI guardrail catching a false
  claim in our *own* repo.
- **Entry point:** `/docs/platforms`, the parity checks, build-in-public posts.

## B — Frontend lead / product engineer

Owns shared UI infrastructure. Cares about DX, CI, accessibility, maintenance
cost.

- **Believes already:** consistency is a maintenance problem, not a design one.
- **Sceptical of:** lock-in and runtime dependencies.
- **Wins them:** "own the code" CLI model, zero runtime deps, CI guardrails.
- **Entry point:** `/docs/installation`, `/components`.

## C — Design-system designer

Manages Figma, tokens and handoff. Less interested in Kotlin, very interested in
semantics, variants and whether the code matches the design intent.

- **Believes already:** token naming is the hard part.
- **Wins them:** DTCG source, semantic vs primitive layering, the token pipeline
  diagram, light/dark as one contract.
- **Entry point:** `/docs/tokens`, `/colors`, `/theme-builder`.

## D — Team shipping web **and** mobile (primary)

React web plus SwiftUI/Compose/Flutter. Parity is an active, current pain.

- **Believes already:** the web team and the mobile teams have diverged.
- **Wins them:** the flagship cross-platform demo; token-only adoption as a
  low-commitment first step.
- **Entry point:** homepage flagship, `/docs/flutter`, `/docs/swiftui`, `/docs/compose`.

## E — RTL / multilingual product team

Arabic or Hebrew UI across platforms. Usually treated as a late patch.

- **Believes already:** RTL is always retrofitted and always breaks.
- **Wins them:** RTL as infrastructure — logical properties enforced by
  `check:rtl`, direction-aware behaviour tested on Compose, Flutter and Angular.
- **Entry point:** `/docs/rtl`.

## Secondary

Open-source contributors · agencies · startups adding a second platform ·
enterprise design-system teams evaluating build-vs-adopt.

## Explicitly not the target right now

Someone who wants a React-only component library. shadcn/ui and Radix serve them
better, and saying so builds more credibility than pretending otherwise.
