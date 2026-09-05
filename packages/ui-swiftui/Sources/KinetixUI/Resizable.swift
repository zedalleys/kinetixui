//
// Resizable.swift — KinetixResizablePanels.
//
// Mirrors packages/ui/src/components/resizable.tsx (a themed wrapper over
// react-resizable-panels). Scoped to exactly **two** horizontal panels —
// the same deliberately narrowed scope the Compose port took (the common
// case; avoids reimplementing an N-panel size-redistribution algorithm).
// The split fraction is a `DragGesture` on the handle, clamped by
// `minFraction` / `maxFraction` ("caller sets the bounds", same as
// KinetixNumberInput's min/max).
//

import SwiftUI

public struct KinetixResizablePanels<First: View, Second: View>: View {
    @Environment(\.kinetixColors) private var colors

    @State private var fraction: CGFloat
    @State private var dragStart: CGFloat?
    private let minFraction: CGFloat
    private let maxFraction: CGFloat
    private let first: First
    private let second: Second

    public init(
        initialFraction: CGFloat = 0.5,
        minFraction: CGFloat = 0.15,
        maxFraction: CGFloat = 0.85,
        @ViewBuilder first: () -> First,
        @ViewBuilder second: () -> Second
    ) {
        self._fraction = State(initialValue: initialFraction)
        self.minFraction = minFraction
        self.maxFraction = maxFraction
        self.first = first()
        self.second = second()
    }

    public var body: some View {
        GeometryReader { geo in
            let handleWidth: CGFloat = 12
            let available = max(1, geo.size.width - handleWidth)
            let firstWidth = max(0, available * fraction)

            HStack(spacing: 0) {
                first.frame(width: firstWidth)

                ZStack {
                    Rectangle().fill(colors.border).frame(width: 1)
                    Image(systemName: "ellipsis")
                        .font(.system(size: 12))
                        .foregroundStyle(colors.mutedForeground)
                        .rotationEffect(.degrees(90))
                        .frame(width: handleWidth)
                        .background(colors.background)
                }
                .frame(width: handleWidth)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            let start = dragStart ?? fraction
                            if dragStart == nil { dragStart = fraction }
                            let delta = value.translation.width / available
                            fraction = min(max(start + delta, minFraction), maxFraction)
                        }
                        .onEnded { _ in dragStart = nil }
                )

                second.frame(width: max(0, available - firstWidth))
            }
        }
    }
}
