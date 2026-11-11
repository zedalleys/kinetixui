/** Node adapter for the canonical validator; browser/server share validate-core.mjs. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadRegistries } from "./registries.mjs";
import { validateCreateProject as validateCore } from "./validate-core.mjs";
export { SEMANTIC_CODES, MAX_JSON_DEPTH, serialize } from "./validate-core.mjs";
export const SCHEMA_PATH = "docs/create/create-project.schema.json";
export const loadSchema = () => JSON.parse(readFileSync(join(ROOT, SCHEMA_PATH), "utf8"));
export function validateCreateProject(doc, { schema = loadSchema(), registries = loadRegistries(), ...options } = {}) {
  return validateCore(doc, { schema, registries, ...options });
}
