//
// Drawer.swift — KinetixDrawer.
//
// Mirrors packages/ui/src/components/drawer.tsx (a vaul bottom drawer
// with a drag handle). Functionally identical to KinetixSheet here, so
// it's a thin pass-through — the same call the Compose port made
// (`KinetixDrawer` → `KinetixSheet`). `shouldScaleBackground` has no
// SwiftUI equivalent and is dropped.
//

import SwiftUI

public struct KinetixDrawer<Content: View>: View {
    @Binding private var isPresented: Bool
    private let content: Content

    public init(isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) {
        self._isPresented = isPresented
        self.content = content()
    }

    public var body: some View {
        KinetixSheet(isPresented: $isPresented) { content }
    }
}

public typealias KinetixDrawerHeader<Content: View> = KinetixDialogHeader<Content>
public typealias KinetixDrawerFooter<Content: View> = KinetixDialogFooter<Content>
public typealias KinetixDrawerTitle = KinetixDialogTitle
public typealias KinetixDrawerDescription = KinetixDialogDescription
