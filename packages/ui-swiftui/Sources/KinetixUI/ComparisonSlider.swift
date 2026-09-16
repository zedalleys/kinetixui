//
// ComparisonSlider.swift — KinetixComparisonSlider.
//
// Mirrors packages/ui/src/components/comparison-slider.tsx: a drag
// handle wiping between two stacked layers. Unlike KinetixSlider (which
// wraps the system Slider), this needs a fully custom visual, so it's
// built on a plain DragGesture over a GeometryReader-measured width —
// the "after" layer is masked with a transparent-then-opaque HStack
// (rather than the alignment-parameterized `.mask`, to avoid an
// availability question) instead of Compose's `clipRect` or the web's
// CSS `clip-path`. Only dragging the handle is supported — the web
// version's Radix Slider also lets you click anywhere on the track to
// jump, a documented scope-down, not a silent gap.
//

import SwiftUI

public struct KinetixComparisonSlider<Before: View, After: View>: View {
    @Environment(\.kinetixColors) private var colors

    private let before: Before
    private let after: After
    private let beforeLabel: String?
    private let afterLabel: String?
    private let externalValue: Binding<Double>?

    @State private var internalValue: Double

    public init(
        value: Binding<Double>? = nil,
        defaultValue: Double = 50,
        beforeLabel: String? = nil,
        afterLabel: String? = nil,
        @ViewBuilder before: () -> Before,
        @ViewBuilder after: () -> After
    ) {
        self.externalValue = value
        self._internalValue = State(initialValue: value?.wrappedValue ?? defaultValue)
        self.beforeLabel = beforeLabel
        self.afterLabel = afterLabel
        self.before = before()
        self.after = after()
    }

    private var current: Double {
        externalValue?.wrappedValue ?? internalValue
    }

    private func setCurrent(_ v: Double) {
        let clamped = min(100, max(0, v))
        if let externalValue {
            externalValue.wrappedValue = clamped
        } else {
            internalValue = clamped
        }
    }

    @ViewBuilder
    private func labelChip(_ text: String) -> some View {
        Text(text)
            .font(.kinetixLabelSm)
            .foregroundStyle(colors.foreground)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(colors.background.opacity(0.8), in: RoundedRectangle(cornerRadius: 4, style: .continuous))
            .padding(8)
    }

    public var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let handleX = width * CGFloat(current / 100)

            ZStack(alignment: .topLeading) {
                before
                after
                    .mask(
                        HStack(spacing: 0) {
                            Color.clear.frame(width: handleX)
                            Color.black
                        }
                    )

                Rectangle()
                    .fill(colors.background)
                    .frame(width: 2)
                    .offset(x: handleX - 1)

                if let beforeLabel {
                    labelChip(beforeLabel)
                }
                if let afterLabel {
                    labelChip(afterLabel)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }

                Circle()
                    .fill(colors.background.opacity(0.9))
                    .overlay(Circle().strokeBorder(colors.background, lineWidth: 2))
                    .frame(width: 32, height: 32)
                    .offset(x: handleX - 16, y: proxy.size.height / 2 - 16)
                    .contentShape(Circle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { g in
                                setCurrent(Double(g.location.x / width) * 100)
                            }
                    )
            }
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .aspectRatio(16.0 / 9.0, contentMode: .fit)
    }
}
