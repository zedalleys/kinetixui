import SwiftUI
import XCTest
import KinetixUI

/// The "Account security" block — see SignInBlockTests.swift for how block fixtures work.
///
/// Three security controls in one place, each stating its consequence rather than only its name: what
/// two-factor will do, what a recovery code is for, and where each session is.
///
/// Composition, not a port. The web version draws its own rows; here they are `KinetixListItem`, because a
/// grouped settings list IS the native shape for this and it brings the row metrics, the separators and the
/// combined announcement with it.
///
/// Accessibility: each row is one element, so VoiceOver reads "Two-factor authentication, Required for every
/// new sign-in, switch, on" instead of a nameless toggle next to some text. "Revoke" keeps its short visible
/// word but announces which session it ends — two identical Revoke buttons are otherwise indistinguishable.
///
// kx-block:start
struct AccountSecurityBlock: View {
    private struct Session: Identifiable {
        let id: String
        let device: String
        let detail: String
        let isCurrent: Bool
    }

    private static let sessions = [
        Session(id: "mbp", device: "MacBook Pro", detail: "Chrome · Berlin · now", isCurrent: true),
        Session(id: "iphone", device: "iPhone 15", detail: "Safari · Berlin · 2 hours ago", isCurrent: false),
    ]

    @State private var twoFactor = true

    var onRegenerate: () -> Void = {}
    var onRevoke: (String) -> Void = { _ in }

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Security")
                KinetixCardDescription("Keep your account safe.")
            }
            KinetixSeparator()
            KinetixList {
                KinetixListItem(
                    title: "Two-factor authentication",
                    description: "Required for every new sign-in."
                ) {
                    EmptyView()
                } trailing: {
                    KinetixSwitch(isOn: $twoFactor)
                }
                KinetixListItem(
                    title: "Recovery codes",
                    description: "Single-use codes for when you lose your phone."
                ) {
                    EmptyView()
                } trailing: {
                    HStack(spacing: 8) {
                        KinetixBadge("8 unused", variant: .secondary)
                        KinetixButton(variant: .outline, size: .sm, action: onRegenerate) {
                            Text("Regenerate")
                        }
                    }
                }
            }
            KinetixSeparator()
            VStack(alignment: .leading, spacing: 0) {
                Text("Active sessions")
                    .font(.subheadline.weight(.medium))
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                KinetixList {
                    ForEach(Self.sessions) { session in
                        KinetixListItem(title: session.device, description: session.detail) {
                            EmptyView()
                        } trailing: {
                            if session.isCurrent {
                                KinetixBadge("This device")
                            } else {
                                KinetixButton(variant: .ghost, size: .sm, action: { onRevoke(session.id) }) {
                                    Text("Revoke")
                                }
                                .accessibilityLabel("Revoke \(session.device)")
                            }
                        }
                    }
                }
            }
        }
    }
}
// kx-block:end

final class AccountSecurityBlockTests: XCTestCase {
    func testAccountSecurityBlockCompiles() {
        XCTAssertNotNil(AccountSecurityBlock().body)
    }
}
