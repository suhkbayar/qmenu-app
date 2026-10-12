package com.mn.qmenu.selforder.cardscanner

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val REQUEST_CODE = 166666
private const val PAYMENT_APP = "com.gerege.mpos"
private const val PAYMENT_ACTIVITY = "com.gerege.mpos.activities.MainActivity"

// Card payments: opens the Gerege mPOS app with the amount and resolves with its result
class CardScannerModule : Module() {

    private var pending: Promise? = null

    override fun definition() = ModuleDefinition {
        Name("CardScanner")

        AsyncFunction("launchScanner") { amount: String, returnPackage: String, returnActivity: String, promise: Promise ->
            val intent = Intent("android.intent.action.SEND")
                .setClassName(PAYMENT_APP, PAYMENT_ACTIVITY)
                .putExtra("return_package", returnPackage)
                .putExtra("return_activity", returnActivity)
                .putExtra("pay_amount", amount)
            try {
                appContext.throwingActivity.startActivityForResult(intent, REQUEST_CODE)
                pending = promise
            } catch (e: Exception) {
                promise.reject("LAUNCH_ERROR", e.message ?: "Failed to launch card scanner", e)
            }
        }.runOnQueue(Queues.MAIN)

        OnActivityResult { _, payload ->
            if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
            pending?.resolve(toResult(payload.resultCode, payload.data))
            pending = null
        }
    }
}

// Shape: payment_status, resultCode, and either response_body (string), response_body_map, or error
@Suppress("DEPRECATION") // Bundle.get: mPOS sends untyped extras
private fun toResult(resultCode: Int, data: Intent?): Bundle {
    val result = Bundle()
    result.putInt("resultCode", resultCode)

    if (resultCode != Activity.RESULT_OK || data == null) {
        result.putBoolean("payment_status", false)
        val cancelled = resultCode == Activity.RESULT_CANCELED
        result.putString("error", if (cancelled) "User cancelled the operation" else "Unknown result")
        return result
    }

    val extras = data.extras
    val status = when (val value = extras?.get("payment_status")) {
        is Boolean -> value
        is String -> value == "true"
        else -> false
    }
    result.putBoolean("payment_status", status)

    when (val body = extras?.get("response_body")) {
        null -> Unit
        is String -> result.putString("response_body", body)
        is Map<*, *> -> result.putBundle("response_body_map", toBundle(body))
        else -> result.putString("response_body", body.toString())
    }
    return result
}

private fun toBundle(map: Map<*, *>): Bundle = Bundle().apply {
    map.forEach { (key, value) ->
        val name = key.toString()
        when (value) {
            is String -> putString(name, value)
            is Int -> putInt(name, value)
            is Double -> putDouble(name, value)
            is Boolean -> putBoolean(name, value)
            else -> putString(name, value?.toString() ?: "")
        }
    }
}
