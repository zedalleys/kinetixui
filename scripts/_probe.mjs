import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const dir = "D:/src/kinetixui/apps/docs/storybook-static";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = createServer((q, r) => { let f = join(dir, new URL(q.url, "http://x").pathname); if (!existsSync(f) || f === dir + "/") { r.writeHead(404).end(); return; } r.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" }); r.end(readFileSync(f)); }).listen(0);
await new Promise((r) => srv.once("listening", r));
const base = JSON.parse(readFileSync("a11y-baseline.json", "utf8"));
const ids = [...new Set(base.filter((k) => k.split("|")[1] === "light").map((k) => k.split("|")[0]))];
const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const ctx = await b.newContext({ reducedMotion: "reduce", viewport: { width: 1024, height: 768 } });
for (const id of ids) {
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${srv.address().port}/iframe.html?id=${id}&viewMode=story&globals=theme:light`);
  await p.waitForFunction(() => document.body.classList.contains("sb-show-main"));
  await p.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
  await p.waitForTimeout(300);
  const out = await p.evaluate(async () => {
    for (let i = 0; i < 20; i++) { try { const r = await window.axe.run("#storybook-root", { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } });
      return r.violations.map((v) => v.id + " :: " + v.nodes.slice(0, 2).map((n) => n.html.replace(/\s+/g, " ").slice(0, 150)).join("  ||  ")); } catch (e) { await new Promise((r) => setTimeout(r, 250)); } }
    return ["axe busy"]; });
  console.log("\n## " + id + "\n  " + out.join("\n  "));
  await p.close();
}
await b.close(); srv.close();
