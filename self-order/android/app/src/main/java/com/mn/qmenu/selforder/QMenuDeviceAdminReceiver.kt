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
        // Called after QR code enrollment completes — auto-start kiosk mode
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

        // Launch MainActivity — it will call startLockTask() on resume
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(launchIntent)
    }
}
