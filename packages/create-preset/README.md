# @kinetixui/create-preset

The portable Kinetix Create preset contract: the schema a preset must satisfy, its validation, its
canonicalisation, and the KX1 codec that encodes a preset as a shareable string.

**This package is private and is not published to npm.** It is a workspace dependency of the website and
the CLI. There is no install command, and nothing here is public API — the published surface is whatever
`@kinetixui/cli` and the Theme Creator choose to expose on top of it.

## What belongs here

The preset *contract*, and nothing that resolves it. A preset is the set of choices someone made; turning
those choices into a theme is `@kinetixui/create-theme`'s job. Keeping the two apart is what lets a preset
outlive any particular resolver.

A change to the schema or to the codec is a compatibility event for every preset string anyone has already
saved or shared, so treat the codec version as a format version rather than an implementation detail.

## What does not belong here

Colour maths, semantic role resolution, platform export, React, or anything that reads the component
manifest.
