/**
 * docs-image-local-assets.mjs — the Image documentation route resolves its artwork locally.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3000) &
 *   node scripts/docs-image-local-assets.mjs [--base http://127.0.0.1:3000]
 *
 * WHAT WENT WRONG, AND WHY A GATE EXISTS FOR IT. `/docs/components/image` used to load three images from
 * `picsum.photos`, which made it the only page in the site that fetched a third-party subresource.
 * `scripts/a11y-site.mjs` navigates with `page.goto`, which waits for `load`, and `load` waits for every
 * subresource — so whenever that host was slow, rate-limiting the runner or unreachable, the navigation hit
 * its 30s timeout at every viewport and both themes, and the site gate went red with zero accessibility
 * violations to show for it. It did that on PR branches that touched nothing near the page. A reader with no
 * route to the host saw the same three blank frames.
 *
 * The fix is local artwork. This gate is what keeps it local: it fails if the route reaches ANY origin other
 * than the one serving it, which is the property that the old source violated and a timeout bump would not
 * have restored.
 *
 * WHAT IS CHECKED HERE AND WHAT IS CHECKED ELSEWHERE. The route is already in `a11y-site.mjs`'s PAGES, so axe,
 * horizontal overflow, light and dark, four widths and 200% text are covered there, by the unchanged gate. This
 * file adds only what that one cannot see: that the images are local, that they decode, that the navigation
 * survives the old host being a black hole, that RTL still lays the demo out inside the viewport, and that the
 * component's error fallback is still real.
 *
 * ── The negative control, and why it is not a script ──
 * Restore the dependency and this gate fails at check 2, for the one reason only the defect can produce — the
 * `load` event never arriving while the blocked host hangs:
 *
 *   git stash && node scripts/docs-image-local-assets.mjs   # (on the pre-fix source, with the site built)
 *
 * Measured on the pre-fix source, with `picsum.photos` routed to a handler that never fulfils and never
 * aborts: `page.goto` threw `Timeout 30000ms exceeded` — CI's error character for character. Measured on
 * this source under the same condition: the navigation completed in 440ms. The control is run by hand rather
 * than scripted because scripting it means shipping the defect in a fixture, and the fixture would then need
 * its own control.
 *
 * An ABORT is not a substitute for the hang. `route.abort()` surfaces as a failed request, which fires `load`
 * normally and does not reproduce the failure at all. The handler below deliberately does neither.
 *
 * ── A SECOND defect, in this gate, and its own two controls ──
 * Checks 2 and 3 read the DOM without waiting for it. CI caught it first, on PR #582 — a branch that touches
 * nothing on this route — with `RTL at 390px: 0 of 0 images sit outside the viewport`, from a page whose
 * images were present a moment later. Two things were wrong, and they are fixed separately because they are
 * separate defects:
 *
 *   TIMING. The route is client-rendered, so a read taken the instant `load` fires races hydration.
 *   Measured here with no throttling, 25 runs of each ordering: no wait at all saw all three images 23/25;
 *   a wait placed BEFORE the `dir` flip 25/25; a wait placed after it 25/25. The first reading of this was
 *   that the flip's own re-render was the race — the two orderings disagreeing would have shown that, and
 *   they do not, so the cause is hydration and the flip is incidental. The wait sits after the flip anyway,
 *   because it then covers both and costs nothing. (It is not only a slow-runner effect: 23/25 is this
 *   machine, unthrottled. The very first probe returned 3 three times in a row, which is how a hole like
 *   this survives being written.)
 *
 *   COVERAGE. The first version of this fix waited in sections 1 to 3 and left section 4, whose own
 *   "could not be checked" message hid the same race behind different words. CI found it on PR #579, a
 *   carousel branch, within the hour. The lesson is the obvious one: when the cause is "this read does not
 *   wait", the fix is every read, not the reads that have failed so far.
 *
 *   WORDING. "0 of 0 images sit outside the viewport" is a layout sentence reporting a missing-images
 *   result. Pointing `THREE_LOCAL_IMAGES` at a prefix that matches nothing and re-running now gives
 *   `expected 3 local images in <main>, found 0 after waiting for them` — the finding saying what it found,
 *   not what it measured. Both messages are reachable; which one appears is the diagnosis.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (cloud containers); CI uses `playwright install`.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:3000").replace(/\/$/, "");
const ROUTE = "/docs/components/image";
const origin = new URL(base).origin;

const findings = [];
const fail = (what, detail) => findings.push(`${what}: ${detail}`);
const ok = (what, detail) => console.log(`  ok   ${what}${detail ? ` — ${detail}` : ""}`);

/** The demo's three images, read from the page rather than from a list this file keeps in step by hand. */
const readImages = (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll("main img")).map((img) => ({
      src: img.getAttribute("src") ?? "",
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      alt: img.getAttribute("alt"),
      hasAlt: img.hasAttribute("alt"),
    })),
  );

/**
 * Wait for the demo's three local images to be in the DOM before reading anything about them.
 *
 * `load` is not enough on its own. The route is server-rendered, so the markup arrives with the images in
 * it, but hydration can replace that subtree, and a `dir` flip on `documentElement` re-renders it again;
 * a read taken in the middle of either sees a subtree that is briefly empty. Section 1 already waited for
 * this reason, and sections 2 and 3 only ever passed because they won the race — until CI lost it, on a
 * runner slower than any local machine: `RTL at 390px: 0 of 0 images sit outside the viewport`, from a
 * page whose images were present a moment later. Locally the same read returned 3 on every attempt, which
 * is exactly why a timing hole like this does not show up where it is written.
 *
 * Resolving false is not itself the finding — each caller still says what the absence means in its own
 * terms, because "no images at 390px" and "no images with the host blocked" are different defects.
 */
const THREE_LOCAL_IMAGES = 'main img[src^="/img/"]';
const waitForImages = (page, timeout = 5_000) =>
  page
    .waitForFunction((sel) => document.querySelectorAll(sel).length === 3, THREE_LOCAL_IMAGES, { timeout })
    .then(() => true)
    .catch(() => false);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
  // ── 1. The route loads, the artwork is local, and nothing is fetched off-origin ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const offOrigin = [];
    const otherOffOrigin = [];
    // Only a subresource the `load` event waits for can hold a navigation open, and that is what went wrong
    // here: an image. A `fetch` to another origin cannot do it — the page asks api.github.com for its own
    // repository stars, and that request failing does not delay `load` by a millisecond. So the finding is
    // scoped to the blocking resource types and the rest is printed as a note. That keeps the gate's claim to
    // the one it can defend, rather than an allowlist of whichever hosts the page happens to call today.
    const BLOCKING = new Set(["image", "stylesheet", "script", "font", "media"]);
    const record = (r, suffix = "") => {
      const u = new URL(r.url());
      if (u.protocol === "data:" || u.protocol === "blob:") return;
      if (u.origin === origin) return;
      (BLOCKING.has(r.resourceType()) ? offOrigin : otherOffOrigin).push(`${r.url()}${suffix} [${r.resourceType()}]`);
    };
    page.on("request", (r) => record(r));
    // A request that never resolves is the failure mode this gate exists for, and a request that fails fast is
    // what the same dependency looks like from a machine with no route to the host. Both are recorded: the
    // finding is the attempt, not its outcome.
    page.on("requestfailed", (r) => record(r, ` (failed: ${r.failure()?.errorText ?? "unknown"})`));

    const started = Date.now();
    await page.goto(`${base}${ROUTE}`, { waitUntil: "load", timeout: 15_000 });
    const elapsed = Date.now() - started;
    ok("the route loads", `${elapsed}ms`);

    // Wait for them rather than reading whatever is in the DOM the instant `load` fires: a gate that reads
    // once races hydration, and a race that resolves the wrong way reads as a missing-image finding.
    await waitForImages(page);
    const images = (await readImages(page)).filter((i) => i.src.startsWith("/img/"));
    if (images.length !== 3) fail("the demo's images", `expected 3 local images in <main>, found ${images.length}`);
    for (const img of images) {
      if (img.naturalWidth === 0) fail("a local image did not decode", `${img.src} has naturalWidth 0`);
      // The three frames illustrate the `ratio` prop, so they are decorative and carry an empty alt. The
      // assertion is on the ATTRIBUTE being present, not on it being non-empty: a missing alt is a defect, a
      // deliberately empty one is the correct semantics for artwork that says nothing the prose does not.
      if (!img.hasAlt) fail("a local image has no alt attribute", img.src);
    }
    if (images.length === 3 && images.every((i) => i.naturalWidth > 0)) {
      ok("all three images decode", images.map((i) => `${i.src} ${i.naturalWidth}x${i.naturalHeight}`).join(", "));
    }

    // The structural claim. This, not the timing above, is what the old source could not satisfy.
    if (offOrigin.length) fail("the route fetched blocking off-origin subresources", [...new Set(offOrigin)].join(", "));
    else ok("no blocking off-origin subresources", `every image, style, script, font and media file came from ${origin}`);
    if (otherOffOrigin.length) console.log(`  note non-blocking off-origin requests — ${[...new Set(otherOffOrigin)].join(", ")}`);

    await page.close();
  }

  // ── 2. The regression: the old host is a black hole and the navigation still completes ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    // Never fulfil, never abort: a hanging request is what kept `load` from firing. An abort would fire it.
    await page.route("**://*.picsum.photos/**", () => {});
    await page.route("**://picsum.photos/**", () => {});

    const started = Date.now();
    try {
      await page.goto(`${base}${ROUTE}`, { waitUntil: "load", timeout: 20_000 });
      const elapsed = Date.now() - started;
      await waitForImages(page);
      const images = (await readImages(page)).filter((i) => i.src.startsWith("/img/"));
      if (images.length !== 3 || images.some((i) => i.naturalWidth === 0)) {
        fail("with picsum.photos blocked", `the page loaded but ${images.length} of 3 local images are present and decoded`);
      } else {
        ok("with picsum.photos blocked, the route still loads", `${elapsed}ms, 3 images decoded`);
      }
    } catch (err) {
      fail("with picsum.photos blocked", `${err.message.split("\n")[0]} — the route still depends on that host`);
    }
    await page.close();
  }

  // ── 3. RTL: the demo lays out inside the viewport when the document direction flips ──
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${base}${ROUTE}`, { waitUntil: "load", timeout: 15_000 });
    await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    // Read the direction back. A gate that sets `dir` and never checks it took hold is an LTR gate with an
    // RTL name — measured on `scripts/react-carousel-focus.mjs`, where `addInitScript` never reached the
    // document at all and three "rtl" rows had been passing against the LTR layout.
    const computed = await page.evaluate(() => getComputedStyle(document.body).direction);
    if (computed !== "rtl") {
      fail("the RTL check", `asked for dir=rtl, the document computes ${computed}; the gate is wrong, not the page`);
    } else {
      // After the flip, not before it: the flip is what re-renders the subtree being measured.
      const present = await waitForImages(page);
      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        const imgs = Array.from(document.querySelectorAll('main img[src^="/img/"]'));
        return {
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          count: imgs.length,
          outside: imgs.filter((i) => {
            const r = i.getBoundingClientRect();
            return r.left < -1 || r.right > el.clientWidth + 1;
          }).length,
        };
      });
      if (overflow.scrollWidth > overflow.clientWidth) {
        fail("RTL at 390px", `the page scrolls sideways: ${overflow.scrollWidth} > ${overflow.clientWidth}`);
      } else if (!present || overflow.count !== 3) {
        // Said separately, because it is a different claim. "0 of 0 images sit outside the viewport" reads
        // as a layout result and is really a missing-images result — the gate reporting that it found
        // nothing to measure in the voice of a measurement.
        fail("RTL at 390px", `expected 3 local images in <main>, found ${overflow.count} after waiting for them`);
      } else if (overflow.outside) {
        fail("RTL at 390px", `${overflow.outside} of ${overflow.count} images sit outside the viewport`);
      } else {
        ok("RTL at 390px", "3 images, inside the viewport, no sideways scroll");
      }
    }
    await page.close();
  }

  // ── 4. The component's error fallback, on a genuinely broken source ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${base}${ROUTE}`, { waitUntil: "load", timeout: 15_000 });
    // This section needs the wait too, and CI proved it rather than the argument did: the first version of
    // this fix left section 4 alone, and PR #579 — a carousel branch — went red on
    // `the error fallback: could not be checked: the route served no local image to break`, the same race
    // wearing a different sentence. Every section that reads this DOM waits for it now, with none left to
    // be the next one found.
    await waitForImages(page);
    // A real 404 on a real <img>, so the browser fires a real `error` event and the component's own
    // onError runs. Nothing is mocked: replacing the component's success path with a stub would prove
    // only that the stub works.
    const broke = await page.evaluate(() => {
      const img = document.querySelector('main img[src^="/img/"]');
      if (!img) return false;
      img.src = "/img/this-asset-does-not-exist.svg";
      return true;
    });
    const fellBack = !broke
      ? false
      : await page
      .waitForFunction(
        () => {
          const frames = Array.from(document.querySelectorAll("main .relative.w-full"));
          return frames.some((f) => !f.querySelector("img") && f.querySelector("svg"));
        },
        null,
        { timeout: 5_000 },
      )
      .then(() => true)
      .catch(() => false);
    const left = (await readImages(page)).filter((i) => i.src.startsWith("/img/") && i.naturalWidth > 0).length;
    if (!broke) fail("the error fallback", "could not be checked: the route served no local image to break");
    else if (!fellBack) fail("the error fallback", "a 404 source left the broken <img> in place with no fallback");
    else if (left !== 2) fail("the error fallback", `it replaced the broken frame but ${left} of the other 2 images are gone`);
    else ok("the error fallback", "the broken frame shows the fallback mark, the other two are untouched");
    await page.close();
  }
} finally {
  await browser.close();
}

// ── 5. Source-level: every referenced local path exists, and Storybook is told where to find it ──
// `apps/docs` has no `public/` of its own, so the generated stories' `/img/...` paths resolve only through
// the Storybook `staticDirs` mapping. Without it the paths 404 in the story and `a11y-browser.mjs` sweeps a
// story whose image never arrives — a silent hole, since axe has nothing to complain about.
{
  const demos = readFileSync("apps/web/src/registry/demos.tsx", "utf8");
  const stories = readFileSync("packages/ui/src/stories/Image.stories.tsx", "utf8");
  const referenced = new Set([...`${demos}\n${stories}`.matchAll(/["'](\/img\/[^"']+)["']/g)].map((m) => m[1]));
  if (!referenced.size) fail("the local references", "no /img/… path is referenced any more; this gate has nothing to guard");
  for (const path of referenced) {
    try {
      readFileSync(`apps/web/public${path}`);
    } catch {
      fail("a referenced asset is missing", `apps/web/public${path}`);
    }
  }
  if (referenced.size) ok("referenced assets exist", [...referenced].join(", "));

  const sb = readFileSync("apps/docs/.storybook/main.ts", "utf8");
  if (!/staticDirs\s*:/.test(sb) || !/web\/public\/img/.test(sb) || !/to:\s*["']\/img["']/.test(sb)) {
    fail("the Storybook static mapping", "apps/docs/.storybook/main.ts no longer maps apps/web/public/img to /img");
  } else {
    ok("Storybook maps /img", "apps/docs/.storybook/main.ts → apps/web/public/img");
  }
}

console.log("");
if (findings.length) {
  console.error(`docs-image-local-assets — ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("docs-image-local-assets — clean: the Image route is served entirely from this origin.");
