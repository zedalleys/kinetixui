import SwiftUI
import XCTest
import KinetixUI

/// The "Onboarding checklist" block — see SignInBlockTests.swift for how block fixtures work.
///
/// Counted, not measured: the bar announces "2 of 5 complete" rather than "40". A percentage is a rendering
/// of the number, and the number is what a reader can act on.
///
/// Accessibility: each step is one element with the `.isSelected` trait, so VoiceOver reads the label and its
/// state together. The strike-through is the sighted rendering of the same fact, never the only carrier of
/// it — a line through text says nothing to a screen reader.
///
// kx-block:start
struct OnboardingChecklistBlock: View {
    private struct Step: Identifiable {
        let id: String
        let label: String
    }

    private static let steps = [
        Step(id: "account", label: "Create your account"),
        Step(id: "workspace", label: "Name your workspace"),
        Step(id: "invite", label: "Invite a teammate"),
        Step(id: "connect", label: "Connect a repository"),
        Step(id: "deploy", label: "Ship your first change"),
    ]

    @State private var done: Set<String> = ["account", "workspace"]

    var onSkip: () -> Void = {}

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Get started")
                KinetixCardDescription("\(done.count) of \(Self.steps.count) done")
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 16) {
                    KinetixProgress(value: Double(done.count) / Double(Self.steps.count) * 100)
                        .frame(height: 8)
                        .accessibilityLabel("Setup progress")
                        .accessibilityValue("\(done.count) of \(Self.steps.count) complete")

                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(Self.steps) { step in
                            HStack(spacing: 12) {
                                KinetixCheckbox(isOn: binding(for: step.id))
                                Text(step.label)
                                    .strikethrough(done.contains(step.id))
                                    .foregroundStyle(done.contains(step.id) ? AnyShapeStyle(.secondary) : AnyShapeStyle(.primary))
                            }
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
            }
            KinetixCardFooter {
                KinetixButton(variant: .ghost, size: .sm, action: onSkip) {
                    Text("Skip setup")
                }
            }
        }
    }

    private func binding(for id: String) -> Binding<Bool> {
        Binding(
            get: { done.contains(id) },
            set: { isOn in
                if isOn { done.insert(id) } else { done.remove(id) }
            }
        )
    }
}
// kx-block:end

final class OnboardingChecklistBlockTests: XCTestCase {
    func testOnboardingChecklistBlockCompiles() {
        XCTAssertNotNil(OnboardingChecklistBlock().body)
    }
}
