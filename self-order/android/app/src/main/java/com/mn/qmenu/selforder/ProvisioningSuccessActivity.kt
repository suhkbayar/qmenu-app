package com.mn.qmenu.selforder

import android.app.Activity
import android.content.Intent
import android.os.Bundle

// Launched by the system when device-owner setup finishes — opens the app, which enters kiosk mode
class ProvisioningSuccessActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        KioskModule.setBootIntoApp(this)
        startActivity(
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        )
        finish()
    }
}
