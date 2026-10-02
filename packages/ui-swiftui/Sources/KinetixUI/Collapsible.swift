//
// Collapsible.swift — KinetixCollapsible.
//
// Mirrors packages/ui/src/components/collapsible.tsx, itself a bare
// re-export of Radix's Collapsible whose only real contribution is the
// show/hide animation. The caller owns their own toggle control and
// passes its state through as `isExpanded` — same call as the Compose
// port.
//

import SwiftUI

public struct KinetixCollapsible<Content: View>: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let isExpanded: Bool
    private let content: Content

    public init(isExpanded: Bool, @ViewBuilder content: () -> Content) {
        self.isExpanded = isExpanded
        self.content = content()
    }

    public var body: some View {
        // `Group` is layout-neutral, and it is here so the animation modifier can live OUTSIDE the
        // conditional. Attached inside it, the modifier was removed along with the branch on the way
        // out: a collapse got no animation at all, and `.expanding` was hardcoded, so the resolver's
        // exit curve was unreachable from this view. The direction now follows the state.
        Group {
            if isExpanded {
                content
                    .transition(KinetixDisclosureMotion.transition(reduceMotion: reduceMotion))
            }
        }
        .animation(
            KinetixDisclosureMotion.animation(isExpanded ? .expanding : .collapsing, reduceMotion: reduceMotion),
            value: isExpanded
        )
    }
}
