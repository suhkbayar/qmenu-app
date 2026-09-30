package com.mn.qmenu.selforder

import android.app.Activity
import android.os.Bundle

// Android 12+ provisioning asks the DPC to confirm its policies before finishing setup
class AdminPolicyComplianceActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_OK)
        finish()
    }
}
