// a01 — package consistency.
//
//   node marketing/content/drafts/a01/verify-package.mjs
//
// Checks the channel files agree with each other and with the campaign rules: one title everywhere,
// no fabricated DEV URL, the denominator phrased precisely, Angular always marked preview, and every
// recommended link using a campaign tag the acquisition parser actually keeps.
//
// Companion to verify-evidence.mjs, which checks the historical claims against git.
import { readFileSync } from "node:fs";
const dir = new URL("./", import.meta.url);
const TITLE = "Your cross-platform design system may be lying about parity";
const files = ["article.md", "devto.md", "linkedin.md", "x-thread.md", "visual-brief.md", "measurement.md", "publish-checklist.md"];
const read = (f) => readFileSync(new URL(f, dir), "utf8");

let bad = 0;
const t = (ok, m) => {
  console.log((ok ? "ok   " : "FAIL ") + m);
  if (!ok) bad++;
};

const art = read("article.md");
const dev = read("devto.md");
const li = read("linkedin.md");
const xt = read("x-thread.md");
const backlog = JSON.parse(readFileSync(new URL("../../backlog.json", dir), "utf8"));
const bl = backlog.items.find((i) => i.id === "a01");

t(art.includes("# " + TITLE), "article H1 = final title");
t(dev.includes("title: " + TITLE), "devto front matter title matches");
t(bl.title === TITLE, "backlog title matches");
t(!dev.includes("canonical_url:"), "devto has NO canonical_url set");
t(dev.includes("published: false"), "devto published: false");
t(bl.status === "drafted", "backlog status still 'drafted'");
t(bl.publishWindow === null, "no publish window set");

for (const f of files) {
  // The checklist names the banned phrases in order to forbid them, so scanning it for
  // those phrases always trips. Its job is to quote them.
  if (f === "publish-checklist.md") continue;
  const s = read(f);
  if (/all four platforms\b/.test(s)) t(false, `${f}: bare "all four platforms"`);
  if (/\ball platforms\b/i.test(s) && s.includes("89")) t(false, `${f}: "all platforms" near the 89 figure`);
  if (/revolutionary|game.chang/i.test(s)) t(false, `${f}: superlative language`);
  const ng = [...s.matchAll(/Angular/g)];
  if (ng.length && !/Angular[\s\S]{0,120}preview/i.test(s)) t(false, `${f}: Angular without "preview" nearby`);
}
t(true, "claim hygiene sweep (denominator, superlatives, Angular maturity)");

t(li.includes("<DEV_ARTICLE_URL>") && xt.includes("<DEV_ARTICLE_URL>"), "placeholders present in both social files");
t(!/https?:\/\/dev\.to\/\S+/i.test(li + xt + art), "no fabricated dev.to URL anywhere");
t(/utm_campaign=kx_parity_proof/.test(read("measurement.md")), "campaign tag uses the kx_ prefix the regex requires");
// Only recommended links matter. measurement.md quotes the bad tag deliberately, as the warning.
const recommended = read("measurement.md").split(String.fromCharCode(10)).filter((l) => l.startsWith("| ") && l.includes("utm_campaign="));
t(recommended.length >= 3, "link table has the three channel rows");
t(recommended.every((l) => l.includes("utm_campaign=kx_parity_proof")), "every recommended link uses the kx_ campaign tag");
t(!recommended.some((l) => /utm_medium=article/.test(l)), "no recommended link uses the rejected medium");

const words = art.split(/\s+/).filter(Boolean).length;
console.log(`\narticle words: ${words} (was 1864, −${(((1864 - words) / 1864) * 100).toFixed(1)}%)`);
console.log(bad ? `\n${bad} PROBLEM(S)` : "\nall consistency checks passed");
process.exit(bad ? 1 : 0);
