import SwiftUI
import XCTest
import KinetixUI

/// The "Sign in" block — a KinetixUI composition, in SwiftUI.
///
/// This file is the canonical source for the SwiftUI tab of kinetixui.com/blocks/sign-in: `pnpm gen:blocks`
/// extracts the `kx-block` region below, and `pnpm check:blocks` fails if the site and this file disagree.
/// `swift build && swift test` compiles it (native-swiftui.yml), so the snippet cannot describe an API that
/// does not exist — the whole reason blocks are stored as source rather than as strings.
///
/// Composition, not a port. The web version is a fixed-width card because a sign-in form on a desktop page
/// sits in acres of space; on a phone the card IS the screen, so the width cap is dropped and the form fills
/// its container. What is shared is the task and the anatomy — identifier, secret, recall, primary action,
/// provider alternative — not the geometry.
///
/// Accessibility: `KinetixInput` with `isSecure` gives the platform's own secure-entry behaviour, which is
/// what suppresses autocorrect, dictation and the keyboard cache — a styled plain field does not. Each field
/// carries a visible `KinetixLabel`, and the "Forgot?" affordance is a real button so VoiceOver reaches it in
/// order rather than finding it as decorative text.
///
// kx-block:start
struct SignInBlock: View {
    @State private var email = ""
    @State private var password = ""
    @State private var remember = true

    var onSignIn: () -> Void = {}
    var onProvider: () -> Void = {}
    var onForgot: () -> Void = {}

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Sign in")
                KinetixCardDescription("Enter your email to sign in to your account.")
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        KinetixLabel("Email")
                        KinetixInput(text: $email, placeholder: "you@example.com")
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            KinetixLabel("Password")
                            Spacer()
                            Button("Forgot?", action: onForgot)
                                .font(.footnote)
                        }
                        KinetixInput(text: $password, isSecure: true)
                    }
                    HStack(spacing: 8) {
                        KinetixCheckbox(isOn: $remember)
                        Text("Remember me")
                            .font(.subheadline)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
            KinetixCardFooter {
                VStack(spacing: 8) {
                    KinetixButton(action: onSignIn) {
                        Text("Sign in").frame(maxWidth: .infinity)
                    }
                    KinetixButton(variant: .outline, action: onProvider) {
                        Text("Continue with GitHub").frame(maxWidth: .infinity)
                    }
                }
            }
        }
    }
}
// kx-block:end

final class SignInBlockTests: XCTestCase {
    /// Constructing the view is what makes the published snippet evidence: it forces the compiler to resolve
    /// every symbol and argument label in it against the real package.
    func testSignInBlockCompiles() {
        XCTAssertNotNil(SignInBlock().body)
    }
}
