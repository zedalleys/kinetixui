import SwiftUI
import XCTest
import KinetixUI

/// The "Editor toolbar" block — see SignInBlockTests.swift for how block fixtures work.
///
/// Two different kinds of choice, given two different controls on purpose: the mode is one-of-two and swaps
/// the whole surface, so it is a segmented control; the marks are independent and combine, so they are a
/// toggle group. Using one control for both is the usual way a toolbar stops making sense.
///
/// The formatting controls disable in Preview. Leaving them live would offer an action that cannot happen.
///
/// Accessibility: each toggle carries an `accessibilityLabel` and hides its glyph, so VoiceOver says "Bold,
/// toggle button, on" rather than reading the letter B. The shortcut hints are `KinetixKbd`, which is the
/// component that already knows how a key should look — spelling it with styled text would not.
///
// kx-block:start
struct EditorToolbarBlock: View {
    private struct Format: Identifiable {
        let id: String
        let name: String
        let glyph: String
        let shortcut: String
    }

    private static let formats = [
        Format(id: "bold", name: "Bold", glyph: "B", shortcut: "B"),
        Format(id: "italic", name: "Italic", glyph: "I", shortcut: "I"),
        Format(id: "code", name: "Code", glyph: "</>", shortcut: "E"),
    ]

    @State private var mode = "write"
    @State private var marks: Set<String> = ["bold"]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                KinetixSegmentedControl {
                    KinetixSegmentedControlItem("Write", isSelected: mode == "write") { mode = "write" }
                    KinetixSegmentedControlItem("Preview", isSelected: mode == "preview") { mode = "preview" }
                }
                Spacer()
                KinetixToggleGroup {
                    ForEach(Self.formats) { format in
                        KinetixToggleGroupItem(isOn: binding(for: format.id)) {
                            Text(format.glyph)
                        }
                        .accessibilityLabel(format.name)
                    }
                }
                .disabled(mode == "preview")
            }

            HStack(spacing: 16) {
                ForEach(Self.formats) { format in
                    HStack(spacing: 6) {
                        Text(format.name)
                        KinetixKbdGroup {
                            KinetixKbd("⌘")
                            KinetixKbd(format.shortcut)
                        }
                    }
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(8)
    }

    private func binding(for id: String) -> Binding<Bool> {
        Binding(
            get: { marks.contains(id) },
            set: { isOn in
                if isOn { marks.insert(id) } else { marks.remove(id) }
            }
        )
    }
}
// kx-block:end

final class EditorToolbarBlockTests: XCTestCase {
    func testEditorToolbarBlockCompiles() {
        XCTAssertNotNil(EditorToolbarBlock().body)
    }
}
