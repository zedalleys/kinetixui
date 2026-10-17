/**
 * Ranking for the command menu (⌘K), as cmdk's `filter`. An item passes `keywords` as
 *
 *   [title, ...terms, describe(description)]
 *
 * where `terms` are verified keywords (category, business context, aliases) and the optional last entry, marked by
 * `describe`, is its description. Tiers, highest first — a deterministic order with no fuzzy-search dependency:
 *
 *   1    the title is the query
 *   0.9  the title starts with it
 *   0.8  a word of the title starts with it
 *   0.7  the title contains it
 *   0.6  every word of the query is in the title
 *   0.4  every word is in the title or a keyword
 *   0.2  every word is in the title, a keyword or the description
 *   0.1  the query's letters appear in the title in order ("btn" → Button, "dlg" → Dialog): the abbreviation
 *        matching cmdk's default scorer gave before, kept as the lowest tier so no title that used to match stops
 *   0    hidden
 *
 * So an exact component name always beats a block or use case that only mentions it, and a word that appears only in
 * a description never outranks a keyword match.
 */
const DESCRIPTION = "\u0000description:";

/** Mark a description so `rankCommand` gives it the lowest tier. */
export const describe = (text: string) => `${DESCRIPTION}${text}`;

export const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function rankCommand(value: string, search: string, keywords: string[] = []): number {
  const q = normalise(search);
  if (!q) return 1;
  const title = normalise(keywords[0] ?? value);
  if (title === q) return 1;
  if (title.startsWith(q)) return 0.9;
  const titleWords = title.split(/[\s/&·,()-]+/).filter(Boolean);
  if (titleWords.some((w) => w.startsWith(q))) return 0.8;
  if (title.includes(q)) return 0.7;
  const tokens = q.split(" ");
  if (tokens.every((t) => title.includes(t))) return 0.6;
  const rest = keywords.slice(1);
  const terms = normalise([title, ...rest.filter((k) => !k.startsWith(DESCRIPTION))].join(" "));
  if (tokens.every((t) => terms.includes(t))) return 0.4;
  const all = normalise([terms, ...rest.filter((k) => k.startsWith(DESCRIPTION)).map((k) => k.slice(DESCRIPTION.length))].join(" "));
  if (tokens.every((t) => all.includes(t))) return 0.2;
  return inOrder(q.replace(/ /g, ""), title) ? 0.1 : 0;
}

/** Whether every character of `q` appears in `s`, in order. */
function inOrder(q: string, s: string): boolean {
  let i = 0;
  for (const ch of s) if (ch === q[i] && ++i === q.length) return true;
  return q.length === 0;
}
