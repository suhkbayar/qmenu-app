package com.mn.qmenu.selforder.kiosk

import android.app.Activity
import android.app.ActivityManager
import android.os.Handler
import android.os.Looper
import android.util.Log

// While another screen is still on top, try again this often, for up to RETRY_MS × MAX_TRIES
private const val RETRY_MS = 500L
private const val MAX_TRIES = 20

/**
 * Locks the app into kiosk mode. Android only locks the screen that's on top and throws "Invalid task,
 * not in foreground" otherwise, as when the app opens right after an update installs and Android is
 * still putting it back. Uncaught, that crashed the app at every start and left tablets on a white
 * screen; instead it tries again shortly, while the app is still on screen.
 */
internal object LockTask {

    private val handler = Handler(Looper.getMainLooper())

    fun start(activity: Activity, tries: Int = 0) {
        if (activity.isFinishing || activity.isDestroyed || isLocked(activity)) return
        try {
            activity.startLockTask()
        } catch (e: RuntimeException) {
            if (tries >= MAX_TRIES) {
                Log.w("Kiosk", "Couldn't start kiosk mode", e)
                return
            }
            handler.postDelayed({ start(activity, tries + 1) }, RETRY_MS)
        }
    }

    private fun isLocked(activity: Activity) =
        activity.getSystemService(ActivityManager::class.java)?.lockTaskModeState
            .let { it != null && it != ActivityManager.LOCK_TASK_MODE_NONE }
}
