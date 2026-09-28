# @kinetixui/cli

Adds KinetixUI components and tokens to your project by writing source into your repo — the
copy-the-code model, not a dependency you import from.

**Beta.** Ships alongside `@kinetixui/ui` and `@kinetixui/tokens` on one version line.

```bash
npx @kinetixui/cli init
npx @kinetixui/cli add button card dialog
```

No install step is needed; `npx` is the intended way to run it. The binary is `kinetixui` if you do
install it.

## What it is

A registry client and a code writer. `init` sets up `kinetixui.json` and writes the token contract into
your global stylesheet. `add` resolves a component's registry dependencies, installs the npm packages it
needs with *your* package manager, and writes the component source into your tree. From that point the
code is yours to edit — nothing rewrites it unless you ask.

## Commands

| Command | Does |
| --- | --- |
| `init` | Create `kinetixui.json`, write `:root` / `.dark` token blocks into your stylesheet |
| `add <name…>` | Resolve and write component source, plus its registry and npm dependencies |
| `list` | List what the registry offers |
| `inspect <name>` | Show a component's files, dependencies and registry metadata |
| `parity <name>` | Show which platforms carry a component, and why one does not |
| `lint` | Check your usage against the token contract |
| `doctor` | Check that your project is set up correctly |
| `theme` | Work with themes |
| `preset` | Read a Kinetix Create preset code (`KX1_…`) and emit CSS or native token files |
| `create` | Scaffolding helpers |

Run any command with `--help` for its flags. Full reference: <https://kinetixui.com/docs/cli>.

## Where components come from

`add` fetches from a registry over HTTPS. The default is `https://kinetixui.com/r`, which serves a
shadcn-compatible JSON descriptor per component. You can point it elsewhere:

```bash
npx @kinetixui/cli add button --registry https://your-mirror.example.com/r
```

`-r, --registry <url>` is accepted by `init`, `add`, `list` and `inspect`. The URL is validated before
use, and component names are validated against a strict character set before they are used to build any
path — a registry response cannot direct the CLI to write outside your project.

**One consequence to be aware of:** `add` needs that origin to be reachable, and there is no offline
mode. If you need installs to keep working without the default registry, mirror the JSON and pass
`--registry`.

## Requirements

- **Node 18 or newer** (declared in `engines`)
- A JavaScript package manager on `PATH` — npm, pnpm, yarn or bun; the CLI detects which you use and
  calls it rather than assuming npm
- A project with a global stylesheet for `init` to write into

## What it does not do

It does not publish, does not phone home, and does not write outside the directory you run it in. It
installs dependencies by invoking your package manager, so anything it installs is visible in your
lockfile like any other dependency.

## Links

- CLI reference — <https://kinetixui.com/docs/cli>
- Installation — <https://kinetixui.com/docs/installation>
- Components — <https://kinetixui.com/components>
- Source — <https://github.com/zedalleys/kinetixui>

## License

MIT
