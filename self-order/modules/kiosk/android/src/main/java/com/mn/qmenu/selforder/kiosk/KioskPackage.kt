package com.mn.qmenu.selforder.kiosk

import android.app.Activity
import android.content.Context
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

class KioskPackage : Package {

    override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> =
        listOf(object : ReactActivityLifecycleListener {
            // Kiosk comes back on whenever the app returns to the screen, e.g. staff press Home after using Settings
            override fun onResume(activity: Activity) {
                if (DeviceOwner.isActive(activity)) activity.startLockTask()
            }
        })
}
