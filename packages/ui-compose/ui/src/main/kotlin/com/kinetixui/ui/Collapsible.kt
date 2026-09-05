package com.kinetixui.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixCollapsible — mirrors `packages/ui/src/components/collapsible.tsx`,
 * itself a bare re-export of Radix's `Collapsible.Root`/`Trigger`/`Content`
 * with no styling of its own — the only thing that primitive actually
 * provides is the show/hide animation. Compose's built-in
 * `AnimatedVisibility` already does exactly that, so there's no
 * `Root`/`Trigger` to reassemble: the caller supplies their own toggle
 * control (a `KinetixButton`, a whole row — whatever) and passes its
 * state straight through as `expanded`.
 */
@Composable
fun KinetixCollapsible(
    expanded: Boolean,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    AnimatedVisibility(visible = expanded, modifier = modifier) {
        content()
    }
}
