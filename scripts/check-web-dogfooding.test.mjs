import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { scan, check } from './check-web-dogfooding.mjs';
test('ratchet distinguishes actual JSX from snippets, library components and structural HTML', () => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-dogfood-'));
 try {
  fs.writeFileSync(path.join(dir, 'surface.tsx'), 'import { Button as Action } from "@kinetixui/ui"; import * as D from "@radix-ui/react-dialog"; const code = "<button>example</button>"; export const View = () => <section><Action>Save</Action><D.Root/><button type="button">Local</button></section>');
  fs.writeFileSync(path.join(dir, 'surface.test.tsx'), 'const fixture = <input/>');
  const result = scan(dir);
  assert.equal(result.library.length, 1); assert.equal(result.coverage.length, 1); assert.equal(result.rows.length, 2);
  assert.equal(check(result, { entries: [] }).length, 2);
  const entries = result.rows.map(r => ({ file: r.file, pattern: r.pattern, maxCount: 1, classification: 'B', reason: 'Pending migration with focus coverage' }));
  assert.deepEqual(check(result, { entries }), []);
  assert.equal(check({ rows: [...result.rows, result.rows[0]] }, { entries }).length, 1);
  assert.deepEqual(check({ rows: [] }, { entries }), []);
  entries[0].reason = ''; assert.equal(check(result, { entries }).length, 1);
 } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
