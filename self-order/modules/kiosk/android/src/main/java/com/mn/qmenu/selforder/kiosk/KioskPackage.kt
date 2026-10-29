package com.mn.qmenu.selforder.kiosk

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.pm.ApplicationInfo
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import expo.modules.core.interfaces.ReactNativeHostHandler

class KioskPackage : Package {

    override fun createApplicationLifecycleListeners(context: Context?): List<ApplicationLifecycleListener> =
        listOf(object : ApplicationLifecycleListener {
            // A crash in native code ends the app: Android is asked to open it again shortly after, so
            // a tablet never stays on a black screen. Not in development builds.
            override fun onCreate(application: Application) {
                if ((application.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) return
                val previous = Thread.getDefaultUncaughtExceptionHandler()
                Thread.setDefaultUncaughtExceptionHandler { thread, error ->
                    runCatching { AppRestarter.relaunchAfterCrash(application, error) }
                    previous?.uncaughtException(thread, error)
                }
            }
        })

    override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> =
        listOf(object : ReactActivityLifecycleListener {
            // Kiosk comes back on whenever the app returns to the screen, e.g. staff press Home after using Settings
            override fun onResume(activity: Activity) {
                if (DeviceOwner.isActive(activity)) activity.startLockTask()
            }
        })

    override fun createReactNativeHostHandlers(context: Context): List<ReactNativeHostHandler> =
        listOf(object : ReactNativeHostHandler {
            // React Native shut the app's JavaScript down after an error. Neither it nor expo-updates
            // (past its first seconds) brings the app back, which left a black screen: restart instead.
            // In development the error screen shows instead.
            override fun onReactInstanceException(useDeveloperSupport: Boolean, exception: Exception) {
                if (useDeveloperSupport) return
                AppRestarter.restartAfterCrash(context.applicationContext, exception)
            }
        })
}
