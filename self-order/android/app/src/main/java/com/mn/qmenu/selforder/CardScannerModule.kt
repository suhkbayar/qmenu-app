package com.mn.qmenu.selforder

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*

class CardScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val REQUEST_CODE = 166666
        private const val MODULE_NAME = "CardScannerModule"
    }

    private var mPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun launchScanner(
        amount: String,
        returnPackage: String,
        returnActivity: String,
        promise: Promise
    ) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        mPromise = promise

        try {
            val intent = Intent("android.intent.action.SEND").apply {
                setClassName("com.gerege.mpos", "com.gerege.mpos.activities.MainActivity")
                putExtra("return_package", returnPackage)
                putExtra("return_activity", returnActivity)
                putExtra("pay_amount", amount)
            }

            activity.startActivityForResult(intent, REQUEST_CODE)
        } catch (e: Exception) {
            mPromise?.reject("LAUNCH_ERROR", e.message ?: "Failed to launch card scanner")
            mPromise = null
        }
    }

    override fun onActivityResult(
        activity: Activity?,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == REQUEST_CODE && mPromise != null) {
            try {
                val result = Arguments.createMap()

                if (resultCode == Activity.RESULT_OK && data != null) {
                    // Get payment_status - handle both boolean and string
                    val paymentStatus = when {
                        data.hasExtra("payment_status") -> {
                            val extra = data.extras?.get("payment_status")
                            when (extra) {
                                is Boolean -> extra
                                is String -> extra == "true"
                                else -> false
                            }
                        }
                        else -> false
                    }

                    result.putBoolean("payment_status", paymentStatus)
                    result.putInt("resultCode", resultCode)

                    // Get response_body
                    if (data.hasExtra("response_body")) {
                        val responseBody = data.extras?.get("response_body")
                        when (responseBody) {
                            is String -> result.putString("response_body", responseBody)
                            is java.util.HashMap<*, *> -> {
                                val map = Arguments.createMap()
                                responseBody.forEach { (key, value) ->
                                    when (value) {
                                        is String -> map.putString(key.toString(), value)
                                        is Int -> map.putInt(key.toString(), value)
                                        is Double -> map.putDouble(key.toString(), value)
                                        is Boolean -> map.putBoolean(key.toString(), value)
                                        else -> map.putString(key.toString(), value?.toString() ?: "")
                                    }
                                }
                                result.putMap("response_body_map", map)
                            }
                            else -> {
                                // Try to get as serializable
                                val serializable = data.getSerializableExtra("response_body")
                                if (serializable != null) {
                                    result.putString("response_body", serializable.toString())
                                }
                            }
                        }
                    }

                    mPromise?.resolve(result)
                } else if (resultCode == Activity.RESULT_CANCELED) {
                    result.putBoolean("payment_status", false)
                    result.putInt("resultCode", resultCode)
                    result.putString("error", "User cancelled the operation")
                    mPromise?.resolve(result)
                } else {
                    result.putBoolean("payment_status", false)
                    result.putInt("resultCode", resultCode)
                    result.putString("error", "Unknown result")
                    mPromise?.resolve(result)
                }
            } catch (e: Exception) {
                mPromise?.reject("RESULT_ERROR", e.message ?: "Failed to process result")
            } finally {
                mPromise = null
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Not needed for this implementation
    }
}
