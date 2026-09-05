//
// Skeleton.swift — KinetixSkeleton.
//
// Mirrors packages/ui/src/components/skeleton.tsx (`animate-pulse
// rounded-md bg-muted`). No intrinsic size — the caller sizes it with a
// `.frame(...)`, the same as the React version being sized by `className`.
//

import SwiftUI

public struct KinetixSkeleton: View {
    @Environment(\.kinetixColors) private var colors
    @State private var pulsed = false

    public init() {}

    public var body: some View {
        RoundedRectangle(cornerRadius: 8, style: .continuous) // radius/md
            .fill(colors.muted)
            .opacity(pulsed ? 0.5 : 1)
            .animation(
                .easeInOut(duration: 1).repeatForever(autoreverses: true),
                value: pulsed
            )
            .onAppear { pulsed = true }
    }
}
