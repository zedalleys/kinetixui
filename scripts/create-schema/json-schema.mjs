/**
 * json-schema.mjs — a dependency-free interpreter for the subset of JSON Schema 2020-12 that
 * docs/create/create-project.schema.json uses.
 *
 * Why an interpreter rather than a hand-written validator: the schema file is the canonical
 * structural source. A second validator that re-expressed the same constraints in JavaScript would
 * be a derivation that has to agree with the first by hand — the shape of defect this repository's
 * architecture rules exist to prevent. This file executes the schema; it knows nothing about
 * CreateProject.
 *
 * Supported keywords: $ref (local, "#/$defs/..."), type, const, enum, properties, required,
 * additionalProperties, propertyNames, items, minItems, maxItems, minLength, maxLength, pattern,
 * minimum, maximum, oneOf, anyOf, allOf.
 *
 * Anything else in a schema is a programming error here rather than a silent pass: `validate`
 * throws on an unknown keyword, so a keyword added to the schema file without support cannot be
 * quietly ignored. check:create-schema has a negative control for exactly that.
 */

/** Keywords that carry no constraint, so they are harmless beside a $ref. */
const ANNOTATIONS = new Set(["$schema", "$id", "$defs", "title", "description", "$comment", "default", "examples"]);

const KNOWN = new Set([
  "$ref", "type", "const", "enum", "properties", "required", "additionalProperties",
  "propertyNames", "items", "minItems", "maxItems", "minLength", "maxLength", "pattern",
  "minimum", "maximum", "oneOf", "anyOf", "allOf",
  // annotations: carry no constraint
  "$schema", "$id", "$defs", "title", "description", "$comment", "default", "examples",
]);

const typeOf = (v) =>
  v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;

const matchesType = (value, t) => {
  const actual = typeOf(value);
  if (t === "number") return actual === "number" || actual === "integer";
  if (t === "object") return actual === "object";
  return actual === t;
};

const resolveRef = (root, ref) => {
  if (!ref.startsWith("#/")) throw new Error(`json-schema: only local $ref is supported, got "${ref}"`);
  let node = root;
  for (const raw of ref.slice(2).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    node = node?.[key];
    if (node === undefined) throw new Error(`json-schema: $ref "${ref}" does not resolve`);
  }
  return node;
};

/**
 * @returns {string[]} one message per violation, each prefixed with the instance path. Empty = valid.
 */
export function validate(instance, schema, { root = schema, path = "" } = {}) {
  for (const key of Object.keys(schema)) {
    if (!KNOWN.has(key)) throw new Error(`json-schema: unsupported keyword "${key}" at ${path || "<root>"}`);
  }
  const at = path || "<root>";
  const errors = [];

  if (schema.$ref) {
    // Returning early here would discard every sibling keyword silently — the one construct that
    // could pass quietly in an interpreter whose contract is that it throws instead. 2020-12 does
    // allow siblings; this interpreter does not implement merging them, so it refuses them.
    const siblings = Object.keys(schema).filter((k) => k !== "$ref" && !ANNOTATIONS.has(k));
    if (siblings.length)
      throw new Error(`json-schema: $ref with sibling keyword(s) ${siblings.join(", ")} at ${at} — merging is not implemented, so the sibling would be ignored`);
    return validate(instance, resolveRef(root, schema.$ref), { root, path });
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(instance, t)))
      return [`${at}: expected ${types.join(" or ")}, got ${typeOf(instance)}`];
  }
  if (schema.const !== undefined && JSON.stringify(instance) !== JSON.stringify(schema.const))
    errors.push(`${at}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum !== undefined && !schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(instance)))
    errors.push(`${at}: must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`);

  if (typeof instance === "string") {
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(instance))
      errors.push(`${at}: ${JSON.stringify(instance)} does not match ${schema.pattern}`);
    if (schema.minLength !== undefined && instance.length < schema.minLength)
      errors.push(`${at}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && instance.length > schema.maxLength)
      errors.push(`${at}: longer than ${schema.maxLength}`);
  }
  if (typeof instance === "number") {
    if (schema.minimum !== undefined && instance < schema.minimum) errors.push(`${at}: below ${schema.minimum}`);
    if (schema.maximum !== undefined && instance > schema.maximum) errors.push(`${at}: above ${schema.maximum}`);
  }

  if (Array.isArray(instance)) {
    if (schema.minItems !== undefined && instance.length < schema.minItems)
      errors.push(`${at}: fewer than ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && instance.length > schema.maxItems)
      errors.push(`${at}: more than ${schema.maxItems} item(s)`);
    if (schema.items)
      instance.forEach((item, i) => errors.push(...validate(item, schema.items, { root, path: `${path}[${i}]` })));
  }

  if (typeOf(instance) === "object") {
    for (const key of schema.required ?? []) if (!(key in instance)) errors.push(`${at}: missing "${key}"`);
    for (const [key, value] of Object.entries(instance)) {
      const child = `${path}.${key}`;
      if (schema.propertyNames)
        errors.push(...validate(key, schema.propertyNames, { root, path: `${path} key ${JSON.stringify(key)}` }));
      const sub = schema.properties?.[key];
      if (sub) {
        errors.push(...validate(value, sub, { root, path: child }));
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}: unknown property "${key}"`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        errors.push(...validate(value, schema.additionalProperties, { root, path: child }));
      }
    }
  }

  for (const sub of schema.allOf ?? []) errors.push(...validate(instance, sub, { root, path }));
  if (schema.anyOf && !schema.anyOf.some((sub) => validate(instance, sub, { root, path }).length === 0))
    errors.push(`${at}: matches none of the ${schema.anyOf.length} anyOf alternatives`);
  if (schema.oneOf) {
    const passing = schema.oneOf.filter((sub) => validate(instance, sub, { root, path }).length === 0).length;
    if (passing !== 1)
      errors.push(
        passing === 0
          ? `${at}: matches none of the ${schema.oneOf.length} oneOf alternatives`
          : `${at}: matches ${passing} oneOf alternatives, must match exactly one`,
      );
  }

  return errors;
}

/**
 * Walks every subschema and reports keywords this interpreter does not implement — independently of
 * any instance, because `validate` only visits the subschemas a given document reaches, so a
 * document that happens not to carry a property would leave that property's schema unchecked.
 *
 * @returns {string[]} one message per unsupported keyword. Empty = the whole schema is executable.
 */
export function assertSupported(schema, path = "<root>") {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) return [];
  const problems = [];
  for (const key of Object.keys(schema))
    if (!KNOWN.has(key)) problems.push(`json-schema: unsupported keyword "${key}" at ${path}`);
  if (schema.$ref) {
    const siblings = Object.keys(schema).filter((k) => k !== "$ref" && !ANNOTATIONS.has(k));
    if (siblings.length)
      problems.push(`json-schema: $ref with sibling keyword(s) ${siblings.join(", ")} at ${path} — merging is not implemented, so the sibling would be ignored`);
  }
  for (const container of ["properties", "$defs"])
    for (const [key, sub] of Object.entries(schema[container] ?? {}))
      problems.push(...assertSupported(sub, `${path}.${container}.${key}`));
  for (const key of ["items", "propertyNames", "additionalProperties"])
    if (schema[key] && typeof schema[key] === "object") problems.push(...assertSupported(schema[key], `${path}.${key}`));
  for (const key of ["oneOf", "anyOf", "allOf"])
    (schema[key] ?? []).forEach((sub, i) => problems.push(...assertSupported(sub, `${path}.${key}[${i}]`)));
  return problems;
}
