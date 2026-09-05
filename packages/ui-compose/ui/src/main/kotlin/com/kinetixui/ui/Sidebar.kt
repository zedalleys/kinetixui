package com.kinetixui.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.DrawerState
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixSidebar family — a **scoped** port of
 * `packages/ui/src/components/sidebar.tsx` (a 390-line desktop-web
 * dashboard shell — `SidebarProvider`/`useSidebar` context, cookie
 * persistence, a keyboard shortcut, responsive mobile/desktop switching,
 * collapse-to-icon rail mode, `SidebarInset`). None of that transfers to
 * a phone-first native package. What ports cleanly is the nav drawer
 * itself: this wraps Material3's `ModalNavigationDrawer` +
 * `NavigationDrawerItem` (both stable) — the idiomatic Android equivalent
 * — and re-themes them, the same "reuse the platform's widget, restyle
 * it" call `KinetixCalendar`/`KinetixSlider` make. The caller owns the
 * `DrawerState` (`rememberDrawerState(DrawerValue.Closed)` and
 * `scope.launch { drawerState.open() }`), same as `KinetixCarousel`'s
 * `PagerState`. Rail/icon-collapse mode, `SidebarInset`, the cookie and
 * the shortcut aren't ported — desktop-web concerns.
 */
@Composable
fun KinetixSidebar(
    drawerState: DrawerState,
    content: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    header: (@Composable ColumnScope.() -> Unit)? = null,
    footer: (@Composable ColumnScope.() -> Unit)? = null,
    drawerContent: @Composable ColumnScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current

    ModalNavigationDrawer(
        drawerState = drawerState,
        modifier = modifier,
        scrimColor = colors.foreground.copy(alpha = 0.4f),
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = colors.background,
                drawerContentColor = colors.foreground,
            ) {
                Column(modifier = Modifier.fillMaxHeight().padding(dimensionResource(R.dimen.spacing_2))) {
                    if (header != null) header()
                    Column(modifier = Modifier.weight(1f)) { drawerContent() }
                    if (footer != null) footer()
                }
            }
        },
        content = content,
    )
}

@Composable
fun KinetixSidebarGroup(
    modifier: Modifier = Modifier,
    title: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    Column(modifier = modifier) {
        if (title != null) {
            Text(
                text = title,
                color = colors.mutedForeground,
                fontWeight = FontWeight.Medium,
                fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
                modifier = Modifier.padding(
                    horizontal = dimensionResource(R.dimen.spacing_3),
                    vertical = dimensionResource(R.dimen.spacing_2),
                ),
            )
        }
        content()
    }
}

@Composable
fun KinetixSidebarMenuItem(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: (@Composable () -> Unit)? = null,
    badge: String? = null,
) {
    val colors = KinetixColorScheme.current
    NavigationDrawerItem(
        label = { Text(label) },
        selected = selected,
        onClick = onClick,
        modifier = modifier,
        icon = icon,
        badge = if (badge != null) {
            { Text(badge) }
        } else {
            null
        },
        colors = NavigationDrawerItemDefaults.colors(
            selectedContainerColor = colors.accent,
            unselectedContainerColor = Color.Transparent,
            selectedTextColor = colors.accentForeground,
            unselectedTextColor = colors.foreground,
            selectedIconColor = colors.accentForeground,
            unselectedIconColor = colors.mutedForeground,
            selectedBadgeColor = colors.accentForeground,
            unselectedBadgeColor = colors.mutedForeground,
        ),
    )
}
