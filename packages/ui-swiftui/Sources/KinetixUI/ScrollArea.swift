//
// ScrollArea.swift — KinetixScrollArea.
//
// Mirrors packages/ui/src/components/scroll-area.tsx. Wraps SwiftUI's
// native `ScrollView` — the custom Radix scrollbar isn't reproduced (the
// system indicators take its place), the same "reuse the platform
// machinery" call the Compose port made.
//

import SwiftUI

public struct KinetixScrollArea<Content: View>: View {
    private let axes: Axis.Set
    private let showsIndicators: Bool
    private let content: Content

    public init(
        _ axes: Axis.Set = .vertical,
        showsIndicators: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self.axes = axes
        self.showsIndicators = showsIndicators
        self.content = content()
    }

    public var body: some View {
        ScrollView(axes, showsIndicators: showsIndicators) { content }
    }
}
