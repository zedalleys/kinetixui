//
// Progress.swift — KinetixProgress.
//
// Mirrors packages/ui/src/components/progress.tsx (Radix `Progress`:
// `h-2 w-full rounded-full bg-muted` track, `bg-primary` indicator). The
// indicator is sized directly as a fraction of the track width rather
// than offset with a translate — the idiomatic, RTL-safe SwiftUI form,
// same call as the Compose port.
//

import SwiftUI

public struct KinetixProgress: View {
    @Environment(\.kinetixColors) private var colors

    /// 0…100, same scale as the React `value` prop.
    private let value: Double

    public init(value: Double) {
        self.value = value
    }

    public var body: some View {
        let fraction = CGFloat(max(0, min(1, value / 100)))
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(colors.muted)
                Capsule()
                    .fill(colors.primary)
                    .frame(width: geo.size.width * fraction)
            }
        }
        .frame(height: 8) // h-2
        .animation(.default, value: value)
        .accessibilityValue("\(Int(fraction * 100)) percent")
    }
}
