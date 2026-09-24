package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixSkeleton
import com.kinetixui.ui.KinetixSpinner
import com.kinetixui.ui.KinetixSpinnerSize
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Loading state" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// A skeleton is a picture of nothing: it says "wait" to someone who can see the shapes and nothing at all to
// anyone who cannot. clearAndSetSemantics collapses the placeholders into one element that says so, instead
// of leaving TalkBack to walk six meaningless grey rectangles.
//
// kx-block:start
@Composable
fun LoadingStateBlock() {
    KinetixCard(Modifier.width(360.dp)) {
        KinetixCardHeader { KinetixCardTitle("Activity") }
        KinetixCardContent {
            Column(
                modifier = Modifier.clearAndSetSemantics { contentDescription = "Loading activity" },
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                repeat(3) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        // The shapes match what replaces them, so nothing moves when the data arrives.
                        KinetixSkeleton(Modifier.size(40.dp).clip(CircleShape))
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            KinetixSkeleton(Modifier.width(180.dp).height(16.dp))
                            KinetixSkeleton(Modifier.width(80.dp).height(12.dp))
                        }
                    }
                }
            }
        }
        KinetixCardFooter {
            KinetixButton(
                onClick = {},
                modifier = Modifier.fillMaxWidth(),
                variant = KinetixButtonVariant.Outline,
                enabled = false,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    KinetixSpinner(size = KinetixSpinnerSize.Sm)
                    Text("Loading")
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LoadingStateBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun the_placeholders_announce_as_one_thing_that_is_loading() {
        rule.setContent { KinetixTheme(darkTheme = false) { LoadingStateBlock() } }
        rule.onNodeWithContentDescription("Loading activity").assertIsDisplayed()
    }
}
