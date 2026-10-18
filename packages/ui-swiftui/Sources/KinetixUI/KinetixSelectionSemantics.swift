//
// KinetixSelectionSemantics.swift — what a selection control tells VoiceOver, as a pure function.
//
// Deliberately `internal`, not public API: this is how the package's own controls phrase their
// state, not a capability a consumer asked for. `@testable import KinetixUI` reaches it, which is
// what makes the phrasing testable without putting it on the published surface.
//
// ── Why the tri-state is a type and not two Bools at the call site ────────
//
// `KinetixCheckbox` takes `isOn: Binding<Bool>` plus a display-only `indeterminate` flag, and that
// public shape is unchanged. But "which of the three states is this" was being answered twice inside
// the view — once for the glyph (`indeterminate ? minus : checkmark`) and once, wrongly, for
// accessibility (`isOn ? [.isSelected] : []`, which announced a mixed box as plain unselected and
// never announced mixed at all). Resolving it once, here, is what stops those two answers drifting
// again, and it is also the value the selection animation keys on.
//
// ── On the strings ────────────────────────────────────────────────────────
//
// Plain English literals, matching `KinetixSwitch`'s existing "On" / "Off". The package ships no
// string catalogue, and inventing one for three words would be a localisation decision smuggled in
// through an accessibility fix. Recorded as a known gap instead: these are not localised, and a
// product that ships in more than one language has to override them until the package has a
// catalogue.
//

import SwiftUI

/// A checkbox's three states, resolved once from the public `isOn` / `indeterminate` pair.
enum KinetixTriState: Equatable {
    case off, mixed, on

    /// The state the box is actually in. `indeterminate` wins over `isOn`, because that is what the
    /// glyph already did: a box showing a dash is mixed whatever the underlying Bool says.
    static func resolve(isOn: Bool, indeterminate: Bool) -> KinetixTriState {
        if indeterminate { return .mixed }
        return isOn ? .on : .off
    }

    /// What `accessibilityValue` reads. "Mixed" is the word VoiceOver itself uses for a partially
    /// checked control, so a reader hears the same term they would from a system checkbox.
    var accessibilityValue: String {
        switch self {
        case .off:   return "Unchecked"
        case .mixed: return "Mixed"
        case .on:    return "Checked"
        }
    }

    /// Whether the control is in the fully-selected state. Mixed is NOT selected: it is its own
    /// third state, and claiming `.isSelected` for it would be the old defect wearing a new name.
    var isFullySelected: Bool { self == .on }
}

extension View {
    /// Adds the toggle trait where the OS has one.
    ///
    /// `AccessibilityTraits.isToggle` is iOS 17 / macOS 14; this package's floor is iOS 16 / macOS 13
    /// (see `Package.swift`), so it is applied behind an availability check rather than by raising the
    /// floor — a deployment-target bump for one trait would be a far larger decision than the defect
    /// it fixes. On iOS 16 the control keeps the behaviour it has today: a button with a value, which
    /// VoiceOver still reads as "<label>, On".
    @ViewBuilder
    func kinetixToggleTrait() -> some View {
        if #available(iOS 17.0, macOS 14.0, tvOS 17.0, watchOS 10.0, *) {
            self.accessibilityAddTraits(.isToggle)
        } else {
            self
        }
    }
}
