import SwiftUI
import XCTest
import KinetixUI

/// The "Settings list" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The closest thing to a native pattern in the catalogue: a titled group of rows, each a label, an
/// explanation and a switch. That is what Settings.app looks like, so the composition needs no argument.
///
/// Accessibility: each switch takes its name from its row rather than carrying a separate `accessibilityLabel`
/// — combining the element is what makes VoiceOver announce "Email, Product news and receipts, switch, on"
/// instead of three unlabelled controls in a row. A hard-coded label on the switch would duplicate the title
/// and read it twice.
///
// kx-block:start
struct SettingsListBlock: View {
    @State private var email = true
    @State private var push = true
    @State private var sms = false

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Notifications")
            }
            KinetixSeparator()
            KinetixList {
                KinetixListItem(title: "Email", description: "Product news and receipts") {
                    EmptyView()
                } trailing: {
                    KinetixSwitch(isOn: $email)
                }
                KinetixListItem(title: "Push", description: "Activity on your projects") {
                    EmptyView()
                } trailing: {
                    KinetixSwitch(isOn: $push)
                }
                KinetixListItem(title: "SMS", description: "Only critical alerts") {
                    EmptyView()
                } trailing: {
                    KinetixSwitch(isOn: $sms)
                }
            }
        }
    }
}
// kx-block:end

final class SettingsListBlockTests: XCTestCase {
    func testSettingsListBlockCompiles() {
        XCTAssertNotNil(SettingsListBlock().body)
    }
}
