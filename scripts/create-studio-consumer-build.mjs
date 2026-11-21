#!/usr/bin/env node
//
// Mandatory M1 export acceptance gate: a REAL consumer production build.
//
// consumer-fixture.test.ts already typechecks the generated source and bundles a browser entry
// with esbuild against symlinked workspace directories. That proves the source compiles; it does
// not prove a consumer can install the published package shape and run their own framework
// production build. This gate closes that distance:
//
//   1. pack @kinetixui/ui and @kinetixui/tokens as real tarballs, so only files the packages
//      actually ship are visible (a symlink exposes the whole working tree, including files
//      "files" excludes);
//   2. install them into an isolated consumer project with pnpm, together with React and Vite
//      resolved from the registry — a real install, not a link farm;
//   3. typecheck the generated source with the consumer's own TypeScript;
//   4. run `vite build` — a real minified production build through Rollup;
//   5. serve the built output and read the RENDERED structure in Chromium, asserting it against
//      the SAVED document (docs/create/m1 calls this source-document.json) at every breakpoint
//      boundary the document declares;
//   6. prove the gate fails when the generated imports are invalid, when a saved property is
//      lost from the output, and when the responsive configuration is discarded.
//
// What this gate does NOT claim: it is not an npm-registry install of a PUBLISHED @kinetixui
// version, not a hosted build service, and not five-platform parity. `visual` remains 0 on all
// platforms. The honest claim it earns is exactly: generated code builds successfully in a clean
// consumer project, and what it renders matches the saved project.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile, copyFile, rm, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const fixture = resolve(process.env.CREATE_EXPORT_FIXTURE ?? "/tmp/kinetix-create-export-m1");
const consumer = resolve(process.env.CREATE_CONSUMER_DIR ?? "/tmp/kinetix-create-consumer-build");
const out = resolve(process.env.CREATE_ARTIFACTS ?? ".impeccable/review/create-studio");
const results = [];
const pass = name => { results.push(name); console.log("PASS " + name); };

// The breakpoint cascade is re-stated here on purpose: a gate that imports the module under test
// cannot detect that module getting the cascade wrong.
const BREAKPOINTS = [
  { id: "tablet", minWidth: 768 },
  { id: "desktop", minWidth: 960 },
];
const effectiveProps = (node, width) => {
  const props = { ...node.props };
  for (const breakpoint of BREAKPOINTS) if (width >= breakpoint.minWidth) Object.assign(props, node.responsive?.[breakpoint.id]);
  return props;
};
// Read straight from the token primitives, so the gate's expected pixel values do not come from
// the same lowering code it is measuring.
const SPACING = Object.fromEntries(Object.entries(JSON.parse(await readFile(join(root, "tokens/primitives/dimension.json"), "utf8")).spacing)
  .map(([key, value]) => [`spacing.${key}`, Number(value.$value)]));
const px = value => `${Number(value)}px`;
const DEFAULTS = {
  "component:Button": { text: "Continue", variant: "Primary", size: "md", disabled: false },
  "component:Input": { label: "Email address", placeholder: "you@example.com", disabled: false },
  "component:Card": { title: "Your next idea", description: "Build something that feels like you." },
  "component:Badge": { text: "New", variant: "default" },
  "component:Tabs": { firstLabel: "Overview", secondLabel: "Details", firstContent: "Start with the big picture.", secondContent: "Make room for the details." },
  "layout:stack": { axis: "column", gap: "spacing.4", padding: "spacing.4", align: "stretch" },
  "layout:grid": { columns: 2, gap: "spacing.4", padding: "spacing.4" },
  "layout:section": { name: "Untitled screen", width: 640, widthMode: "fixed", gap: "spacing.4", padding: "spacing.6" },
};
function* nodesOf(document) {
  for (const page of document.pages) {
    const stack = [page.root];
    while (stack.length) {
      const node = stack.pop();
      yield node;
      for (const child of node.children ?? []) stack.push(child);
    }
  }
}

/**
 * Reads the rendered page and returns every disagreement with the saved document.
 * Returns an array so a negative control can assert that it is NON-empty.
 */
async function disagreements(page, document, width) {
  const failures = [];
  const check = async (what, run) => { try { await run(); } catch (error) { failures.push(`${what}: ${error.message.split("\n")[0]}`); } };
  for (const node of nodesOf(document)) {
    if (!node.ref) continue;
    const props = { ...DEFAULTS[node.ref], ...effectiveProps(node, width) };
    if (node.ref === "layout:section") {
      await check(`${node.id} frame "${props.name}"`, async () =>
        assert.ok(await page.locator(`section[aria-label=${JSON.stringify(String(props.name))}]`).count() > 0, "no section with that accessible name"));
    } else if (node.ref === "component:Button") {
      await check(`${node.id} button "${props.text}"`, async () =>
        assert.ok(await page.getByRole("button", { name: String(props.text), exact: true, disabled: Boolean(props.disabled) }).count() > 0, "no button with that accessible name"));
    } else if (node.ref === "component:Badge") {
      await check(`${node.id} badge "${props.text}"`, async () =>
        assert.ok(await page.getByText(String(props.text), { exact: true }).count() > 0, "badge text is not rendered"));
    } else if (node.ref === "component:Input") {
      await check(`${node.id} input labelled "${props.label}"`, async () => {
        const input = page.getByLabel(String(props.label), { exact: true });
        assert.ok(await input.count() > 0, "no input with that label");
        assert.equal(await input.first().getAttribute("placeholder"), String(props.placeholder));
      });
    } else if (node.ref === "component:Card") {
      await check(`${node.id} card "${props.title}"`, async () => {
        assert.ok(await page.getByText(String(props.title), { exact: true }).count() > 0, "card title is not rendered");
        assert.ok(await page.getByText(String(props.description), { exact: true }).count() > 0, "card description is not rendered");
      });
    } else if (node.ref === "component:Tabs") {
      await check(`${node.id} tabs "${props.firstLabel}"/"${props.secondLabel}"`, async () => {
        assert.ok(await page.getByRole("tab", { name: String(props.firstLabel), exact: true }).count() > 0, "first tab is missing");
        assert.ok(await page.getByRole("tab", { name: String(props.secondLabel), exact: true }).count() > 0, "second tab is missing");
      });
    }
    if (node.kind === "layout" && node.responsive) {
      // gap, padding and (for a frame) width are emitted into the responsive stylesheet, so an
      // override of any of them is readable and must be read — otherwise a discarded override of
      // exactly those properties would pass unseen.
      await check(`${node.id} box metrics at ${width}px`, async () => {
        const element = page.locator(`[data-kx-layout=${JSON.stringify(node.id)}]`);
        assert.ok(await element.count() > 0, "no responsive handle to measure");
        const box = await element.first().evaluate(el => {
          const style = getComputedStyle(el);
          return { gap: style.rowGap, padding: style.paddingTop, width: style.width };
        });
        assert.equal(box.gap, px(SPACING[String(props.gap)]), "gap");
        assert.equal(box.padding, px(SPACING[String(props.padding)]), "padding");
        if (node.ref === "layout:section" && props.widthMode === "fixed") {
          // maxWidth:100% clamps a fixed frame to the viewport, so compare against the smaller.
          const expected = Math.min(Number(props.width), width);
          assert.ok(Math.abs(parseFloat(box.width) - expected) <= 1, `width ${box.width} is not ${expected}px`);
        }
      });
    }
    // A node WITHOUT overrides carries its styles inline and has no handle, so there is nothing to
    // address; a node WITH overrides and no handle is a defect, not a reason to skip.
    if (node.responsive && node.ref === "layout:grid") {
      await check(`${node.id} grid of ${props.columns} columns at ${width}px`, async () => {
        const element = page.locator(`[data-kx-layout=${JSON.stringify(node.id)}]`);
        assert.ok(await element.count() > 0, "grid has no responsive handle; nothing addressable to measure");
        const tracks = (await element.first().evaluate(el => getComputedStyle(el).gridTemplateColumns)).split(" ").filter(Boolean).length;
        assert.equal(tracks, Number(props.columns), `rendered ${tracks} tracks`);
      });
    } else if (node.responsive && node.ref === "layout:stack") {
      await check(`${node.id} stack on the ${props.axis} axis at ${width}px`, async () => {
        const element = page.locator(`[data-kx-layout=${JSON.stringify(node.id)}]`);
        assert.ok(await element.count() > 0, "stack has no responsive handle; nothing addressable to measure");
        assert.equal(await element.first().evaluate(el => getComputedStyle(el).flexDirection), String(props.axis));
      });
    }
  }
  return failures;
}

const run = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: consumer, stdio: "pipe", encoding: "utf8", ...options });

/** Vite is the consumer's own choice of bundler, so the gate pins it rather than reading a repository dependency. */
const CONSUMER_BUNDLER = { vite: "7.3.6", "@vitejs/plugin-react": "5.1.0" };

async function scaffold() {
  await rm(consumer, { recursive: true, force: true });
  await mkdir(consumer, { recursive: true });
  for (const name of ["design.tsx", "theme.css", "source-document.json"]) {
    await copyFile(join(fixture, name), join(consumer, name));
  }
  const web = JSON.parse(await readFile(join(root, "apps/web/package.json"), "utf8"));
  const exact = name => {
    const range = web.dependencies?.[name] ?? web.devDependencies?.[name];
    assert.ok(range, `apps/web does not declare ${name}; the gate must not invent a version`);
    return range.replace(/^[^\d]*/, "");
  };
  // Real tarballs: only the files each package actually publishes are visible to the consumer.
  const packed = {};
  for (const [workspace, name] of [["@kinetixui/ui", "ui"], ["@kinetixui/tokens", "tokens"]]) {
    const output = execFileSync("pnpm", ["--filter", workspace, "exec", "pnpm", "pack", "--pack-destination", consumer], { cwd: root, stdio: "pipe", encoding: "utf8" });
    const tarball = output.trim().split("\n").at(-1).trim();
    assert.match(tarball, /\.tgz$/, `pnpm pack did not report a tarball for ${workspace}`);
    packed[workspace] = "file:./" + tarball.split("/").at(-1);
    console.log(`packed ${workspace} → ${packed[workspace]} (${name})`);
  }
  await writeFile(join(consumer, "package.json"), JSON.stringify({
    name: "kinetix-create-consumer-build", private: true, version: "0.0.0", type: "module",
    dependencies: {
      "@kinetixui/tokens": packed["@kinetixui/tokens"],
      "@kinetixui/ui": packed["@kinetixui/ui"],
      react: exact("react"), "react-dom": exact("react-dom"),
    },
    devDependencies: {
      "@types/react": exact("@types/react"), "@types/react-dom": exact("@types/react-dom"),
      autoprefixer: exact("autoprefixer"), postcss: exact("postcss"),
      tailwindcss: exact("tailwindcss"), typescript: exact("typescript"),
      ...CONSUMER_BUNDLER,
    },
  }, null, 2) + "\n");
  await writeFile(join(consumer, "vite.config.ts"),
    'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()], build: { minify: "esbuild", sourcemap: false } });\n');
  // The content scan covers the installed package dist, exactly as docs/create/m1/EXPORT.md instructs.
  await writeFile(join(consumer, "tailwind.config.cjs"),
    'module.exports = { presets: [require("@kinetixui/ui/tailwind.config").default], content: ["./node_modules/@kinetixui/ui/dist/**/*.js", "./*.tsx"] };\n');
  await writeFile(join(consumer, "postcss.config.cjs"),
    'module.exports = { plugins: { tailwindcss: { config: "./tailwind.config.cjs" }, autoprefixer: {} } };\n');
  await writeFile(join(consumer, "index.css"), "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");
  const document = JSON.parse(await readFile(join(consumer, "source-document.json"), "utf8"));
  const screens = document.pages.map((_, index) => `Screen${index + 1}`);
  await writeFile(join(consumer, "main.tsx"),
    'import React from "react";\nimport { createRoot } from "react-dom/client";\n' +
    `import { ${screens.join(", ")} } from "./design";\n` +
    'import "@kinetixui/tokens/css";\nimport "@kinetixui/tokens/css/dark";\nimport "@kinetixui/tokens/css/extras";\nimport "./index.css";\n' +
    `const dir = new URLSearchParams(location.search).get("dir") === "rtl" ? "rtl" : undefined;\n` +
    `createRoot(document.getElementById("root")!).render(<>${screens.map(name => `<${name} dir={dir} />`).join("")}</>);\n`);
  await writeFile(join(consumer, "index.html"),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Exported KinetixUI consumer</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>\n');
  await writeFile(join(consumer, "tsconfig.json"), JSON.stringify({
    compilerOptions: { strict: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", noEmit: true, esModuleInterop: true, skipLibCheck: true, types: ["vite/client"] },
    include: ["design.tsx", "main.tsx"],
  }, null, 2) + "\n");
  return document;
}

async function serve(directory) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".json": "application/json", ".svg": "image/svg+xml" };
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, "http://localhost").pathname;
      const name = path === "/" ? "index.html" : path.slice(1);
      // Served from the built output only; no path may leave it.
      const file = resolve(directory, name);
      if (!file.startsWith(directory + "/")) { response.writeHead(403).end(); return; }
      response.setHeader("content-type", types[extname(file)] ?? "application/octet-stream");
      response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

await mkdir(out, { recursive: true });
const document = await scaffold();
const widths = [...new Set([390, ...BREAKPOINTS.flatMap(({ minWidth }) => [minWidth - 1, minWidth]), 1440])].sort((a, b) => a - b);
const browser = await chromium.launch({ headless: true });
const report = { candidate: process.env.GITHUB_SHA ?? null, widths, steps: [], negativeControls: [] };
try {
  // No extra flags: the consumer directory is created fresh, so a plain install is what a real
  // consumer would run, and the gate stays independent of pnpm's configuration surface.
  const installed = run("pnpm", ["install"]);
  await writeFile(join(out, "consumer-install.log"), installed);
  const tree = await readdir(join(consumer, "node_modules/@kinetixui"));
  assert.deepEqual(tree.sort(), ["tokens", "ui"]);
  // A tarball install must not expose source the package excludes from "files".
  pass("packed @kinetixui/ui and @kinetixui/tokens install into a clean consumer project");

  run("./node_modules/.bin/tsc", ["--project", "tsconfig.json"]);
  pass("the consumer's own TypeScript accepts the generated source under strict mode");

  const built = run("./node_modules/.bin/vite", ["build"]);
  await writeFile(join(out, "consumer-build.log"), built);
  const assets = await readdir(join(consumer, "dist/assets"));
  const script = assets.find(name => name.endsWith(".js"));
  const style = assets.find(name => name.endsWith(".css"));
  assert.ok(script && style, `production build produced no script/stylesheet pair: ${assets.join(", ")}`);
  const bytes = (await readFile(join(consumer, "dist/assets", script))).length;
  // A build that emitted a near-empty chunk would otherwise "pass" every rendering assertion below
  // by rendering nothing at all; the page checks catch that too, but say so here explicitly.
  assert.ok(bytes > 100_000, `production chunk is implausibly small (${bytes} bytes)`);
  report.steps.push({ step: "vite build", script, style, scriptBytes: bytes });
  pass(`a real Vite production build succeeds (${script}, ${(bytes / 1024).toFixed(0)} kB minified)`);

  const site = await serve(join(consumer, "dist"));
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  await page.goto(site.url);
  await page.locator("section").first().waitFor();
  assert.deepEqual(runtimeErrors, [], "the built consumer page raised runtime errors");
  pass("the built consumer page mounts with no runtime error");

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1200 });
    await page.waitForFunction(w => Math.abs(innerWidth - w) <= 1, width);
    const failures = await disagreements(page, document, width);
    report.steps.push({ step: "rendered structure", width, disagreements: failures });
    assert.deepEqual(failures, [], `rendered output disagrees with the saved document at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.screenshot({ path: join(out, "consumer-production-build.png"), fullPage: true });
  pass(`rendered structure matches the saved document at ${widths.join(", ")}px`);

  // ---- Negative controls. Each breaks ONE protected behaviour, proves the gate reddens, restores it.
  const design = await readFile(join(consumer, "design.tsx"), "utf8");
  const theme = await readFile(join(consumer, "theme.css"), "utf8");
  const rebuild = () => run("./node_modules/.bin/vite", ["build"]);
  // `evidence` records WHAT the control detected, so a reviewer can tell a control that caught the
  // intended break from one that reddened for an unrelated reason.
  const control = async (name, detected, evidence) => {
    report.negativeControls.push({ control: name, detected, evidence });
    assert.equal(detected, true, `negative control "${name}" did not redden the gate`);
    console.log("CONTROL " + name + " → detected: " + (Array.isArray(evidence) ? evidence.join(" | ") : evidence));
  };

  // A: generated imports that do not resolve must fail the build, not emit a plausible bundle.
  await writeFile(join(consumer, "design.tsx"), design.replace('from "@kinetixui/ui"', 'from "@kinetixui/ui-does-not-exist"'));
  let buildFailure = null;
  try { rebuild(); } catch (error) {
    const output = [error.stdout, error.stderr, error.message].map(part => String(part ?? "")).join("\n");
    buildFailure = output.split("\n").map(line => line.trim()).find(line => line.includes("ui-does-not-exist")) ?? output.split("\n").map(line => line.trim()).filter(Boolean).at(-1) ?? "build failed";
  }
  await writeFile(join(consumer, "design.tsx"), design);
  // Require the failure to NAME the unresolvable import, so the control cannot be satisfied by a
  // build that failed for an unrelated reason.
  await control("invalid generated imports fail the production build", buildFailure !== null && buildFailure.includes("ui-does-not-exist"), buildFailure);

  // B: a saved property lost from the output must be caught by the rendered-structure reading.
  const savedButton = [...nodesOf(document)].find(node => node.ref === "component:Button");
  assert.ok(savedButton, "the fixture composition must contain a Button for control B");
  const savedText = { ...DEFAULTS["component:Button"], ...savedButton.props }.text;
  await writeFile(join(consumer, "design.tsx"), design.replace(JSON.stringify(savedText), JSON.stringify(savedText + " (dropped)")));
  rebuild();
  await page.goto(site.url, { waitUntil: "load" });
  const lostProperty = await disagreements(page, document, 1440);
  await writeFile(join(consumer, "design.tsx"), design);
  await control("a lost saved property is detected in the rendered output", lostProperty.some(failure => failure.includes(savedButton.id)), lostProperty);

  // C: responsive configuration discarded from the generated stylesheet.
  await writeFile(join(consumer, "theme.css"), theme.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, ""));
  rebuild();
  // Must be a node whose desktop override the gate READS, or the control would be credited to an
  // unrelated reddening. Measured: picking the first node with any desktop override selected the
  // frame, whose padding override was not read at the time, and the control passed for the wrong
  // node.
  const overridden = [...nodesOf(document)].find(node => node.ref === "layout:grid" && node.responsive?.desktop?.columns !== undefined);
  assert.ok(overridden, "the fixture composition must contain a measurable desktop grid override for control C");
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(site.url, { waitUntil: "load" });
  const discarded = await disagreements(page, document, 1440);
  await writeFile(join(consumer, "theme.css"), theme);
  rebuild();
  // The control must redden BECAUSE the overridden node no longer measures its override, not for
  // some unrelated reason a stripped stylesheet might cause.
  await control("a discarded responsive configuration is detected at the desktop breakpoint", discarded.some(failure => failure.includes(overridden.id)), discarded);

  // Restore and prove the gate is green again on the repaired fixture, so the controls above
  // cannot be credited to a gate that simply fails everything.
  await page.goto(site.url, { waitUntil: "load" });
  assert.deepEqual(await disagreements(page, document, 1440), [], "the restored fixture must pass again");
  pass("three negative controls redden the gate and the restored fixture passes again");

  await context.close();
  await site.close();
  report.results = results;
  report.runtimeErrors = runtimeErrors;
  report.limitations = [
    "Installs packed workspace tarballs, not published npm versions; this is not a release certification",
    "Chromium only; rendered structure is read through the accessibility tree and computed style, not compared pixel by pixel",
    "`visual` verification remains 0 on all five platforms; this gate concerns generated React source only",
  ];
  await writeFile(join(out, "consumer-build-results.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: results.length, controls: report.negativeControls.length, widths, out }));
} catch (error) {
  report.failure = String(error.stdout ?? "") + String(error.message ?? error);
  await writeFile(join(out, "consumer-build-failure.json"), JSON.stringify(report, null, 2) + "\n").catch(() => undefined);
  console.error(report.failure);
  throw error;
} finally {
  await browser.close();
}
