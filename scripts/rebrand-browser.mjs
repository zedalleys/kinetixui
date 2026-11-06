/**
 * The hero polygon network's browser contract.
 *
 * The illustration is the owner's supplied OH38WC1 mesh (provenance in
 * design-assets/polygon/REFERENCE.md). Every count this asserts is read from
 * the generated mesh, not written here, so the gate follows
 * `scripts/gen-hero-mesh.mjs` rather than drifting from it.
 *
 * What it proves, in a real browser, at seven viewport/theme/motion cases:
 *   - the mesh renders, in full, with its facets, edge chains, junctions and
 *     light pulses; the drawing is hidden from AT and the hero holds no focus
 *     stop, no named group and no control row
 *   - the illustration moves — geometry, not just a class name — and the light
 *     pulses travel, and the junctions respond to them
 *   - the hero is decoration and nothing else (owner decision, 2026-11-06): it
 *     holds no tab stop, Tab never lands in it, a drag on a facet moves nothing,
 *     the arrow keys and Home move nothing, Space and Escape do not stop the
 *     light, and the element-bound pointer spotlight is gone — the pointer glow
 *     is now the site-wide layer that `check:cursor-glow` owns
 *   - under reduced motion nothing runs and the mesh sits at its generated rest
 *     pose, which is a complete composition rather than a stripped one
 *   - motion suspends offscreen and when the preference changes live
 *   - the copy and both CTAs stay hit-testable, and nothing overflows
 *   - zero page errors and zero WCAG A/AA findings from axe
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const base = process.env.REBRAND_BASE || 'http://127.0.0.1:3104';

/**
 * Injected defects, each the mistake the motion lifecycle exists to prevent: a
 * continuous animation that keeps running although `data-running` is false.
 *
 * `scripts/rebrand-hero-negative-controls.mjs` runs this gate once unmutated
 * and then once per entry, requiring a non-zero exit each time. The three are
 * deliberately not one: the gate compares the body transform and a facet's
 * opacity together, so a single blanket control could pass while the gate
 * observed only one of the two layers. `body-escapes` and `facets-escapes`
 * prove each layer is genuinely measured.
 */
const NEGATIVE_CONTROLS = {
  // The pre-2026-11-05 behaviour exactly: nothing gates the CSS layers.
  'ignores-data-running': `.kx-hero-polygon[data-running="false"] *,
     .kx-hero-polygon[data-running="false"] *::before,
     .kx-hero-polygon[data-running="false"] *::after { animation-play-state: running !important; }`,
  // Only the breath escapes the lifecycle.
  'body-escapes': `.kx-hero-polygon[data-running="false"] .kx-mesh-body { animation-play-state: running !important; }`,
  // Only the per-facet shimmer escapes it.
  'facets-escapes': `.kx-hero-polygon[data-running="false"] .kx-mesh-facets path { animation-play-state: running, running !important; }`,
  // Reduced-motion controls. The reduced-motion rule is `.kx-hero-polygon * { animation: none !important }`
  // at specificity (0,1,0); each of these is (0,2,0) and also `!important`, so it wins and the layer
  // keeps animating for a reader who asked for no motion. The gate must notice. These exist because an
  // assertion that reads `animationName` is only worth anything if its subject animates when motion is
  // allowed — measured at this head, it does: facets run kx-mesh-facet-in + kx-mesh-shimmer, the body
  // kx-mesh-breathe, the links kx-mesh-draw.
  // Each is confined to `@media (prefers-reduced-motion: reduce)` on purpose. Planted
  // unconditionally, a surviving breath also defeats the `data-running` suspension and the
  // offscreen assertion fires first, so the run proves the lifecycle check rather than the
  // reduced-motion one. Confined, only the reduced cases see it.
  'reduced-body-animates': `@media (prefers-reduced-motion: reduce) { .kx-hero-polygon .kx-mesh-body { animation: kx-mesh-breathe 19s ease-in-out infinite !important; } }`,
  'reduced-facets-animate': `@media (prefers-reduced-motion: reduce) { .kx-hero-polygon .kx-mesh-facets path { animation: kx-mesh-shimmer 16s ease-in-out infinite !important; } }`,
  'reduced-links-animate': `@media (prefers-reduced-motion: reduce) { .kx-hero-polygon .kx-mesh-links path { animation: kx-mesh-draw 2s ease-out infinite !important; } }`,
};

/**
 * Negative controls that no stylesheet can express, injected into the page instead.
 *
 * The hero became decoration on 2026-11-06, and an assertion of ABSENCE is the
 * easiest kind to get wrong: it passes when the feature is gone, and it also
 * passes when the assertion is looking in the wrong place. Each of these puts
 * one removed control back — a tab stop, a drag rotation, the arrow keys — and
 * requires the gate to notice. None of them can be expressed in CSS, because
 * each is a listener or an attribute rather than a style.
 */
const NEGATIVE_CONTROL_SCRIPTS = {
  // The hero takes focus again, and nothing else changes: the control adds the
  // tab stop and leaves `aria-hidden` alone, so the assertion under test is the
  // one that counts focus stops rather than the one before it.
  'tab-stop-returns': () => {
    document.querySelector('.kx-hero-mesh').setAttribute('tabindex', '0');
  },
  // A drag on a facet turns the network again, written the way it used to be:
  // a transform on a group inside the SVG, composed over the breath.
  //
  // The rotation goes on `.kx-mesh-facets`, not on `.kx-mesh-body`. The body
  // carries `kx-mesh-breathe`, and a CSS animation on `transform` beats an
  // inline one whether it is running or paused — written there, the control
  // would do nothing at all and would "prove" the gate catches a defect that
  // never happened.
  'drag-returns': () => {
    const root = document.querySelector('.kx-hero-polygon');
    const body = root.querySelector('.kx-mesh-facets');
    let from = null;
    let angle = 0;
    // Any press inside the hero starts it. The facets no longer opt in to
    // pointer events, so a press over the artwork is delivered to the root div;
    // requiring an SVG path here would make the control a no-op.
    root.addEventListener('pointerdown', (event) => {
      from = { x: event.clientX, angle };
    });
    root.addEventListener('pointermove', (event) => {
      if (!from) return;
      angle = from.angle + (event.clientX - from.x) * 0.28;
      body.style.transformBox = 'view-box';
      body.style.transformOrigin = '62% 46%';
      body.style.transform = `rotate(${angle}deg)`;
    });
    root.addEventListener('pointerup', () => {
      from = null;
    });
  },
  // The arrow keys turn it again. Bound on the document, because with the tab
  // stop gone there is nothing in the hero for a key to be delivered to.
  'keys-return': () => {
    const body = document.querySelector('.kx-mesh-facets');
    let angle = 0;
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') angle += 4;
      else if (event.key === 'ArrowLeft') angle -= 4;
      else if (event.key === 'Home') angle = 0;
      else return;
      body.style.transformBox = 'view-box';
      body.style.transformOrigin = '62% 46%';
      body.style.transform = `rotate(${angle}deg)`;
    });
  },
};
const output = process.env.REBRAND_OUTPUT || 'design-assets/identity/v1/verification';
const mesh = JSON.parse(await readFile('apps/web/src/components/hero-mesh.json', 'utf8'));
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: process.env.PLAYWRIGHT_CHROMIUM_PATH ? ['--no-sandbox'] : [],
});
const results = [];

/**
 * The rendered position of the mesh body, as the screen transform the browser
 * has computed for it. The breath is one transform on that group, so this is
 * the honest measurement of it: not a class name, the actual matrix.
 */
const bodyMatrix = (root) =>
  root.locator('.kx-mesh-body').evaluate((el) => {
    const m = el.getScreenCTM();
    return [m.a, m.b, m.c, m.d, m.e, m.f].map((n) => Number(n.toFixed(4)));
  });

/** Every facet's `d`, to prove the supplied coordinates are rendered unaltered. */
const facetPaths = (root) =>
  root.locator('.kx-mesh-facets path').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('d')));

/**
 * Which cases to run. Empty (the normal run, and CI) means all of them.
 *
 * `scripts/rebrand-hero-negative-controls.mjs` narrows it for the reduced-motion
 * controls. The gate stops at the first failing case, and a planted animation that
 * survives `prefers-reduced-motion` is caught first by the live preference-change
 * assertion in the `desktop` case — a true catch, but by a different assertion than
 * the one the control exists to prove. Restricting the run to a reduced case puts the
 * plant in front of the assertion under test.
 */
const ONLY_CASES = (process.env.KX_HERO_CASES ?? '').split(',').filter(Boolean);

try {
  for (const [name, width, dark, rtl, reduced, zoom] of [
    ['desktop', 1440, false, false, false, false],
    ['mobile', 390, false, false, false, false],
    ['desktop-dark', 1440, true, false, false, false],
    ['mobile-dark-rtl', 390, true, true, true, false],
    ['narrow', 320, false, false, true, false],
    ['tablet', 768, false, false, true, false],
    ['narrow-text-200', 320, false, false, true, true],
  ]) {
    if (ONLY_CASES.length && !ONLY_CASES.includes(name)) continue;
    const context = await browser.newContext({
      viewport: { width, height: 960 },
      colorScheme: dark ? 'dark' : 'light',
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    await context.addInitScript(({ dark, rtl }) => {
      localStorage.setItem('kx-consent', 'denied');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      if (rtl) document.addEventListener('DOMContentLoaded', () => (document.documentElement.dir = 'rtl'));
    }, { dark, rtl });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (zoom) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } });
    }
    await page.goto(base, { waitUntil: 'networkidle' });
    // Negative-control seam. `scripts/rebrand-hero-negative-controls.mjs` runs
    // THIS gate with KX_HERO_NC set and requires it to fail, so the lifecycle
    // assertions below are proven to catch the defect they exist for rather
    // than merely passing. Nothing is injected on a normal run.
    if (NEGATIVE_CONTROLS[process.env.KX_HERO_NC ?? '']) {
      await page.addStyleTag({ content: NEGATIVE_CONTROLS[process.env.KX_HERO_NC] });
    }
    if (NEGATIVE_CONTROL_SCRIPTS[process.env.KX_HERO_NC ?? '']) {
      await page.evaluate(NEGATIVE_CONTROL_SCRIPTS[process.env.KX_HERO_NC]);
    }
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').count(), 1);

    const root = page.locator('.kx-hero-polygon');
    const svg = root.locator('svg.kx-hero-mesh');

    // ── The mesh is all there, and it is the generated mesh ──────────────────
    assert.equal(await root.locator('.kx-mesh-facets path').count(), mesh.facets.length, 'facet count');
    assert.equal(await root.locator('.kx-mesh-links path').count(), mesh.links.length, 'link outline count');
    assert.equal(await root.locator('.kx-mesh-nodes [data-junction]').count(), mesh.nodes.length, 'junctions');
    assert.equal(await root.locator('.kx-mesh-pulses circle').count(), mesh.routes.length, 'light pulses');
    assert.equal(await svg.getAttribute('viewBox'), mesh.viewBox, "the supplied artwork's own viewBox");
    // The supplied coordinates are rendered, not a redrawing of them.
    assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'a facet path was altered');

    // ── No focus stop, no name, no control row ──────────────────────────────
    //    The hero is decoration. The drawing says nothing a screen reader needs,
    //    so the SVG stays hidden, and since 2026-11-06 there is nothing to
    //    operate either: no tab stop, and so nothing that should carry a name or
    //    point at instructions. A decorative illustration that still advertises
    //    keys it no longer handles is worse than a silent one, so the absence of
    //    the instructions is asserted as firmly as the absence of the handler.
    assert.equal(await svg.getAttribute('aria-hidden'), 'true', 'the illustration is hidden from AT');
    assert.equal(
      await root.locator('[tabindex], a, button, input, select, textarea').count(),
      0,
      'the hero holds a focus stop — it is decoration and takes no input',
    );
    assert.equal(await root.locator('.kx-polygon-interaction').count(), 0, 'the rotation group returned');
    assert.equal(await root.locator('[role="group"]').count(), 0, 'a named interactive group returned');
    assert.equal(await root.locator('[aria-describedby]').count(), 0, 'the hero still points at instructions');
    assert.equal(await root.locator('p.sr-only').count(), 0, 'the hero still describes controls it does not have');
    assert.equal(await root.getByRole('button').count(), 0, 'visible hero controls returned');
    // The element-bound pointer spotlight is gone with them: it could not leave
    // the hero's own box, which is the defect this release fixed. The pointer
    // glow is the site-wide layer, and `check:cursor-glow` owns it.
    assert.equal(await root.locator('.kx-polygon-spotlight').count(), 0, 'the hero-bound pointer spotlight returned');
    assert.equal(await page.locator('.kx-cursor-glow').count(), 1, 'the site-wide pointer glow is missing');

    // ── Nothing overflows ────────────────────────────────────────────────────
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .map((el) => ({ tag: el.tagName, cls: String(el.className).slice(0, 80), right: el.getBoundingClientRect().right }))
        .filter((el) => el.right > innerWidth + 1)
        .slice(0, 10),
    );
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `${name}: horizontal overflow ${JSON.stringify(overflow)}`,
    );

    // ── The CTAs stay reachable under the illustration ───────────────────────
    //    Each one is scrolled into view before it is hit-tested. `elementFromPoint`
    //    is viewport-relative and answers null for anything outside it, so without
    //    the scroll this reports "covered" for a CTA that is merely further down
    //    the page — which is exactly what it did at 320px with 200% text, where
    //    the buttons sit at y≈1241 in a 960px viewport.
    const ctas = await page.evaluate(() => {
      const links = [...document.querySelectorAll('[data-hero-copy] a')].slice(0, 3);
      return links.map((link) => {
        link.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = link.getBoundingClientRect();
        const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
        const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        return {
          text: link.textContent.trim().slice(0, 30),
          inView: r.top < innerHeight && r.bottom > 0,
          hit: hit ? `${hit.tagName}.${String(hit.className).slice(0, 40)}` : 'null',
          reachable: !!hit && (hit === link || link.contains(hit)),
        };
      });
    });
    for (const cta of ctas) {
      assert.ok(cta.inView, `${name}: "${cta.text}" could not be scrolled into view`);
      assert.ok(cta.reachable, `${name}: "${cta.text}" is covered — the point hits ${cta.hit}`);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    if (!reduced) {
      await root.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'true');

      // ── 1. The mesh breathes, as one body ────────────────────────────────
      //    The breath is a transform on the whole group, which is what keeps the
      //    facets and the wireframe outlining them from ever slipping apart. So
      //    the measurement is the group's own screen matrix, not a class name.
      const firstMatrix = await bodyMatrix(root);
      let moved = false;
      let scaleSpread = 0;
      for (let i = 0; i < 16 && !moved; i++) {
        await page.waitForTimeout(260);
        const now = await bodyMatrix(root);
        if (JSON.stringify(now) !== JSON.stringify(firstMatrix)) moved = true;
        scaleSpread = Math.max(scaleSpread, Math.abs(now[0] / firstMatrix[0] - 1));
      }
      assert.ok(moved, 'the mesh body never moved — nothing is breathing');
      assert.ok(scaleSpread < 0.06, `the breath scaled the mesh by ${(scaleSpread * 100).toFixed(1)}% — that is a zoom`);
      // And the geometry underneath it is untouched: a breath, not a morph.
      assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'the breath rewrote the artwork');

      // ── 2/3. Light travels the supplied edges, and junctions answer it ────
      const pulseAt = () =>
        root.locator('.kx-mesh-pulses circle').evaluateAll((n) => n.map((c) => [c.getAttribute('cx'), c.getAttribute('cy')]));
      const glowAt = () =>
        root.locator('.kx-mesh-node-glow').evaluateAll((n) => n.map((c) => Number(c.getAttribute('opacity'))));
      /**
       * The CSS motion layers, read off the screen rather than from a class list.
       *
       * The pulses are a JS loop and stop with it. The breath and the per-facet
       * shimmer are CSS `infinite` animations on the compositor, and before
       * 2026-11-05 nothing gated them on `data-running`: they ran through an
       * announced stop and offscreen. This gate could not see that, because its
       * only suspension evidence was `pulseAt()`. So the lifecycle is now
       * measured where it actually shows: the body's composited transform and a
       * facet's computed opacity.
       */
      const cssMotionAt = () =>
        page.evaluate(() => ({
          transform: getComputedStyle(document.querySelector('.kx-mesh-body')).transform,
          opacity: getComputedStyle(document.querySelector('.kx-mesh-facets path')).opacity,
        }));
      const pulsesA = await pulseAt();
      const glowsA = await glowAt();
      await page.waitForTimeout(600);
      const pulsesB = await pulseAt();
      const glowsB = await glowAt();
      assert.notDeepEqual(pulsesB, pulsesA, 'the light pulses never moved');
      assert.notDeepEqual(glowsB, glowsA, 'the junctions never responded');
      // Every pulse must stay on its own route: on the graph, not drifting off it.
      const strayed = pulsesB
        .map(([x, y], r) => {
          const v = mesh.routes[r].v;
          let best = Infinity;
          for (let i = 1; i < v.length; i++) {
            const [ax, ay] = v[i - 1];
            const [bx, by] = v[i];
            const len = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
            const t = Math.min(1, Math.max(0, ((Number(x) - ax) * (bx - ax) + (Number(y) - ay) * (by - ay)) / len));
            best = Math.min(best, Math.hypot(Number(x) - (ax + (bx - ax) * t), Number(y) - (ay + (by - ay) * t)));
          }
          return { r, best };
        })
        .filter((p) => p.best > 1.5);
      assert.equal(strayed.length, 0, `a pulse left its edge: ${JSON.stringify(strayed)}`);
      // A junction must actually brighten, not merely shimmer at rest.
      let peak = 0;
      for (let i = 0; i < 16; i++) {
        peak = Math.max(peak, ...(await glowAt()));
        await page.waitForTimeout(240);
      }
      assert.ok(peak > 0.4, `the brightest junction reached only ${peak.toFixed(3)} — no light arrived`);
      // …and the junctions must not all be lit at once, which is what a timer
      // would produce. A pulse lights the few it is passing.
      const spread = await glowAt();
      assert.ok(
        Math.max(...spread) - Math.min(...spread) > 0.08,
        'every junction is equally lit — the glow is on a timer, not following the light',
      );

      // ── 4. The hero answers the reader with nothing ──────────────────────
      //    Decoration, as of the owner's decision of 2026-11-06. A pointer over
      //    it, a drag across a facet, Tab, the arrow keys and Home must each
      //    leave the drawing exactly where it was.
      //
      //    "Exactly where it was" needs the breath held, or the artwork moves
      //    between the two samples on its own and every comparison below is
      //    noise. So the motion is paused with a style tag for the duration of
      //    this section and released afterwards — the gate's own suspension
      //    assertions, further down, are what prove the motion was running.
      const box = await svg.boundingBox();
      const holdMotion = () =>
        page.evaluate(() => {
          const tag = document.createElement('style');
          tag.id = 'kx-hold-motion';
          tag.textContent = '.kx-hero-polygon *{animation-play-state:paused!important}';
          document.head.append(tag);
        });
      const releaseMotion = () => page.evaluate(() => document.getElementById('kx-hold-motion')?.remove());
      // Measured RELATIVE to the illustration's own box, not to the viewport:
      // ArrowDown scrolls the page, and an absolute rect would read that scroll
      // as the artwork having moved. The `<svg>` box is fixed on the page, so
      // the offset between the two changes only if the drawing itself turns.
      const facetBox = async () => {
        const facet = await root.locator('.kx-mesh-facets path[data-material="3"]').first().boundingBox();
        const frame = await svg.boundingBox();
        return { x: facet.x - frame.x, y: facet.y - frame.y, width: facet.width, height: facet.height };
      };
      const samePlace = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1;

      await holdMotion();
      await page.waitForTimeout(120);
      const atRest = await facetBox();

      // A pointer over the artwork: no local spotlight, no displacement, and no
      // state written on the root for one.
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
      await page.waitForTimeout(400);
      assert.equal(await root.getAttribute('data-pointer'), null, 'the hero still tracks the pointer');
      assert.ok(samePlace(await facetBox(), atRest), 'the pointer moved the artwork');
      assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'the pointer rewrote the artwork');

      // A drag across a facet, the gesture that used to turn the network.
      const grab = await root.locator('.kx-mesh-facets path[data-material="3"]').first().boundingBox();
      await page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2);
      await page.mouse.down();
      await page.mouse.move(grab.x + grab.width / 2 + 180, grab.y + grab.height / 2, { steps: 12 });
      const dragged = await facetBox();
      await page.mouse.up();
      assert.ok(
        samePlace(dragged, atRest),
        `a 180px drag moved the artwork from ${JSON.stringify(atRest)} to ${JSON.stringify(dragged)}`,
      );
      assert.equal(await root.locator('[data-dragging]').count(), 0, 'the drag state returned');
      assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'the drag rewrote the artwork');
      // The group the rotation lived on, and the property it wrote, are gone.
      assert.equal(await root.locator('.kx-mesh-spin').count(), 0, 'the rotation group returned');

      // Tab never lands in the illustration, from anywhere on the page.
      await page.evaluate(() => document.activeElement?.blur());
      let landedInHero = false;
      for (let i = 0; i < 40 && !landedInHero; i++) {
        await page.keyboard.press('Tab');
        landedInHero = await page.evaluate(() => !!document.activeElement?.closest('.kx-hero-polygon'));
      }
      assert.equal(landedInHero, false, 'Tab reached the hero — it is decoration and should not take focus');

      // …and the keys that used to turn it do nothing, wherever focus is.
      //
      // The arrows are measured BEFORE Home is pressed. Home used to return the
      // network to its own angle, so a sequence that ends with it leaves the
      // artwork back where it started whether the keys still work or not — which
      // is exactly what the `keys-return` negative control exploited when this
      // measured only the end state.
      await page.evaluate(() => document.activeElement?.blur());
      for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown']) {
        await page.keyboard.press(key);
      }
      await page.waitForTimeout(200);
      const afterArrows = await facetBox();
      assert.ok(
        samePlace(afterArrows, atRest),
        `the arrow keys moved the artwork from ${JSON.stringify(atRest)} to ${JSON.stringify(afterArrows)}`,
      );
      await page.keyboard.press('Home');
      await page.waitForTimeout(150);
      assert.ok(
        samePlace(await facetBox(), atRest),
        'Home moved the artwork — the reset the rotation used to need is still bound',
      );
      assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'a key rewrote the artwork');
      await releaseMotion();

      // There is no reader-facing pause (owner decision, 2026-11-05, and the
      // hero has had no controls at all since 2026-11-06). Space and Escape
      // must not stop the motion, and nothing may announce a pause: a control
      // removed from the handler but left in a description is still a promise
      // to a screen-reader user. The description itself is asserted gone above.
      await page.keyboard.press(' ');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      assert.equal(
        await root.getAttribute('data-running'),
        'true',
        'Space or Escape still stops the hero: the pause control was supposed to be gone',
      );
      assert.equal(await root.locator('[role="status"]').count(), 0, 'a pause status region survived');
      assert.equal(
        await root.locator('text=/pause|resume/i').count(),
        0,
        'the hero still offers a pause control somewhere in its text',
      );
      await page.mouse.move(box.x - 60, box.y - 60);

      // ── 5. Suspension: offscreen, and on a live preference change ──────────
      // `data-running === 'false'` is the claim; what follows is whether the
      // artwork actually stopped. Each state is sampled twice and compared with
      // itself, so the assertion is about motion rather than about any value.
      const movingBefore = await cssMotionAt();
      await page.waitForTimeout(700);
      const movingAfter = await cssMotionAt();
      assert.notDeepEqual(movingBefore, movingAfter, 'the CSS layers never moved while the hero was running');

      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
      const offscreenPulses = await pulseAt();
      const offscreenCss = await cssMotionAt();
      await page.waitForTimeout(700);
      assert.deepEqual(await pulseAt(), offscreenPulses, 'the light kept travelling offscreen');
      assert.deepEqual(
        await cssMotionAt(),
        offscreenCss,
        'the breath or the facet shimmer kept animating offscreen, where the component reports no motion',
      );

      await root.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'true');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
      const stilledPulses = await pulseAt();
      const stilledCss = await cssMotionAt();
      await page.waitForTimeout(500);
      assert.deepEqual(await pulseAt(), stilledPulses, 'the light kept travelling after the preference changed');
      assert.deepEqual(await cssMotionAt(), stilledCss, 'a CSS layer kept animating after the preference changed');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    } else {
      // ── Reduced motion: no loop, no CSS animation, and the rest pose is the
      //    supplied artwork rather than a partial reveal left frozen. ─────────
      assert.equal(await root.getAttribute('data-running'), 'false');
      assert.deepEqual(
        await root.locator('.kx-mesh-facets path').evaluateAll((n) => [
          ...new Set(n.map((el) => getComputedStyle(el).animationName)),
        ]),
        ['none'],
        'a facet animation survived reduced motion',
      );
      assert.equal(
        await root.locator('.kx-mesh-body').evaluate((el) => getComputedStyle(el).animationName),
        'none',
        'the breath survived reduced motion',
      );
      assert.equal(
        await root.locator('.kx-mesh-links path').first().evaluate((el) => getComputedStyle(el).animationName),
        'none',
        'the intro draw-on survived reduced motion',
      );
      assert.equal(
        await root.locator('.kx-mesh-pulses').evaluate((el) => getComputedStyle(el).display),
        'none',
        'light pulses are shown with nothing to animate them',
      );
      // The still mesh is the whole artwork: every supplied facet, drawn, with
      // the wireframe solid rather than left half-dashed.
      assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'the still pose is not the supplied artwork');
      assert.ok(
        await root.locator('.kx-mesh-facets path').first().evaluate((el) => Number(getComputedStyle(el).opacity) > 0.05),
        'the facets are invisible at rest',
      );
      assert.ok(
        await root.locator('.kx-mesh-links path').first().evaluate((el) => getComputedStyle(el).strokeDasharray === 'none'),
        'the links stayed dashed, so the network reads as half-drawn',
      );
    }

    // ── Forced colours: the facets go, the network stays legible ─────────────
    await page.emulateMedia({ forcedColors: 'active' });
    assert.equal(await root.locator('.kx-mesh-facets').evaluate((el) => getComputedStyle(el).display), 'none');
    assert.notEqual(await root.locator('.kx-mesh-links').evaluate((el) => getComputedStyle(el).display), 'none');
    await page.emulateMedia({ forcedColors: 'none' });

    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () =>
      (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(
        (v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }),
      ),
    );
    await page.evaluate(() => {
      document.activeElement?.blur();
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
    if (['desktop', 'mobile', 'desktop-dark'].includes(name)) {
      await page.locator('.kx-brand-hero').screenshot({ path: `${output}/${name}-hero.png`, animations: 'disabled' });
    }
    if (name === 'mobile') await root.screenshot({ path: `${output}/mobile-polygon.png`, animations: 'disabled' });
    results.push({ name, violations, errors });
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
assert.ok(results.every((r) => !r.violations.length && !r.errors.length), 'browser or accessibility errors; inspect results');
console.log(
  `hero mesh ok — the supplied OH38WC1 artwork rendered unaltered: ${mesh.facets.length} facets, ` +
    `${mesh.links.length} link outlines, ${mesh.nodes.length} junctions, ${mesh.routes.length} light routes, ` +
    `across ${results.length} browser cases`,
);
