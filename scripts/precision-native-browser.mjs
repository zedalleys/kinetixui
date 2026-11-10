import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../package.json', import.meta.url));
const axe = require.resolve('axe-core/axe.min.js');
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const out = arg('output', '../precision-native-evidence');
const base = arg('base', 'http://127.0.0.1:3000');
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const width of [1440,390,320]) for (const theme of ['light','dark']) for (const scale of (width === 320 ? [1,2] : [1])) {
  const context = await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce',colorScheme:theme});
  await context.addInitScript((t) => { localStorage.setItem('theme',t); localStorage.setItem('kx-consent','denied'); },theme);
  const page = await context.newPage();
  const errors=[];page.on('pageerror', e=>errors.push(e.message));
  if (scale === 2) { const cdp = await context.newCDPSession(page); await cdp.send('Page.setFontSizes', {fontSizes:{standard:32,fixed:26}}); }
  await page.goto(`${base}/`,{waitUntil:'networkidle'});
  await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);
  await page.locator('#flagship').scrollIntoViewIfNeeded();
  const specimen=page.getByRole('switch',{name:'Playground product updates'});
  await specimen.click();assert.equal(await specimen.getAttribute('aria-checked'),'false');
  const heights=[];
  for(const name of ['React','Angular','SwiftUI','Jetpack Compose','Flutter']) {
    await page.locator('[data-implementation-explorer] [role="tab"]').filter({hasText:name}).click();
    heights.push((await page.locator('[data-implementation-explorer]').boundingBox()).height);
    assert.equal(await specimen.getAttribute('aria-checked'),'false');
  }
  assert.ok(Math.max(...heights)-Math.min(...heights)<2,`platform layout shift: ${heights}`);
  await page.getByRole('button',{name:'Try disabled state'}).click();assert.ok(await specimen.isDisabled());
  await page.getByRole('button',{name:'Enable control'}).click();assert.ok(await specimen.isEnabled());
  await page.locator('#motion').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Check address'}).click();
  assert.equal(await page.getByLabel('Email address').getAttribute('aria-invalid'),'true');
  await page.getByLabel('Email address').fill('reader@example.com');
  await page.getByRole('button',{name:'Check address'}).click();
  assert.ok(await page.getByText('Address accepted for this demo.').isVisible());
  await page.getByRole('button',{name:'What happens with reduced motion?'}).click();
  await page.getByRole('button',{name:'Search components',exact:true}).click();
  await page.getByLabel('Filter example components').fill('Switch');
  assert.ok(await page.getByRole('status').filter({hasText:'1 matching components'}).isVisible());
  await page.getByLabel('Filter example components').press('Escape');
  assert.ok(await page.getByRole('button',{name:'Search components',exact:true}).evaluate(el=>el===document.activeElement));
  await page.getByRole('button',{name:'Create an item',exact:true}).click();
  await page.getByRole('button',{name:'New document',exact:true}).click();
  assert.ok(await page.getByText('Document selected in this local demo.').isVisible());
  await page.getByRole('button',{name:'Try pending feedback'}).click();
  await page.getByRole('button',{name:'Try pending feedback'}).waitFor();
  await page.getByRole('button',{name:'Replay reveal'}).click();
  for (const dir of ['ltr','rtl']) {
    await page.evaluate(d=>document.documentElement.dir=d,dir);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const fits = await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
    if (!fits) console.log(JSON.stringify(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+2&&r.width>0&&!(()=>{for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement)if(['hidden','auto','scroll','clip'].includes(getComputedStyle(a).overflowX))return true;return false})()}).map(el=>({tag:el.tagName,cls:el.getAttribute('class')?.slice(0,100),text:el.textContent.slice(0,100),x:el.getBoundingClientRect().x,w:el.getBoundingClientRect().width})).slice(0,20)})),null,2));
    assert.ok(fits,`overflow ${width} ${theme} ${dir} scale ${scale}`);
  }
  await page.addScriptTag({path:axe});
  const audit=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
  assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  assert.deepEqual(errors,[]);
  results.push({width,theme,scale,heights,axeViolations:0,runtimeErrors:0});
  await context.close();
}
await browser.close();
await writeFile(`${out}/browser-results.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
