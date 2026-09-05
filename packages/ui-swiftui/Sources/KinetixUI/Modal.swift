//
// Modal.swift — KinetixModal.
//
// Mirrors packages/ui/src/components/modal.tsx, a Dialog recipe with a
// required title and a corner close. Built from KinetixDialog + the
// KinetixDialog* header parts (same call as the Compose port's
// `KinetixModal` from `KinetixDialog` + `KinetixButton`).
//

import SwiftUI

public struct KinetixModal<Content: View>: View {
    @Binding private var isPresented: Bool
    private let title: String
    private let content: Content

    public init(isPresented: Binding<Bool>, title: String, @ViewBuilder content: () -> Content) {
        self._isPresented = isPresented
        self.title = title
        self.content = content()
    }

    public var body: some View {
        KinetixDialog(isPresented: $isPresented) {
            KinetixDialogHeader {
                KinetixDialogTitle(title)
            }
            content
        }
    }
}
