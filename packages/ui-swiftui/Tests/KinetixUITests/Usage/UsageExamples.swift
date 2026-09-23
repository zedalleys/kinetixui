import SwiftUI
import XCTest
import KinetixUI

/// The SwiftUI usage snippets shown on kinetixui.com's component pages.
///
/// Each `kx-usage:<demo-key>` region below is extracted by `pnpm gen:usage` into the website's generated
/// module, and `pnpm check:platform-code` fails if what the site shows drifts from what is here. The regions
/// live inside a real `View` that `swift build && swift test` compiles, so a snippet cannot describe an API
/// that does not exist — which is exactly what had happened before this file: the Chart page advertised a
/// Compose `KinetixChart` with no source behind it at all.
struct UsageExamplesView: View {
    @State private var airplane = true
    @State private var query = ""

    func save() {}

    var body: some View {
        VStack(spacing: 16) {
            // kx-usage:button-demo
            KinetixButton(action: save) {
                Text("Button")
            }
            // kx-usage:end

            // kx-usage:badge-demo
            HStack(spacing: 8) {
                KinetixBadge("Default")
                KinetixBadge("Secondary", variant: .secondary)
            }
            // kx-usage:end

            // kx-usage:switch-demo
            HStack {
                KinetixSwitch(isOn: $airplane)
                Text("Airplane mode")
            }
            // kx-usage:end

            // kx-usage:direction-provider-demo
            // No provider to port: layout direction is an environment value, and every view below reads it.
            VStack {
                KinetixInput(text: $query, placeholder: "Search")
                KinetixButton(action: save) { Text("Save") }
            }
            .environment(\.layoutDirection, .rightToLeft)
            // kx-usage:end
        }
    }
}

final class UsageExamplesTests: XCTestCase {
    /// Constructing the view is what makes the snippets above evidence: it forces the compiler to resolve every
    /// symbol and argument label in them against the real package.
    func testUsageExamplesCompileAndBuild() {
        let view = UsageExamplesView()
        XCTAssertNotNil(view.body)
    }
}
