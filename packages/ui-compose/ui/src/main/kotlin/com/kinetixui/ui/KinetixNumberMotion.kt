package com.kinetixui.ui

import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.tween
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing

object KinetixNumberMotion {
    fun spec(reduceMotion: Boolean): FiniteAnimationSpec<Float> =
        tween(if (reduceMotion) 0 else KinetixDuration.base, easing = KinetixEasing.linear)
}
