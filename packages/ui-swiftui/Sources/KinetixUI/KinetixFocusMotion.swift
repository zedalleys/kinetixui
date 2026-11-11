import SwiftUI

/// Optional border-colour settling. The separate focus ring is immediate in
/// both modes; neither focus ownership nor ring visibility is animated.
public enum KinetixFocusMotion {
    public static var durationSeconds: Double {
        let c = KinetixDuration.instant.components
        return Double(c.seconds) + Double(c.attoseconds) / 1e18
    }

    public static func animation(reduceMotion: Bool) -> Animation? {
        guard !reduceMotion else { return nil }
        let e = KinetixEasing.standard
        return .timingCurve(e.0, e.1, e.2, e.3, duration: durationSeconds)
    }
}
