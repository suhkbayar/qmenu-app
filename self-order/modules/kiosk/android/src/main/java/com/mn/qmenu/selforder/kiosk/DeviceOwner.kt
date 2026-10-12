package com.mn.qmenu.selforder.kiosk

import android.app.admin.DevicePolicyManager
import android.app.admin.FactoryResetProtectionPolicy
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.UserManager
import android.provider.MediaStore
import android.provider.Settings
import android.util.Log
import android.view.inputmethod.InputMethodManager
import com.mn.qmenu.selforder.QMenuDeviceAdminReceiver

// Card payments open this app, so lock task must allow switching to it
private const val PAYMENT_APP = "com.gerege.mpos"

private const val HIDDEN_APPS_KEY = "hiddenApps"

// QMenu Google accounts that can finish setup after a reset from the recovery screen. Use the account ID
// (the digits of "people/<id>" from the People API, people.get with resourceName people/me), not the email.
// Empty: no reset protection, so a recovery reset gives a clean tablet.
private val RESET_PROTECTION_ACCOUNTS = listOf(
    "101171971903814036619", // QMenu tablets account
)

/** Policies that only work when the app is the tablet's device owner (set by QR provisioning or adb). */
internal object DeviceOwner {

    fun isActive(context: Context) = dpm(context).isDeviceOwnerApp(context.packageName)

    fun setLockTaskApps(context: Context) {
        dpm(context).setLockTaskPackages(admin(context), arrayOf(context.packageName, PAYMENT_APP))
    }

    /** Full lock: only our apps, no Home/Recents/status bar, boot into the app, theft protection on. */
    fun lockDown(context: Context) {
        val dpm = dpm(context)
        val admin = admin(context)
        setLockTaskApps(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
        }
        setBootIntoApp(context)
        protect(context)
    }

    /**
     * Theft protection. Stays on after the admin exit too: staff get Settings, but can't factory reset,
     * boot into safe mode, add a user or an account, install apps or turn on developer options.
     * A reset from the recovery screen asks for a QMenu Google account (see RESET_PROTECTION_ACCOUNTS).
     */
    fun protect(context: Context) {
        val dpm = dpm(context)
        val admin = admin(context)
        dpm.addUserRestriction(admin, UserManager.DISALLOW_FACTORY_RESET)
        dpm.addUserRestriction(admin, UserManager.DISALLOW_SAFE_BOOT)
        dpm.addUserRestriction(admin, UserManager.DISALLOW_ADD_USER)
        // No Google account, so Play Store can't install anything; no APK files either. AppInstaller
        // installs as the device owner, which these shouldn't cover (verify on the test tablet).
        dpm.addUserRestriction(admin, UserManager.DISALLOW_MODIFY_ACCOUNTS)
        dpm.addUserRestriction(
            admin,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES_GLOBALLY
            else UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES,
        )
        // Debug builds keep adb, so development tablets can still be reinstalled
        if (!isDebugBuild(context)) dpm.addUserRestriction(admin, UserManager.DISALLOW_DEBUGGING_FEATURES)
        setResetProtection(dpm, admin)
    }

    /**
     * Hides every app with a home-screen icon (YouTube, Chrome, Play Store, …) except [extra] and the
     * basics: this app, the home screen, the keyboard, Settings, Camera and Files. Hidden apps stay
     * installed but can't be opened or run; taking a package off the hidden list brings it back.
     */
    fun setAllowedApps(context: Context, extra: Collection<String>) {
        val pm = context.packageManager
        val keep = extra.toMutableSet().apply {
            add(context.packageName)
            addAll(handlers(pm, Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)))
            addAll(handlers(pm, Intent(Settings.ACTION_SETTINGS)))
            addAll(handlers(pm, Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA)))
            addAll(handlers(pm, Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")))
            // Without a keyboard nobody could type a table code or the PIN
            addAll(context.getSystemService(InputMethodManager::class.java).enabledInputMethodList.map { it.packageName })
        }

        val dpm = dpm(context)
        val admin = admin(context)
        val prefs = context.getSharedPreferences("kiosk", Context.MODE_PRIVATE)
        // Hidden apps no longer show up as having an icon, so remember which ones we hid
        val hiddenBefore = prefs.getStringSet(HIDDEN_APPS_KEY, null) ?: emptySet()
        val candidates = handlers(pm, Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)) + hiddenBefore

        val hidden = mutableSetOf<String>()
        for (pkg in candidates) {
            dpm.setApplicationHidden(admin, pkg, pkg !in keep)
            if (dpm.isApplicationHidden(admin, pkg)) hidden.add(pkg)
        }
        prefs.edit().putStringSet(HIDDEN_APPS_KEY, hidden).apply()
    }

    private fun handlers(pm: PackageManager, intent: Intent): Set<String> =
        pm.queryIntentActivities(intent, 0).map { it.activityInfo.packageName }.toSet()

    private fun setResetProtection(dpm: DevicePolicyManager, admin: ComponentName) {
        if (RESET_PROTECTION_ACCOUNTS.isEmpty() || Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        val policy = FactoryResetProtectionPolicy.Builder()
            .setFactoryResetProtectionAccounts(RESET_PROTECTION_ACCOUNTS)
            .setFactoryResetProtectionEnabled(true)
            .build()
        // Throws on tablets without reset protection support; never let that stop kiosk mode from starting
        runCatching { dpm.setFactoryResetProtectionPolicy(admin, policy) }
            .onFailure { Log.w("Kiosk", "Couldn't set factory reset protection", it) }
    }

    private fun isDebugBuild(context: Context) =
        (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

    /** The tablet boots straight into the app: we're the home screen and there's no lock screen. */
    fun setBootIntoApp(context: Context) {
        if (!isActive(context)) return
        val homeFilter = IntentFilter(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addCategory(Intent.CATEGORY_DEFAULT)
        }
        dpm(context).addPersistentPreferredActivity(admin(context), homeFilter, mainActivity(context))
        dpm(context).setKeyguardDisabled(admin(context), true)
    }

    fun launchApp(context: Context) {
        context.startActivity(
            Intent().setComponent(mainActivity(context))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        )
    }

    private fun mainActivity(context: Context): ComponentName =
        context.packageManager.getLaunchIntentForPackage(context.packageName)!!.component!!

    private fun admin(context: Context) = ComponentName(context, QMenuDeviceAdminReceiver::class.java)

    private fun dpm(context: Context) =
        context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
}
