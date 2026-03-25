package com.mn.qmenu.selforder

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.UserManager
import com.facebook.react.bridge.*

class KioskModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        var kioskExited = false
    }

    override fun getName() = "KioskModule"

    private val dpm: DevicePolicyManager
        get() = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

    private val adminComponent: ComponentName
        get() = ComponentName(reactApplicationContext, QMenuDeviceAdminReceiver::class.java)

    @ReactMethod
    fun isDeviceOwner(promise: Promise) {
        promise.resolve(dpm.isDeviceOwnerApp(reactApplicationContext.packageName))
    }

    @ReactMethod
    fun setKioskApps(packageNames: ReadableArray, promise: Promise) {
        if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
            promise.reject("NOT_DEVICE_OWNER", "App is not device owner")
            return
        }
        val packages = (0 until packageNames.size()).map { packageNames.getString(it) }.toTypedArray()
        dpm.setLockTaskPackages(adminComponent, packages)
        promise.resolve(true)
    }

    @ReactMethod
    fun startKioskMode(promise: Promise) {
        val activity = currentActivity ?: return promise.reject("NO_ACTIVITY", "No activity")
        try {
            if (dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_SAFE_BOOT)
                dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    dpm.setLockTaskFeatures(
                        adminComponent,
                        DevicePolicyManager.LOCK_TASK_FEATURE_NONE
                    )
                }
            }
            kioskExited = false
            activity.startLockTask()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopKioskMode(promise: Promise) {
        val activity = currentActivity ?: return promise.reject("NO_ACTIVITY", "No activity")
        try {
            if (dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_SAFE_BOOT)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
            }
            kioskExited = true
            activity.stopLockTask()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
