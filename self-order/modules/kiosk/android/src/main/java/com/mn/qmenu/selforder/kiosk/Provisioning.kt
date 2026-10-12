package com.mn.qmenu.selforder.kiosk

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Bundle

// QR provisioning on Android 12+: setup asks which mode we want, then asks us to confirm our
// policies, then reports success. Each step is a screen-less activity that answers and finishes.

/** We are always a fully managed device (device owner). */
class GetProvisioningModeActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_OK, Intent().putExtra(DevicePolicyManager.EXTRA_PROVISIONING_MODE, mode()))
        finish()
    }

    private fun mode(): Int {
        val allowed = intent.getIntegerArrayListExtra(DevicePolicyManager.EXTRA_PROVISIONING_ALLOWED_PROVISIONING_MODES)
        if (allowed.isNullOrEmpty() || allowed.contains(DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE)) {
            return DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE
        }
        return allowed.first()
    }
}

/** Nothing to confirm: our policies are applied in QMenuDeviceAdminReceiver and when kiosk mode starts. */
class AdminPolicyComplianceActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_OK)
        finish()
    }
}

/** Setup finished: open the app, which enters kiosk mode. */
class ProvisioningSuccessActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DeviceOwner.setBootIntoApp(this)
        DeviceOwner.launchApp(this)
        finish()
    }
}
