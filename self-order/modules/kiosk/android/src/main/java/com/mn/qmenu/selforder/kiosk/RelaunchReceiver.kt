package com.mn.qmenu.selforder.kiosk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Open the app after a reboot (even if staff had exited kiosk mode) and after it updated itself
// (AppInstaller). The resume hook in KioskPackage re-locks it.
class RelaunchReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        if (!DeviceOwner.isActive(context)) return
        DeviceOwner.launchApp(context)
    }
}
