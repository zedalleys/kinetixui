//
// Calendar.swift — KinetixCalendar.
//
// Mirrors packages/ui/src/components/calendar.tsx (a react-day-picker
// month grid). SwiftUI has no standalone calendar view, so this wraps
// `DatePicker(.graphical)` — a month grid with selection — themed with
// `.tint`, the same "reuse the platform's widget, restyle it" call the
// Compose port made wrapping Material3's `DatePicker`. Single-date only;
// no range select (a documented gap, same as the Compose port).
//

import SwiftUI

public struct KinetixCalendar: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var selection: Date
    private let range: ClosedRange<Date>?

    public init(selection: Binding<Date>, in range: ClosedRange<Date>? = nil) {
        self._selection = selection
        self.range = range
    }

    public var body: some View {
        Group {
            if let range {
                DatePicker("", selection: $selection, in: range, displayedComponents: [.date])
            } else {
                DatePicker("", selection: $selection, displayedComponents: [.date])
            }
        }
        .datePickerStyle(.graphical)
        .labelsHidden()
        .tint(colors.primary)
    }
}
