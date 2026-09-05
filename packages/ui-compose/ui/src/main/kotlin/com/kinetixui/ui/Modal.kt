package com.kinetixui.ui

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixModal — mirrors `packages/ui/src/components/modal.tsx`: a
 * structured, single-composable dialog recipe (header/title + close,
 * optional description, right-aligned Cancel/primary-action footer),
 * unlike the raw slot-based [KinetixDialog] it's built from. Composed
 * directly from [KinetixDialog]/[KinetixDialogHeader]/[KinetixDialogTitle]/
 * [KinetixDialogDescription]/[KinetixDialogFooter]/[KinetixButton] rather
 * than re-implemented — the source itself is just that same composition
 * over its own `Dialog` primitives. The header/body/footer hairline
 * dividers (`h-px w-full bg-border`) aren't reproduced: they're full-bleed
 * across the whole modal width in the source, which would mean bypassing
 * `KinetixDialog`'s own uniform content padding to draw them — not worth
 * giving up that reuse for; `KinetixDialog`'s existing spacing already
 * reads as a coherent modal without hard rules between sections.
 */
enum class KinetixModalType { Info, Confirmation, Warning, Destructive }

private fun defaultActionLabel(type: KinetixModalType): String = when (type) {
    KinetixModalType.Info -> "Got it"
    KinetixModalType.Confirmation -> "Confirm"
    KinetixModalType.Warning -> "Proceed"
    KinetixModalType.Destructive -> "Delete"
}

@Composable
fun KinetixModal(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    title: String,
    modifier: Modifier = Modifier,
    type: KinetixModalType = KinetixModalType.Info,
    description: String? = null,
    actionLabel: String? = null,
    cancelLabel: String = "Cancel",
    onAction: () -> Unit = {},
    onCancel: () -> Unit = {},
    content: (@Composable () -> Unit)? = null,
) {
    val showCancel = type != KinetixModalType.Info

    KinetixDialog(visible = visible, onDismissRequest = onDismissRequest, modifier = modifier) {
        KinetixDialogHeader {
            KinetixDialogTitle(text = title)
        }
        if (description != null) {
            KinetixDialogDescription(text = description)
        }
        content?.invoke()
        KinetixDialogFooter {
            if (showCancel) {
                KinetixButton(
                    onClick = { onCancel(); onDismissRequest() },
                    variant = KinetixButtonVariant.Outline,
                    size = KinetixButtonSize.Lg,
                ) {
                    Text(cancelLabel)
                }
            }
            KinetixButton(
                onClick = { onAction(); onDismissRequest() },
                variant = if (type == KinetixModalType.Destructive) KinetixButtonVariant.Destructive else KinetixButtonVariant.Primary,
                size = KinetixButtonSize.Lg,
            ) {
                Text(actionLabel ?: defaultActionLabel(type))
            }
        }
    }
}
