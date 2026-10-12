import * as React from "react";

/**
 * Offers line breaks inside a code reference at its natural joints — before a ".", after a "(" or "/", and
 * between the words of a camelCase name — so a narrow column wraps `KinetixColorScheme` / `.action` as
 * `KinetixColor` / `Scheme.action` instead of splitting a word mid-letter.
 */
export function breakable(reference: string) {
  return reference.split(/(?=\.)|(?<=[(/])|(?<=[a-z])(?=[A-Z])/).map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 ? <wbr /> : null}
      {part}
    </React.Fragment>
  ));
}
