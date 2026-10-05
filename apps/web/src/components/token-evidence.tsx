import { CodePre } from "@/components/code-pre";
import { EVIDENCE_TOKEN, tokenEvidence } from "@/lib/token-evidence";

/**
 * /docs/tokens' "one token, every platform" evidence. A server component: the source rows and every code line
 * are read from the DTCG files and `packages/tokens/dist` at build time (`lib/token-evidence.ts`), so the page
 * cannot show output the generator no longer writes — a missing token or file fails the build.
 *
 * Static on purpose: no tabs. The point is the comparison, which a reader (and a screen reader) gets by reading
 * down, and a platform switcher here would also be one more control emitting `platform_selected`, a Qualified
 * Evaluation signal, on a page whose own view must not count as evaluation.
 */
export function TokenAcrossPlatforms({ token = EVIDENCE_TOKEN }: { token?: string }) {
  const evidence = tokenEvidence(token);
  return (
    <div className="my-6 min-w-0 space-y-6">
      {/* scrolls sideways on a phone, so it must be keyboard-focusable and named (axe scrollable-region-focusable) */}
      <div
        role="group"
        aria-label={`Source definition of color.${evidence.token}`}
        tabIndex={0}
        className="w-full overflow-x-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table className="w-full border-collapse text-sm">
          <caption className="px-4 pt-3 text-left text-sm text-muted-foreground">
            Source — DTCG, in <code>tokens/</code>
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-2 font-semibold">Token</th>
              <th scope="col" className="px-4 py-2 font-semibold">Theme</th>
              <th scope="col" className="px-4 py-2 font-semibold">
                <code>$value</code>
              </th>
              <th scope="col" className="px-4 py-2 font-semibold">File</th>
            </tr>
          </thead>
          <tbody>
            {evidence.source.map((row) => (
              <tr key={`${row.file}:${row.path}`} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-2 font-mono text-[13px]">{row.path}</td>
                <td className="px-4 py-2">{row.theme === "both" ? "primitive" : row.theme}</td>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-[13px]">{row.value}</td>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-[13px] text-muted-foreground">
                  {row.file.replace(/^tokens\//, "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {evidence.outputs.map((out) => (
        <figure key={out.platform} data-rehype-pretty-code-figure="" className="min-w-0">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold">
              {out.platform} <span className="font-normal text-muted-foreground">· {out.languageLabel}</span>
            </span>
            <span className="text-muted-foreground">
              use as <code>{out.reference}</code>
            </span>
          </figcaption>
          <CodePre data-language={out.language}>
            <code data-language={out.language}>
              {out.lines.map((line, i) => (
                <span key={i} data-line="">
                  {line || " "}
                </span>
              ))}
            </code>
          </CodePre>
        </figure>
      ))}
    </div>
  );
}
