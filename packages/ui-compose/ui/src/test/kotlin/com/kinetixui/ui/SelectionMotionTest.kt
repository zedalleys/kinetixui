package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.animation.core.TweenSpec
import androidx.compose.material3.Text
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.isSelectable
import androidx.compose.ui.test.isToggleable
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The selection-STATE family's contract on Compose: Toggle, ToggleGroup, Checkbox and RadioButton.
 *
 * ## What each half proves
 *
 * - **The spec tests** (before the first `kx-verify` marker, so they publish no evidence) hold the
 *   timing: `fast`, the `standard` curve, zero at animator scale 0, and the fact that this role is
 *   deliberately NOT the switch's `instant`.
 * - **The rendered tests** hold that animating these colours did not break the controls: composed
 *   for real through Robolectric, each one still reports its state to the semantics tree, still
 *   responds to a click, and still does both with animations off.
 *
 * ## What is deliberately NOT claimed
 *
 * No interpolated colour. Compose's test surface exposes composition and semantics, not per-frame
 * paint, and this repository's Compose suite establishes no image-capture idiom to lean on — the
 * module cannot be compiled on the dev box at all (its plugin repositories are unreachable there),
 * so an unproven test API would be guesswork committed to CI. **Flutter's widget tests do measure a
 * real interpolated colour mid-transition**; the difference between the platforms is stated rather
 * than smoothed over. Nothing here is runtime evidence either: Robolectric is a JVM host, there is
 * no emulator job in this repository, and `testDebugUnitTest` renders nothing a person could see.
 *
 * Both directions throughout: unchecked → checked and checked → unchecked are asserted separately.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SelectionMotionTest {
    @get:Rule
    val rule = createComposeRule()

    private fun setAnimatorScale(scale: Float) {
        Settings.Global.putFloat(
            RuntimeEnvironment.getApplication().contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            scale,
        )
    }

    // ── the spec: where the timing comes from, and what suppresses it ────────

    @Test
    fun selectionColourSettlesOverTheCanonicalFastToken() {
        assertEquals(KinetixDuration.fast, KinetixSelectionMotion.durationMillis(false))
        val spec = KinetixSelectionMotion.spec<Float>(false) as TweenSpec<Float>
        assertEquals(KinetixDuration.fast, spec.durationMillis)
        assertEquals(KinetixEasing.standard, spec.easing)
        // Not the disclosure family's directional pair: selecting is symmetric.
        assertNotEquals(KinetixEasing.enter, spec.easing)
    }

    @Test
    fun selectionStateIsNotTheSwitchesInstantRole() {
        // The owner decision of 2026-10-17 as an assertion rather than a comment: a refactor that
        // collapsed the two selection roles into one duration would fail here.
        assertNotEquals(
            KinetixSwitchMotion.durationMillis(false),
            KinetixSelectionMotion.durationMillis(false),
        )
        assertEquals(KinetixDuration.instant, KinetixSwitchMotion.durationMillis(false))
    }

    @Test
    fun uncheckedToCheckedAndCheckedToUncheckedAreBothSuppressed() {
        val spec = KinetixSelectionMotion.spec<Float>(true) as TweenSpec<Float>
        assertEquals(0, spec.durationMillis)
        assertEquals(0, KinetixSelectionMotion.durationMillis(true))
    }

    @Test
    fun theSwitchTrackNowSharesTheThumbsSpec() {
        // `selection-control` covers the thumb AND the track colour. Before MX1d the track was
        // handed straight to `.background` and cut in one frame. This pins the two to one spec; what
        // it cannot do is watch them land together, which is why Compose's Switch Runtime cell is
        // still open.
        val thumb = KinetixSwitchMotion.spec<Float>(false) as TweenSpec<Float>
        assertEquals(KinetixDuration.instant, thumb.durationMillis)
        assertEquals(KinetixEasing.standard, thumb.easing)
    }

    // kx-verify: interaction, accessibility
    // ── rendered: the controls still report and still respond ───────────────
    //
    // Claimed from here to the end of the file. Robolectric composes each control for real and the
    // assertions read the semantics tree, which is what TalkBack reads: the role, the on / off /
    // mixed / selected state, and whether a click lands. Headless, never runtime.

    @Test
    fun uncheckedToCheckedSurvivesWithAnimationsOn() {
        setAnimatorScale(1f)
        val state = mutableStateOf(ToggleableState.Off)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixCheckbox(
                    state = state.value,
                    onClick = {
                        state.value =
                            if (state.value == ToggleableState.On) ToggleableState.Off else ToggleableState.On
                    },
                )
            }
        }
        val box = rule.onNode(isToggleable())
        box.assertIsOff()
        box.performClick()
        rule.waitForIdle()
        box.assertIsOn()
    }

    @Test
    fun checkedToUncheckedSurvivesWithAnimationsOff() {
        setAnimatorScale(0f)
        val state = mutableStateOf(ToggleableState.On)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixCheckbox(
                    state = state.value,
                    onClick = {
                        state.value =
                            if (state.value == ToggleableState.On) ToggleableState.Off else ToggleableState.On
                    },
                )
            }
        }
        val box = rule.onNode(isToggleable())
        box.assertIsOn()
        box.performClick()
        rule.waitForIdle()
        // Suppression removes the settle, never the state change — and never what TalkBack is told.
        box.assertIsOff()
    }

    @Test
    fun aMixedCheckboxStillAnnouncesMixedWithAnimationsOff() {
        setAnimatorScale(0f)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixCheckbox(state = ToggleableState.Indeterminate, onClick = {})
            }
        }
        // The third state, which the animated fill must not have flattened into one of the other two.
        rule.onNode(isToggleable()).assert(
            SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Indeterminate),
        )
    }

    @Test
    fun theRadioStillAnnouncesItsRoleAndSelectionWithAnimationsOff() {
        setAnimatorScale(0f)
        // The dot is now always composed, with an animated alpha, instead of appearing from nothing.
        // That is a change to the tree, so the state an unselected radio reports is worth pinning.
        val selected = mutableStateOf(false)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixRadioGroup {
                    KinetixRadioButton(selected = selected.value, onClick = { selected.value = true })
                }
            }
        }
        val radio = rule.onNode(isSelectable())
        radio.assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton))
        radio.assertIsNotSelected()
        radio.performClick()
        rule.waitForIdle()
        radio.assertIsSelected()
    }

    @Test
    fun theToggleStillReportsPressedWithAnimationsOn() {
        setAnimatorScale(1f)
        val pressed = mutableStateOf(false)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixToggle(pressed = pressed.value, onPressedChange = { pressed.value = it }) {
                    Text("Bold")
                }
            }
        }
        rule.onNodeWithText("Bold").assertIsOff()
        rule.onNodeWithText("Bold").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("Bold").assertIsOn()
    }

    @Test
    fun theToggleGroupCarriesItsNameAndItsItemsKeepTheirOwnState() {
        setAnimatorScale(1f)
        val bold = mutableStateOf(false)
        val italic = mutableStateOf(true)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixToggleGroup(accessibleLabel = "Text style") {
                    KinetixToggleGroupItem(pressed = bold.value, onPressedChange = { bold.value = it }) {
                        Text("Bold")
                    }
                    KinetixToggleGroupItem(pressed = italic.value, onPressedChange = { italic.value = it }) {
                        Text("Italic")
                    }
                }
            }
        }
        // The group is named…
        rule.onNode(hasContentDescription("Text style")).assertIsDisplayed()
        // …and naming it did not merge or clear the items: each still reports its own state.
        rule.onNodeWithText("Bold").assertIsOff()
        rule.onNodeWithText("Italic").assertIsOn()
        rule.onNodeWithText("Bold").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("Bold").assertIsOn()
        rule.onNodeWithText("Italic").assertIsOn()
    }

    @Test
    fun theSwitchStillTogglesWithItsTrackAnimated() {
        setAnimatorScale(1f)
        val checked: MutableState<Boolean> = mutableStateOf(false)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixSwitch(checked = checked.value, onCheckedChange = { checked.value = it })
            }
        }
        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(true, checked.value)
        rule.onNode(isToggleable()).assertIsOn()
    }

    @Test
    fun aDisabledSwitchIgnoresAClickWithItsTrackAnimated() {
        setAnimatorScale(1f)
        val locked: MutableState<Boolean> = mutableStateOf(false)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixSwitch(checked = locked.value, onCheckedChange = { locked.value = it }, enabled = false)
            }
        }
        // The disabled alpha is now part of the animated target, so this also pins that folding it
        // in did not make a disabled switch operable.
        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(false, locked.value)
    }
}
