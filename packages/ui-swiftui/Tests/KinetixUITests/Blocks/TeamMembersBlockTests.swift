import SwiftUI
import XCTest
import KinetixUI

/// The "Team members" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The row action is a word, not a glyph. The web version uses a ghost button reading "Remove"; an icon-only
/// trash button would be the tempting native shorthand, and it is exactly the thing that ships unlabelled.
/// Keeping the word means the accessible name is the visible name, and nothing has to be remembered.
///
/// A swipe action would be more idiomatic still, but it belongs to `List` rather than to a composition, and
/// a destructive action reachable only by swipe is unreachable by VoiceOver without the rotor. The visible
/// button is the honest default for an example.
///
// kx-block:start
struct TeamMembersBlock: View {
    private struct Member: Identifiable {
        var id: String { name }
        let name: String
        let role: String
        let initials: String
    }

    private let team = [
        Member(name: "Ada Lovelace", role: "Owner", initials: "AL"),
        Member(name: "Grace Hopper", role: "Admin", initials: "GH"),
        Member(name: "Alan Turing", role: "Member", initials: "AT"),
    ]

    var onRemove: (String) -> Void = { _ in }

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Team")
            }
            KinetixSeparator()
            KinetixList {
                ForEach(team) { member in
                    KinetixListItem(title: member.name, description: member.role) {
                        KinetixAvatar {
                            KinetixAvatarFallback(member.initials)
                        }
                    } trailing: {
                        KinetixButton(variant: .ghost, size: .sm, action: { onRemove(member.name) }) {
                            Text("Remove")
                        }
                        .accessibilityLabel("Remove \(member.name)")
                    }
                }
            }
        }
    }
}
// kx-block:end

final class TeamMembersBlockTests: XCTestCase {
    func testTeamMembersBlockCompiles() {
        XCTAssertNotNil(TeamMembersBlock().body)
    }
}
