package com.mn.qmenu.selforder

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Bundle

// Android 12+ QR provisioning asks the DPC which mode to set up — we are always fully managed (device owner)
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
