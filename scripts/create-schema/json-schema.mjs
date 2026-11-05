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

/**
 * A schema is parsed JSON, so every key it declares is an OWN property. Reading one with plain
 * indexing also reaches `Object.prototype`, which is not a declaration: `properties.constructor`
 * answers with a function nobody wrote. Every lookup keyed by document data goes through this.
 */
const own = (object, key) =>
  object !== null && typeof object === "object" && Object.hasOwn(object, key) ? object[key] : undefined;

const resolveRef = (root, ref) => {
  if (!ref.startsWith("#/")) throw new Error(`json-schema: only local $ref is supported, got "${ref}"`);
  let node = root;
  for (const raw of ref.slice(2).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    node = own(node, key);
    if (node === undefined) throw new Error(`json-schema: $ref "${ref}" does not resolve`);
  }
  return node;
};

/**
 * How expensive a value is to validate. Under `failFast` the cheap members of an object are visited
 * first, so an alternative that is going to fail on a scalar — a `kind` that does not match — fails
 * before anything recurses into its `children`. It reorders nothing a caller can observe, because
 * `failFast` is only ever used to answer "does this branch have zero errors".
 */
const costOf = (value) => (value !== null && typeof value === "object" ? 1 : 0);

/**
 * How many subschema evaluations the last run cost. A measurement seam, not a cache and not a
 * constraint: it is written and never read by validation itself. check:create-schema resets it and
 * compares two document depths, so the proof that branch work stays linear in document size is a
 * deterministic count rather than a wall-clock assertion that a loaded CI machine could flip.
 */
export const counters = { visits: 0 };

/**
 * @param failFast stop at the first violation. Set only where the caller needs the VERDICT and not
 *   the list — `anyOf` and `oneOf`, which ask "exactly how many alternatives have zero errors". This
 *   is what keeps a recursive schema from costing exponential work: `oneOf` must evaluate every
 *   alternative, and without the early exit each one walks the same `children` subtree again.
 *   Measured before this fix, all accepted and all far inside MAX_JSON_DEPTH: a legal chain of 12
 *   nested slot nodes took 2.5 s and one of 14 took 25.6 s, about 8x per level. No result is cached
 *   and no partial verdict is reused: a failed branch simply stops doing work it cannot need.
 * @returns {string[]} one message per violation, each prefixed with the instance path. Empty = valid.
 */
export function validate(instance, schema, { root = schema, path = "", failFast = false } = {}) {
  counters.visits += 1;
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
    return validate(instance, resolveRef(root, schema.$ref), { root, path, failFast });
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
  if (failFast && errors.length) return errors;

  if (typeof instance === "string") {
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(instance))
      errors.push(`${at}: ${JSON.stringify(instance)} does not match ${schema.pattern}`);
    if (schema.minLength !== undefined && instance.length < schema.minLength)
      errors.push(`${at}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && instance.length > schema.maxLength)
      errors.push(`${at}: longer than ${schema.maxLength}`);
    if (failFast && errors.length) return errors;
  }
  if (typeof instance === "number") {
    if (schema.minimum !== undefined && instance < schema.minimum) errors.push(`${at}: below ${schema.minimum}`);
    if (schema.maximum !== undefined && instance > schema.maximum) errors.push(`${at}: above ${schema.maximum}`);
    if (failFast && errors.length) return errors;
  }

  if (Array.isArray(instance)) {
    if (schema.minItems !== undefined && instance.length < schema.minItems)
      errors.push(`${at}: fewer than ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && instance.length > schema.maxItems)
      errors.push(`${at}: more than ${schema.maxItems} item(s)`);
    if (failFast && errors.length) return errors;
    if (schema.items)
      for (const [i, item] of instance.entries()) {
        errors.push(...validate(item, schema.items, { root, path: `${path}[${i}]`, failFast }));
        if (failFast && errors.length) return errors;
      }
  }

  if (typeOf(instance) === "object") {
    for (const key of schema.required ?? []) if (!(key in instance)) errors.push(`${at}: missing "${key}"`);
    if (failFast && errors.length) return errors;
    const entries = Object.entries(instance);
    // Scalars first under failFast: a `kind` that does not match this alternative is the cheapest
    // possible rejection, and taking it first is what stops the walk into `children`.
    if (failFast) entries.sort((a, b) => costOf(a[1]) - costOf(b[1]));
    for (const [key, value] of entries) {
      const child = `${path}.${key}`;
      if (schema.propertyNames)
        errors.push(...validate(key, schema.propertyNames, { root, path: `${path} key ${JSON.stringify(key)}`, failFast }));
      // `own`, not `schema.properties?.[key]`: a document key of "constructor", "toString" or
      // "hasOwnProperty" would otherwise find an inherited JavaScript member, be treated as a
      // DECLARED property, and sail past `additionalProperties: false`. Measured before this fix: a
      // root-level `"constructor": {"injected": true}` was ACCEPTED. `__proto__` is an own property
      // on a JSON.parse result, so it lands here too and is reported as undeclared.
      const sub = own(schema.properties, key);
      if (sub !== undefined) {
        errors.push(...validate(value, sub, { root, path: child, failFast }));
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}: unknown property "${key}"`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        errors.push(...validate(value, schema.additionalProperties, { root, path: child, failFast }));
      }
      if (failFast && errors.length) return errors;
    }
  }

  for (const sub of schema.allOf ?? []) {
    errors.push(...validate(instance, sub, { root, path, failFast }));
    if (failFast && errors.length) return errors;
  }
  // `failFast` here, and only here: both branches read `.length === 0` and discard the messages, so
  // stopping a branch at its first violation cannot change the verdict — it only stops the branch
  // from descending into children it has already disqualified itself from matching.
  if (schema.anyOf && !schema.anyOf.some((sub) => validate(instance, sub, { root, path, failFast: true }).length === 0))
    errors.push(`${at}: matches none of the ${schema.anyOf.length} anyOf alternatives`);
  if (failFast && errors.length) return errors;
  if (schema.oneOf) {
    const passing = schema.oneOf.filter((sub) => validate(instance, sub, { root, path, failFast: true }).length === 0).length;
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
