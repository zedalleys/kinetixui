package com.kinetixui.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource

/**
 * KinetixToaster / kinetixToast — mirrors
 * `packages/ui/src/components/sonner.tsx`, itself a themed wrapper around
 * the `sonner` npm library. Compose's own `SnackbarHostState`/`SnackbarHost`
 * already provide exactly what `sonner` provides on the web — a real
 * queue (one toast at a time, next one waits), auto-dismiss timing, and
 * swipe-to-dismiss — so this wraps that machinery directly rather than
 * hand-rolling a toast queue, the same "reuse the platform's queue/overlay
 * machinery" call [KinetixSlider]/[KinetixDialog] made elsewhere.
 * `actionButton`/`cancelButton` styling collapses into `Snackbar`'s own
 * `actionColor` — Material3's snackbar has one action slot, not
 * sonner's separate action/cancel buttons.
 */
@Composable
fun KinetixToaster(
    hostState: SnackbarHostState,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    SnackbarHost(hostState = hostState, modifier = modifier) { data ->
        Snackbar(
            snackbarData = data,
            shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md)),
            containerColor = colors.background,
            contentColor = colors.foreground,
            actionColor = colors.primary,
        )
    }
}

suspend fun kinetixToast(
    hostState: SnackbarHostState,
    message: String,
    actionLabel: String? = null,
    withDismissAction: Boolean = false,
    duration: SnackbarDuration = SnackbarDuration.Short,
): SnackbarResult = hostState.showSnackbar(
    message = message,
    actionLabel = actionLabel,
    withDismissAction = withDismissAction,
    duration = duration,
)
