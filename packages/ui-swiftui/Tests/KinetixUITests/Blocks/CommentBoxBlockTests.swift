import SwiftUI
import XCTest
import KinetixUI

/// The "Comment box" block — see SignInBlockTests.swift for how block fixtures work.
///
/// `KinetixTextarea` grows with its content on this platform, so there is no fixed row count to choose: a
/// comment that runs long pushes the submit button down rather than scrolling inside a box the size of the
/// web version's three rows. That is the native expectation, and it is also what keeps the block usable at
/// larger text sizes.
///
/// Accessibility: the field carries a visible label rather than relying on the placeholder. A placeholder is
/// announced as a value, disappears the moment typing starts, and leaves the field nameless — the most
/// common accessibility defect in a comment form.
///
// kx-block:start
struct CommentBoxBlock: View {
    @State private var comment = ""
    var onSubmit: () -> Void = {}

    var body: some View {
        KinetixCard {
            KinetixCardContent {
                HStack(alignment: .top, spacing: 12) {
                    KinetixAvatar {
                        KinetixAvatarFallback("ZF")
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        KinetixLabel("Add a comment")
                        KinetixTextarea(text: $comment)
                        HStack {
                            Spacer()
                            KinetixButton(action: onSubmit) { Text("Comment") }
                        }
                    }
                }
            }
        }
    }
}
// kx-block:end

final class CommentBoxBlockTests: XCTestCase {
    func testCommentBoxBlockCompiles() {
        XCTAssertNotNil(CommentBoxBlock().body)
    }
}
