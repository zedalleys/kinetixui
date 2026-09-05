package com.kinetixui.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixDrawer family — mirrors `packages/ui/src/components/drawer.tsx`
 * (a themed `vaul` `Drawer`). `vaul`'s Drawer is a bottom-anchored,
 * drag-handled panel with rounded top corners — which on Android is
 * exactly [KinetixSheet] (Material3's `ModalBottomSheet`, drag handle on
 * by default). So there's nothing to re-implement: these are thin
 * pass-throughs to the `KinetixSheet*` family, kept only so code ported
 * from the React `Drawer` compiles unchanged. The one `vaul`-specific
 * knob, `shouldScaleBackground` (scaling the page behind the drawer), has
 * no `ModalBottomSheet` equivalent and isn't reproduced.
 */
@Composable
fun KinetixDrawer(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    KinetixSheet(visible = visible, onDismissRequest = onDismissRequest, modifier = modifier, content = content)
}

@Composable
fun KinetixDrawerHeader(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    KinetixSheetHeader(modifier = modifier, content = content)
}

@Composable
fun KinetixDrawerFooter(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    KinetixSheetFooter(modifier = modifier, content = content)
}

@Composable
fun KinetixDrawerTitle(text: String, modifier: Modifier = Modifier) {
    KinetixSheetTitle(text = text, modifier = modifier)
}

@Composable
fun KinetixDrawerDescription(text: String, modifier: Modifier = Modifier) {
    KinetixSheetDescription(text = text, modifier = modifier)
}
