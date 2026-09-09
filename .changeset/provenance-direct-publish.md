---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

The release now publishes via `pnpm -r publish --provenance` (a directory publish) instead of `changeset publish` (which packs to a tarball first — that path drops provenance). Git tags are created with `changeset git-tag`. This is the release that should finally carry an npm provenance attestation.
