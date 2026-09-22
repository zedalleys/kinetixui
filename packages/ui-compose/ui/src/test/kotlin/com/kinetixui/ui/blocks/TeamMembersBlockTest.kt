package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixAvatar
import com.kinetixui.ui.KinetixAvatarFallback
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonSize
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixList
import com.kinetixui.ui.KinetixListItem
import com.kinetixui.ui.KinetixSeparator
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Team members" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// kx-block:start
data class TeamMember(val name: String, val role: String, val initials: String)

@Composable
fun TeamMembersBlock(
    team: List<TeamMember> = listOf(
        TeamMember("Ada Lovelace", "Owner", "AL"),
        TeamMember("Grace Hopper", "Admin", "GH"),
        TeamMember("Alan Turing", "Member", "AT"),
    ),
    onRemove: (TeamMember) -> Unit = {},
) {
    KinetixCard(Modifier.width(360.dp)) {
        KinetixCardHeader { KinetixCardTitle("Team") }
        KinetixSeparator()
        KinetixList {
            team.forEach { member ->
                KinetixListItem(
                    title = member.name,
                    description = member.role,
                    leading = { KinetixAvatar { KinetixAvatarFallback(member.initials) } },
                    trailing = {
                        KinetixButton(
                            { onRemove(member) },
                            variant = KinetixButtonVariant.Ghost,
                            size = KinetixButtonSize.Sm,
                        ) { Text("Remove") }
                    },
                )
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TeamMembersBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_every_member_with_their_role() {
        rule.setContent { KinetixTheme(darkTheme = false) { TeamMembersBlock() } }
        rule.onNodeWithText("Team").assertExists()
        rule.onNodeWithText("Ada Lovelace").assertExists()
        rule.onNodeWithText("Owner").assertExists()
        rule.onNodeWithText("Alan Turing").assertExists()
    }
}
