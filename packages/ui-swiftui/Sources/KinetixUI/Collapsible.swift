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
    private let isExpanded: Bool
    private let content: Content

    public init(isExpanded: Bool, @ViewBuilder content: () -> Content) {
        self.isExpanded = isExpanded
        self.content = content()
    }

    public var body: some View {
        if isExpanded {
            content
                .transition(.opacity.combined(with: .move(edge: .top)))
        }
    }
}
