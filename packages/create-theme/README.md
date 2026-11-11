# @kinetixui/create-theme

Resolves a Kinetix Create preset into a platform-neutral semantic theme, and exports it. Shared by the
website, the CLI and future platform exporters.

**This package is private and is not published to npm.** It is a workspace dependency. Consumers reach
this code through `@kinetixui/cli` or the Theme Creator, never directly.

## What belongs here

The resolution step: a validated preset in, a semantic theme out — plus the colour maths that step needs
and the exporters that write a resolved theme into a platform's format.

"Platform-neutral" is the constraint that earns this package its existence. A resolver that knew about CSS
custom properties would make every non-web exporter a special case, which is the shape this package is
here to avoid.

## What does not belong here

The preset schema or the KX1 codec, which are `@kinetixui/create-preset`'s; the DTCG token source of
truth, which is `@kinetixui/tokens`'; and any component.

## Tests

```
pnpm --filter @kinetixui/create-theme test
```

The colour maths and the resolution engine each carry their own suite. The engine's is the one that holds
the contract.
