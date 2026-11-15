// kx-verify: interaction, reducedMotion
// kx-verify-only: button, fab, slider

import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
import { buildAngularHarness, serveStatic, settleAngular, waitForAngular } from './visual-harness.mjs';

const dir = buildAngularHarness('angular-press-slider');
const server = await serveStatic(dir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const evidence = process.env.KX_PRESS_EVIDENCE;
if (evidence) mkdirSync(evidence, { recursive: true });

try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ reducedMotion, viewport: { width: 430, height: 720 } });
    await page.goto(`${server.base}/?fixture=press-slider`);
    await waitForAngular(page);
    const save = page.getByRole('button', { name: 'Save' });
    const fab = page.getByRole('button', { name: 'Add item' });
    const disabled = page.getByRole('button', { name: 'Unavailable' });
    const slider = page.getByRole('slider', { name: 'Level' });
    const count = page.locator('#submissions');
    await disabled.evaluate(el => el.click());
    assert.equal(await count.textContent(), '0');

    await save.focus();
    await page.keyboard.press('Enter');
    await settleAngular(page);
    assert.equal(await count.textContent(), '1', 'default Button still submits the form');
    assert.equal(await save.evaluate(el => el === document.activeElement), true);
    const timing = await save.evaluate(el => getComputedStyle(el).transitionDuration.split(',')[0].trim());
    assert.equal(timing, reducedMotion === 'reduce' ? '0s' : '0.1s');
    await fab.hover();
    await fab.evaluate(async el => { await Promise.allSettled(el.getAnimations().map(a => a.finished)); });
    const hover = await fab.evaluate(el => getComputedStyle(el).backgroundColor);
    await page.mouse.down();
    assert.equal(await fab.evaluate(el => el.matches(':active')), true);
    const press = await fab.evaluate(async el => {
      const animations = el.getAnimations();
      const duration = getComputedStyle(el).transitionDuration;
      await Promise.allSettled(animations.map(a => a.finished));
      return { duration, fill: getComputedStyle(el).backgroundColor };
    });
    assert.notEqual(press.fill, hover);
    assert.equal(press.duration, reducedMotion === 'reduce' ? '0s' : '0.1s');
    await page.mouse.up();
    await settleAngular(page);
    assert.equal(await page.locator('#items').textContent(), '1');
    assert.equal(await count.textContent(), '1', 'explicit button FAB does not submit');

    const geometry = () => slider.evaluate(input => {
      const track = input.parentElement.querySelector('.kx-slider__track');
      const fill = track.firstElementChild.getBoundingClientRect();
      const t = track.getBoundingClientRect();
      const r = input.getBoundingClientRect();
      return { value: input.valueAsNumber, left: r.left, right: r.right,
        trackLeft: t.left, trackRight: t.right, fillLeft: fill.left, fillRight: fill.right };
    });
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await settleAngular(page);
    assert.equal((await geometry()).value, 0.25);
    await page.keyboard.press('End');
    await settleAngular(page);
    let at = await geometry();
    assert.equal(at.value, 5);
    assert(Math.abs(at.right - at.fillRight - 10) < 1, 'LTR endpoint is the thumb centre');
    await page.getByRole('button', { name: 'Limit to two' }).click();
    await settleAngular(page);
    at = await geometry();
    assert.equal(at.value, 2);
    assert.equal(at.fillRight, at.trackRight);
    await page.getByRole('button', { name: 'Flip direction' }).click();
    await settleAngular(page);
    at = await geometry();
    assert(Math.abs(at.fillLeft - at.left - 10) < 1, 'RTL endpoint mirrors the thumb centre');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await settleAngular(page);
    at = await geometry();
    assert.equal(at.value, 1.75, 'RTL arrow decreases one fractional step');
    assert.equal(at.fillRight, at.trackRight);
    const area = await slider.boundingBox();
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width * 0.8, area.y + area.height / 2, { steps: 6 });
    await page.mouse.up();
    await settleAngular(page);
    const dragged = await geometry();
    const fraction = (dragged.value + 5) / 7;
    assert(Math.abs(dragged.fillLeft - (dragged.trackRight - fraction * (dragged.trackRight - dragged.trackLeft))) < 1);
    if (evidence) await page.screenshot({ path: `${evidence}/press-slider-${reducedMotion}.png` });
    console.log(JSON.stringify({ reducedMotion, press, slider: at }));
    await page.close();
  }

  const touch = await browser.newPage({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 700 } });
  await touch.goto(`${server.base}/?fixture=press-slider`);
  await waitForAngular(touch);
  await touch.getByRole('button', { name: 'Add item' }).tap();
  await settleAngular(touch);
  assert.equal(await touch.locator('#items').textContent(), '1');
  console.log('Angular press and slider feedback passed in Chromium.');
} finally {
  await browser.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });
}
