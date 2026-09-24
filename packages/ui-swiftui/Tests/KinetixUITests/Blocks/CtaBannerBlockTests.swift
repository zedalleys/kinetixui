import SwiftUI
import XCTest
import KinetixUI

/// The "CTA banner" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The web version turns from a stack into a row at the `sm` breakpoint. `ViewThatFits` is the SwiftUI way to
/// express the same idea without naming a width: it takes the row when the row fits and the stack when it
/// does not, which is also correct at large text sizes, where a row that fitted at the default size no longer
/// does. A breakpoint cannot know that; this can.
///
// kx-block:start
struct CtaBannerBlock: View {
    var onStart: () -> Void = {}
    var onDocs: () -> Void = {}

    private var copy: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Ship with one token architecture")
                .font(.title3).fontWeight(.semibold)
            Text("Built from the same design-token contract on every supported platform.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var actions: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) { buttons }
            VStack(spacing: 8) { buttons }
        }
    }

    @ViewBuilder private var buttons: some View {
        KinetixButton(action: onStart) { Text("Get started") }
        KinetixButton(variant: .outline, action: onDocs) { Text("Read the docs") }
    }

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .center, spacing: 16) {
                copy
                Spacer(minLength: 16)
                actions
            }
            VStack(alignment: .leading, spacing: 16) {
                copy
                actions
            }
        }
        .padding(32)
        .background(
            RoundedRectangle(cornerRadius: 12).strokeBorder(.separator)
        )
    }
}
// kx-block:end

final class CtaBannerBlockTests: XCTestCase {
    func testCtaBannerBlockCompiles() {
        XCTAssertNotNil(CtaBannerBlock().body)
    }
}
