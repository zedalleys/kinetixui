import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--no-sandbox'] });
for (const scheme of ['light','dark']) {
  const p = await (await b.newContext({ viewport:{width:1440,height:900}, colorScheme: scheme })).newPage();
  await p.goto('http://127.0.0.1:3000/', { waitUntil:'networkidle' });
  const out=[];
  for (let i=0;i<14;i++){
    await p.keyboard.press('Tab');
    const r = await p.evaluate(()=>{ const el=document.activeElement; if(!el||el===document.body) return null;
      if(!el.closest('header')) return {skip:true};
      const cs=getComputedStyle(el); const body=getComputedStyle(document.body);
      return { label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,22),
        ring: cs.outlineStyle==='auto' ? `UA auto ${cs.outlineWidth} ${cs.outlineColor}` : `house ${cs.boxShadow.slice(0,60)}`,
        pageBg: body.backgroundColor }; });
    if(!r) break; if(r.skip) continue; out.push(r);
  }
  console.log(`--- ${scheme}: page bg ${out[0]?.pageBg}`);
  for (const r of out) console.log(`  ${r.label.padEnd(24)} ${r.ring}`);
  await p.close();
}
await b.close();
