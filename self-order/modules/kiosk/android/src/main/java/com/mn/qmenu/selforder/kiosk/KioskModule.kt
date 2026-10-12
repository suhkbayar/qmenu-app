package com.mn.qmenu.selforder.kiosk

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KioskModule : Module() {

    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

    override fun definition() = ModuleDefinition {
        Name("Kiosk")

        Function("isDeviceOwner") {
            DeviceOwner.isActive(context)
        }

        // Pins the screen to the app. As device owner this is the full lock (see DeviceOwner.lockDown);
        // without it Android asks the user to confirm screen pinning instead.
        AsyncFunction("startKioskMode") {
            if (DeviceOwner.isActive(context)) DeviceOwner.lockDown(context)
            appContext.throwingActivity.startLockTask()
        }.runOnQueue(Queues.MAIN)

        // Hides every other app with a home-screen icon; see DeviceOwner.setAllowedApps
        AsyncFunction("setAllowedApps") { extra: List<String> ->
            if (DeviceOwner.isActive(context)) DeviceOwner.setAllowedApps(context, extra)
        }

        Function("installedVersion") { packageName: String ->
            AppInstaller.installedVersion(context, packageName)
        }

        AsyncFunction("installApp") { packageName: String, url: String, promise: Promise ->
            AppInstaller.install(context, packageName, url, promise)
        }

        // Admin exit after the PIN: unpin so staff can use Settings. Theft protection stays on
        // (DeviceOwner.protect). We stay the home app, so pressing Home brings staff back into
        // kiosk mode (KioskPackage re-locks on resume).
        AsyncFunction("stopKioskMode") {
            val activity = appContext.throwingActivity
            activity.stopLockTask()
            openSystemLauncher(activity)
        }.runOnQueue(Queues.MAIN)
    }

    // Open the stock launcher so staff can reach Settings, Calculator, etc.
    private fun openSystemLauncher(activity: Activity) {
        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val launcher = activity.packageManager
            .queryIntentActivities(home, PackageManager.MATCH_DEFAULT_ONLY)
            .map { it.activityInfo }
            // Skip ourselves and Settings' FallbackHome (a blank placeholder home screen)
            .firstOrNull { it.packageName != activity.packageName && it.packageName != "com.android.settings" }
            ?: return
        activity.startActivity(
            home.setClassName(launcher.packageName, launcher.name).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }
}
