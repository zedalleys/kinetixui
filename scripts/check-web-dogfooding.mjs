/** Source ratchet: review every new native control or direct vendor primitive.
 * Approved debts are not permission to copy them into a new file. Structural
 * HTML and code strings are deliberately outside this check. See the audit.
 *
 *   node scripts/check-web-dogfooding.mjs                    check the ledger against the source
 *   node scripts/check-web-dogfooding.mjs --write-inventory  also regenerate the descriptive inventory
 *
 * The ledger must match the source exactly: a new or growing pattern fails, and so does an approval that no
 * longer matches anything (remove or shrink it), so resolved debt cannot linger as a stale permission.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'docs/audits/website-dogfooding-exceptions.json');
const inventoryJson = path.join(root, 'docs/audits/website-dogfooding-inventory.json');
const inventoryMd = path.join(root, 'docs/audits/website-dogfooding-inventory.md');

/** A read-only `<table>` is semantic HTML (E) without review; an interactive one is caught by its controls. */
export const SEMANTIC_TABLE_REASON = 'Read-only semantic table: no selection, sorting or pagination contract; keep headers, captions and overflow access.';
const isSemanticTable = (row) => row.tag === 'table';

export function scan(directory) {
  const rows = []; const coverage = []; const library = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      if (!/\.[jt]sx?$/.test(file) || /\.(test|spec)\./.test(file)) continue;
      const rel = path.relative(root, file).replaceAll(path.sep, '/');
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      coverage.push(rel);
      const bindings = new Map();
      for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const module = statement.moduleSpecifier.text;
        const named = statement.importClause?.namedBindings;
        const own = module.startsWith('@kinetixui/');
        const vendor = module.startsWith('@radix-ui/') || module === 'cmdk';
        if (!own && !vendor) continue;
        if (named && ts.isNamedImports(named)) for (const el of named.elements) bindings.set(el.name.text, { module, own });
        if (named && ts.isNamespaceImport(named)) bindings.set(named.name.text, { module, own });
        if (statement.importClause?.name) bindings.set(statement.importClause.name.text, { module, own });
      }
      function visit(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(source);
          const props = {};
          for (const attr of node.attributes.properties) if (ts.isJsxAttribute(attr)) props[attr.name.getText(source)] = attr.initializer && ts.isStringLiteral(attr.initializer) ? attr.initializer.text : '*';
          const provenance = bindings.get(tag.split('.')[0]);
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          if (provenance?.own) library.push({ file: rel, line, tag, module: provenance.module, classification: 'A' });
          else if (provenance || /^(button|select|input|textarea|details|summary|table)$/.test(tag) || /^(tab|tablist|switch|dialog|combobox|menu|radio|radiogroup)$/.test(props.role ?? '') || Object.keys(props).some(k => /^on(Click|KeyDown|PointerDown|MouseDown)$/.test(k)) && /^[a-z]/.test(tag)) {
            const pattern = provenance ? `vendor:${provenance.module}:${tag}` : `${tag}${props.type ? `[type=${props.type}]` : ''}${props.role ? `[role=${props.role}]` : ''}`;
            rows.push({ file: rel, line, pattern, tag, props });
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  walk(directory);
  return { coverage, library, rows };
}

export function check(result, baseline) {
  const counts = new Map(); const failures = [];
  for (const row of result.rows) {
    if (isSemanticTable(row)) continue;
    const key = `${row.file}::${row.pattern}`; counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const approved = new Map(baseline.entries.map(row => [`${row.file}::${row.pattern}`, row]));
  for (const [key, count] of counts) {
    const entry = approved.get(key);
    if (!entry || !entry.reason?.trim() || !/^[BCD]$/.test(entry.classification) || count > entry.maxCount) failures.push(`${key}: ${count} occurrences; approved ${entry?.maxCount ?? 0}. Use KinetixUI or document the exception/debt in the audit.`);
  }
  for (const [key, entry] of approved) {
    const count = counts.get(key) ?? 0;
    // a missing or non-numeric maxCount would make both comparisons false and approve unlimited sites
    if (!Number.isInteger(entry.maxCount) || entry.maxCount < 1) failures.push(`${key}: maxCount must be a positive integer (the number of approved sites).`);
    else if (count < entry.maxCount) failures.push(`${key}: approved ${entry.maxCount} but ${count} remain. Debt was removed: ${count ? `shrink maxCount to ${count}` : 'delete the entry'} so it cannot be reused.`);
  }
  return failures;
}

/** Every inventoried site with its classification: A from the scan, E for semantic tables, B/C/D from the ledger. */
export function classify(result, baseline) {
  const approved = new Map(baseline.entries.map(row => [`${row.file}::${row.pattern}`, row]));
  const rows = result.rows.map((row) => {
    if (isSemanticTable(row)) return { ...row, classification: 'E', reason: SEMANTIC_TABLE_REASON };
    const entry = approved.get(`${row.file}::${row.pattern}`);
    return { ...row, classification: entry?.classification ?? '?', reason: entry?.reason ?? '' };
  });
  const totals = { A: result.library.length, B: 0, C: 0, D: 0, E: 0 };
  for (const row of rows) if (row.classification in totals) totals[row.classification]++;
  const debtFiles = [...new Set(rows.filter((r) => r.classification === 'B' || r.classification === 'C').map((r) => r.file))].sort();
  return { rows, totals, debtFiles };
}

function writeInventory(result, classified) {
  // one site per line, so a regenerated inventory diffs by site
  const list = (items) => `[\n${items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]`;
  fs.writeFileSync(inventoryJson, `{\n  "coverage": ${list(result.coverage)},\n  "library": ${list(result.library)},\n  "rows": ${list(classified.rows)}\n}\n`);
  const groups = new Map();
  for (const row of classified.rows) {
    const key = `${row.file}\u0000${row.pattern}`;
    const g = groups.get(key) ?? { ...row, sites: 0 }; g.sites++; groups.set(key, g);
  }
  const t = classified.totals;
  const lines = [
    '# Website JSX inventory',
    '',
    'Generated by `node scripts/check-web-dogfooding.mjs --write-inventory`; do not edit by hand. Counts are JSX syntax sites, not controls rendered from loops. Every imported KinetixUI component site is in the JSON companion. Test files, MDX prose/code examples and quoted snippets are not scanned.',
    '',
    `Scanned ${result.coverage.length} source files: A ${t.A} · B ${t.B} · C ${t.C} · D ${t.D} · E ${t.E} (${result.library.length + classified.rows.length} sites). B/C debt in ${classified.debtFiles.length} files.`,
    '',
    '| File | Pattern | Sites | Class | Reason |',
    '|---|---|---:|:---:|---|',
    ...[...groups.values()].sort((a, b) => a.file.localeCompare(b.file) || a.pattern.localeCompare(b.pattern)).map((g) => `| ${g.file} | ${g.pattern.replaceAll('|', '\\|')} | ${g.sites} | ${g.classification} | ${g.reason} |`),
    '',
  ];
  fs.writeFileSync(inventoryMd, lines.join('\n'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = scan(path.join(root, 'apps/web/src'));
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const failures = check(result, baseline);
  const classified = classify(result, baseline);
  const t = classified.totals;
  console.log(`Website dogfooding: ${result.coverage.length} source files; A ${t.A} · B ${t.B} · C ${t.C} · D ${t.D} · E ${t.E}; B/C debt in ${classified.debtFiles.length} files.`);
  if (process.argv.includes('--write-inventory')) {
    if (failures.length) console.error('Not writing the inventory while the ledger disagrees with the source.');
    else { writeInventory(result, classified); console.log('Wrote the inventory JSON and Markdown.'); }
  }
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
}
