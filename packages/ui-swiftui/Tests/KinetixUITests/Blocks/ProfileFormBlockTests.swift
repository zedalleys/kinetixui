import SwiftUI
import XCTest
import KinetixUI

/// The "Profile form" block — see SignInBlockTests.swift for how block fixtures work.
///
/// A radio group rather than a picker. Three mutually exclusive choices whose consequences differ should all
/// be readable at once; a wheel or a menu hides two of them behind an interaction, which is the wrong trade
/// when the point is to compare them.
///
/// Accessibility: each option is one element carrying the label, the explanation and the selected state, so
/// VoiceOver announces "Only my team, People in your workspace, selected" rather than reading an unlabelled
/// control and then some nearby text. `isSelected` is passed rather than inferred, so the trait is real.
///
// kx-block:start
struct ProfileFormBlock: View {
    private struct Visibility: Identifiable {
        let id: String
        let label: String
        let hint: String
    }

    private static let options = [
        Visibility(id: "everyone", label: "Everyone", hint: "Anyone with the link can see your profile."),
        Visibility(id: "team", label: "Only my team", hint: "People in your workspace."),
        Visibility(id: "nobody", label: "Nobody", hint: "Your profile stays hidden."),
    ]

    @State private var name = "Ziad Fteha"
    @State private var bio = "Building a five-platform design system."
    @State private var visibility = "team"

    var onChangePhoto: () -> Void = {}
    var onSave: () -> Void = {}
    var onCancel: () -> Void = {}

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Profile")
                KinetixCardDescription("This is how you appear to other people.")
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 16) {
                        KinetixAvatar(size: 56) {
                            KinetixAvatarFallback("ZF")
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            KinetixButton(variant: .outline, size: .sm, action: onChangePhoto) {
                                Text("Change photo")
                            }
                            Text("JPG or PNG, up to 2 MB.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    KinetixField {
                        KinetixFieldLabel("Display name")
                        KinetixInput(text: $name)
                    }

                    KinetixField {
                        KinetixFieldLabel("Bio")
                        KinetixTextarea(text: $bio)
                        KinetixFieldDescription("Shown under your name. Plain text.")
                    }

                    KinetixSeparator()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Who can see your profile")
                            .font(.subheadline.weight(.medium))
                        KinetixRadioGroup {
                            ForEach(Self.options) { option in
                                HStack(alignment: .top, spacing: 12) {
                                    KinetixRadioButton(isSelected: visibility == option.id) {
                                        visibility = option.id
                                    }
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(option.label)
                                        Text(option.hint)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .accessibilityElement(children: .combine)
                                .accessibilityAddTraits(visibility == option.id ? .isSelected : [])
                            }
                        }
                    }
                    .accessibilityElement(children: .contain)
                    .accessibilityLabel("Who can see your profile")
                }
            }
            KinetixCardFooter {
                HStack(spacing: 8) {
                    Spacer()
                    KinetixButton(variant: .ghost, action: onCancel) { Text("Cancel") }
                    KinetixButton(action: onSave) { Text("Save changes") }
                }
            }
        }
    }
}
// kx-block:end

final class ProfileFormBlockTests: XCTestCase {
    func testProfileFormBlockCompiles() {
        XCTAssertNotNil(ProfileFormBlock().body)
    }
}
