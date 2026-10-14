import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { scan, check, classify } from './check-web-dogfooding.mjs';

/** Scan a throwaway source tree; the ratchet's verdicts are asserted, not just its counts. */
function withTree(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-dogfood-'));
  try {
    for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
    return fn(scan(dir));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const approve = (result, classification = 'B') =>
  ({ entries: result.rows.filter(r => r.tag !== 'table').map(r => ({ file: r.file, pattern: r.pattern, maxCount: result.rows.filter(x => x.file === r.file && x.pattern === r.pattern).length, classification, reason: 'Pending migration with focus coverage' })) });

test('ratchet distinguishes actual JSX from snippets, library components and structural HTML', () => withTree({
  'surface.tsx': 'import { Button as Action } from "@kinetixui/ui"; import * as D from "@radix-ui/react-dialog"; const code = "<button>example</button>"; export const View = () => <section><Action>Save</Action><D.Root/><button type="button">Local</button></section>',
  'surface.test.tsx': 'const fixture = <input/>',
  'notes.mdx': '# Notes\n\n```tsx\n<button onClick={go}>Example</button>\n<select />\n```\n',
}, (result) => {
  assert.equal(result.library.length, 1); assert.equal(result.coverage.length, 1); assert.equal(result.rows.length, 2);
  assert.equal(check(result, { entries: [] }).length, 2);
  const baseline = approve(result);
  assert.deepEqual(check(result, baseline), []);
  assert.equal(check({ rows: [...result.rows, result.rows[0]] }, baseline).length, 1, 'growth beyond the approval fails');
  baseline.entries[0].reason = ''; assert.equal(check(result, baseline).length, 1, 'an entry needs a reviewed reason');
}));

test('negative controls: a new raw button, raw select or direct Radix/cmdk primitive fails with no ledger entry', () => {
  for (const [name, body, pattern] of [
    ['button.tsx', 'export const V = () => <button type="button" onClick={() => {}}>Save</button>', 'button[type=button]'],
    ['select.tsx', 'export const V = () => <select defaultValue="a"><option>a</option></select>', 'select'],
    ['radix.tsx', 'import * as Tabs from "@radix-ui/react-tabs"; export const V = () => <Tabs.Root><Tabs.List/></Tabs.Root>', 'vendor:@radix-ui/react-tabs:Tabs.Root'],
    ['cmdk.tsx', 'import { Command } from "cmdk"; export const V = () => <Command/>', 'vendor:cmdk:Command'],
  ]) withTree({ [name]: body }, (result) => {
    const failures = check(result, { entries: [] });
    assert.ok(failures.some(f => f.includes(pattern)), `${name}: expected a failure for ${pattern}, got ${failures.join(' | ')}`);
  });
});

test('a library component, structural HTML and a read-only table pass without any ledger entry', () => withTree({
  'ok.tsx': 'import { Button, NativeSelect } from "@kinetixui/ui"; export const V = () => <main><nav><ul><li><a href="/">Home</a></li></ul></nav><Button>Go</Button><NativeSelect/><table><thead><tr><th>Token</th></tr></thead></table></main>',
}, (result) => {
  assert.deepEqual(check(result, { entries: [] }), []);
  const { totals } = classify(result, { entries: [] });
  assert.equal(totals.A, 2); assert.equal(totals.E, 1);
}));

test('a stale or oversized approval fails, so resolved debt cannot stay as a permission', () => withTree({
  'view.tsx': 'export const V = () => <div><button type="button" onClick={() => {}}>One</button></div>',
}, (result) => {
  const baseline = approve(result);
  baseline.entries[0].maxCount = 3;
  assert.match(check(result, baseline).join('\n'), /approved 3 but 1 remain/);
  baseline.entries.push({ file: 'gone.tsx', pattern: 'select', maxCount: 1, classification: 'B', reason: 'Old debt' });
  assert.match(check(result, baseline).join('\n'), /gone\.tsx::select: approved 1 but 0 remain\. .*delete the entry/);
}));

test('documented D exceptions pass; classifications come from the ledger', () => withTree({
  'disclosure.tsx': 'export const V = () => <details><summary>More</summary><p>Body</p></details>',
}, (result) => {
  const baseline = approve(result, 'D');
  assert.deepEqual(check(result, baseline), []);
  assert.equal(classify(result, baseline).totals.D, 2);
  baseline.entries[0].classification = 'A';
  assert.equal(check(result, baseline).length, 1, 'only B, C or D may be approved in the ledger');
}));
