package com.kinetixui.ui

import java.lang.reflect.Method
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The published `KinetixToggleGroup` entry points, checked on the compiled class.
 *
 * The same hazard `ThemeBinaryCompatibilityTest` documents, on a second function: `packages/ui-compose`
 * is published to Maven, so adding `accessibleLabel` to the original signature would have kept every
 * SOURCE call compiling while replacing the JVM method descriptor, and an app compiled against an
 * earlier version of the artifact would have failed at runtime with `NoSuchMethodError`. MX1d added the
 * name on a second overload for that reason; a source-level test cannot tell the two designs apart,
 * so this one reads the methods the compiler emitted.
 */
class ToggleGroupBinaryCompatibilityTest {
    private val toggleGroupKt = Class.forName("com.kinetixui.ui.ToggleGroupKt")

    /**
     * The emitted `KinetixToggleGroup` methods. Matched by prefix rather than by equality, because the
     * Compose compiler may mangle a composable's name, and then filtered: `KinetixToggleGroupItem` is a
     * different function, and `$` names are the synthetic `$default` helpers and lambdas.
     */
    private val entryPoints: List<Method>
        get() = toggleGroupKt.declaredMethods.filter {
            it.name.startsWith("KinetixToggleGroup") &&
                !it.name.startsWith("KinetixToggleGroupItem") &&
                !it.name.contains("$")
        }

    private fun Method.stringParameterCount() = parameterTypes.count { it == String::class.java }

    private fun describe(m: Method) = "${m.name}(${m.parameterTypes.joinToString { it.simpleName }})"

    @Test
    fun the_unnamed_entry_point_is_still_emitted() {
        // The pre-MX1d signature: no String parameter. An app compiled against the previous release
        // calls this descriptor, and it has to still be there.
        assertTrue(
            "KinetixToggleGroup with no accessibleLabel is gone — a consumer compiled against the " +
                "previous artifact would hit NoSuchMethodError. Emitted: " +
                entryPoints.joinToString(separator = "; ") { describe(it) },
            entryPoints.any { it.stringParameterCount() == 0 },
        )
    }

    @Test
    fun the_named_overload_is_emitted_alongside_it() {
        assertTrue(
            "No KinetixToggleGroup overload takes an accessibleLabel. Emitted: " +
                entryPoints.joinToString(separator = "; ") { describe(it) },
            entryPoints.any { it.stringParameterCount() == 1 },
        )
    }
}
