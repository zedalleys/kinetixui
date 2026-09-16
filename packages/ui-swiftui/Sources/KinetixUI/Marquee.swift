//
// Marquee.swift — KinetixMarquee.
//
// Mirrors packages/ui/src/components/marquee.tsx: an auto-scrolling
// horizontal ticker (logo strip, testimonials). Renders `content` twice
// side by side, measures the first copy's width via a `PreferenceKey`,
// then animates a `-width` offset on a `.linear(duration:).repeatForever`
// loop — the same "duplicate + shift by one content-width" technique as
// the web version, since SwiftUI has no CSS keyframe to lean on. The
// duplicate copy is `.accessibilityHidden`, same fix as the web port.
// `pauseOnHover` isn't ported — hover isn't a primary iOS interaction,
// unlike the web (and desktop-pointer) case it's built for.
//

import SwiftUI

private struct MarqueeWidthKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        let next = nextValue()
        if next > 0 { value = next }
    }
}

public struct KinetixMarquee<Content: View>: View {
    private let durationSeconds: Double
    private let content: Content

    @State private var contentWidth: CGFloat = 0
    @State private var offset: CGFloat = 0

    public init(durationSeconds: Double = 32, @ViewBuilder content: () -> Content) {
        self.durationSeconds = durationSeconds
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 0) {
            content
                .fixedSize()
                .background(
                    GeometryReader { proxy in
                        Color.clear.preference(key: MarqueeWidthKey.self, value: proxy.size.width)
                    }
                )
            content
                .fixedSize()
                .accessibilityHidden(true)
        }
        .offset(x: offset)
        .onPreferenceChange(MarqueeWidthKey.self) { width in
            guard width > 0, contentWidth == 0 else { return }
            contentWidth = width
            withAnimation(.linear(duration: durationSeconds).repeatForever(autoreverses: false)) {
                offset = -width
            }
        }
        .clipped()
        .mask(
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0),
                    .init(color: .black, location: 0.08),
                    .init(color: .black, location: 0.92),
                    .init(color: .clear, location: 1),
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
    }
}
