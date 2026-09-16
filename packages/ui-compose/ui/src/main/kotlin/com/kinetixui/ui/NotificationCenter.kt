package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixNotificationCenter family — mirrors
 * `packages/ui/src/components/notification-center.tsx`: a bell trigger
 * opening a popover list of read/unread items with a "mark all read"
 * action. Built directly on [KinetixDropdownMenu] — the same "it's
 * already the thing we built" reuse [KinetixSelect] made — with the
 * caller owning `expanded`/`onDismissRequest`, same convention as every
 * other anchored-popover composable here. No icon library wired in yet
 * (same documented gap as [KinetixInform]) — the bell is a plain glyph.
 */
@Composable
fun KinetixNotificationCenterTrigger(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    unreadCount: Int = 0,
) {
    val colors = KinetixColorScheme.current
    Box(modifier = modifier) {
        KinetixButton(onClick, variant = KinetixButtonVariant.Ghost, size = KinetixButtonSize.Icon) {
            Text("🔔", fontSize = 18.sp)
        }
        if (unreadCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp)
                    .size(8.dp)
                    .border(2.dp, colors.background, CircleShape)
                    .background(colors.destructive, CircleShape),
            )
        }
    }
}

@Composable
fun KinetixNotificationCenter(
    expanded: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    onMarkAllRead: (() -> Unit)? = null,
    trigger: @Composable () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current

    KinetixDropdownMenu(visible = expanded, onDismissRequest = onDismissRequest, modifier = modifier, anchor = trigger) {
        Column(modifier = Modifier.widthIn(min = 320.dp)) {
            Row(
                modifier = Modifier
                    .padding(horizontal = dimensionResource(R.dimen.spacing_4), vertical = dimensionResource(R.dimen.spacing_3)),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Notifications",
                    color = colors.foreground,
                    fontWeight = FontWeight.Medium,
                    fontSize = dimensionResource(R.dimen.font_size_title_sm).value.sp,
                )
                if (onMarkAllRead != null) {
                    Text(
                        text = "Mark all read",
                        color = colors.primary,
                        fontWeight = FontWeight.Medium,
                        fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                        modifier = Modifier.clickable(onClick = onMarkAllRead),
                    )
                }
            }
            Column(modifier = Modifier.heightIn(max = 320.dp), content = content)
        }
    }
}

@Composable
fun KinetixNotificationItem(
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    time: String? = null,
    unread: Boolean = false,
    onSelect: (() -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    Row(
        modifier = modifier
            .clickable(enabled = onSelect != null, onClick = { onSelect?.invoke() })
            .padding(horizontal = dimensionResource(R.dimen.spacing_4), vertical = dimensionResource(R.dimen.spacing_3)),
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3)),
    ) {
        Box(
            modifier = Modifier
                .padding(top = 6.dp)
                .size(8.dp)
                .background(if (unread) colors.primary else Color.Transparent, CircleShape),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = colors.foreground,
                fontWeight = if (unread) FontWeight.Medium else FontWeight.Normal,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (description != null) {
                Text(
                    text = description,
                    color = colors.mutedForeground,
                    fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (time != null) {
                Text(
                    text = time,
                    color = colors.mutedForeground,
                    fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
                )
            }
        }
    }
}
