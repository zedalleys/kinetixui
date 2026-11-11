/** Pure namespaced-reference resolution, shared with the browser. */
export function resolveRef(ref, { spaces }) {
  if (typeof ref !== "string") return `reference ${JSON.stringify(ref)} is not a string`;
  const idx = ref.indexOf(":");
  if (idx < 0)
    return `"${ref}" is unprefixed — a reference must name its identifier space (${Object.keys(spaces).map((p) => `${p}:`).join(", ")})`;
  const prefix = ref.slice(0, idx);
  const id = ref.slice(idx + 1);
  const space = spaces[prefix];
  if (!space) return `"${ref}" uses the unknown prefix "${prefix}:"`;
  if (!id) return `"${ref}" names no identifier`;
  const key = space.normalise ? space.normalise(id) : id;
  if (!space.ids.has(key)) return `"${ref}" does not resolve in ${space.source}`;
  return null;
}
