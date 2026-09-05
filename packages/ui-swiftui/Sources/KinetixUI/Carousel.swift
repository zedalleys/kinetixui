//
// Carousel.swift — KinetixCarousel.
//
// Mirrors packages/ui/src/components/carousel.tsx (a themed wrapper over
// embla-carousel). On iOS this is a paged `TabView` — swipe paging, snap,
// page dots for free, the "reuse the platform's gesture/paging machinery"
// call. `PageTabViewStyle` doesn't exist on macOS, so there `swift build`
// gets a plain width-paged horizontal `ScrollView` fallback.
//
// `selection` is a caller-owned page index — drive your own prev/next
// controls off it.
//

import SwiftUI

public struct KinetixCarousel<Content: View>: View {
    @Binding private var selection: Int
    private let count: Int
    private let content: (Int) -> Content

    public init(
        selection: Binding<Int>,
        count: Int,
        @ViewBuilder content: @escaping (Int) -> Content
    ) {
        self._selection = selection
        self.count = count
        self.content = content
    }

    public var body: some View {
        #if os(iOS)
        TabView(selection: $selection) {
            ForEach(0..<count, id: \.self) { i in
                content(i).tag(i)
            }
        }
        .tabViewStyle(.page)
        #else
        GeometryReader { geo in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 0) {
                    ForEach(0..<count, id: \.self) { i in
                        content(i).frame(width: geo.size.width)
                    }
                }
            }
        }
        #endif
    }
}
