/**
 * The demand-evidence model for `docs/business-capabilities.json` (owner decision D-12a).
 *
 * Every capability row carries `demand: { state, signals }`. The model exists to let the inventory say
 * "nobody has looked" and "someone looked and found nothing" as first-class answers, so that an absence
 * of demand is recorded rather than filled in. Three rules do the work:
 *
 *   1. A state that claims evidence must carry it; a state that claims none must carry none.
 *   2. Both key sets are CLOSED, so no `score`, `total`, `rank` or `votes` can ever be stored. Any
 *      ordering is computed at read time from the signals, where it cannot be edited directly.
 *   3. An evidenced signal must carry provenance a reader can open, the stakeholder's own words, and a
 *      boolean separating "asked for this capability" from "described this problem".
 *
 * It lives in its own module so the rules can be tested directly — see the sibling `.test.mjs`, which
 * `pnpm check:capabilities` runs before the generator.
 */

/** The three honest positions. There is no default: every row states which one it is in. */
export const DEMAND_STATES = ["unmeasured", "unknown", "evidenced"];
export const DEMAND_SOURCES = ["interview", "issue", "discussion", "email", "inbound", "support", "sales", "other"];
export const CONFIDENCE = ["low", "medium", "high"];

/** Closed key sets. See rule 2 above: this is what makes an invented numeric score impossible. */
export const DEMAND_KEYS = new Set(["state", "signals"]);
export const SIGNAL_KEYS = new Set(["date", "source", "ref", "signal", "confidence", "askedForThisCapability", "notes"]);
export const SIGNAL_REQUIRED = ["date", "source", "ref", "signal", "confidence", "askedForThisCapability"];

/**
 * True only for a day the calendar actually has.
 *
 * `Date.parse` cannot answer this: it does not reject `2026-02-30`, it ROLLS it forward to 2 March, so a
 * date that does not exist reads as a real one. The components are compared back instead. (A four-digit
 * year below 100, such as `0026`, is also rejected, because `Date.UTC` maps it into the 1900s.)
 */
export const isRealDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() + 1 === m && t.getUTCDate() === d;
};

/**
 * Everything wrong with one row's demand block, as messages prefixed by `at`. Empty means valid.
 *
 * @param {string} at    where the row is, for the message (e.g. `B / GanttChart / Gantt`)
 * @param {object} row   the capability row
 * @param {string} today an ISO yyyy-mm-dd day; signals may not be dated after it
 */
export const demandProblems = (at, row, today) => {
  const problems = [];
  const d = row.demand;
  if (!d || typeof d !== "object" || Array.isArray(d)) return [`${at}: no demand block`];
  for (const k of Object.keys(d)) if (!DEMAND_KEYS.has(k)) problems.push(`${at}: demand key "${k}" is not part of the model`);
  if (!DEMAND_STATES.includes(d.state)) problems.push(`${at}: demand state "${d.state}"`);
  if (!Array.isArray(d.signals)) {
    problems.push(`${at}: demand.signals is not an array`);
    return problems;
  }
  // Rule 1. Either way the data cannot say one thing and hold another.
  if (d.state === "evidenced" && d.signals.length === 0)
    problems.push(`${at}: demand is "evidenced" with no signals — evidence is the thing that makes it evidenced`);
  if (d.state !== "evidenced" && d.signals.length > 0)
    problems.push(`${at}: demand is "${d.state}" but carries ${d.signals.length} signal(s) — set the state to "evidenced" or remove them`);
  d.signals.forEach((s, i) => {
    const sat = `${at}: demand.signals[${i}]`;
    if (!s || typeof s !== "object" || Array.isArray(s)) return problems.push(`${sat} is not an object`);
    for (const k of Object.keys(s)) if (!SIGNAL_KEYS.has(k)) problems.push(`${sat}: key "${k}" is not part of the model`);
    for (const k of SIGNAL_REQUIRED) if (!(k in s)) problems.push(`${sat}: missing ${k}`);
    if ("date" in s) {
      if (typeof s.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) problems.push(`${sat}: date "${s.date}" is not an ISO yyyy-mm-dd day`);
      else if (!isRealDay(s.date)) problems.push(`${sat}: date "${s.date}" is not a real calendar day`);
      else if (s.date > today) problems.push(`${sat}: date "${s.date}" is in the future`);
    }
    if ("source" in s && !DEMAND_SOURCES.includes(s.source)) problems.push(`${sat}: source "${s.source}"`);
    if ("confidence" in s && !CONFIDENCE.includes(s.confidence)) problems.push(`${sat}: confidence "${s.confidence}"`);
    // Rule 3. Both are what stop a signal being an assertion that someone wanted something.
    if ("ref" in s && (typeof s.ref !== "string" || s.ref.trim() === "")) problems.push(`${sat}: ref is empty — a signal needs a source a reader can open`);
    if ("signal" in s && (typeof s.signal !== "string" || s.signal.trim() === "")) problems.push(`${sat}: signal is empty — record what was actually said`);
    if ("askedForThisCapability" in s && typeof s.askedForThisCapability !== "boolean")
      problems.push(`${sat}: askedForThisCapability must be true or false — it separates "wanted this" from "had this problem"`);
  });
  return problems;
};
