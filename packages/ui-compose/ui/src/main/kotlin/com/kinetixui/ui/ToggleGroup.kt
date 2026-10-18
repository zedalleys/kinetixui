package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics

/**
 * KinetixToggleGroup / KinetixToggleGroupItem — mirrors
 * `packages/ui/src/components/toggle-group.tsx`. The React version shares
 * `variant`/`size` from the group down to each item through a React
 * Context (`ToggleGroupContext`); a `compositionLocalOf` plays the exact
 * same role here — items don't repeat `variant`/`size` themselves.
 * `KinetixToggleGroupItem` is a thin pass-through to [KinetixToggle] with
 * those two values injected, not a reimplementation.
 */
private val LocalToggleGroupVariant = compositionLocalOf { KinetixToggleVariant.Default }
private val LocalToggleGroupSize = compositionLocalOf { KinetixToggleSize.Default }

/**
 * The unnamed group: an unchanged signature, deliberately.
 *
 * `packages/ui-compose` is published to Maven, so this function's JVM method descriptor is part of
 * the contract. Adding `accessibleLabel` here — even defaulted, which keeps Kotlin *source*
 * compatibility — would replace that descriptor, and an app compiled against an earlier version of
 * the artifact would fail at runtime with `NoSuchMethodError` rather than at build time. The name
 * lives on the second overload and this one delegates, exactly as `KinetixTheme` does for its
 * colour parameters; `ThemeBinaryCompatibilityTest` is where that reasoning is written down, and
 * `ToggleGroupBinaryCompatibilityTest` now holds this pair to the same rule.
 */
@Composable
fun KinetixToggleGroup(
    modifier: Modifier = Modifier,
    variant: KinetixToggleVariant = KinetixToggleVariant.Default,
    size: KinetixToggleSize = KinetixToggleSize.Default,
    content: @Composable RowScope.() -> Unit,
) {
    KinetixToggleGroup(
        accessibleLabel = null,
        modifier = modifier,
        variant = variant,
        size = size,
        content = content,
    )
}

/**
 * The same row with a name on it.
 *
 * [accessibleLabel] has no default, and that is what keeps the two overloads unambiguous: a bare
 * `KinetixToggleGroup { … }` — every existing call site — cannot match this one, so it resolves to
 * the delegating overload above. Giving it a default would make both applicable to that call.
 *
 * What the name does and does not do, precisely: Compose has no "group" role to announce, and
 * `selectableGroup()` is the wrong primitive here — it describes a single-choice set of `selectable`
 * children, while these items are independently `toggleable`. So the row becomes a traversal group
 * with a name: TalkBack reaches the items as one run rather than scattered through the surrounding
 * content, and reads the group's name on entry. The pressed state stays on each item, where it
 * belongs; nothing here merges or clears the children's semantics.
 */
@Composable
fun KinetixToggleGroup(
    accessibleLabel: String?,
    modifier: Modifier = Modifier,
    variant: KinetixToggleVariant = KinetixToggleVariant.Default,
    size: KinetixToggleSize = KinetixToggleSize.Default,
    content: @Composable RowScope.() -> Unit,
) {
    CompositionLocalProvider(LocalToggleGroupVariant provides variant, LocalToggleGroupSize provides size) {
        Row(
            modifier = modifier.semantics {
                isTraversalGroup = true
                accessibleLabel?.let { contentDescription = it }
            },
            horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1)),
            content = content,
        )
    }
}

@Composable
fun KinetixToggleGroupItem(
    pressed: Boolean,
    onPressedChange: ((Boolean) -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    KinetixToggle(
        pressed = pressed,
        onPressedChange = onPressedChange,
        modifier = modifier,
        variant = LocalToggleGroupVariant.current,
        size = LocalToggleGroupSize.current,
        enabled = enabled,
        content = content,
    )
}
