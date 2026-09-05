//
// DatePicker.swift — KinetixDatePicker.
//
// Mirrors packages/ui/src/components/date-picker.tsx (a Popover +
// Calendar recipe). Wraps SwiftUI's native `DatePicker` themed with
// `.tint` — the "reuse the platform control" call, same as the Compose
// port wrapping Material3's `DatePicker`. `.compact` shows a field that
// opens a calendar popover; `.graphical` shows the calendar inline.
//

import SwiftUI

public enum KinetixDatePickerStyle {
    case compact, graphical
}

public struct KinetixDatePicker: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var selection: Date
    private let label: String
    private let displayedComponents: DatePickerComponents
    private let style: KinetixDatePickerStyle

    public init(
        _ label: String = "",
        selection: Binding<Date>,
        displayedComponents: DatePickerComponents = [.date],
        style: KinetixDatePickerStyle = .compact
    ) {
        self._selection = selection
        self.label = label
        self.displayedComponents = displayedComponents
        self.style = style
    }

    private var base: some View {
        DatePicker(label, selection: $selection, displayedComponents: displayedComponents)
            .tint(colors.primary)
    }

    public var body: some View {
        switch style {
        case .compact:
            base.datePickerStyle(.compact)
        case .graphical:
            base.datePickerStyle(.graphical)
        }
    }
}
