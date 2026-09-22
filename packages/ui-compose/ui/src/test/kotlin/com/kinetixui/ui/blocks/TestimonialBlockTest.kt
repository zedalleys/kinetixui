package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixAvatar
import com.kinetixui.ui.KinetixAvatarFallback
import com.kinetixui.ui.KinetixQuote
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Testimonial" block shown on kinetixui.com/blocks as the Jetpack Compose implementation. This file is
// the source of truth: `pnpm gen:blocks` extracts the marked region into the website's generated snippet, and
// `pnpm check:blocks` fails if the two drift. The test below is what makes the snippet evidence rather than
// illustration — Gradle compiles it, so an API that no longer exists breaks CI instead of the documentation.
//
// kx-block:start
@Composable
fun TestimonialBlock() {
    KinetixQuote(
        text = "Good design is as little design as possible.",
        author = "Dieter Rams",
        authorTitle = "Industrial Designer",
        avatar = { KinetixAvatar { KinetixAvatarFallback("DR") } },
        modifier = Modifier.width(420.dp),
    )
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TestimonialBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_quote_author_and_avatar_fallback() {
        rule.setContent { KinetixTheme(darkTheme = false) { TestimonialBlock() } }
        rule.onNodeWithText("Good design is as little design as possible.").assertExists()
        rule.onNodeWithText("Dieter Rams").assertExists()
        rule.onNodeWithText("DR").assertExists()
    }
}
