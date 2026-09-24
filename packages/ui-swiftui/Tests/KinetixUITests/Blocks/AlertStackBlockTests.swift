import SwiftUI
import XCTest
import KinetixUI

/// The "Alert stack" block — see SignInBlockTests.swift for how block fixtures work.
///
/// Three statuses, and none of them is carried by colour alone: each alert's title states what happened, so
/// the red one reads "Payment failed" rather than relying on a reader distinguishing red from green. That is
/// the rule this block exists to demonstrate, and it is also what keeps it legible in high-contrast mode and
/// for the most common form of colour blindness.
///
/// The two-line alerts use a title and a description; the success alert has a title only, because "Changes
/// saved" needs no elaboration and an invented second line would be filler.
///
// kx-block:start
struct AlertStackBlock: View {
    var body: some View {
        VStack(spacing: 12) {
            KinetixAlert {
                KinetixAlertTitle("Heads up")
                KinetixAlertDescription("You can add components to your app using the CLI.")
            }
            KinetixAlert(variant: .destructive) {
                KinetixAlertTitle("Payment failed")
                KinetixAlertDescription("Update your billing details to keep your subscription active.")
            }
            KinetixAlert(variant: .success) {
                KinetixAlertTitle("Changes saved")
            }
        }
    }
}
// kx-block:end

final class AlertStackBlockTests: XCTestCase {
    func testAlertStackBlockCompiles() {
        XCTAssertNotNil(AlertStackBlock().body)
    }
}
