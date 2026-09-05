package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp

/**
 * KinetixPagination family — mirrors
 * `packages/ui/src/components/pagination.tsx`, which is itself just
 * `buttonVariants` recipes (`Outline`/`Ghost`, `icon` size) — reused here
 * directly through [KinetixButton] rather than re-deriving the same
 * colors/padding. `size-9` (36dp) isn't on the shared `spacing_*` scale —
 * hardcoded, same reasoning as `KinetixToggle`'s off-scale sizes. The
 * chevrons on Previous/Next are plain "‹"/"›" glyphs, not lucide icons —
 * no icon library wired in yet, same as `KinetixBreadcrumbSeparator`.
 */
@Composable
fun KinetixPagination(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
        content()
    }
}

@Composable
fun KinetixPaginationContent(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1))) {
        content()
    }
}

@Composable
fun KinetixPaginationLink(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isActive: Boolean = false,
) {
    KinetixButton(
        onClick = onClick,
        modifier = modifier.size(36.dp), // size-9, not on the shared scale
        variant = if (isActive) KinetixButtonVariant.Outline else KinetixButtonVariant.Ghost,
        size = KinetixButtonSize.Icon,
    ) {
        Text(text)
    }
}

@Composable
fun KinetixPaginationPrevious(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    KinetixButton(onClick = onClick, modifier = modifier, variant = KinetixButtonVariant.Ghost, size = KinetixButtonSize.Icon) {
        Row(horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1))) {
            Text("‹")
            Text("Previous")
        }
    }
}

@Composable
fun KinetixPaginationNext(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    KinetixButton(onClick = onClick, modifier = modifier, variant = KinetixButtonVariant.Ghost, size = KinetixButtonSize.Icon) {
        Row(horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1))) {
            Text("Next")
            Text("›")
        }
    }
}
