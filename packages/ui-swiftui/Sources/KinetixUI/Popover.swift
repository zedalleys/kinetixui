//
// Popover.swift — KinetixPopover.
//
// Mirrors packages/ui/src/components/popover.tsx. Wraps SwiftUI's native
// `.popover(isPresented:)` — anchor-relative positioning and outside-tap
// dismissal for free, the "reuse the platform machinery" call the
// Compose port made with Material3's `DropdownMenu`. `w-72` (288) is off
// the shared spacing scale.
//
// On iOS in a compact width the system adapts `.popover` to a sheet
// (arbitrary-content popovers as true popovers need
// `.presentationCompactAdaptation`, iOS 16.4+ — above this package's iOS
// 16.0 floor) — a documented platform behaviour, not tuned here.
//

import SwiftUI

public struct KinetixPopover<Anchor: View, Content: View>: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var isPresented: Bool
    @State private var presentation: Presentation = .idle
    private let anchor: Anchor
    private let popoverContent: Content

    public init(
        isPresented: Binding<Bool>,
        @ViewBuilder anchor: () -> Anchor,
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self.anchor = anchor()
        self.popoverContent = content()
    }

    public var body: some View {
        anchor
            .popover(isPresented: systemPresentation) {
                popoverContent
                    .padding(16) // spacing/4
                    .frame(minWidth: 288, alignment: .leading) // w-72
                    .background(colors.popover)
                    .onAppear {
                        if presentation == .requested { presentation = .visible }
                    }
                    .onDisappear(perform: contentDisappeared)
            }
            .onAppear { updatePresentation(isPresented) }
            .onChange(of: isPresented, perform: updatePresentation)
    }

    private enum Presentation {
        case idle, requested, visible, dismissing

        var isOpen: Bool { self == .requested || self == .visible }
    }

    private var systemPresentation: Binding<Bool> {
        Binding(get: { presentation.isOpen }, set: { open, transaction in
            guard !open, presentation.isOpen else { return }
            presentation = presentation == .visible ? .dismissing : .idle
            if isPresented { $isPresented.transaction(transaction).wrappedValue = false }
        })
    }

    private func updatePresentation(_ open: Bool) {
        switch (open, presentation) {
        case (true, .idle): presentation = .requested
        case (false, .requested): presentation = .idle
        case (false, .visible): presentation = .dismissing
        default: break
        }
    }

    private func contentDisappeared() {
        if presentation == .visible {
            // Some native dismissals remove the content before clearing the binding.
            presentation = .requested
        }
        guard presentation == .dismissing else { return }
        // SwiftUI can clear its native binding as a dismissal finishes. Wait
        // until that presentation is gone before applying a queued reopen.
        DispatchQueue.main.async {
            guard presentation == .dismissing else { return }
            presentation = .idle
            updatePresentation(isPresented)
        }
    }
}
