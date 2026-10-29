package com.mn.qmenu.selforder.kiosk

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.os.SystemClock
import android.util.Log

private const val PREFS = "kiosk"
private const val LAST_CRASH_AT = "lastCrashAt"
private const val LAST_CRASH_MESSAGE = "lastCrashMessage"
private const val CRASH_RESTARTS = "crashRestarts"
private const val RELAUNCH_REQUEST = 7001

// More restarts after errors than this within the window, and the next one waits longer, so an
// error at every start can't restart the app over and over
private const val QUICK_RESTARTS = 3
private const val WINDOW_MS = 10 * 60 * 1000L
private const val QUICK_DELAY_MS = 1_500L
private const val SLOW_DELAY_MS = 30_000L
// How much later the alarm opens the app, in case the process dies before it restarts itself
private const val SAFETY_MS = 4_000L
// The restart helper starts in a process of its own, which takes a moment on the tablets; if it
// hasn't ended this process by then, this process ends itself and the alarm takes over
private const val HELPER_WAIT_MS = 3_000L

/**
 * Starts the app afresh after an error, in a new process. React Native shuts the app's JavaScript
 * down after an error in native code (a module, a web view, the drawing of a screen) and then neither
 * crashes nor recovers: the tablet sat on a black screen until it was switched off. A crash that ends
 * the process has Android open the app again. Also the admin menu's restart.
 */
internal object AppRestarter {

    @Volatile
    private var restarting = false

    /** The last error, kept for the admin dialog: what to tell support. */
    fun recordCrash(context: Context, message: String) {
        prefs(context).edit()
            .putLong(LAST_CRASH_AT, System.currentTimeMillis())
            .putString(LAST_CRASH_MESSAGE, message.take(500))
            .commit()
    }

    fun lastCrash(context: Context): Map<String, Any>? {
        val prefs = prefs(context)
        val at = prefs.getLong(LAST_CRASH_AT, 0L)
        if (at == 0L) return null
        return mapOf("at" to at.toDouble(), "message" to (prefs.getString(LAST_CRASH_MESSAGE, null) ?: ""))
    }

    /** React Native shut the app down after an error: note it, then restart, later if it keeps happening. */
    fun restartAfterCrash(context: Context, error: Throwable) {
        if (restarting) return
        restarting = true
        Log.e("Kiosk", "Restarting after an error", error)
        recordCrash(context, describe(error))
        val delay = nextDelay(context)
        // expo-updates may still end the process itself first (in its first seconds): Android opens the app then
        scheduleRelaunch(context, delay + SAFETY_MS)
        // A moment first, so expo-updates can mark a broken update as failed and roll it back
        Handler(Looper.getMainLooper()).postDelayed({ restart(context) }, delay)
    }

    /** A crash about to end the process: Android is asked to open the app again shortly after. */
    fun relaunchAfterCrash(context: Context, error: Throwable) {
        if (restarting) return
        restarting = true
        recordCrash(context, describe(error))
        scheduleRelaunch(context, nextDelay(context))
    }

    /**
     * A fresh start: a helper in a process of its own (RestartActivity) ends this one, then opens the
     * app again, which locks it back into kiosk mode as it opens. Should the helper not start, this
     * process ends itself shortly after and the alarm opens the app instead.
     */
    fun restart(context: Context) {
        scheduleRelaunch(context, SAFETY_MS)
        runCatching {
            context.startActivity(
                Intent(context, RestartActivity::class.java)
                    .putExtra(RestartActivity.EXTRA_PID, Process.myPid())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }.onFailure { Log.w("Kiosk", "Couldn't start the restart helper", it) }
        // The helper ends this process well before this; if it never ran, this process goes itself
        Handler(Looper.getMainLooper()).postDelayed({ Process.killProcess(Process.myPid()) }, HELPER_WAIT_MS)
    }

    /** The app opened again by itself, so the safety alarm isn't needed. */
    fun cancelRelaunch(context: Context) {
        val pending = relaunchIntent(context) ?: return
        context.getSystemService(AlarmManager::class.java)?.cancel(pending)
    }

    private fun scheduleRelaunch(context: Context, delayMs: Long) {
        val pending = relaunchIntent(context) ?: return
        runCatching {
            context.getSystemService(AlarmManager::class.java)
                ?.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + delayMs, pending)
        }.onFailure { Log.w("Kiosk", "Couldn't schedule the relaunch", it) }
    }

    private fun relaunchIntent(context: Context): PendingIntent? {
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
        return PendingIntent.getActivity(
            context,
            RELAUNCH_REQUEST,
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    /** How long to wait before this restart: longer once several came close together. Counts it, too. */
    private fun nextDelay(context: Context): Long {
        val prefs = prefs(context)
        val now = System.currentTimeMillis()
        val recent = (prefs.getString(CRASH_RESTARTS, null) ?: "")
            .split(',')
            .mapNotNull { it.toLongOrNull() }
            .filter { now - it < WINDOW_MS }
        prefs.edit().putString(CRASH_RESTARTS, (recent + now).joinToString(",")).commit()
        return if (recent.size >= QUICK_RESTARTS) SLOW_DELAY_MS else QUICK_DELAY_MS
    }

    private fun describe(error: Throwable): String {
        // At most a few causes deep: a chain that loops back must not hang a crash handler
        val root = generateSequence(error) { it.cause }.take(8).last()
        return listOfNotNull(error.message ?: error.javaClass.name, root.takeIf { it !== error }?.message)
            .distinct()
            .joinToString(" · ")
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
