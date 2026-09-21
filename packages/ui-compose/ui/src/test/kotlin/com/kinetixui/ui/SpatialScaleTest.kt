package com.kinetixui.ui

import com.kinetixui.tokens.KinetixRadius
import com.kinetixui.tokens.KinetixSpacing
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The spatial scale reaches Compose as `KinetixSpacing` / `KinetixRadius`, generated from the same tokens as web,
 * SwiftUI and Flutter. KinetixUI's grid is 8-unit with a 4-unit half-step, so every value is a multiple of 4.
 */
class SpatialScaleTest {
    private val spacing = listOf(
        "space0" to KinetixSpacing.space0, "space1" to KinetixSpacing.space1, "space2" to KinetixSpacing.space2,
        "space3" to KinetixSpacing.space3, "space4" to KinetixSpacing.space4, "space5" to KinetixSpacing.space5,
        "space6" to KinetixSpacing.space6, "space7" to KinetixSpacing.space7, "space8" to KinetixSpacing.space8,
        "space10" to KinetixSpacing.space10, "space12" to KinetixSpacing.space12, "space16" to KinetixSpacing.space16,
        "space20" to KinetixSpacing.space20, "space24" to KinetixSpacing.space24, "space32" to KinetixSpacing.space32,
    )

    @Test
    fun every_spacing_step_is_a_multiple_of_four() {
        for ((name, value) in spacing) assertEquals("$name = $value is off the 4-unit grid", 0f, value % 4f, 0f)
    }

    @Test
    fun spacing_step_number_is_value_over_four() {
        // spaceN = N x 4 (the numbering Tailwind uses), so a token name always tells you its value
        for ((name, value) in spacing) assertEquals(name, name.removePrefix("space").toFloat() * 4f, value, 0f)
    }

    @Test
    fun radii_are_on_the_grid_except_none_and_full() {
        val radii = listOf(
            "sm" to KinetixRadius.sm, "md" to KinetixRadius.md, "lg" to KinetixRadius.lg,
            "xl" to KinetixRadius.xl, "xxl" to KinetixRadius.xxl,
        )
        for ((name, value) in radii) assertEquals("radius $name = $value is off the grid", 0f, value % 4f, 0f)
        assertEquals(0f, KinetixRadius.none, 0f)
        assertTrue("full is a pill / circle", KinetixRadius.full > KinetixRadius.xxl)
    }

    @Test
    fun radius_role_aliases_point_at_their_steps() {
        assertEquals(KinetixRadius.sm, KinetixRadius.field, 0f)
        assertEquals(KinetixRadius.md, KinetixRadius.control, 0f)
        assertEquals(KinetixRadius.lg, KinetixRadius.container, 0f)
        assertEquals(KinetixRadius.xl, KinetixRadius.surface, 0f)
    }
}
