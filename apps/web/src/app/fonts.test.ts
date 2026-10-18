import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * The build must not depend on a font CDN.
 *
 * `next/font/google` downloads from `fonts.googleapis.com` during `next build`. That failed twice
 * (#253, #255) inside the loader, turning a healthy tree red in whichever job happened to draw the
 * bad response — while the same commit built fine elsewhere. The fonts are vendored so no build
 * reaches the network for them, and this test is what keeps it that way: an `import` from
 * `next/font/google` is one autocomplete away, and it would not fail until CI was already red.
 *
 * It also keeps the vendored set honest — every file referenced, every file licensed.
 */

const appDir = path.resolve(import.meta.dirname);
const srcDir = path.resolve(appDir, "..");
const fontsDir = path.join(appDir, "fonts");
const layout = readFileSync(path.join(appDir, "layout.tsx"), "utf8");

/** Every `.ts`/`.tsx`/`.mdx` file under `src`, so the rule covers the app rather than one file. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx|mdx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

describe("the site builds without fetching fonts", () => {
  const files = sourceFiles(srcDir);

  it("scans a meaningful number of files", () => {
    // Vacuity guard: an empty list would pass every rule below.
    expect(files.length).toBeGreaterThan(100);
  });

  it("imports no font from next/font/google anywhere", () => {
    // Matches the *import*, not the mention. Both `layout.tsx` and this file name the module in
    // prose to explain why it is not used, and a substring rule flagged them — the same way a claim
    // guard flags the sentence that explains the claim.
    const IMPORTS_GOOGLE_FONT = /(?:from|require\(|import\()\s*["']next\/font\/google["']/;
    const offenders = files
      .filter((f) => IMPORTS_GOOGLE_FONT.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(srcDir, f));

    expect(
      offenders,
      "next/font/google downloads from fonts.googleapis.com during `next build`, which puts a " +
        "third-party network call on the critical path of every job that builds the site. Use " +
        `next/font/local with a file from src/app/fonts instead. Offending files: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("loads its fonts from local files", () => {
    expect(layout).toContain('from "next/font/local"');
  });
});

describe("the vendored fonts are complete and licensed", () => {
  const woff2 = readdirSync(fontsDir).filter((f) => f.endsWith(".woff2"));

  it("has font files at all", () => {
    expect(woff2.length).toBeGreaterThan(0);
  });

  it("references every vendored file from layout.tsx", () => {
    // A font nobody loads is dead weight in the repository and in the bundle.
    const unreferenced = woff2.filter((f) => !layout.includes(f));
    expect(unreferenced, `vendored but never loaded: ${unreferenced.join(", ")}`).toEqual([]);
  });

  it("ships every file layout.tsx asks for", () => {
    const referenced = [...layout.matchAll(/\.\/fonts\/([\w.-]+\.woff2)/g)].map((m) => m[1]!);
    expect(referenced.length).toBeGreaterThan(0);
    const missing = [...new Set(referenced)].filter((f) => !existsSync(path.join(fontsDir, f)));
    expect(missing, `referenced but not committed: ${missing.join(", ")}`).toEqual([]);
  });

  it("carries a licence for every font", () => {
    // OFL 1.1 permits redistribution only while the licence travels with the font.
    const licenceFor: Record<string, string> = {
      "inter-latin.woff2": "Inter-OFL.txt",
      "space-grotesk-latin.woff2": "SpaceGrotesk-OFL.txt",
      "jetbrains-mono-latin.woff2": "JetBrainsMono-OFL.txt",
      "jetbrains-mono-tree.woff2": "JetBrainsMono-OFL.txt",
    };
    for (const font of woff2) {
      const licence = licenceFor[font];
      expect(licence, `missing licence mapping for ${font}`).toBeDefined();
      expect(readFileSync(path.join(fontsDir, licence!), "utf8")).toContain("SIL Open Font License");
    }
  });
});
