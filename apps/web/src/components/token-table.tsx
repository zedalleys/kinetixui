import { TOKEN_CONTRACT } from "@/lib/token-contract";

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block size-4 shrink-0 rounded-[3px] border border-border/60 align-middle"
      style={{ background: hex }}
    />
  );
}

/** The semantic contract as a live table — swatch + hex for both themes. */
export function TokenTable() {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Token
            </th>
            <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Light
            </th>
            <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Dark
            </th>
          </tr>
        </thead>
        <tbody>
          {TOKEN_CONTRACT.map((r) => (
            <tr key={r.token} className="border-b border-border/60 last:border-0">
              <td className="whitespace-nowrap px-4 py-2 font-mono text-[13px]">
                --{r.token}
                {r.note && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {r.note}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-2">
                <span className="flex items-center gap-2">
                  <Swatch hex={r.light} />
                  <span className="font-mono text-[13px] text-muted-foreground">{r.light}</span>
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-2">
                <span className="flex items-center gap-2">
                  <Swatch hex={r.dark} />
                  <span className="font-mono text-[13px] text-muted-foreground">{r.dark}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
