package com.kinetixui.ui

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixAlertDialog — mirrors `packages/ui/src/components/alert-dialog.tsx`.
 * The React `AlertDialog` is nearly identical to `Dialog` (same overlay/
 * card/Header/Footer/Title/Description), differing only in: no free
 * dismiss (must pick `Action`/`Cancel`), and its own `Action`/`Cancel`
 * buttons styled as `buttonVariants({ variant: "Primary" })` /
 * `buttonVariants({ variant: "Outline" })`. Reused directly rather than
 * re-derived: this composes [KinetixDialog] with `dismissible = false`,
 * and reuses [KinetixDialogHeader]/[KinetixDialogFooter]/
 * [KinetixDialogTitle]/[KinetixDialogDescription] as-is (there's no
 * meaningful visual difference to justify separate copies) — the same
 * "reuse an existing component when the source is itself a thin variant"
 * call [KinetixPagination] made for [KinetixButton].
 */
@Composable
fun KinetixAlertDialog(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    KinetixDialog(visible = visible, onDismissRequest = onDismissRequest, modifier = modifier, dismissible = false, content = content)
}

@Composable
fun KinetixAlertDialogAction(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    KinetixButton(onClick = onClick, modifier = modifier, variant = KinetixButtonVariant.Primary) {
        Text(text)
    }
}

@Composable
fun KinetixAlertDialogCancel(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    KinetixButton(onClick = onClick, modifier = modifier, variant = KinetixButtonVariant.Outline) {
        Text(text)
    }
}
