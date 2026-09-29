# @kinetixui/ui

The React implementation of KinetixUI — CVA + Radix + Tailwind components styled only against the
KinetixUI semantic token layer, never a raw hex.

**Beta.** The catalogue is settled enough to build on (97 of 98 entries are lifecycle `stable`), but the
package is pre-1.0 and minor versions can still move an API.

```bash
npm install @kinetixui/ui
```

`@kinetixui/tokens` comes with it as a real dependency, so the token contract is always present and in
step. React 18 or 19 is a peer you supply.

## Two ways to install, and they are genuinely different

| | npm package | Registry (copy the source) |
| --- | --- | --- |
| Command | `npm install @kinetixui/ui` | `npx @kinetixui/cli add button` |
| You get | A versioned dependency | The component's source, in your repo |
| Updates | `npm update` | You own it; re-run `add` to take a newer version |
| Editing | Wrap or restyle from outside | Edit the file |
| Cost | The whole library resolves (see **Bundle size** below) | Only the components you asked for |

Both compile against the same tokens. Most teams want the registry for components and npm for tokens.

## Minimal usage

Three things have to be true: the token stylesheet is loaded, the Tailwind preset is applied, and
`.dark` is on an ancestor when you want the dark set.

```css
/* your global stylesheet */
@import "@kinetixui/tokens/css";
@import "@kinetixui/tokens/css/dark";
```

```ts
// tailwind.config.ts
import preset from "@kinetixui/ui/tailwind.config";

export default {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "./node_modules/@kinetixui/ui/dist/**/*.js"],
};
```

```tsx
import { Button, Card, CardContent, Dialog, DialogContent, DialogTrigger } from "@kinetixui/ui";

export function Example() {
  return (
    <Card>
      <CardContent>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="Primary">Open</Button>
          </DialogTrigger>
          <DialogContent>Anything.</DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
```

## Entry points

| import | contains |
| --- | --- |
| `@kinetixui/ui` | every component and its prop types |
| `@kinetixui/ui/tailwind.config` | the Tailwind preset — token scales, the `.dark` variant, the animation utilities |

There is no per-component subpath today. That is the reason for the note below.

## Bundle size

**This package does not tree-shake per component.** `dist/` is a single pre-bundled ES module, so a
bundler cannot drop the components you did not import: measured with esbuild, `import { Button }` alone
produces roughly 678 KB minified, against roughly 1,015 KB for importing everything. `sideEffects: false`
is declared and correct, and it does not help — the granularity problem is the single module, not the
side-effect hint.

So: if bundle size is the constraint, use the registry (`npx @kinetixui/cli add button`) and take only
the components you need. If you are building an app that will use most of the catalogue behind a
code-split route, the npm package is fine.

This is a packaging limitation with a known fix (subpath exports per component, as `@kinetixui/iot`
already does) and it is tracked in
[`marketing/audits/TREE-SHAKING.md`](https://github.com/zedalleys/kinetixui/blob/main/marketing/audits/TREE-SHAKING.md).

## Environment

- **React** 18 or 19 (`react` and `react-dom` are peers)
- **Tailwind CSS** 3.4, via the exported preset
- ESM only — the package is `"type": "module"` and ships no CommonJS build
- TypeScript types are shipped (`dist/index.d.ts`)

## Accessibility

Interactive components are built on Radix primitives, so keyboard behaviour and ARIA wiring come from a
maintained implementation rather than a hand-rolled one. Focus is always visible via the `--ring` token
and `focus-visible`.

What is actually verified, per component, is published rather than asserted: every component in this
package passes axe with **all rules enabled, in light and dark**, with an empty baseline — a new
violation fails CI, and so does a baselined one that stops occurring. Contrast is a separate gate: every
semantic token pair is audited against WCAG AA in both themes. The per-component, per-kind evidence
table is at [kinetixui.com/docs/platforms](https://kinetixui.com/docs/platforms).

RTL is in progress. Components are being converted from physical to logical Tailwind utilities and the
conversion is enforced forward in CI, but it is not complete — see
[RTL](https://kinetixui.com/docs/rtl) for where it stands.

## Limitations worth knowing before you adopt

- Pre-1.0: minor versions can move an API.
- No per-component tree-shaking (above).
- One catalogue entry, `combobox`, is a documented **recipe** over `Command` rather than a component —
  there is no `Combobox` export. The catalogue is 98 entries, 97 of which are components.
- No visual-regression suite exists yet, on any platform.

## Links

- Documentation — <https://kinetixui.com/docs>
- Components — <https://kinetixui.com/components>
- Installation — <https://kinetixui.com/docs/installation>
- Per-platform coverage and evidence — <https://kinetixui.com/docs/platforms>
- Source — <https://github.com/zedalleys/kinetixui>

## License

MIT
