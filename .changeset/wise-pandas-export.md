---
"@kinetixui/cli": patch
---

Correct what the CLI says about native theme output.

Three shipped strings claimed things that are no longer true. `theme build` and `preset css`
announced that native output "isn't built yet", which stopped being true when `preset swiftui`,
`preset compose` and `preset flutter` shipped — the limitation is that `theme build` compiles CSS,
not that native themes do not exist, and the messages now say which command produces them. Two
descriptions also pointed at the workspace's "Copy CSS" button, which is now an Export panel with
four targets.

Text only: no command, flag, argument or output format changed.
