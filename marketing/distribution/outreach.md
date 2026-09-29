---
type: distribution — partnerships and outreach
status: templates. Nothing sent. No person or organisation is named anywhere in this file
---

# Partnerships and outreach

**Non-paid only.** No sponsorships, no affiliate arrangements, no paid placements, no influencer list. There
is no budget and, more importantly, paid reach into a funnel with no baseline buys a number rather than a
lesson.

**No individual or company is named in this file, on purpose.** A list of named targets written from inside
a container with no network access would be a list of guesses about who is currently active, and it would go
stale privately. What is durable is the *archetype* and the *approach*; who fits it is a judgement made when
looking at real, current work.

---

## The premise

Every archetype below is a **technical-value exchange**. The question is never *"will you promote my
product?"* — it is *"is there something here you would find useful, and is there something you know that
would make this better?"*

If the honest answer to both is no, there is no partnership and the outreach should not be sent.

**What we have to offer**, concretely, and all of it verifiable:

- A **DTCG token source with committed generated output** for web, iOS, Android and Flutter — a real reference
  implementation of a pipeline most people only describe.
- **Five native component implementations** against one contract, which makes the platform-idiom differences
  visible in a way a single-platform library cannot.
- **Verification machinery**: coverage generated from a manifest, claims checked against source in CI, and
  marketing copy under the same guards. The architecture is more interesting than the components.
- **Three published claim failures**, caught by our own checks, with before/after counts.
- **Evidence published as fractions**, including the ones that look bad.
- MIT licence, so anything can be read, forked or cited.

---

## Five partnership archetypes

### 1 — The design-system educator

| | |
| --- | --- |
| **Who** | Someone who teaches design systems — a course, a book, a workshop series, a long-running newsletter |
| **What they need** | Real examples. Teaching material about cross-platform systems is mostly hypothetical because public multi-platform implementations are rare |
| **What we give** | A complete, MIT-licensed, inspectable case study: the token pipeline, the manifest architecture, and the verification layer. Plus the honest parts — three false claims, uneven evidence fractions, a platform in preview |
| **What we get** | Our architecture explained to an audience that already cares, by someone with more credibility on the topic than we have |
| **Shared value** | Genuine. They need an example; we are one |
| **Form** | They cite or use KinetixUI as a case study. We answer questions properly and fix anything they find confusing in the docs |
| **What this is not** | A sponsorship. If money is mentioned, it is advertising and we do not do that yet |
| **Risk** | Low. The main risk is ours: a teacher reading our docs closely will find gaps, and that is the point |

### 2 — The open-source maintainer in an adjacent layer

| | |
| --- | --- |
| **Who** | A maintainer of something we sit beside — a token tool, a primitive library, a registry-shaped CLI, a theming layer |
| **What they need** | To know how a downstream consumer actually uses their work, and where it breaks |
| **What we give** | A concrete, non-trivial integration report. We compile DTCG through a transform pipeline to four native targets; that exercises edge cases a test suite does not |
| **What we get** | Interoperability that is real rather than claimed, and a relationship that survives a breaking change |
| **Shared value** | Highest of the five. Both sides get working software |
| **Form** | Bug reports with reproductions · a PR · a documented integration · an issue describing a real friction point |
| **What this is not** | A request to be listed in their README. If a listing is the point, this is promotion wearing a collaboration costume |
| **Risk** | Low, and it is mostly ours: a badly-argued issue in someone else's repository is a permanent public artefact |

### 3 — The token / DTCG ecosystem

| | |
| --- | --- |
| **Who** | People working on the design-token standard and its tooling — spec contributors, transform authors, plugin maintainers |
| **What they need** | Evidence of the specification used in anger, especially past the web boundary. Most DTCG discussion is web-shaped |
| **What we give** | A production-shaped implementation that generates Swift, Kotlin and Dart output, plus Material and Cupertino theme adapters — and a clear account of where the spec was ambiguous and what we chose |
| **What we get** | Correctness. If we are misreading the spec, these are the people who will say so, and finding out early is cheap |
| **Shared value** | Strong, and it is the most *strategically* aligned of the five: pillar B's entire position is the native half of the token conversation |
| **Form** | Participation in spec discussion · a write-up of a real ambiguity · contributing a transform |
| **What this is not** | Standing on a standards body to borrow legitimacy |
| **Risk** | Medium, of a useful kind: we may be told we are wrong about something we have published. That is a correction, and `CLAIMS.md` exists to absorb it |

### 4 — The frontend or mobile educator

| | |
| --- | --- |
| **Who** | Someone teaching a *platform* — SwiftUI, Compose, Flutter, Angular — rather than design systems |
| **What they need** | A realistic answer to *"how do I keep this consistent with the web app?"*, which comes up in every course and has no good public answer |
| **What we give** | Per-platform token output they can read, and a component implemented in that platform's own idiom rather than wrapped from React |
| **What we get** | Reach into S4 (mobile engineers), the audience furthest from us and most likely to be blocked on exactly this |
| **Shared value** | Real, but narrower — they teach the platform, we are one answer to one of its questions |
| **Form** | A worked example · a guest section · answering their audience's questions |
| **What this is not** | Positioning KinetixUI as a substitute for platform expertise. **The messaging is shared system intent plus platform-appropriate implementation.** Never *"you don't need to know SwiftUI"* |
| **Risk** | Medium. The easiest archetype in which to overclaim. Every constraint in `CLAIMS.md` C3 applies: no install command for the native libraries, because there is nowhere to install them from |

### 5 — The design-engineering community

| | |
| --- | --- |
| **Who** | A community, not a person — a Slack, a Discord, a meetup, a small conference track for people who sit between design and engineering |
| **What they need** | Substance for their members, and speakers who are not selling |
| **What we give** | A talk or a written contribution on something genuinely uncommon: putting a design system's *claims* under test, and publishing the evidence as fractions rather than ticks |
| **What we get** | P1 concentration unavailable anywhere else, and questions from people who will find the holes |
| **Shared value** | Good, provided the contribution is the content. The moment it is a product walkthrough the exchange collapses |
| **Form** | A talk · a written piece for their channel · sustained participation |
| **What this is not** | A speaking slot used as a demo slot |
| **Risk** | Medium. Communities remember a member who turned up to sell far longer than one who turned up to help |

### Why five, and not fifty

Each archetype above is one we can **actually supply** — there is a specific, verifiable thing we hand over
in every row. An archetype we cannot supply is a wish, and a list of fifty named people is a spreadsheet that
decays privately while nobody reads it.

**Deliberately absent:** paid newsletter placements · conference sponsorship · YouTube integrations ·
"thought leader" co-marketing · any arrangement where the deliverable is an impression.

---

## The outreach framework

### Rules, all of them non-negotiable

1. **Disclose in the first two sentences.** *"I build KinetixUI"* — before the ask, never after it.
2. **One person, one message, read their work first.** If the message could be sent to ten people unchanged,
   it is a cold-DM template and it does not go out.
3. **Name the specific thing.** Their article, their issue, their transform, their talk. Specificity is the
   entire signal that this is not a blast.
4. **Ask for something they can decline in one line.** *"Does the reasoning hold?"* is answerable in thirty
   seconds. *"Would you like to collaborate?"* is homework.
5. **No follow-up.** One message. Silence is an answer, and it is usually *no*. A second message converts a
   non-response into an irritation.
6. **Never ask for promotion, a share, a star, or a mention.** If the work is worth passing on, they will.
7. **Never imply a relationship that does not exist.** No *"we're working with…"* about a conversation.
8. **Never send an unreviewed generated message.** Drafting help is fine; unread output to a real person is
   not.
9. **Never contact someone because they are followed by people we want.** That is using a person as a
   channel, and it is the thing that makes outreach deserve its reputation.
10. **Log it** in [`register.json`](./register.json) with `channel: "outreach"`, so *no reply* is recorded as
    the outcome it is.

### Templates

Four, because four kinds of legitimate one-to-one contact exist. Each is a **shape to adapt**, not copy: the
bracketed parts are the work, and a message where they are still generic should not be sent.

---

**T1 — Asking for technical feedback** (the highest-value one, and the one to reach for first)

> Subject / opener: *A cross-platform token pipeline, and the part I am least sure about*
>
> I build KinetixUI, an MIT-licensed design system that compiles one DTCG token source to web, iOS, Android
> and Flutter output, with components implemented natively per platform rather than transpiled.
>
> I read [their specific piece of work] and [the specific thing in it that changed or challenged how I was
> thinking].
>
> The part I am least confident about is [a real, specific technical uncertainty — the semantic/primitive
> boundary, how dark mode should be expressed as a contract, what a verification level should actually
> require]. [Two sentences on what we chose and the trade-off we accepted.]
>
> If you have ten minutes and an opinion, I would rather hear it now than after someone builds on it. The
> relevant source is [a direct link to the specific file or directory] — no sign-up, nothing to install.
>
> Either way, thanks for [their work] — it is [the specific reason].

**Why it works:** the ask is a real question with a real answer, it is bounded, and it is genuinely useful to
receive. **Why it is honest:** we do want the answer.

---

**T2 — Inviting critique of a published position**

> I build KinetixUI. We publish per-platform coverage as fractions with a documented reason for every
> absence, including the fractions that look bad — [name one, quoted from `pnpm marketing:stats` on the day,
> never from memory].
>
> You have argued [their position on measurement, reporting or verification], which is why I am asking you
> rather than someone who would agree: **is the reporting honest, or does it look rigorous while hiding
> something?** [One sentence on the specific thing you suspect might be hiding something.]
>
> The table is at [the link]. A blunt answer is more useful to me than a kind one.

**Why it works:** asking someone to attack a position is the only request that is flattering and honest at
once. **The constraint:** if the critique lands, it goes in `CLAIMS.md` and the copy changes. Otherwise this
is theatre.

---

**T3 — Sharing a relevant article**

> I build KinetixUI, so treat this as biased.
>
> I wrote [the article] because [the specific problem it addresses]. It is relevant to you because of [their
> specific work on the same problem] — and it argues [the position], which I think [agrees with / contradicts]
> what you concluded in [their piece].
>
> No ask. If it is useful, it is useful; if I have got something wrong, I would like to know which part.

**Use only when the article genuinely engages with their work.** *"I wrote a thing you might like"* to
someone whose work you have not read is spam with a byline. **Never send this on the day of publication** —
that makes the person part of a launch, which they can tell.

---

**T4 — Proposing a joint technical discussion**

> I build KinetixUI. We compile one DTCG source into native output for four platforms, and [their
> tool / library / spec work] sits [directly upstream / alongside] that.
>
> Integrating it surfaced [a specific, concrete finding — an ambiguity, an edge case, a transform that needed
> a workaround]. I have written it up at [the link] and I think the *general* problem is more interesting than
> our particular case.
>
> Would a public conversation about it be worth having — a joint write-up, a recorded discussion, or just an
> issue thread on your side? Happy for it to live entirely on your channel, and happy for the answer to be
> no.
>
> If it is easier, [the finding] stands alone as an issue and I will open it either way.

**Why it works:** the finding is delivered whether or not they engage, so the message has value even as a
`no`. **The tell that it is not promotion:** the last line means nothing is contingent on their participation.

---

### What no template exists for, and will not

- **Cold DMs to strangers.** Not a template, a rule: there isn't one.
- **"Quick question" openers** that are not a question.
- **Asking for a star, a share, an upvote or a mention.**
- **Any message whose real purpose is a link.**
- **Recruiting people into a launch.** If a launch needs recruiting, it is not ready — `../launches.md`.
- **Mass sending.** One at a time, read first, or not at all.

### Sequencing

**No outreach in the first 14 days.** There is nothing to react to yet, and an introduction spent before
there is a body of published work is spent badly.

The trigger is **two published articles plus four weeks of consistent publishing** — the same point at which
`../launches.md` Stage 3 opens. At that point there is a track record to point at, and T1 is a better message
because the uncertainty in it is a real one someone has already asked about.
