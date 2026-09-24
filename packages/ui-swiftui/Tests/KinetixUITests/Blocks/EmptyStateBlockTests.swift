import SwiftUI
import XCTest
import KinetixUI

/// The "Empty state" block — see SignInBlockTests.swift for how block fixtures work.
///
/// `KinetixEmpty` and its parts already carry the layout, so this composition is mostly content. The media
/// slot takes an SF Symbol — the platform's own icon set, no asset to ship — and hides it from assistive
/// technology: the heading already says there are no messages, and "tray" adds nothing to that.
///
// kx-block:start
struct EmptyStateBlock: View {
    var onStart: () -> Void = {}

    var body: some View {
        KinetixEmpty {
            KinetixEmptyHeader {
                KinetixEmptyMedia(variant: .icon) {
                    Image(systemName: "tray")
                        .accessibilityHidden(true)
                }
                KinetixEmptyTitle("No messages yet")
                KinetixEmptyDescription("When someone messages you, it'll show up here.")
            }
            KinetixEmptyContent {
                KinetixButton(action: onStart) { Text("Start a conversation") }
            }
        }
    }
}
// kx-block:end

final class EmptyStateBlockTests: XCTestCase {
    func testEmptyStateBlockCompiles() {
        XCTAssertNotNil(EmptyStateBlock().body)
    }
}
