/**
 * Label fallback, shared by every primitive that accepts one.
 *
 * Each primitive documents `label` as replacing its text "never removing it", and each one reached
 * that with `label ?? describeSomething(value)`. Nullish coalescing keeps the promise for `undefined`
 * and breaks it for `""`: an empty string is not nullish, so it wins, and the primitive renders a
 * badge with no words in it — a status conveyed by colour alone, or a `role="img"` with an empty
 * accessible name that assistive technology cannot report.
 *
 * That is not a hypothetical. `label={t("device.status.online")}` returns `""` from most i18n
 * libraries when a key is missing, so the failure arrives through the exact prop added for
 * translation, in the locale nobody tested.
 *
 * Whitespace is treated the same way for the same reason — `" "` names nothing — and a supplied
 * label is passed through unchanged otherwise, including its own leading and trailing spaces, since
 * trimming someone's copy is not this function's business.
 */
export function resolveLabel(label: string | undefined, fallback: string): string {
  if (typeof label !== "string") return fallback;
  return label.trim().length > 0 ? label : fallback;
}
