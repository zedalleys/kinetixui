import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * The component's real props, read from its generated spec.
 *
 * Every component page used to end at `import { DataGrid } from "@kinetixui/ui"` and a paragraph about
 * tokens. For a Badge that is enough; for a 792-line grid with column pinning, range selection and
 * edit-in-place it is not, and "lifecycle stable" is supposed to mean a reader can use the component without
 * opening its source. This is what closes that gap for all of them at once.
 *
 * `specs/components/<slug>.json` is generated from the TypeScript by `pnpm build:registry`, so the table
 * cannot drift from the props the component actually accepts, and a prop that is renamed changes here on the
 * next generation rather than whenever someone remembers.
 *
 * It is a REACT table and says so. The spec is parsed out of `packages/ui`, and SwiftUI, Jetpack Compose,
 * Flutter and Angular each expose their own idiomatic interface — a SwiftUI view does not take `className`
 * or `onValueChange`. Heading this "API" would quietly re-introduce the exact claim the five-platform
 * guidance work removed: that the other platforms are React with different syntax. What they share is the
 * design contract (the same variant and size names, the same tokens, the same behaviour), not the props;
 * the platform tabs above the table show each one's real usage.
 *
 * Read from disk in a server component: the spec files exist at build time, nothing reaches the browser, and
 * no 98-component index module has to be generated and kept in sync to satisfy a bundler.
 */

type Prop = { name: string; type: string; required: boolean; description?: string };
type Spec = { components?: { name: string; props?: Prop[] }[] };

/**
 * `specs/` lives at the repository root, and the working directory is not the same in every context: the dev
 * server is launched from the repo root, `next build` runs inside apps/web. Walking up for the directory is
 * why the table renders in both instead of only in the one that happened to be tested.
 */
function specsDir(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "specs", "components");
    if (existsSync(candidate)) return candidate;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

function spec(slug: string): Spec | null {
  const dir = specsDir();
  if (!dir) return null;
  try {
    return JSON.parse(readFileSync(join(dir, `${slug}.json`), "utf8")) as Spec;
  } catch {
    return null;
  }
}

export function ComponentApi({ slug }: { slug: string }) {
  const data = spec(slug);
  const parts = (data?.components ?? []).filter((c) => c.props?.length);
  // A component whose props are all inherited DOM attributes has nothing of its own to document, and an
  // empty table would imply it takes none.
  if (!parts.length) return null;

  return (
    <section className="my-6">
      <h2 id="react-api">React API</h2>
      <p className="text-sm text-muted-foreground">
        The props of <code>@kinetixui/ui</code>, generated from its TypeScript. Props inherited from the
        underlying DOM element (<code>className</code>, <code>id</code>, event handlers) are accepted too and
        are not listed.
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="text-foreground">This table is React-specific.</span> The SwiftUI, Jetpack Compose,
        Flutter and Angular implementations share the design contract — the same variants, sizes, states and
        tokens — but each exposes its own idiomatic interface. Their real usage is in the platform tabs on the
        example above, not here.
      </p>
      {parts.map((part) => (
        <div key={part.name} className="mt-5">
          <h3 className="font-mono text-sm text-foreground">{part.name}</h3>
          {/*
            No horizontal scroll container, deliberately.

            One used to be here, and the rendered accessibility pass caught what it cost: a region that
            scrolls sideways is operable with a mouse or a swipe but not with a keyboard, so axe flags
            `scrollable-region-focusable`. The usual remedy is `tabIndex={0}` plus a name — but that is a
            fix for the symptom, and it puts a tab stop on every one of these tables at every width,
            including the desktop ones that never scroll.

            The cause is a long type string forcing the table wider than the page, so that is what gives:
            the TYPE cell alone may break mid-token. A type is read, not scanned, so a wrapped
            `((row: TData) => React.ReactNode)` costs nothing.

            `table-fixed` with declared column widths is what makes that a guarantee rather than a hope:
            an auto-laid-out table takes its min-content width from its longest unbreakable token and can
            exceed its container however narrow the page gets. With fixed columns it cannot, so the layout
            holds at 320 as well as it does at 1280.

            Three different wrapping rules, because the columns hold three different kinds of text. The type
            may break anywhere — it is read, not scanned. The prop name and the note use `break-words`,
            which breaks a long word only when it cannot fit at all, so "columns" stays "columns" instead
            of becoming "colu mns".
          */}
          <div className="mt-2">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[38%] sm:w-[26%]" />
                <col className="w-[62%] sm:w-[32%]" />
                {/* the notes column only earns its own space once there is room for prose in it */}
                <col className="hidden sm:table-column sm:w-[42%]" />
              </colgroup>
              <caption className="sr-only">{part.name} props</caption>
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th scope="col" className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Prop
                  </th>
                  <th scope="col" className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Type
                  </th>
                  <th scope="col" className="hidden px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground sm:table-cell">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {part.props!.map((p) => (
                  <tr key={p.name} className="border-b border-border/60 align-top">
                    <th scope="row" className="px-2 py-2 text-left font-mono text-[12px] font-medium [overflow-wrap:break-word] sm:px-3">
                      {p.name}
                      {p.required && (
                        <span className="ml-1.5 font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                          required
                        </span>
                      )}
                    </th>
                    <td className="px-2 py-2 font-mono text-[12px] text-muted-foreground [overflow-wrap:anywhere] sm:px-3">
                      {p.type}
                      {/* below `sm` the notes column is dropped, so the note rides under the type rather
                          than being lost — the information stays, the column does not */}
                      {p.description && (
                        <span className="mt-1 block font-sans text-[12px] text-muted-foreground [overflow-wrap:break-word] sm:hidden">
                          {p.description}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 text-[13px] text-muted-foreground [overflow-wrap:break-word] sm:table-cell">
                      {p.description ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
