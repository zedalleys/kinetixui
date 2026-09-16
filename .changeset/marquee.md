---
"@kinetixui/ui": minor
---

Add `Marquee` — an auto-scrolling horizontal ticker (logo strip, testimonials), pausing on hover and respecting `prefers-reduced-motion`. First pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Lifted out of the marketing site's `reveal.tsx` (which leaned on a hand-written `.kx-marquee-track`/`@keyframes marquee` in its own `globals.css` — not something a CLI-installed app would have) onto the shared Tailwind preset (`animate-marquee`, `motion-reduce:animate-none`) instead, so it's portable. Also fixes an accessibility bug found in the site version: both content copies were marked `aria-hidden`, hiding the whole marquee from screen readers — only the duplicate copy needed for the seamless loop is hidden here.

Ships on all four platforms per the four-platform rule: `KinetixMarquee` on Jetpack Compose, SwiftUI, and Flutter too, each using the same "duplicate the content, measure it, translate by exactly one content-width in an infinite loop" technique (no CSS keyframe to lean on natively). `pauseOnHover` is web-only — hover isn't a primary mobile interaction, so the native ports don't carry it.
