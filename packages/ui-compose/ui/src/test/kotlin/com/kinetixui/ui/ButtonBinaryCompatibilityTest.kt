package com.kinetixui.ui

import java.lang.reflect.Method
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `KinetixButton`'s published entry points, read off the compiled class.
 *
 * Same reasoning as [ThemeBinaryCompatibilityTest], applied to the `pending` addition. This artifact
 * is published to Maven, so an app can be compiled against one version and run against another, and
 * the JVM method descriptor is therefore part of the contract. Adding a defaulted `pending` parameter
 * to the existing `KinetixButton` would have kept every source call compiling while replacing the
 * descriptor — the breakage would appear later, in someone else's app, as `NoSuchMethodError`.
 *
 * So `pending` and `pendingLabel` live on a second overload with no defaults, and the original
 * delegates to it. A source-level test cannot tell that design from the broken one; this one can.
 */
class ButtonBinaryCompatibilityTest {
    private val buttonKt = Class.forName("com.kinetixui.ui.ButtonKt")

    /** Every emitted `KinetixButton`, including the synthetic `$lambda$N` helpers Compose generates. */
    private val entryPoints: List<Method>
        get() = buttonKt.declaredMethods.filter { it.name.startsWith("KinetixButton") && !it.name.contains("$") }

    private fun describe(m: Method) = "${m.name}(${m.parameterTypes.joinToString { it.simpleName }})"

    /** The `pending` overload is the only one taking a `String` — `pendingLabel`. */
    private fun Method.looksLikeThePendingOverload() = parameterTypes.any { it == String::class.java }

    @Test
    fun the_original_entry_point_is_still_emitted() {
        val original = entryPoints.filterNot { it.looksLikeThePendingOverload() }
        assertTrue(
            "The original KinetixButton, with no pendingLabel, is gone — an app compiled against the " +
                "previous release calls that descriptor. Emitted: " +
                entryPoints.joinToString(separator = "; ") { describe(it) },
            original.isNotEmpty(),
        )
    }

    @Test
    fun the_pending_overload_is_emitted_alongside_it() {
        val pending = entryPoints.filter { it.looksLikeThePendingOverload() }
        assertTrue(
            "No KinetixButton overload takes a pendingLabel String. Emitted: " +
                entryPoints.joinToString(separator = "; ") { describe(it) },
            pending.isNotEmpty(),
        )
    }

    @Test
    fun there_are_two_of_them_and_not_one() {
        // The failure this test exists for: someone collapses the two back into a single function
        // with `pending: Boolean? = null`, every call site still compiles, and the descriptor changes.
        assertTrue(
            "Expected two KinetixButton entry points, the original and the pending overload. Emitted: " +
                entryPoints.joinToString(separator = "; ") { describe(it) },
            entryPoints.size >= 2,
        )
    }
}
