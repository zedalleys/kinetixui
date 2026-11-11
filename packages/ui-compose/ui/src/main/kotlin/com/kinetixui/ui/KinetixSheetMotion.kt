package com.kinetixui.ui

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.SheetState
import androidx.compose.ui.MotionDurationScale
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.withContext

/** Preserve Material3's native spatial scheme and gesture physics. Its 1.4
 * timing hooks are internal, so pretending to install slow/base tokens would
 * be false. Reduced motion reaches the target without positional travel. */
@OptIn(ExperimentalMaterial3Api::class)
object KinetixSheetMotion {
    fun context(reduceMotion: Boolean): CoroutineContext =
        if (reduceMotion) object : MotionDurationScale { override val scaleFactor = 0f }
        else EmptyCoroutineContext

    suspend fun show(state: SheetState, reduceMotion: Boolean) =
        withContext(context(reduceMotion)) { state.show() }

    suspend fun hide(state: SheetState, reduceMotion: Boolean) =
        withContext(context(reduceMotion)) { state.hide() }
}
