package com.mn.qmenu.selforder

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import com.mn.qmenu.selforder.kiosk.DeviceOwner

// Do not rename or move this class. "com.mn.qmenu.selforder/.QMenuDeviceAdminReceiver" is the
// device-owner component in the provisioning QR code and on tablets set up with adb; if it changes,
// those tablets lose kiosk control after an update.
class QMenuDeviceAdminReceiver : DeviceAdminReceiver() {

    // QR setup finished. Runs before ProvisioningSuccessActivity opens the app.
    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        // Protected from the first moment, before the app has even opened
        DeviceOwner.protect(context)
        DeviceOwner.setLockTaskApps(context)
        // Become the home screen before setup finishes, so there's no launcher chooser
        DeviceOwner.setBootIntoApp(context)
    }
}
