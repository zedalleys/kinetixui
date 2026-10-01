---
"@kinetixui/angular": patch
---

Accept `@kinetixui/tokens` 0.24.x as a peer.

`@kinetixui/angular` peer-declared `@kinetixui/tokens` as `^0.23.0`, and 0.24.0 falls outside
that range. The peer is now `>=0.23.0 <0.25.0`, written as an explicit span rather than
`^0.23.0 || ^0.24.0` — the two accept exactly the same versions, but the caret form embeds the
string `0.24`, which is also `@kinetixui/angular`'s own version, and the repository guards against a
token peer that tracks Angular's version instead of the token contract. Nothing in `@kinetixui/tokens` changed to cause the bump: the token sources and every
built artifact are byte-identical to 0.23.3. It moves only because `@kinetixui/tokens` shares a
version line with `@kinetixui/ui` through the Changesets `fixed` group, and `@kinetixui/ui` took a
minor for the motion pass.

So the widened range is a claim that holds on inspection rather than an assumption: there is no
0.24.0 token change for Angular to be incompatible with. A published `package.json` cannot be
edited, so the new range only reaches consumers as a release — hence this changeset. The
alternative the release gate offers, holding `@kinetixui/tokens` inside `^0.23.0`, would have meant
publishing the `@kinetixui/ui` motion work as a patch, and a base layer that adds `!important`
animation and transition rules to `*`, `::before` and `::after` in a consumer's stylesheet is not a
patch.
