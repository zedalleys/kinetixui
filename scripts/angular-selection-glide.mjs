// kx-verify: interaction, reducedMotion, rtl
// kx-verify-only: segmented-control, tabs

import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
import { buildAngularHarness, serveStatic, settleAngular, waitForAngular } from './visual-harness.mjs';

const dir = buildAngularHarness('angular-selection-glide');
const server = await serveStatic(dir);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const artifactDir = process.env.KX_GLIDE_EVIDENCE;
if (artifactDir) mkdirSync(artifactDir, { recursive: true });

async function open(options) {
  const page = await browser.newPage(options);
  await page.goto(`${server.base}/?fixture=selection-glide&theme=${options.colorScheme ?? 'light'}`);
  await waitForAngular(page);
  return page;
}
const rect = el => el.boundingBox();
const moving = indicator => indicator.evaluate(el => el.getAnimations().some(a => a.playState === 'running'));

async function aligned(indicator, item, underline = false) {
  await indicator.evaluate(async el => {
    await Promise.allSettled(el.getAnimations().map(animation => animation.finished));
  });
  const a = await rect(indicator);
  const b = await rect(item);
  assert(a && b, 'the indicator and selected item render');
  assert(Math.abs(a.x - b.x) < 1.1 && Math.abs(a.width - b.width) < 1.1, JSON.stringify({ a, b }));
  assert(Math.abs(a.y + a.height - b.y - b.height) < 1.1, 'indicator shares the selected bottom edge');
  if (!underline) assert(Math.abs(a.height - b.height) < 1.1);
}

const ready = async page => {
  await settleAngular(page);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

async function clickWithoutWaiting(locator) {
  await locator.evaluate(el => el.click());
}

async function sampleTravel(indicator, start, end) {
  const positions = await indicator.evaluate(el => {
    const animations = el.getAnimations();
    if (!animations.length) return [];
    for (const animation of animations) animation.pause();
    return [0.2, 0.45].map(fraction => {
      for (const animation of animations) {
        animation.currentTime = Number(animation.effect.getComputedTiming().duration) * fraction;
      }
      return el.getBoundingClientRect().x;
    });
  });
  const [early, late] = positions;
  const direction = Math.sign(end - start);
  assert(
    direction * (early - start) > 1 && direction * (late - early) > 1 && direction * (end - late) > 1,
    `indicator must travel through distinct intermediate positions: ${JSON.stringify({ start, early, late, end })}`,
  );
  return { early, late };
}

async function exercise(page, kind, reduced) {
  const isTabs = kind === 'tabs';
  const host = page.locator(isTabs ? 'kx-tab-list' : 'kx-segmented-control');
  const bar = host.locator(':scope > .kx-selection-indicator');
  const items = host.locator(isTabs ? '.kx-tab' : '.kx-segmented__label');
  const active = host.locator(isTabs ? '[aria-selected=true]' : '.kx-segmented__radio:checked + label');
  await aligned(bar, active, isTabs);
  const initial = await rect(bar);
  assert.equal(await bar.getAttribute('aria-hidden'), 'true');

  await clickWithoutWaiting(items.nth(3));
  await settleAngular(page);
  assert.equal(await active.count(), 1);
  assert.match(await active.textContent(), isTabs ? /Settings/ : /Year/);
  if (isTabs) assert.equal(await page.getByRole('tabpanel').textContent(), 'Account settings');
  if (!reduced) {
    const target = await rect(items.nth(3));
    const { early, late } = await sampleTravel(bar, initial.x, target.x);
    await clickWithoutWaiting(items.nth(2));
    await settleAngular(page);
    const retarget = await rect(bar);
    assert(Math.abs(retarget.x - late) < 24, 'retarget continues from rendered position');
    await bar.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
    await aligned(bar, active, isTabs);
    console.log(JSON.stringify({ kind, start: initial.x, early, late, retarget: retarget.x }));
  } else {
    assert.equal(await moving(bar), false);
    await aligned(bar, items.nth(3), isTabs);
  }

  const reverseStart = await rect(bar);
  await clickWithoutWaiting(items.nth(0));
  if (!reduced) {
    await settleAngular(page);
    const reverseEnd = await rect(items.nth(0));
    const reverse = await sampleTravel(bar, reverseStart.x, reverseEnd.x);
    await bar.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
    console.log(JSON.stringify({ kind, reverseStart: reverseStart.x, ...reverse, reverseEnd: reverseEnd.x }));
  }
  await aligned(bar, active, isTabs);
  const keyTarget = isTabs ? items.first() : host.locator('input').first();
  await keyTarget.focus();
  await page.keyboard.press('ArrowRight');
  await ready(page);
  assert.match(await active.textContent(), isTabs ? /Activity/ : /Quarter/);
  await aligned(bar, active, isTabs);
  const panels = await page.getByRole('tabpanel').count();
  assert.equal(panels, 1);

  for (const label of ['Change labels', 'Resize controls', 'Flip direction']) {
    await page.getByRole('button', { name: label }).click();
    await ready(page);
    assert.equal(await moving(bar), false, `${label} snaps`);
    await aligned(bar, active, isTabs);
  }
  if (isTabs) {
    await active.focus();
    await page.keyboard.press('ArrowRight');
    await ready(page);
    assert.match(await active.textContent(), /Summary/, 'RTL arrows skip the disabled tab');
  }
}

try {
  for (const kind of ['segmented', 'tabs']) {
    for (const reduced of [false, true]) {
      const page = await open({ reducedMotion: reduced ? 'reduce' : 'no-preference', viewport: { width: 640, height: 720 } });
      await exercise(page, kind, reduced);
      if (artifactDir) await page.screenshot({ path: `${artifactDir}/${kind}-${reduced ? 'reduced' : 'normal'}.png` });
      await page.close();
    }
  }
  const page = await open({ forcedColors: 'active' });
  const bars = page.locator('.kx-selection-indicator');
  assert.equal(await bars.first().isVisible(), false);
  assert.equal(await bars.last().isVisible(), false);
  const selected = page.locator('.kx-segmented__radio:checked + label');
  assert.notEqual(await selected.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  const bar = bars.first();
  await clickWithoutWaiting(page.getByText('Year', { exact: true }));
  await settleAngular(page);
  assert.equal(await moving(bar), true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  assert.equal(await moving(bar), false);
  await aligned(bar, selected);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert.equal(await moving(bar), false, 'restoring motion does not replay');
  await page.getByRole('button', { name: 'Clear range' }).click();
  await ready(page);
  assert.equal(await bar.isVisible(), false);
  await page.getByRole('button', { name: 'Select week' }).click();
  await ready(page);
  await aligned(bar, selected);
  console.log('Angular Selection Glide passed in Chromium.');
} finally {
  await browser.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });
}
