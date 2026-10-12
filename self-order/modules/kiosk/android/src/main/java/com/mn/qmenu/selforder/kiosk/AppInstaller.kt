package com.mn.qmenu.selforder.kiosk

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.IntentSender
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.Promise
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Installs app updates silently, which Android allows only for the device owner.
 * For now only this app can be installed (self-update); the card payment app will be added here later.
 */
internal object AppInstaller {

    /** The installed version code of [packageName], or null when it isn't installed. */
    fun installedVersion(context: Context, packageName: String): Long? = try {
        versionCode(context.packageManager.getPackageInfo(packageName, 0))
    } catch (e: PackageManager.NameNotFoundException) {
        null
    }

    /**
     * Downloads the APK, checks it is [packageName] and newer than the installed build, then installs it.
     * Android itself refuses an APK that isn't signed with the installed app's key, so a wrong or
     * damaged file can't get in. Updating this app kills it mid-install (RelaunchReceiver opens it
     * again), so on success the promise only resolves for other apps; failures always reject.
     */
    fun install(context: Context, packageName: String, url: String, promise: Promise) {
        val file = File(context.cacheDir, "update-$packageName.apk")
        try {
            check(DeviceOwner.isActive(context)) { "Only the device owner can install apps" }
            check(packageName == context.packageName) { "Not allowed to install $packageName" }
            check(url.startsWith("https://")) { "APK must be downloaded over https" }

            download(url, file)

            @Suppress("DEPRECATION") // the flags overload is API 33+
            val apk = context.packageManager.getPackageArchiveInfo(file.path, 0) ?: error("Not a valid APK")
            val installed = installedVersion(context, packageName) ?: 0
            check(apk.packageName == packageName) { "APK is ${apk.packageName}, expected $packageName" }
            check(versionCode(apk) > installed) { "APK build ${versionCode(apk)} isn't newer than $installed" }

            commit(context, file, packageName, promise)
        } catch (e: Exception) {
            promise.reject("INSTALL_FAILED", e.message ?: "Install failed", e)
        } finally {
            file.delete()
        }
    }

    private fun download(url: String, file: File) {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 60_000
        try {
            check(connection.responseCode == HttpURLConnection.HTTP_OK) { "Download failed: HTTP ${connection.responseCode}" }
            connection.inputStream.use { input ->
                file.outputStream().use { output -> input.copyTo(output) }
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun commit(context: Context, file: File, packageName: String, promise: Promise) {
        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(packageName)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
            }
        }
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            file.inputStream().use { input ->
                session.openWrite("app.apk", 0, file.length()).use { output ->
                    input.copyTo(output)
                    session.fsync(output)
                }
            }
            session.commit(resultReceiver(context, sessionId, promise))
        }
    }

    /** Android reports the install result with a broadcast; turn it into the promise's result. */
    private fun resultReceiver(context: Context, sessionId: Int, promise: Promise): IntentSender {
        val action = "${context.packageName}.APP_INSTALL_RESULT.$sessionId"
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(receiverContext: Context, intent: Intent) {
                context.unregisterReceiver(this)
                val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
                if (status == PackageInstaller.STATUS_SUCCESS) return promise.resolve(null)
                val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "status $status"
                promise.reject("INSTALL_FAILED", "Install failed: $message", null)
            }
        }
        val filter = IntentFilter(action)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(receiver, filter)
        }
        // Mutable: the installer adds the status extras to it
        val intent = Intent(action).setPackage(context.packageName)
        return PendingIntent.getBroadcast(
            context, sessionId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        ).intentSender
    }

    @Suppress("DEPRECATION") // versionCode: for Android 8 and older
    private fun versionCode(info: PackageInfo): Long =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode else info.versionCode.toLong()
}
