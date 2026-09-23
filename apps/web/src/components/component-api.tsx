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
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{part.name} props</caption>
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th scope="col" className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Prop
                  </th>
                  <th scope="col" className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {part.props!.map((p) => (
                  <tr key={p.name} className="border-b border-border/60 align-top">
                    <th scope="row" className="px-3 py-2 text-left font-mono text-[12px] font-medium">
                      {p.name}
                      {p.required && (
                        <span className="ml-1.5 font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                          required
                        </span>
                      )}
                    </th>
                    <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{p.type}</td>
                    <td className="px-3 py-2 text-[13px] text-muted-foreground">{p.description ?? ""}</td>
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
