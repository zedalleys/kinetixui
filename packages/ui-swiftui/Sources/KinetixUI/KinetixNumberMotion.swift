import SwiftUI

/// Numeric tracking uses a fixed linear token duration; the accessibility preference removes interpolation.
public enum KinetixNumberMotion {
    public static var durationSeconds: Double {
        let c = KinetixDuration.base.components
        return Double(c.seconds) + Double(c.attoseconds) / 1e18
    }
    public static func animation(reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .linear(duration: durationSeconds)
    }
}
