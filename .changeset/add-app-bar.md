---
"@kinetixui/ui": minor
---

Add **AppBar** — a web application top bar.

`AppBar` + `AppBarBrand` / `AppBarNav` / `AppBarLink` / `AppBarActions`: a sticky bordered header with a brand slot, a row of primary nav links (`active` marks the current one, `asChild` forwards to a framework `<Link>`), and a trailing actions slot. Below the `md` breakpoint the nav collapses behind a menu toggle into a panel under the bar. `useAppBar()` exposes the menu open state.

`NavigationBar` remains the mobile back-button bar; `AppBar` is the desktop app shell. Registry / Storybook / docs entry included; native ports (SwiftUI / Compose / Flutter) to follow.
