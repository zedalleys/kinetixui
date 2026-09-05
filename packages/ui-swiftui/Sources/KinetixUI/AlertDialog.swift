//
// AlertDialog.swift — KinetixAlertDialog family.
//
// Mirrors packages/ui/src/components/alert-dialog.tsx: a KinetixDialog
// with no dismiss affordance (`dismissible: false`) — the user must pick
// an explicit action. Content chrome reuses the KinetixDialog* header /
// title / description / footer parts (the React AlertDialog* parts are
// near-identical). `KinetixAlertDialogAction` / `Cancel` are thin
// KinetixButton wrappers, matching the source's `buttonVariants` recipes
// (Primary / Outline).
//

import SwiftUI

public struct KinetixAlertDialog<Content: View>: View {
    @Binding private var isPresented: Bool
    private let content: Content

    public init(isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) {
        self._isPresented = isPresented
        self.content = content()
    }

    public var body: some View {
        KinetixDialog(isPresented: $isPresented, dismissible: false) { content }
    }
}

public struct KinetixAlertDialogAction: View {
    private let title: String
    private let action: () -> Void

    public init(_ title: String, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        KinetixButton(action: action) { Text(title) }
    }
}

public struct KinetixAlertDialogCancel: View {
    private let title: String
    private let action: () -> Void

    public init(_ title: String = "Cancel", action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        KinetixButton(variant: .outline, action: action) { Text(title) }
    }
}
