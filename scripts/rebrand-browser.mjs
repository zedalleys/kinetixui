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
 *     light pulses; the drawing is hidden from AT and the hero takes NO focus
 *     stop of its own, with no visible control row
 *   - the illustration moves — geometry, not just a class name — and the light
 *     pulses travel, and the junctions respond to them
 *   - the artwork is inert: rotation (pointer and keyboard), the pause control
 *     and the focus indicator were removed on the owner's instruction
 *     (2026-11-02), and this gate now proves they stayed removed — a facet
 *     cannot be dragged, the arrow keys do nothing, Space does not stop the
 *     light, and the hero contributes nothing tabbable
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

    // ── No focus stop, and no control row ────────────────────────────────────
    //    The artwork is decorative. It says nothing a screen reader needs, it
    //    operates nothing, and so it must cost a keyboard reader nothing: a tab
    //    stop on decoration is a tab stop that does nothing.
    assert.equal(await svg.getAttribute('aria-hidden'), 'true', 'the illustration is hidden from AT');
    assert.equal(
      await root.locator('[tabindex], a, button, input, select, textarea').count(),
      0,
      'the hero took a focus stop back — the artwork is decorative and must not be tabbable',
    );
    assert.equal(await root.locator('[role="group"]').count(), 0, 'the rotation group returned');
    assert.equal(await root.getByRole('button').count(), 0, 'visible hero controls returned');

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

      // ── 4. The cursor's brightening is site-wide, and it never moves the art
      //    It used to be scoped to this component, where the artwork's own box
      //    clipped it. It is one fixed layer over the page now, so it is asserted
      //    on the page, not on the hero — and it must sit BEHIND the content, or
      //    it would be brightening type on every page at once.
      const box = await svg.boundingBox();
      const glow = page.locator('.kx-cursor-glow');
      assert.equal(await glow.count(), 1, 'the site-wide cursor glow is not on the page');
      assert.equal(await root.locator('.kx-polygon-spotlight').count(), 0, 'the hero-scoped spotlight returned');
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
      await page.waitForTimeout(700);
      assert.equal(await glow.getAttribute('data-active'), 'true', 'the pointer was not picked up');
      assert.ok(
        Number(await glow.evaluate((el) => getComputedStyle(el).opacity)) > 0.5,
        'the cursor brightening never came up',
      );
      const glowPlacement = await glow.evaluate((el) => {
        const s = getComputedStyle(el);
        return { position: s.position, z: s.zIndex, events: s.pointerEvents };
      });
      assert.equal(glowPlacement.position, 'fixed', 'the cursor glow is not fixed to the viewport');
      assert.ok(Number(glowPlacement.z) <= 0, `the cursor glow sits at z-index ${glowPlacement.z}, over the content`);
      assert.equal(glowPlacement.events, 'none', 'the cursor glow swallows pointer events');
      assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'the pointer displaced the artwork');

      // ── 4b. The artwork is inert, and the light never stops ────────────────
      //    Rotation, the pause control and the focus indicator were removed on
      //    the owner's instruction (2026-11-02). These assertions are the record
      //    that they stayed removed: each one would fail the moment any of them
      //    came back, which is what makes this a gate and not a comment.
      assert.equal(await root.locator('.kx-mesh-spin').count(), 0, 'the rotation group returned');

      const facetAt = () => root.locator('.kx-mesh-facets path').first().boundingBox();
      const restBox = await facetAt();

      // A facet cannot be dragged: the artwork must not move, and the light
      // must not pause because someone held the mouse down on it.
      const grab = await root.locator('.kx-mesh-facets path[data-material="3"]').first().boundingBox();
      const beforeDrag = await pulseAt();
      await page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2);
      await page.mouse.down();
      await page.mouse.move(grab.x + grab.width / 2 + 180, grab.y + grab.height / 2, { steps: 12 });
      await page.mouse.up();
      const afterDrag = await facetAt();
      assert.ok(
        Math.hypot(afterDrag.x - restBox.x, afterDrag.y - restBox.y) < 2,
        'a drag still turns the network',
      );
      await page.waitForTimeout(500);
      assert.notDeepEqual(await pulseAt(), beforeDrag, 'the light stopped while the pointer was held down');

      // The keys do nothing, because nothing in the hero can hold focus.
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => document.querySelector('.kx-hero-polygon')?.contains(document.activeElement) ?? false),
        false,
        'focus landed inside the hero artwork',
      );
      const beforeKeys = await facetAt();
      for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home']) {
        await page.keyboard.press(key);
      }
      const afterKeys = await facetAt();
      assert.ok(
        Math.hypot(afterKeys.x - beforeKeys.x, afterKeys.y - beforeKeys.y) < 2,
        'the arrow keys still rotate the network',
      );

      // Space does not stop the light, and no status region announces a pause.
      assert.equal(await root.locator('[role="status"]').count(), 0, 'the pause status region returned');
      const beforeSpace = await pulseAt();
      await page.keyboard.press(' ');
      await page.waitForTimeout(500);
      assert.equal(await root.getAttribute('data-running'), 'true', 'Space still stops the light');
      assert.notDeepEqual(await pulseAt(), beforeSpace, 'the light stopped on Space');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      assert.equal(await root.getAttribute('data-running'), 'true', 'Escape still stops the light');
      await page.mouse.move(box.x - 60, box.y - 60);

      // ── 5. Suspension: offscreen, and on a live preference change ──────────
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
      await root.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'true');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
      const stilledPulses = await pulseAt();
      await page.waitForTimeout(500);
      assert.deepEqual(await pulseAt(), stilledPulses, 'the light kept travelling after the preference changed');
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
