import SwiftUI

/// Determinate progress only. Accessible values use this bounded target;
/// only the visual fill interpolates, and Reduce Motion removes that path.
public enum KinetixProgressMotion {
    public static func fraction(_ value: Double) -> Double {
        value.isNaN ? 0 : max(0, min(1, value / 100))
    }
    public static var durationSeconds: Double {
        let c = KinetixDuration.base.components
        return Double(c.seconds) + Double(c.attoseconds) / 1e18
    }
    public static func animation(reduceMotion: Bool) -> Animation? {
        guard !reduceMotion else { return nil }
        let e = KinetixEasing.linear
        return .timingCurve(e.0, e.1, e.2, e.3, duration: durationSeconds)
    }
}
