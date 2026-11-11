package com.kinetixui.ui

import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing

/** Determinate progress, independent from the indeterminate loop role. */
object KinetixProgressMotion {
    fun fraction(value: Float): Float = if (value.isNaN()) 0f else (value / 100f).coerceIn(0f, 1f)
    fun spec(reduceMotion: Boolean): FiniteAnimationSpec<Float> =
        tween(if (reduceMotion) 0 else KinetixDuration.base, easing = KinetixEasing.linear)

    @Composable
    fun animatedFraction(value: Float, reduceMotion: Boolean): Float = key(reduceMotion) {
        // A preference change starts at the exact target, so restoring motion
        // cannot replay interpolation that began before reduction.
        val target = fraction(value)
        val displayed by animateFloatAsState(target, spec(reduceMotion), label = "Kinetix progress")
        if (reduceMotion) target else displayed
    }
}
