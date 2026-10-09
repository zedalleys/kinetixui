# Vendored web fonts

These are the fonts the site renders with. They live here, in the repository, rather than being
fetched from Google at build time.

## Why they are vendored

`next/font/google` resolves and downloads font files from `fonts.googleapis.com` and
`fonts.gstatic.com` during `next build`. That put a third-party network call on the critical path of
every job that builds this site — `build`, `axe` and the Vercel deployment — and it failed twice:

```
src/app/layout.tsx
An error occurred in `next/font`.
TypeError: Cannot read properties of null (reading '1')
    at @next/font/dist/google/loader.js:122:78
```

That line runs `/\.(woff|woff2|eot|ttf|otf)$/.exec(url)[1]` on a URL fetched from Google and gets
`null` when the response is not what it expects. It is a build-time fetch, so a healthy tree goes red
for a reason that has nothing to do with the change under test. Both times the same commit built
successfully elsewhere.

Vendoring removes the network from the build path entirely.

## What is here

| File | Family | Version | Axis | Subset | Bytes |
| --- | --- | --- | --- | --- | --- |
| `inter-latin.woff2` | Inter | 4.001 (`git-66647c0bb`) | `wght` 100–900 | `latin` | 48,432 |
| `space-grotesk-latin.woff2` | Space Grotesk | 2.000 | `wght` 300–700 | `latin` | 22,320 |
| `jetbrains-mono-latin.woff2` | JetBrains Mono | 2.211 | `wght` 400–800 | `latin` | 31,340 |

All three are **variable** fonts: one file covers its whole weight axis, so no per-weight files are
needed and none are committed.

These are the same files, in the same versions, that the site was already serving — taken from the
build output of the last `next/font/google` build. The rendered type is therefore unchanged rather
than approximately preserved.

### Only the `latin` subset

`next/font/google` emitted seven subsets for Inter (`cyrillic-ext`, `cyrillic`, `greek-ext`, `greek`,
`vietnamese`, `latin-ext`, `latin`) and preloaded only `latin`. Only `latin` is vendored, and that is
a measured decision rather than an assumption: scanning the built HTML and every source file for
non-ASCII characters found **11,288 occurrences in the `latin` subset and none in any other Google
subset**. The remaining non-ASCII characters (arrows, box-drawing, `⌘`, `≈`) are in none of these
subsets and already fall back to a system font.

If non-latin copy is ever added, add the matching subset file here and a `src` entry for it.

## Licensing

All three are licensed under the **SIL Open Font License, Version 1.1**, which permits redistribution
— including bundling into a repository and serving from an application — provided the copyright
notice and licence travel with the font and the fonts are not sold on their own. The full licence
text for each is committed beside the font, and the copyright lines below are read from the font
binaries' own `name` tables rather than transcribed.

| Font | Copyright | Licence | Upstream |
| --- | --- | --- | --- |
| Inter | Copyright 2016 The Inter Project Authors | [`Inter-OFL.txt`](./Inter-OFL.txt) | https://github.com/rsms/inter |
| Space Grotesk | Copyright 2020 The Space Grotesk Project Authors | [`SpaceGrotesk-OFL.txt`](./SpaceGrotesk-OFL.txt) | https://github.com/floriankarsten/space-grotesk |
| JetBrains Mono | Copyright 2020 The JetBrains Mono Project Authors | [`JetBrainsMono-OFL.txt`](./JetBrainsMono-OFL.txt) | https://github.com/JetBrains/JetBrainsMono |

No font here carries a Reserved Font Name restriction that this use engages: the files are served
unmodified and under their original names.

## Changing a font

Do not hand-edit these binaries. To change a weight, a subset or a version, replace the `.woff2`,
update the table above from the file's own `name` table, and update the `src` entries in
`../layout.tsx`. `apps/web/src/app/fonts.test.ts` fails if `layout.tsx` reaches for
`next/font/google` again, or if a `.woff2` here is unreferenced.

## Documentation diagram face

`jetbrains-mono-tree.woff2` is the full JetBrains Mono Regular face (92,380 bytes), from
https://github.com/JetBrains/JetBrainsMono/blob/master/fonts/webfonts/JetBrainsMono-Regular.woff2
(downloaded 2026-10-09). It uses the included `JetBrainsMono-OFL.txt` license. Unlike the Latin
subset, it covers `│`, `├`, `└`, and `─` in the same face as spaces and filenames. Only plaintext
documentation diagrams use it; code syntax highlighting retains its existing typography.

SHA-256: `f1a7a03672cdd494ce0d5543fac6e4360fe22403c6de297fdc2e55a815f7baff`.
