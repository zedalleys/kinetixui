//
// Tooltip.swift — KinetixTooltip.
//
// Mirrors packages/ui/src/components/tooltip.tsx. Wraps the content in
// SwiftUI's `.help(_:)` — the "reuse the platform machinery" call, same
// as the Compose port wrapping Material3's `TooltipBox`. On macOS this is
// a real hover tooltip; on iOS `.help` surfaces the text to
// accessibility only (no visual bubble) — a documented gap, since a
// hover-triggered tooltip has no direct touch idiom.
//

import SwiftUI

public struct KinetixTooltip<Content: View>: View {
    private let text: String
    private let content: Content

    public init(_ text: String, @ViewBuilder content: () -> Content) {
        self.text = text
        self.content = content()
    }

    public var body: some View {
        content.help(text)
    }
}
