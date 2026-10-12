import * as React from "react";

/**
 * Offers line breaks inside a code reference at its natural joints — before a ".", after a "(" or "/" — so a
 * narrow column wraps `KinetixColorsSwiftUI` / `.action` instead of splitting a name mid-word.
 */
export function breakable(reference: string) {
  return reference.split(/(?=\.)|(?<=[(/])/).map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 ? <wbr /> : null}
      {part}
    </React.Fragment>
  ));
}
