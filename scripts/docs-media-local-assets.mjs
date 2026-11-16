/**
 * docs-media-local-assets.mjs — the audio and video the documentation ships can actually play.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3000) &
 *   node scripts/docs-media-local-assets.mjs [--base http://127.0.0.1:3000] [--control]
 *
 * WHAT WENT WRONG, AND WHY A SECOND GATE EXISTS FOR IT. `scripts/docs-image-local-assets.mjs` opens with the
 * sentence "which made it the only page in the site that fetched a third-party subresource". That sentence was
 * true of images and false of the site: `/docs/components/audio-player` pointed both of its players at an MP3
 * on `soundhelix.com`, and this site's own Content Security Policy is `default-src 'self'` with no `media-src`
 * of its own. So the browser did not merely fetch the clip slowly — it refused the load. Measured on the
 * pre-fix source, in a production build, both `<audio>` elements reported:
 *
 *     error.code    4   (MEDIA_ERR_SRC_NOT_SUPPORTED — "Media load rejected by URL safety check")
 *     networkState  3   (NETWORK_NO_SOURCE)
 *     readyState    0
 *     duration      null
 *
 * and pressing Play left `paused: true` at `currentTime: 0`. The component documentation shipped a player that
 * could not play, on every visit, for every visitor. No gate could see it: the image gate reads one route and
 * asks about `<img>`, and the site gate asks axe, which has no opinion about whether media loaded.
 *
 * WHY IT IS ITS OWN FILE AND NOT A CLAUSE IN THE IMAGE GATE. The failures are not the same failure. A blocked
 * IMAGE hangs the navigation, so the image gate's evidence is a `load` event that never arrives. Blocked MEDIA
 * does not hang anything: `load` fires normally and the page looks finished. The evidence here has to be the
 * media element's own readiness, which is a different reading taken at a different moment.
 *
 * WHAT IS CHECKED, AND WHAT IS CHECKED ELSEWHERE. These routes are already in `a11y-site.mjs`'s PAGES, so axe,
 * horizontal overflow, both themes, four widths and 200% text are covered there by the unchanged gate. This
 * file adds only what that one cannot see:
 *
 *   1. every media element's resolved source is SAME-ORIGIN — the property the defect violated;
 *   2. every media element reaches `readyState >= HAVE_METADATA` with `error === null` and a finite duration —
 *      "the file is local" and "the file plays" are different claims, and only the second is the product one;
 *   3. the page raises no Content Security Policy violation naming media — the mechanism of the refusal,
 *      checked separately from its effect so a future CSP widening cannot quietly restore the dependency.
 *
 * ── The negative control ──
 * `--control` runs the same three checks against a page whose media source has been rewritten, IN THE BROWSER
 * AND AT RUNTIME, to a cross-origin URL. Nothing on disk changes and no defect is committed: the rewrite lives
 * in this file, in the branch that exists to prove the instrument can fail. The control passes only when every
 * one of the three checks reports a failure — a control that fires on one check and not the others would mean
 * the other two are decoration.
 *
 * Both modes exit non-zero on failure, so CI can run them as two steps.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

/* Both spellings, because the sibling gate's package.json entry uses the space form and this one's was
   written with `=`. A parser that silently ignores `--base http://…` falls back to the default, which in
   CI happens to be the right port — so the mismatch would have passed there and failed only for whoever
   ran it by hand against another one. */
const arg = (name, fallback) => {
  const argv = process.argv.slice(2);
  const joined = argv.find((a) => a.startsWith(`--${name}=`));
  if (joined) return joined.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return fallback;
};
const BASE = arg("base", "http://127.0.0.1:3000");
const CONTROL = process.argv.slice(2).includes("--control");

/* Routes that render a media element. Kept explicit rather than crawled: a crawl that finds nothing passes
   silently, and "no page has media" is exactly the reading a regression would produce. */
const ROUTES = ["/docs/components/audio-player"];

/* Where the control sends the source. A real host is deliberately NOT used — the point is the origin, and a
   control that depends on a third party being reachable is a control that can pass for the wrong reason. */
const FOREIGN = "https://media.invalid.example/clip.mp3";

/* The path the fixed source serves, and the only string the control rewrites. */
const LOCAL_CLIP = "/audio/kinetixui-demo-tone.mp3";

const failures = [];
const fail = (route, msg) => failures.push(`${route}: ${msg}`);

const browser = await chromium.launch({ args: ["--no-sandbox"] });

for (const route of ROUTES) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const cspViolations = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text()) && /\b(media|audio|video)\b/i.test(m.text())) {
      cspViolations.push(m.text().slice(0, 200));
    }
  });

  if (CONTROL) {
    /* The control serves the page with its media source pointing at another origin, by rewriting the
       RESPONSE BODY on the way to the browser and leaving every response header — the Content Security
       Policy among them — exactly as the server sent it. That is the defect's own path: a document
       whose `<audio src>` names a third party, under this site's real policy.

       Two earlier attempts did nothing at all, and both are recorded because each reads like a pass.
       A MutationObserver rewriting elements as they appeared was overwritten by React's own commit. An
       accessor override on `HTMLMediaElement.prototype.src`, plus a `setAttribute` wrapper, never fired
       either: this route is server-rendered, so the attribute arrives from the HTML parser and touches
       neither hook. In both runs all three checks passed on a control that had changed nothing — which
       is exactly why the mode below refuses to report success unless all three of them fail. */
    await page.route("**/*", async (route) => {
      const response = await route.fetch();
      const type = response.headers()["content-type"] || "";
      if (!/text\/html|text\/x-component|application\/json/.test(type)) return route.fulfill({ response });
      const body = (await response.text()).split(LOCAL_CLIP).join(FOREIGN);
      return route.fulfill({ response, body });
    });
  }

  await page.goto(BASE + route, { waitUntil: "load", timeout: 30000 });

  /* These routes are client-rendered, so a read taken the instant `load` fires races hydration — the lesson
     the image gate learned twice. Wait for the elements themselves, then give the media a bounded window to
     report readiness rather than sleeping a fixed amount and hoping. */
  await page.waitForSelector("audio,video", { timeout: 15000 }).catch(() => {});
  await page
    .waitForFunction(
      () => {
        const els = [...document.querySelectorAll("audio,video")];
        return els.length > 0 && els.every((e) => e.readyState >= 1 || e.error !== null);
      },
      { timeout: 15000 },
    )
    .catch(() => {});

  const media = await page.evaluate(() =>
    [...document.querySelectorAll("audio,video")].map((e) => ({
      tag: e.tagName.toLowerCase(),
      src: e.currentSrc || e.getAttribute("src") || "",
      readyState: e.readyState,
      networkState: e.networkState,
      duration: Number.isFinite(e.duration) ? e.duration : null,
      error: e.error ? { code: e.error.code, message: e.error.message } : null,
    })),
  );

  if (media.length === 0) {
    fail(route, "no <audio> or <video> element was found. This route is listed because it renders one, so an\n" +
      "      empty reading is a regression in the page, not a pass for this gate.");
  }

  // 1 — same origin
  for (const m of media) {
    const origin = (() => {
      try {
        return new URL(m.src, BASE).origin;
      } catch {
        return "(unparseable)";
      }
    })();
    if (origin !== new URL(BASE).origin) {
      fail(route, `a <${m.tag}> resolves to ${origin}, which is not the origin serving the page.\n` +
        `      Documentation media ships with the repository. Source: ${m.src}`);
    }
  }

  // 2 — it actually plays
  for (const m of media) {
    if (m.error) {
      fail(route, `a <${m.tag}> failed to load: MEDIA error code ${m.error.code} — ${m.error.message}\n` +
        `      A player that cannot play is not a demonstration of a player. Source: ${m.src}`);
    } else if (m.readyState < 1 || m.duration === null) {
      fail(route, `a <${m.tag}> never reached HAVE_METADATA (readyState ${m.readyState}, ` +
        `networkState ${m.networkState}, duration ${m.duration}).\n` +
        `      "The file is local" and "the file plays" are different claims. Source: ${m.src}`);
    }
  }

  // 3 — the policy raised nothing
  if (cspViolations.length > 0) {
    fail(route, `the Content Security Policy refused a media load:\n      ${cspViolations[0]}`);
  }

  console.log(
    `${route}: ${media.length} media element(s); ` +
      media.map((m) => `${m.tag} readyState=${m.readyState} error=${m.error ? m.error.code : "none"}`).join(", "),
  );

  await context.close();
}

await browser.close();

/* Storybook serves the same clip from the same directory, so the mapping is part of the fix and is
   asserted here rather than left to be noticed when a story goes silent. The sibling image gate checks
   its own mapping for the same reason. Source-level, not rendered: it proves the configuration still
   names the directory, which is the thing a cleanup would remove. */
if (!CONTROL) {
  const config = readFileSync(new URL("../apps/docs/.storybook/main.ts", import.meta.url), "utf8");
  if (!/from:\s*["'`][^"'`]*web\/public\/audio["'`]/.test(config) || !/to:\s*["'`]\/audio["'`]/.test(config)) {
    failures.push(
      "apps/docs/.storybook/main.ts: no staticDirs entry maps apps/web/public/audio to /audio.\n" +
        "      The generated AudioPlayer story loads the clip by that path, so without the mapping the\n" +
        "      story renders a player with nothing behind it and no gate above would notice.",
    );
  } else {
    console.log("Storybook maps /audio — apps/docs/.storybook/main.ts → apps/web/public/audio");
  }
}

if (CONTROL) {
  /* Three checks, and the control is only a control if the defect reaches all three. */
  const kinds = {
    origin: failures.some((f) => /not the origin serving the page/.test(f)),
    playable: failures.some((f) => /failed to load|never reached HAVE_METADATA/.test(f)),
    policy: failures.some((f) => /Content Security Policy refused/.test(f)),
  };
  const missed = Object.entries(kinds).filter(([, hit]) => !hit).map(([k]) => k);
  if (missed.length > 0) {
    console.error(
      `\ndocs media control — DID NOT FIRE on: ${missed.join(", ")}.\n` +
        `A foreign media source was injected and ${missed.length} of the three checks still passed, so ` +
        `${missed.length === 1 ? "that check is" : "those checks are"} decoration.\n` +
        (failures.length ? `What did fire:\n  ${failures.join("\n  ")}` : "  (nothing fired at all)"),
    );
    process.exit(1);
  }
  console.log(
    `\ndocs media control — all three checks fire on a cross-origin source: the gate can tell a local, ` +
      `playable clip from a foreign one the policy refuses.`,
  );
  process.exit(0);
}

if (failures.length > 0) {
  console.error(`\ndocs media — ${failures.length} failure(s):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`\ndocs media — every documented player loads a same-origin clip that reports its duration.`);
