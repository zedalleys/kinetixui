//
// Label.swift — KinetixLabel.
//
// Mirrors packages/ui/src/components/label.tsx (`text-sm font-medium
// leading-none`). `color` defaults to the theme `foreground` but is
// overridable — a field wrapper switches it to `destructive` on an
// invalid control, mirroring the React `invalid && "text-destructive"`.
//

import SwiftUI

public struct KinetixLabel: View {
    @Environment(\.kinetixColors) private var colors

    private let text: String
    private let color: Color?

    public init(_ text: String, color: Color? = nil) {
        self.text = text
        self.color = color
    }

    public var body: some View {
        Text(text)
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(color ?? colors.foreground)
    }
}
