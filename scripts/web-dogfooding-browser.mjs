/** Focused behavior/layout evidence for Wave 1; run against a production build. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.KX_AUDIT_BASE || 'http://127.0.0.1:3124';
const out='evidence/website-dogfooding';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined});
const rows=[];
try {
 for (const dir of ['ltr','rtl']) for (const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
  await context.addInitScript(({dir,theme}) => { localStorage.setItem('theme',theme); document.addEventListener('DOMContentLoaded',()=>{document.documentElement.dir=dir}); }, {dir,theme});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.goto(`${base}/iot?kx_traffic=diagnostic#monitoring`,{waitUntil:'domcontentloaded'});
  await page.evaluate(({dir,theme})=>{document.documentElement.dir=dir;document.documentElement.classList.toggle('dark',theme==='dark')},{dir,theme});
  await page.getByText("Try imperfect data yourself, or see a telemetry board", {exact:true}).click();
  // Open the progressive disclosure through its actual visible control.
  const select=page.locator('#iot-demo-status');await select.waitFor();
  assert.equal(await select.getAttribute('data-slot'),'native-select');
  await select.selectOption('offline');assert.equal(await select.inputValue(),'offline');
  const quality=page.locator('#iot-demo-quality');await quality.selectOption('missing');assert.equal(await quality.inputValue(),'missing');
  await select.focus();assert(await select.evaluate(el=>el===document.activeElement));
  const normalFont=await select.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  await page.evaluate(()=>{document.documentElement.style.fontSize='32px'});
  const scaled=await select.evaluate(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return {font:parseFloat(s.fontSize),height:r.height,width:r.width,right:r.right,left:r.left,line:parseFloat(s.lineHeight),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}});
  assert(scaled.font>=normalFont*1.9);assert(scaled.height>=scaled.line);assert(scaled.left>=0&&scaled.right<=scaled.viewport+1);assert(scaled.scrollWidth<=scaled.viewport+1);
  rows.push({dir,theme,largeTextSelect:scaled});
  await page.evaluate(()=>{document.documentElement.style.fontSize=''});
  await page.screenshot({path:`${out}/iot-selects-${dir}-${theme}.png`});
  rows.push({dir,theme,selects:'controlled status and quality updated; labelled native picker; keyboard focus retained'});
  await page.goto(`${base}/iot?kx_traffic=diagnostic#control`,{waitUntil:'domcontentloaded'});
  await page.evaluate(dir=>{document.documentElement.dir=dir},dir);
  const clock=page.getByRole('group',{name:'Simulation clock'}).first();await clock.waitFor();
  const pause=clock.getByRole('button',{name:/Pause clock|Resume clock/});
  const before=await pause.getAttribute('aria-pressed');await pause.click();assert.notEqual(await pause.getAttribute('aria-pressed'),before);
  await clock.getByRole('button',{name:'Step 1 s'}).click();await clock.getByRole('button',{name:'Reset demo'}).click();
  assert.equal(await pause.getAttribute('data-slot'),'button');
  await page.goto(`${base}/docs/installation?kx_traffic=diagnostic`,{waitUntil:'domcontentloaded'});
  await page.evaluate(dir=>{document.documentElement.dir=dir},dir);
  await page.waitForFunction(theme=>document.documentElement.classList.contains('dark')===(theme==='dark'),theme);
  assert.equal(await page.locator('html').getAttribute('dir'),dir);
  const markdown=page.getByRole('button',{name:'Copy this page as Markdown'});await markdown.focus();await page.keyboard.press('Enter');await page.getByText('Copied',{exact:true}).first().waitFor();
  const clipboard=await page.evaluate(()=>navigator.clipboard.readText());assert(clipboard.includes('#'));
  await page.getByRole('button',{name:'Copy code',exact:true}).first().focus();await page.keyboard.press('Enter');
  await page.screenshot({path:`${out}/docs-copy-${dir}-${theme}.png`});
  rows.push({dir,theme,buttons:'clock pressed state, step/reset; keyboard Markdown and code copy succeeded'});
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:320,height:900},forcedColors:'active',reducedMotion:'reduce'});const p=await context.newPage();
 await p.goto(`${base}/docs/installation?kx_traffic=diagnostic`,{waitUntil:'domcontentloaded'});
 const copy=p.getByRole('button',{name:'Copy this page as Markdown'});await copy.focus();
 const focus=await copy.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth}));assert(focus.outline!=='none' && focus.width!=='0px');
 rows.push({forcedColors:focus});await context.close();
 fs.writeFileSync(`${out}/wave1-browser.json`,JSON.stringify(rows,null,2)+'\n');console.log('Wave 1 behavior checks passed');
} finally {await browser.close();}
