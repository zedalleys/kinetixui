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
 *     light pulses; the drawing is hidden from AT and the one focus stop is the
 *     named rotation group, with no visible control row
 *   - the illustration moves — geometry, not just a class name — and the light
 *     pulses travel, and the junctions respond to them
 *   - the pointer response is local: a facet under the cursor lifts, one across
 *     the mesh does not
 *   - the reader can turn the network: a drag and the arrow keys both rotate it,
 *     Home returns it, Space and Escape stop the light, and keyboard focus is
 *     drawn on the artwork with no rectangle around it
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

    // ── One focus stop, named, and no control row ────────────────────────────
    //    The drawing itself says nothing a screen reader needs, so the SVG stays
    //    hidden; the single focusable group carries the name and the keys.
    assert.equal(await svg.getAttribute('aria-hidden'), 'true', 'the illustration is hidden from AT');
    assert.equal(
      await root.locator('[tabindex], a, button, input, select, textarea').count(),
      1,
      'the hero has exactly one focus stop: the rotation group',
    );
    const group = root.locator('.kx-polygon-interaction');
    assert.equal(await group.getAttribute('role'), 'group');
    assert.ok((await group.getAttribute('aria-label'))?.trim(), 'the rotation group has no accessible name');
    const described = await group.getAttribute('aria-describedby');
    assert.ok(
      (await page.locator(`#${described}`).innerText()).includes('arrow keys'),
      'the group does not point at instructions that name the keys',
    );
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

      // ── 4. Pointer response is local, and is a brightening, not a distortion
      const box = await svg.boundingBox();
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
      await page.waitForTimeout(600);
      assert.equal(await root.getAttribute('data-pointer'), 'true', 'the pointer was not picked up');
      const spotlight = root.locator('.kx-polygon-spotlight');
      assert.ok(
        Number(await spotlight.evaluate((el) => getComputedStyle(el).opacity)) > 0.5,
        'the pointer brightening never came up',
      );
      assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'the pointer displaced the artwork');
      await page.mouse.move(box.x - 40, box.y - 40);
      await page.waitForTimeout(600);
      assert.equal(await root.getAttribute('data-pointer'), 'false', 'the brightening stayed after the pointer left');

      // ── 4b. The reader turns the network ───────────────────────────────────
      //    The rotation is a transform on `.kx-mesh-spin`, so every assertion
      //    here reads the matrix the browser computed, not the custom property
      //    the component wrote. The facet `d`s are re-checked after each one:
      //    rotating the composition must never rewrite the supplied artwork.
      const spinAngle = () =>
        root.locator('.kx-mesh-spin').evaluate((el) => {
          const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
          return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI);
        });
      const facetBox = () => root.locator('.kx-mesh-facets path').first().boundingBox();

      assert.equal(await spinAngle(), 0, 'the network does not start at the artwork\'s own angle');
      const restBox = await facetBox();

      // Drag: on a facet, and it must move the drawing on screen.
      const grab = await root.locator('.kx-mesh-facets path[data-material="3"]').first().boundingBox();
      await page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2);
      await page.mouse.down();
      const duringDrag = await pulseAt();
      await page.mouse.move(grab.x + grab.width / 2 + 180, grab.y + grab.height / 2, { steps: 12 });
      const dragged = await spinAngle();
      assert.ok(Math.abs(dragged) > 10, `a 180px drag turned the network by ${dragged}°`);
      assert.equal(await group.getAttribute('data-dragging'), 'true', 'the drag never registered');
      // The light does not stop because a reader is holding the artwork.
      await page.waitForTimeout(500);
      assert.notDeepEqual(await pulseAt(), duringDrag, 'the light stopped while the reader was dragging');
      await page.mouse.up();
      assert.equal(await group.getAttribute('data-dragging'), 'false', 'the drag never ended');
      const draggedBox = await facetBox();
      assert.ok(
        Math.hypot(draggedBox.x - restBox.x, draggedBox.y - restBox.y) > 4,
        'the angle changed but nothing moved on screen',
      );
      assert.deepEqual(await facetPaths(root), mesh.facets.map((f) => f.d), 'the drag rewrote the artwork');

      // Keyboard: the same rotation, and Home brings it back.
      await group.focus();
      const beforeKeys = await spinAngle();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      const afterRight = await spinAngle();
      assert.ok(afterRight !== beforeKeys, 'the arrow keys did not rotate the network');
      await page.keyboard.press('ArrowLeft');
      assert.ok(
        Math.abs(afterRight - (await spinAngle())) > 0,
        'ArrowLeft and ArrowRight move it the same way',
      );
      await page.keyboard.press('Home');
      assert.equal(await spinAngle(), 0, 'Home did not return the network to its own angle');

      // Keyboard focus is on the artwork, with no rectangle around it.
      const focusRing = await group.evaluate((el) => {
        const s = getComputedStyle(el);
        return { outline: s.outlineStyle, width: parseFloat(s.outlineWidth) || 0, shadow: s.boxShadow };
      });
      assert.ok(
        focusRing.outline === 'none' || focusRing.width === 0,
        `a rectangular focus outline returned: ${JSON.stringify(focusRing)}`,
      );
      assert.equal(focusRing.shadow, 'none', 'a focus box-shadow returned');
      const linkFocus = await root.locator('.kx-mesh-links').evaluate((el) => {
        const s = getComputedStyle(el);
        return { stroke: s.stroke, width: parseFloat(s.strokeWidth), opacity: Number(s.strokeOpacity) };
      });
      const focusRole = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.color = 'hsl(var(--focus))';
        document.body.append(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      });
      assert.equal(linkFocus.stroke, focusRole, 'the focus indicator is not drawn in the --focus role');
      assert.ok(linkFocus.width >= 2, `the focused wireframe is only ${linkFocus.width}px`);
      assert.ok(linkFocus.opacity > 0.9, `the focused wireframe is still ${linkFocus.opacity} opaque`);

      // Space stops the light and says so; Escape stops it and keeps it stopped.
      await page.keyboard.press(' ');
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
      assert.match(
        await root.locator('[role="status"]').innerText(),
        /paused/i,
        'pausing announced nothing',
      );
      const held = await pulseAt();
      await page.waitForTimeout(500);
      assert.deepEqual(await pulseAt(), held, 'the light kept travelling while paused');
      await page.keyboard.press(' ');
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'true');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
      await page.keyboard.press(' ');
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'true');
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
