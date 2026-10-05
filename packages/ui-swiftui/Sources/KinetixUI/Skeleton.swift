//
// Skeleton.swift — KinetixSkeleton.
//
// Mirrors packages/ui/src/components/skeleton.tsx (`animate-pulse
// rounded-md bg-muted`). No intrinsic size — the caller sizes it with a
// `.frame(...)`, the same as the React version being sized by `className`.
//
// With Reduce Motion on the placeholder rests at full opacity (KinetixLoopMotion), which is React's
// `motion-reduce:animate-none`.
//

import SwiftUI

public struct KinetixSkeleton: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.kinetixRadii) private var radii
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulsed = false

    public init() {}

    public var body: some View {
        RoundedRectangle(cornerRadius: radii.control, style: .continuous) // radius/md
            .fill(colors.muted)
            .opacity(pulsed && !reduceMotion ? 0.5 : 1)
            .animation(
                KinetixLoopMotion.loop(
                    .easeInOut(duration: KinetixLoopMotion.skeletonHalfCycleSeconds),
                    reduceMotion: reduceMotion,
                    autoreverses: true
                ),
                value: pulsed
            )
            .onAppear { pulsed = true }
    }
}
