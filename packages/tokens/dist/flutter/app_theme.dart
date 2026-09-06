
//
// app_theme.dart
//

// Do not edit directly, this file was auto-generated.



import 'dart:ui';

class KinetixTheme {
    KinetixTheme._();

    static const colorAccent = Color(0xFFF0F7FF); /** figma: 'LightBlue' #f0f7ff (the hover fill used by Outline/Ghost buttons) */
    static const colorAccentForeground = Color(0xFF163042); /** synth: = primary for readable text on accent */
    static const colorBackground = Color(0xFFFFFFFF); /** figma: surfaceContainerLowest #ffffff */
    static const colorBorder = Color(0xFF92B2C8); /** figma: outline #92b2c8 */
    static const colorCard = Color(0xFFFFFFFF); /** synth: no Figma card token; = background */
    static const colorCardForeground = Color(0xFF050C11); /** synth: = foreground */
    static const colorChart1 = Color(0xFF1B3C53); /** synth: brand ramps for data viz */
    static const colorChart2 = Color(0xFF748873);
    static const colorChart3 = Color(0xFFFFBC53);
    static const colorChart4 = Color(0xFFD13A3A);
    static const colorChart5 = Color(0xFFB4A499);
    static const colorChart6 = Color(0xFF57778D); /** synth: 6th data-viz hue — steel blue, distinct from the navy chart-1 */
    static const colorChart7 = Color(0xFF9E0808); /** synth: 7th data-viz hue — deep red, distinct from chart-4 */
    static const colorChart8 = Color(0xFF465245); /** synth: 8th data-viz hue — deep green, distinct from chart-2 */
    static const colorDestructive = Color(0xFFC60A0A); /** a11y: figma error #ec5047 is 3.33:1 under on-error / 3.62:1 as text on the page — fails WCAG AA. red.500 #c60a0a clears 5.6:1 / 6.1:1. See ACCESSIBILITY-AUDIT.md. */
    static const colorDestructiveForeground = Color(0xFFFEF3F2); /** figma: onError #fef3f2 */
    static const colorForeground = Color(0xFF050C11); /** figma: onSurface #050c11 */
    static const colorInfo = Color(0xFF57778D); /** synth: steel blue, distinct from navy primary */
    static const colorInfoForeground = Color(0xFFF0F7FF);
    static const colorInput = Color(0xFF92B2C8); /** figma: outline #92b2c8 (same as border) */
    static const colorMuted = Color(0xFFF6F6F6); /** figma: surfaceContainer #f6f6f6 */
    static const colorMutedForeground = Color(0xFF6D6D6D); /** figma: onSurfaceVariant #6d6d6d */
    static const colorPopover = Color(0xFFFFFFFF); /** synth: no Figma popover token; = background */
    static const colorPopoverForeground = Color(0xFF050C11); /** synth: = foreground */
    static const colorPrimary = Color(0xFF163042); /** figma 'Primay' (sic) was blue.500 #1b3c53 (11.55:1 on bg); deepened one ramp step to blue.600 #163042 (~13:1) for headroom on tints/overlays — same navy hue */
    static const colorPrimaryForeground = Color(0xFFF0F7FF); /** figma: 'On Primary' #f0f7ff -> renamed primary-foreground (on blue.600 primary ~12:1) */
    static const colorRing = Color(0xFF163042); /** figma: focus state draws a 2px 'Primay' border — tracks --primary (blue.600) */
    static const colorSecondary = Color(0xFFE3E7E3); /** figma secondaryContainer was green.50 #f1f3f1 (barely distinct from bg); deepened to green.100 #e3e7e3 so the surface reads as a control — same sage hue */
    static const colorSecondaryForeground = Color(0xFF465245); /** green.600 #5d6d5c on the old secondary was 4.95:1 (marginal AA); green.700 #465245 on green.100 clears ~6.5:1 */
    static const colorSemanticError = Color(0xFFEC5047); /** figma: error (NOT red.500 #c60a0a — Figma keeps error as its own value) */
    static const colorSemanticErrorContainer = Color(0xFFFEF3F2); /** figma: errorContainer */
    static const colorSemanticInfoContainer = Color(0xFFF0F7FF);
    static const colorSemanticOnError = Color(0xFFFEF3F2); /** figma: onError */
    static const colorSemanticOnErrorContainer = Color(0xFFEC5047); /** figma: onErrorContainer */
    static const colorSemanticOnInfoContainer = Color(0xFF395A70);
    static const colorSemanticOnSuccessContainer = Color(0xFF465245);
    static const colorSemanticOnWarningContainer = Color(0xFFF97907); /** figma: onWarningContainer */
    static const colorSemanticSuccessContainer = Color(0xFFF1F3F1);
    static const colorSemanticWarning = Color(0xFFF97907);
    static const colorSemanticWarningContainer = Color(0xFFFFF8EB); /** figma: warningContainer */
    static const colorSidebar = Color(0xFFFAFAFA);
    static const colorSidebarAccent = Color(0xFFF0F7FF);
    static const colorSidebarAccentForeground = Color(0xFF163042);
    static const colorSidebarBorder = Color(0xFFE0E0E0);
    static const colorSidebarForeground = Color(0xFF050C11);
    static const colorSidebarPrimary = Color(0xFF163042);
    static const colorSidebarPrimaryForeground = Color(0xFFF0F7FF);
    static const colorSidebarRing = Color(0xFF163042);
    static const colorSuccess = Color(0xFF5D6D5C); /** synth: no Figma success token; green ramp step 6 (distinct from secondary) */
    static const colorSuccessForeground = Color(0xFFF1F3F1); /** synth */
    static const colorTertiary = Color(0xFFB0B0B0); /** figma: tertiary — switch off-track */
    static const colorTertiaryForeground = Color(0xFFF0F7FF);
    static const colorWarning = Color(0xFF7F5B21); /** a11y: Figma onWarningContainer #f97907 is 2.7:1 as text on the page / 2.6:1 in the Tag warning variant — fails WCAG AA. amber.800 #7f5b21 clears 6.1:1 / 5.8:1. Dark --warning stays bright (amber.400). See ACCESSIBILITY-AUDIT.md. */
    static const colorWarningForeground = Color(0xFFFFF8EB); /** figma: warningContainer #fff8eb */
}