/** Source ratchet: review every new native control or direct vendor primitive.
 * Approved debts are not permission to copy them into a new file. Structural
 * HTML and code strings are deliberately outside this check. See the audit.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'docs/audits/website-dogfooding-exceptions.json');
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
  for (const row of result.rows) { const key = `${row.file}::${row.pattern}`; counts.set(key, (counts.get(key) ?? 0) + 1); }
  const approved = new Map(baseline.entries.map(row => [`${row.file}::${row.pattern}`, row]));
  for (const [key, count] of counts) {
    const entry = approved.get(key);
    if (!entry || !entry.reason?.trim() || !/^[BCDE]$/.test(entry.classification) || count > entry.maxCount) failures.push(`${key}: ${count} occurrences; approved ${entry?.maxCount ?? 0}. Use KinetixUI or document the exception/debt in the audit.`);
  }
  return failures;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = scan(path.join(root, 'apps/web/src'));
  const failures = check(result, JSON.parse(fs.readFileSync(baselinePath, 'utf8')));
  console.log(`Website dogfooding: ${result.coverage.length} source files; ${result.library.length} library JSX sites; ${result.rows.length} reviewed native/vendor sites.`);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
}
