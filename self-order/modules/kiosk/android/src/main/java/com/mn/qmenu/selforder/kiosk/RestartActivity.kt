package com.mn.qmenu.selforder.kiosk

import android.app.Activity
import android.os.Bundle
import android.os.Process

/**
 * Runs in a process of its own (see the manifest), never seen: ends the app's old process, opens the
 * app again in a fresh one, then ends itself. See AppRestarter.
 */
class RestartActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pid = intent.getIntExtra(EXTRA_PID, -1)
        if (pid > 0) Process.killProcess(pid)
        AppRestarter.cancelRelaunch(this)
        DeviceOwner.launchApp(this)
        finish()
        Runtime.getRuntime().exit(0)
    }

    companion object {
        const val EXTRA_PID = "pid"
    }
}
