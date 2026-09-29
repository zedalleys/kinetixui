# Future IoT proof assets (candidates)

**Not scheduled. Not part of the active campaign.** These are candidate proof assets for `@kinetixui/iot`,
kept so the arguments and their evidence are not lost. None is in [`register.json`](./register.json) or
[`calendar.md`](./calendar.md), none has a draft, and nothing here is approved to publish.

Before any of these is used:

1. Check every product statement against [`../CLAIMS.md`](../CLAIMS.md), in particular **C4 — The IoT module**.
   It is a React module; it is not a platform; no protocol or transport is supported; no native port exists;
   its primitives and patterns are not counted in the component catalogue.
2. Re-derive every number with `pnpm marketing:stats`. Never copy a count from this file. Read the published
   version of `@kinetixui/iot` from the manifest and from npm, and confirm the feature a piece describes is
   in the *published* release, not only in the repository.
3. Every demo on the website is **simulation**. A visual made from one carries the same disclosure the page does:
   "Simulated — no device is contacted."
4. Follow the normal path in [`README.md`](./README.md): a real development event, a verified claim, a register
   entry, an attributed URL. This file is a shelf, not a step in that path.

Each candidate has three parts: the **product value** (why it matters to someone building a connected
product), the **documented proof** (where in this repository the claim can be checked), and the **marketing
story** (the argument, and what it must not say).

---

## 1. Why optimistic UI is dangerous when the UI controls physical hardware

- **Product value.** A switch that slides the moment it is pressed asserts a state the device has not reported.
  On a lamp that is harmless; on a lock, a valve or a pump the user finds out later, and a second press because
  "it did not work" toggles the device twice. Building the honest version is design work most teams skip.
- **Documented proof.**
  - `docs/iot/EXPERIENCE-MATURITY.md` §1 ("The defect that matters most") and §4 (the site's own showcase
    updated optimistically, with no pending state, until the control layer replaced it).
  - The controls take `state` and `requested` as separate props; `aria-checked` reports the confirmed state while
    a request is open (`packages/iot/src/react/device-power-control.tsx`, `controls.test.tsx`).
  - The `/iot` hero device and the `state-honesty` example, which can be watched failing to confirm.
- **Marketing story.** Optimistic UI is a reasonable default for a like button and a defect for a door lock.
  Show the same press twice: once lying, once honest, and let the reader see the gap. Must not claim the module
  fixes device reliability; it changes what the interface says while the device is unreliable.

## 2. Requested state is not confirmed state

- **Product value.** The gap between *asked* and *confirmed* is where connected products lose trust, and most
  design systems have no vocabulary for it. Naming it, and drawing it differently in the picture and in
  assistive technology, is a reusable rule.
- **Documented proof.**
  - The command lifecycle machine in `packages/iot/src/functions/commands.ts` (nine stages; only `confirm` moves
    the confirmed value; `acknowledged` is never drawn as confirmed) and its tests.
  - The `CommandLifecycle` component and the sentences from `describeCommandLifecycle`, which name both values.
  - `/docs/iot`, "The command lifecycle": the worked example from off, through turning on, timeout and
    unreachable, to retry and confirmed. Every output in it is asserted against the source.
- **Marketing story.** A short piece on the words: *requested*, *acknowledged*, *confirmed*, *timed out*,
  *unreachable*. Each is a different sentence because each asks the user for a different next step. Must not
  imply a transport: the machine has no clock and no network, and the application decides when to time out.

## 3. What a design system should own in IoT — and what it shouldn't

- **Product value.** A design system that reaches for the transport ends up owning protocols it cannot keep
  current. One that owns none of the device model leaves every team inventing its own words for "stale". The
  boundary is the useful part.
- **Documented proof.**
  - `/docs/iot`, "Transport boundary", and the figure on `/iot`: the application and provider layer, the
    application adapter, the state model, the components, the compositions. "KinetixUI does not own the transport."
  - The absence is asserted: no transport code in the package, the functions half is React-free and asserted
    against the source graph and the built output, zero runtime dependencies.
  - The registries (device taxonomy, metric registry, pairing failures) are the part a design system *can* own.
- **Marketing story.** Own the semantics and the states; refuse the plumbing. Must not name a protocol as
  something the module works with. Protocols appear only as examples of what an application might use.

## 4. Pairing is a product pattern, not a Bluetooth API

- **Product value.** Adding a device is the first impression of every connected product, and it fails in a
  dozen specific ways. Teams usually design the happy path and let the transport's error strings leak through.
- **Documented proof.**
  - The pairing flow machine, the five methods and the failure registry with recovery actions
    (`packages/iot/src/functions/pairing.ts`, `pairing-flow.test.ts`).
  - `PairingMethodPicker`, `PairingStepper`, `PairingFailure` and the `pairing-flow` example, driven by the
    state machine with real failure and recovery states.
  - The package states plainly that nothing discovers, connects to or authenticates a device.
- **Marketing story.** The screen can be designed, tested and reviewed before any transport exists, and the
  failure copy is decided once instead of per radio. Must not claim it pairs anything, and must not say which
  radios a product should use.

## 5. One IoT interaction model across smart spaces, farms and industrial operations

- **Product value.** A home, a greenhouse and a production line name their places differently and want
  different controls, but they need the same answers: what was asked, what was confirmed, how much to trust a
  reading. A vocabulary-free model means one team's work carries to the next domain.
- **Documented proof.**
  - The three reference environments on `/iot` (Smart space, Agritech, Operations), each a fabricated,
    disclosed scenario built from the same components.
  - The space hierarchy model, which has one node type and a `kind` string, exercised in its tests with four
    different vocabularies; the device taxonomy and domain registry.
  - `docs/iot/EXPERIENCE-MATURITY.md` §9.3, which records why interaction-shape categories were kept beside a
    domain registry rather than replaced by it.
- **Marketing story.** The same rules applied three times. The evidence is the three environments side by side,
  every one labelled as simulation. Must not present any environment as a customer, a deployment or a measured
  result; all of the data is fabricated and scripted.
