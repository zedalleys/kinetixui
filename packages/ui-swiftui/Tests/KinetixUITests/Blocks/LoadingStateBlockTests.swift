import SwiftUI
import XCTest
import KinetixUI

/// The "Loading state" block — see SignInBlockTests.swift for how block fixtures work.
///
/// A skeleton is a picture of nothing. It says "wait" to someone who can see the shapes and absolutely
/// nothing to anyone who cannot, so the region says so out loud. Collapsing the placeholders into a single
/// element labelled "Loading activity" is what stops VoiceOver walking six meaningless grey rectangles.
///
/// The shapes match what replaces them — an avatar circle and two lines of text — so nothing moves when the
/// data arrives.
///
/// The spinner is not given its own label: the row beside it already says "Loading", and saying it twice is
/// noise rather than redundancy.
///
// kx-block:start
struct LoadingStateBlock: View {
    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Activity")
            }
            KinetixCardContent {
                VStack(spacing: 16) {
                    ForEach(0..<3, id: \.self) { _ in
                        HStack(spacing: 12) {
                            KinetixSkeleton()
                                .frame(width: 40, height: 40)
                                .clipShape(Circle())
                            VStack(alignment: .leading, spacing: 8) {
                                KinetixSkeleton().frame(height: 16)
                                KinetixSkeleton().frame(width: 80, height: 12)
                            }
                        }
                    }
                }
                // One element, one announcement. Without `.ignore` VoiceOver walks six grey rectangles.
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Loading activity")
            }
            KinetixCardFooter {
                KinetixButton(variant: .outline, action: {}) {
                    HStack(spacing: 8) {
                        KinetixSpinner(size: .sm)
                            .accessibilityHidden(true)
                        Text("Loading")
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(true)
            }
        }
    }
}
// kx-block:end

final class LoadingStateBlockTests: XCTestCase {
    func testLoadingStateBlockCompiles() {
        XCTAssertNotNil(LoadingStateBlock().body)
    }
}
