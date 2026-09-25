---
"@kinetixui/cli": minor
---

`kinetixui preset …` — read and resolve a Kinetix Create preset from the command line.

- `preset decode <code|url>` prints what a preset contains, with `--json` for piping.
- `preset url <code>` prints the canonical `/create?preset=…` share link.
- `preset css <code|url>` resolves a preset into its web CSS override block — the `:root` and `.dark`
  declarations, including the radius and elevation variables `theme build`'s CSV format cannot express.
  `--output <file>` writes it instead of printing it.

`preset css` runs the same theme engine and the same exporter the /create workspace runs behind Copy CSS,
so for a given preset the two produce byte-identical output. Web CSS only: there is no SwiftUI, Compose or
Flutter output behind any of these commands, which is why the third one is named `preset css` rather than
`preset apply`.

`theme create` and `theme build` are unchanged.

(`preset decode` and `preset url` shipped in the previous release without a changeset, so they are recorded
here alongside `preset css` rather than going unlisted.)
