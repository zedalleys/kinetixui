//
// Sheet.swift — KinetixSheet family.
//
// Mirrors packages/ui/src/components/sheet.tsx. The React `side`
// (top/bottom/left/right) collapses to **bottom only** here — the
// idiomatic mobile pattern and the only edge with a clean single
// primitive, the same deliberate scope cut the Compose port made
// (`ModalBottomSheet`). Place it in an `.overlay { }` or top-level
// `ZStack` and drive it with an `isPresented` binding; wrap the state
// change in `withAnimation` for the slide-up.
//
// Header / Title / Description / Footer are the KinetixDialog* parts
// (identical on the web).
//

import SwiftUI

public struct KinetixSheet<Content: View>: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var isPresented: Bool
    private let content: Content

    public init(isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) {
        self._isPresented = isPresented
        self.content = content()
    }

    public var body: some View {
        if isPresented {
            ZStack(alignment: .bottom) {
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture { isPresented = false }

                VStack(alignment: .leading, spacing: 16) {
                    Capsule()
                        .fill(colors.border)
                        .frame(width: 36, height: 4)
                        .frame(maxWidth: .infinity) // grabber
                    content
                }
                .padding(24) // p-6
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    colors.background,
                    in: RoundedRectangle(cornerRadius: 16, style: .continuous) // radius/xl, top corners visually
                )
                .overlay(alignment: .top) {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(colors.border, lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.2), radius: 16, y: -4)
                .ignoresSafeArea(edges: .bottom)
                .transition(.move(edge: .bottom))
            }
        }
    }
}

public typealias KinetixSheetHeader<Content: View> = KinetixDialogHeader<Content>
public typealias KinetixSheetFooter<Content: View> = KinetixDialogFooter<Content>
public typealias KinetixSheetTitle = KinetixDialogTitle
public typealias KinetixSheetDescription = KinetixDialogDescription
