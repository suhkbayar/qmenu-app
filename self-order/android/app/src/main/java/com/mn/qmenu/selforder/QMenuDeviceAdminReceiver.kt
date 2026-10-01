package com.mn.qmenu.selforder

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class QMenuDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {}

    override fun onDisabled(context: Context, intent: Intent) {}

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        // Called after QR code enrollment completes — ProvisioningSuccessActivity then opens the app
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, QMenuDeviceAdminReceiver::class.java)

        // Whitelist our app and the payment app for lock task
        dpm.setLockTaskPackages(
            adminComponent,
            arrayOf(
                context.packageName,
                "com.gerege.mpos"
            )
        )

        // Become the home screen before setup finishes, so there's no launcher chooser
        KioskModule.setBootIntoApp(context)
    }
}
