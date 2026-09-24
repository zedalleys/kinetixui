import SwiftUI
import XCTest
import KinetixUI

/// The "Create account" block — see SignInBlockTests.swift for how block fixtures work.
///
/// Four independent rules rather than one length check. A meter that only counts characters rewards a long
/// common word, which is precisely what a dictionary attack is good at; counting variety rewards what it is
/// bad at. Keeping the rules as data lets the hint name what is still missing instead of saying "weak" and
/// leaving the reader to guess which lever to pull.
///
/// Accessibility: the meter is labelled "Password strength" and announces the WORD through
/// `accessibilityValue` — "Fair", not "50". A percentage is an implementation detail; nobody can act on it.
/// `KinetixPasswordInput` supplies the platform's real secure entry together with its own reveal control, so
/// the show/hide affordance is already a reachable button rather than an icon painted on a plain field.
///
// kx-block:start
struct CreateAccountBlock: View {
    /// Data, not a switch statement, so the hint can name the rules that are still unmet.
    private static let rules: [(label: String, met: (String) -> Bool)] = [
        ("12 characters", { $0.count >= 12 }),
        ("an upper and a lower case letter", { $0.contains(where: \.isLowercase) && $0.contains(where: \.isUppercase) }),
        ("a number", { $0.contains(where: \.isNumber) }),
        ("a symbol", { $0.contains { !$0.isLetter && !$0.isNumber } }),
    ]
    private static let strength = ["Too weak", "Weak", "Fair", "Good", "Strong"]

    @State private var email = ""
    @State private var password = ""
    @State private var accepted = false

    var onCreate: () -> Void = {}

    private var missing: [String] { Self.rules.filter { !$0.met(password) }.map(\.label) }
    private var met: Int { Self.rules.count - missing.count }

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Create your account")
                KinetixCardDescription("Free for 14 days. No card required.")
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 16) {
                    KinetixField {
                        KinetixFieldLabel("Email")
                        KinetixInput(text: $email, placeholder: "you@example.com")
                    }
                    KinetixField {
                        KinetixFieldLabel("Password")
                        KinetixPasswordInput(text: $password)
                        KinetixProgress(value: Double(met) / Double(Self.rules.count) * 100)
                            .frame(height: 4)
                            .accessibilityLabel("Password strength")
                            .accessibilityValue(Self.strength[met])
                        KinetixFieldDescription(
                            missing.isEmpty ? "Strong password." : "Still needs \(missing.joined(separator: ", "))."
                        )
                    }
                    HStack(alignment: .top, spacing: 8) {
                        KinetixCheckbox(isOn: $accepted)
                        Text("I agree to the terms of service and the privacy policy.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
            KinetixCardFooter {
                KinetixButton(action: onCreate) {
                    Text("Create account").frame(maxWidth: .infinity)
                }
                .disabled(!accepted || !missing.isEmpty)
            }
        }
    }
}
// kx-block:end

final class CreateAccountBlockTests: XCTestCase {
    func testCreateAccountBlockCompiles() {
        XCTAssertNotNil(CreateAccountBlock().body)
    }
}
