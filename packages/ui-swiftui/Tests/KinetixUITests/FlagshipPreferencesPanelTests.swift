import SwiftUI
import XCTest
import KinetixUI

// The flagship "Notification preferences" recipe shown on kinetixui.com's homepage as the SwiftUI implementation
// of the cross-platform proof. This file is the canonical source: `pnpm gen:flagship` extracts the marked region
// below into the website's generated source display — the site never hand-duplicates this snippet, and `pnpm
// check:flagship-examples` (CI) fails if the two drift apart. Compiled by the same `swift build && swift test`
// this package already runs (native-swiftui.yml); the test below is what proves the file actually compiles
// against the real `KinetixUI` package API, not a hand-typed illustration.
//
// kx-flagship:start
struct FlagshipPreferencesPanel: View {
    @State private var productUpdates = true
    @State private var securityAlerts = true

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                HStack {
                    KinetixCardTitle("Notifications")
                    Spacer()
                    KinetixBadge("Synced", variant: .secondary)
                }
                KinetixCardDescription("Choose what you hear about.")
            }
            KinetixCardContent {
                VStack(spacing: 16) {
                    HStack {
                        Text("Product updates")
                        Spacer()
                        KinetixSwitch(isOn: $productUpdates)
                    }
                    HStack {
                        Text("Security alerts")
                        Spacer()
                        KinetixSwitch(isOn: $securityAlerts)
                    }
                    KinetixButton(action: {}) {
                        Text("Save preferences")
                    }
                }
            }
        }
    }
}
// kx-flagship:end

final class FlagshipPreferencesPanelTests: XCTestCase {
    /// Real compile verification: this only passes if `FlagshipPreferencesPanel` builds against the actual
    /// `KinetixCard` / `KinetixBadge` / `KinetixSwitch` / `KinetixButton` API surface shipped in this package.
    func testCompilesAgainstTheRealKinetixUIPackageAPI() {
        let sut = KinetixTheme { FlagshipPreferencesPanel() }
        XCTAssertTrue(type(of: sut).self == KinetixTheme<FlagshipPreferencesPanel>.self)
    }
}
