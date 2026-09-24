import SwiftUI
import XCTest
import KinetixUI

/// The "Testimonial" block — see SignInBlockTests.swift for how block fixtures work.
///
/// `KinetixQuote` carries the whole anatomy — the quotation, the attribution and an avatar slot — so the
/// block is one view. Using the quote primitive rather than styling a `Text` is the point: it is what makes
/// the quotation marks decorative and keeps the attribution structurally attached to what it attributes.
///
// kx-block:start
struct TestimonialBlock: View {
    var body: some View {
        KinetixQuote(
            "Good design is as little design as possible.",
            author: "Dieter Rams",
            authorTitle: "Industrial Designer"
        ) {
            KinetixAvatar {
                KinetixAvatarFallback("DR")
            }
        }
    }
}
// kx-block:end

final class TestimonialBlockTests: XCTestCase {
    func testTestimonialBlockCompiles() {
        XCTAssertNotNil(TestimonialBlock().body)
    }
}
