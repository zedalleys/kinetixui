//
// AspectRatio.swift — KinetixAspectRatio.
//
// Mirrors packages/ui/src/components/aspect-ratio.tsx, itself a bare
// re-export of Radix's `AspectRatio.Root` with no styling. SwiftUI has a
// direct built-in (`.aspectRatio`) — this just gives it a `Kinetix`-
// prefixed, content-slot API consistent with the rest of the package.
//

import SwiftUI

public struct KinetixAspectRatio<Content: View>: View {
    private let ratio: CGFloat
    private let content: Content

    public init(_ ratio: CGFloat, @ViewBuilder content: () -> Content) {
        self.ratio = ratio
        self.content = content()
    }

    public var body: some View {
        Color.clear
            .aspectRatio(ratio, contentMode: .fit)
            .overlay { content }
            .clipped()
    }
}
