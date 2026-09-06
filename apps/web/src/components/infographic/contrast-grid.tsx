import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Every semantic text pair the components render, resolved to primitive hex for
 * both themes with its WCAG ratio + level. This is the visual form of
 * `scripts/check-contrast.mjs`; the numbers are read from the same token JSON at
 * build time (/infographic is statically prerendered, so the fs reads only run
 * during the build).
 */

const ROOT = resolve(process.cwd(), "..", "..");
const read = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

type Node = { $value?: string; value?: string };
const val = (n?: Node) => n?.$value ?? n?.value ?? null;

const prim = read("tokens/primitives/color.json").color as Record<string, Record<string, Node>>;
const flat: Record<string, string> = {};
for (const fam of Object.keys(prim))
  for (const step of Object.keys(prim[fam] ?? {})) {
    const v = val(prim[fam][step]);
    if (typeof v === "string" && v.startsWith("#")) flat[`${fam}.${step}`] = v;
  }

const lum = (hex: string) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS: [string, string, string][] = [
  ["foreground", "background", "body text"],
  ["muted-foreground", "background", "secondary text"],
  ["primary-foreground", "primary", "on primary"],
  ["secondary-foreground", "secondary", "on secondary"],
  ["destructive-foreground", "destructive", "on destructive"],
  ["destructive", "background", "text-destructive"],
  ["success", "background", "text-success"],
  ["warning", "background", "text-warning"],
  ["info", "background", "text-info"],
  ["accent-foreground", "accent", "on accent"],
];

function resolveMode(mode: "light" | "dark") {
  const sem = read(`tokens/semantic/color.${mode}.json`).color as Record<string, Node & Record<string, Node>>;
  const local: Record<string, string> = {};
  for (const k of Object.keys(sem.semantic ?? {})) {
    const v = val(sem.semantic[k] as Node);
    if (typeof v === "string") local[k] = v;
  }
  const res = (ref: string | null, depth = 0): string | null => {
    if (typeof ref !== "string" || depth > 5) return null;
    if (ref.startsWith("#")) return ref;
    let m = ref.match(/^\{color\.semantic\.([\w-]+)\}$/);
    if (m) return res(local[m[1]] ?? null, depth + 1);
    m = ref.match(/^\{color\.([\w-]+)\.([\w-]+)\}$/);
    if (m) return flat[`${m[1]}.${m[2]}`] ?? null;
    m = ref.match(/^\{color\.([\w-]+)\}$/);
    if (m) return res(val(sem[m[1]]) ?? null, depth + 1);
    return null;
  };
  const out: Record<string, string> = {};
  for (const k of Object.keys(sem)) {
    if (k === "semantic") continue;
    const hex = res(val(sem[k] as Node));
    if (hex) out[k] = hex;
  }
  return out;
}

const LIGHT = resolveMode("light");
const DARK = resolveMode("dark");

const level = (r: number) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA·lg" : "fail");
const badgeCls = (r: number) =>
  r >= 7
    ? "bg-success/15 text-success"
    : r >= 4.5
      ? "bg-primary/10 text-primary"
      : "bg-destructive/15 text-destructive";

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-3 shrink-0 rounded-[2px] border border-border/50 align-middle"
      style={{ background: hex }}
    />
  );
}

function ModeCol({ pair, mode }: { pair: [string, string, string]; mode: Record<string, string> }) {
  const [fg, bg] = pair;
  if (!mode[fg] || !mode[bg]) return <td className="px-3 py-2 text-center text-muted-foreground">—</td>;
  const r = ratio(mode[fg], mode[bg]);
  return (
    <td className="px-3 py-2 text-center">
      <span className="inline-flex items-center gap-1.5">
        <Swatch hex={mode[bg]} />
        <Swatch hex={mode[fg]} />
        <span className="font-mono tabular-nums">{r.toFixed(1)}</span>
        <span className={`rounded px-1 py-0.5 font-mono text-[9px] ${badgeCls(r)}`}>{level(r)}</span>
      </span>
    </td>
  );
}

export function ContrastGrid() {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="py-2 pr-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
            >
              Pair
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-center font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
            >
              Light
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-center font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
            >
              Dark
            </th>
          </tr>
        </thead>
        <tbody>
          {PAIRS.map((p) => (
            <tr key={p[0] + p[1]} className="border-b border-border/60">
              <td className="py-2 pr-4">
                <span className="font-mono text-[12px]">
                  {p[0]} / {p[1]}
                </span>
                <span className="ml-2 text-[11px] text-muted-foreground">{p[2]}</span>
              </td>
              <ModeCol pair={p} mode={LIGHT} />
              <ModeCol pair={p} mode={DARK} />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
        AAA ≥ 7 · AA ≥ 4.5 · AA·lg ≥ 3 (large text only). Read from the token JSON at build —
        the same source as <code className="text-foreground">pnpm check:contrast</code>, which fails CI
        on any regression.
      </p>
    </div>
  );
}
