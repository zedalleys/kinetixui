//
// HoverCard.swift — KinetixHoverCard.
//
// Mirrors packages/ui/src/components/hover-card.tsx. On the web it opens
// on hover; here it's the same anchored overlay as KinetixPopover with a
// caller-driven `isPresented` (wire it to `.onHover` on macOS) — the
// Compose port likewise built HoverCard on its Popover.
//

import SwiftUI

public struct KinetixHoverCard<Anchor: View, Content: View>: View {
    @Binding private var isPresented: Bool
    private let anchor: Anchor
    private let cardContent: Content

    public init(
        isPresented: Binding<Bool>,
        @ViewBuilder anchor: () -> Anchor,
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self.anchor = anchor()
        self.cardContent = content()
    }

    public var body: some View {
        KinetixPopover(isPresented: $isPresented) {
            anchor
        } content: {
            cardContent
        }
    }
}
