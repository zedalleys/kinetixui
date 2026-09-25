package com.kinetixui.ui

import java.lang.reflect.Method
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The published entry points, checked on the compiled class rather than in source.
 *
 * `packages/ui-compose` is published to Maven (`maven-publish` + `signing` in `ui/build.gradle.kts`), so
 * an app can be compiled against one version of this artifact and run against another. That makes the JVM
 * method descriptor part of the contract, and it is a part Kotlin will let you change without a word:
 * adding a defaulted parameter to a public function keeps every SOURCE call compiling while replacing
 * the descriptor, so the breakage only appears at runtime, in someone else's app, as `NoSuchMethodError`.
 *
 * That is exactly what adding `light` / `dark` to the original `KinetixTheme` would have done — which is
 * why they live on a second overload and the original delegates. A source-level test cannot tell the
 * difference between the two designs; this one can, because it reads the methods the compiler actually
 * emitted.
 *
 * There is no binary-compatibility-validator or metalava in this project, and adding one for a single
 * function would be a large dependency for a small guarantee. `java.lang.Class` is enough.
 */
class ThemeBinaryCompatibilityTest {
    private val themeKt = Class.forName("com.kinetixui.ui.ThemeKt")

    /** Every emitted `KinetixTheme`, including the synthetic `$lambda$N` helpers Compose generates. */
    private val entryPoints: List<Method>
        get() = themeKt.declaredMethods.filter { it.name.startsWith("KinetixTheme") }

    private fun Method.colorParameterCount() = parameterTypes.count { it == KinetixColors::class.java }

    /** Readable in a failure message — the whole point is to say what the compiler emitted instead. */
    private fun describe(m: Method) = "${m.name}(${m.parameterTypes.joinToString { it.simpleName }})"

    @Test
    fun the_original_entry_point_is_still_emitted() {
        // The pre-existing signature: a Boolean and the content lambda, and NO KinetixColors. An app
        // compiled against the previous release calls this descriptor.
        val original = entryPoints.filter { !it.name.contains("$") && it.colorParameterCount() == 0 }
        assertTrue(
            "The original KinetixTheme(darkTheme, content) is gone. Emitted: " +
                entryPoints.joinToString(separator = "; ") { describe(it) },
            original.isNotEmpty(),
        )
        assertTrue(
            "The original entry point should still take a Boolean first — got " +
                original.joinToString(separator = "; ") { describe(it) },
            original.any { it.parameterTypes.firstOrNull() == Boolean::class.javaPrimitiveType },
        )
    }

    @Test
    fun the_custom_theme_overload_is_emitted_alongside_it() {
        val custom = entryPoints.filter { !it.name.contains("$") && it.colorParameterCount() == 2 }
        assertTrue(
            "No KinetixTheme overload takes a light and a dark KinetixColors. Emitted: " +
                entryPoints.joinToString(separator = "; ") { describe(it) },
            custom.isNotEmpty(),
        )
    }

    @Test
    fun the_two_are_separate_functions_not_one_widened_one() {
        // If someone later "simplifies" this back into a single function with defaulted colour
        // parameters, every assertion above still passes except this one: there would be no overload
        // left that takes zero KinetixColors.
        val shapes = entryPoints.filter { !it.name.contains("$") }.map { it.colorParameterCount() }.toSet()
        assertEquals(
            "Expected both a 0-colour and a 2-colour entry point. Emitted: " +
                entryPoints.joinToString(separator = "; ") { describe(it) },
            setOf(0, 2),
            shapes,
        )
    }

    @Test
    fun the_original_descriptor_is_exactly_what_it_was() {
        // Pinned, not merely present. The pre-existing public function compiles to
        // `KinetixTheme(boolean, Function2, Composer, int, int)` — the two trailing ints being Compose's
        // `$changed` and `$default` masks — and that is the descriptor an already-published app calls.
        //
        // Note there is no separate `$default` BRIDGE to check: the Compose compiler folds default
        // arguments into a trailing mask parameter on the function itself rather than emitting the
        // `name$default` method plain Kotlin would. An earlier version of this test looked for bridges
        // and failed, which is the useful kind of failure — the assertion now describes the real ABI.
        val original = entryPoints.single { !it.name.contains("$") && it.colorParameterCount() == 0 }
        assertEquals(
            "The original KinetixTheme descriptor changed — an app compiled against a previous release " +
                "would fail with NoSuchMethodError. Emitted: " + describe(original),
            listOf("boolean", "Function2", "Composer", "int", "int"),
            original.parameterTypes.map { it.simpleName },
        )
    }

    @Test
    fun both_public_overloads_still_carry_a_defaults_mask() {
        // The trailing `int` beyond `$changed` is what lets a caller omit `darkTheme`. Losing it would
        // break `KinetixTheme { … }` and `KinetixTheme(light, dark) { … }` alike.
        val public = entryPoints.filter { !it.name.contains("$") }
        assertEquals("Expected exactly two public overloads. Emitted: " +
            public.joinToString(separator = "; ") { describe(it) }, 2, public.size)

        for (m in public) {
            val tail = m.parameterTypes.takeLast(3).map { it.simpleName }
            assertEquals(
                "${describe(m)} should end with Composer, \$changed, \$default",
                listOf("Composer", "int", "int"),
                tail,
            )
        }
    }
}
