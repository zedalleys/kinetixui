//
// Popover.swift — KinetixPopover.
//
// Mirrors packages/ui/src/components/popover.tsx. Wraps SwiftUI's native
// `.popover(isPresented:)` — anchor-relative positioning and outside-tap
// dismissal for free, the "reuse the platform machinery" call the
// Compose port made with Material3's `DropdownMenu`. `w-72` (288) is off
// the shared spacing scale.
//
// On iOS in a compact width the system adapts `.popover` to a sheet
// (arbitrary-content popovers as true popovers need
// `.presentationCompactAdaptation`, iOS 16.4+ — above this package's iOS
// 16.0 floor) — a documented platform behaviour, not tuned here.
//

import SwiftUI

public struct KinetixPopover<Anchor: View, Content: View>: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var isPresented: Bool
    private let anchor: Anchor
    private let popoverContent: Content

    public init(
        isPresented: Binding<Bool>,
        @ViewBuilder anchor: () -> Anchor,
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self.anchor = anchor()
        self.popoverContent = content()
    }

    public var body: some View {
        anchor
            .popover(isPresented: $isPresented) {
                popoverContent
                    .padding(16) // spacing/4
                    .frame(minWidth: 288, alignment: .leading) // w-72
                    .background(colors.popover)
            }
    }
}
