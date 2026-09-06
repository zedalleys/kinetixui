
//
// Theme.swift
//

// Do not edit directly, this file was auto-generated.


import SwiftUI

public class KinetixTheme {
    public static let colorAccent = UIColor(red: 0.941, green: 0.969, blue: 1.000, alpha: 1) /** figma: 'LightBlue' #f0f7ff (the hover fill used by Outline/Ghost buttons) */
    public static let colorAccentForeground = UIColor(red: 0.106, green: 0.235, blue: 0.325, alpha: 1) /** synth: = primary for readable text on accent */
    public static let colorBackground = UIColor(red: 1.000, green: 1.000, blue: 1.000, alpha: 1) /** figma: surfaceContainerLowest #ffffff */
    public static let colorBorder = UIColor(red: 0.573, green: 0.698, blue: 0.784, alpha: 1) /** figma: outline #92b2c8 */
    public static let colorCard = UIColor(red: 1.000, green: 1.000, blue: 1.000, alpha: 1) /** synth: no Figma card token; = background */
    public static let colorCardForeground = UIColor(red: 0.020, green: 0.047, blue: 0.067, alpha: 1) /** synth: = foreground */
    public static let colorChart1 = UIColor(red: 0.106, green: 0.235, blue: 0.325, alpha: 1) /** synth: brand ramps for data viz */
    public static let colorChart2 = UIColor(red: 0.455, green: 0.533, blue: 0.451, alpha: 1)
    public static let colorChart3 = UIColor(red: 1.000, green: 0.737, blue: 0.325, alpha: 1)
    public static let colorChart4 = UIColor(red: 0.820, green: 0.227, blue: 0.227, alpha: 1)
    public static let colorChart5 = UIColor(red: 0.706, green: 0.643, blue: 0.600, alpha: 1)
    public static let colorDestructive = UIColor(red: 0.776, green: 0.039, blue: 0.039, alpha: 1) /** a11y: figma error #ec5047 is 3.33:1 under on-error / 3.62:1 as text on the page — fails WCAG AA. red.500 #c60a0a clears 5.6:1 / 6.1:1. See ACCESSIBILITY-AUDIT.md. */
    public static let colorDestructiveForeground = UIColor(red: 0.996, green: 0.953, blue: 0.949, alpha: 1) /** figma: onError #fef3f2 */
    public static let colorForeground = UIColor(red: 0.020, green: 0.047, blue: 0.067, alpha: 1) /** figma: onSurface #050c11 */
    public static let colorInfo = UIColor(red: 0.341, green: 0.467, blue: 0.553, alpha: 1) /** synth: steel blue, distinct from navy primary */
    public static let colorInfoForeground = UIColor(red: 0.941, green: 0.969, blue: 1.000, alpha: 1)
    public static let colorInput = UIColor(red: 0.573, green: 0.698, blue: 0.784, alpha: 1) /** figma: outline #92b2c8 (same as border) */
    public static let colorMuted = UIColor(red: 0.965, green: 0.965, blue: 0.965, alpha: 1) /** figma: surfaceContainer #f6f6f6 */
    public static let colorMutedForeground = UIColor(red: 0.427, green: 0.427, blue: 0.427, alpha: 1) /** figma: onSurfaceVariant #6d6d6d */
    public static let colorPopover = UIColor(red: 1.000, green: 1.000, blue: 1.000, alpha: 1) /** synth: no Figma popover token; = background */
    public static let colorPopoverForeground = UIColor(red: 0.020, green: 0.047, blue: 0.067, alpha: 1) /** synth: = foreground */
    public static let colorPrimary = UIColor(red: 0.106, green: 0.235, blue: 0.325, alpha: 1) /** figma: 'Primay' (sic) #1b3c53 -> renamed primary */
    public static let colorPrimaryForeground = UIColor(red: 0.941, green: 0.969, blue: 1.000, alpha: 1) /** figma: 'On Primary' #f0f7ff -> renamed primary-foreground */
    public static let colorRing = UIColor(red: 0.106, green: 0.235, blue: 0.325, alpha: 1) /** figma: focus state draws a 2px 'Primay' border */
    public static let colorSecondary = UIColor(red: 0.945, green: 0.953, blue: 0.945, alpha: 1) /** figma: secondaryContainer #f1f3f1 (our 'secondary' == Figma container role) */
    public static let colorSecondaryForeground = UIColor(red: 0.365, green: 0.427, blue: 0.361, alpha: 1) /** figma onSecondaryContainer was green.500 (#748873) = 3.42:1 on secondary (AA-large only); green.600 (#5d6d5c) = 4.95:1 */
    public static let colorSemanticError = UIColor(red: 0.925, green: 0.314, blue: 0.278, alpha: 1) /** figma: error (NOT red.500 #c60a0a — Figma keeps error as its own value) */
    public static let colorSemanticErrorContainer = UIColor(red: 0.996, green: 0.953, blue: 0.949, alpha: 1) /** figma: errorContainer */
    public static let colorSemanticInfoContainer = UIColor(red: 0.941, green: 0.969, blue: 1.000, alpha: 1)
    public static let colorSemanticOnError = UIColor(red: 0.996, green: 0.953, blue: 0.949, alpha: 1) /** figma: onError */
    public static let colorSemanticOnErrorContainer = UIColor(red: 0.925, green: 0.314, blue: 0.278, alpha: 1) /** figma: onErrorContainer */
    public static let colorSemanticOnInfoContainer = UIColor(red: 0.224, green: 0.353, blue: 0.439, alpha: 1)
    public static let colorSemanticOnSuccessContainer = UIColor(red: 0.275, green: 0.322, blue: 0.271, alpha: 1)
    public static let colorSemanticOnWarningContainer = UIColor(red: 0.976, green: 0.475, blue: 0.027, alpha: 1) /** figma: onWarningContainer */
    public static let colorSemanticSuccessContainer = UIColor(red: 0.945, green: 0.953, blue: 0.945, alpha: 1)
    public static let colorSemanticWarning = UIColor(red: 0.976, green: 0.475, blue: 0.027, alpha: 1)
    public static let colorSemanticWarningContainer = UIColor(red: 1.000, green: 0.973, blue: 0.922, alpha: 1) /** figma: warningContainer */
    public static let colorSidebar = UIColor(red: 0.980, green: 0.980, blue: 0.980, alpha: 1)
    public static let colorSidebarAccent = UIColor(red: 0.941, green: 0.969, blue: 1.000, alpha: 1)
    public static let colorSidebarAccentForeground = UIColor(red: 0.106, green: 0.235, blue: 0.325, alpha: 1)
    public static let colorSidebarBorder = UIColor(red: 0.878, green: 0.878, blue: 0.878, alpha: 1)
    public static let colorSidebarForeground = UIColor(red: 0.020, green: 0.047, blue: 0.067, alpha: 1)
    public static let colorSidebarPrimary = UIColor(red: 0.106, green: 0.235, blue: 0.325, alpha: 1)
    public static let colorSidebarPrimaryForeground = UIColor(red: 0.941, green: 0.969, blue: 1.000, alpha: 1)
    public static let colorSidebarRing = UIColor(red: 0.106, green: 0.235, blue: 0.325, alpha: 1)
    public static let colorSuccess = UIColor(red: 0.365, green: 0.427, blue: 0.361, alpha: 1) /** synth: no Figma success token; green ramp step 6 (distinct from secondary) */
    public static let colorSuccessForeground = UIColor(red: 0.945, green: 0.953, blue: 0.945, alpha: 1) /** synth */
    public static let colorTertiary = UIColor(red: 0.690, green: 0.690, blue: 0.690, alpha: 1) /** figma: tertiary — switch off-track */
    public static let colorTertiaryForeground = UIColor(red: 0.941, green: 0.969, blue: 1.000, alpha: 1)
    public static let colorWarning = UIColor(red: 0.498, green: 0.357, blue: 0.129, alpha: 1) /** a11y: Figma onWarningContainer #f97907 is 2.7:1 as text on the page / 2.6:1 in the Tag warning variant — fails WCAG AA. amber.800 #7f5b21 clears 6.1:1 / 5.8:1. Dark --warning stays bright (amber.400). See ACCESSIBILITY-AUDIT.md. */
    public static let colorWarningForeground = UIColor(red: 1.000, green: 0.973, blue: 0.922, alpha: 1) /** figma: warningContainer #fff8eb */
}