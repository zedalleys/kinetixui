//
// Separator.swift — KinetixSeparator.
//
// Mirrors packages/ui/src/components/separator.tsx (`bg-border`, 1px
// thick, full-length on its own axis). Decorative — same as the Radix
// source's default.
//

import SwiftUI

public enum KinetixSeparatorOrientation {
    case horizontal, vertical
}

public struct KinetixSeparator: View {
    @Environment(\.kinetixColors) private var colors

    private let orientation: KinetixSeparatorOrientation

    public init(orientation: KinetixSeparatorOrientation = .horizontal) {
        self.orientation = orientation
    }

    public var body: some View {
        Rectangle()
            .fill(colors.border)
            .frame(width: orientation == .vertical ? 1 : nil)
            .frame(height: orientation == .horizontal ? 1 : nil)
            .frame(
                maxWidth: orientation == .horizontal ? .infinity : nil,
                maxHeight: orientation == .vertical ? .infinity : nil
            )
            .accessibilityHidden(true)
    }
}
