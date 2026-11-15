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
    @Environment(\.layoutDirection) private var layoutDirection
    @Environment(\.scenePhase) private var scenePhase
    @Namespace private var resizeSpace

    @State private var fraction: CGFloat
    @GestureState private var dragTranslation: CGFloat?
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
            let displayedFraction = dragTranslation.map { resizedFraction(by: $0, available: available) } ?? fraction
            let firstWidth = max(0, available * displayedFraction)

            HStack(spacing: 0) {
                first.frame(width: firstWidth)

                ZStack {
                    Rectangle().fill(colors.border).frame(width: 1)
                    Image(systemName: "ellipsis")
                        .font(.kinetixBodySm)
                        .foregroundStyle(colors.mutedForeground)
                        .rotationEffect(.degrees(90))
                        .frame(width: handleWidth)
                        .background(colors.background)
                }
                .frame(width: handleWidth)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(coordinateSpace: .named(resizeSpace))
                        .updating($dragTranslation) { value, translation, _ in
                            translation = value.translation.width
                        }
                        .onEnded { value in
                            guard scenePhase == .active else { return }
                            fraction = resizedFraction(by: value.translation.width, available: available)
                        },
                    including: scenePhase == .active ? .all : .none
                )

                second.frame(width: max(0, available - firstWidth))
            }
            .coordinateSpace(name: resizeSpace)
        }
    }

    private func resizedFraction(by physicalTranslation: CGFloat, available: CGFloat) -> CGFloat {
        Self.resizedFraction(
            start: fraction,
            physicalTranslation: physicalTranslation,
            available: available,
            layoutDirection: layoutDirection,
            minFraction: minFraction,
            maxFraction: maxFraction
        )
    }

    // The drag stays in the container's physical coordinates while the first panel
    // occupies the logical leading side. The handle itself moves during the drag.
    static func resizedFraction(
        start: CGFloat,
        physicalTranslation: CGFloat,
        available: CGFloat,
        layoutDirection: LayoutDirection,
        minFraction: CGFloat,
        maxFraction: CGFloat
    ) -> CGFloat {
        let growth = layoutDirection == .rightToLeft ? -physicalTranslation : physicalTranslation
        return min(max(start + growth / available, minFraction), maxFraction)
    }
}
