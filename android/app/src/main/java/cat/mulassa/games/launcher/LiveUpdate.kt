package cat.mulassa.games.launcher

import android.content.Context
import androidx.core.content.pm.PackageInfoCompat
import ee.forgr.capacitor_updater.BundleStatus
import ee.forgr.capacitor_updater.CapgoUpdater
import ee.forgr.capacitor_updater.CryptoCipher
import ee.forgr.capacitor_updater.DownloadWorkerManager
import ee.forgr.capacitor_updater.Logger
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean
import org.json.JSONArray
import org.json.JSONObject

// The live-update check of the app's start (docs/app/native-shell.md, contract 5), as plassa native.js checkLiveUpdate does from a
// game page: the active bundle's version.json names its build and the site it follows (`live`); that site's app-bundle.json
// lists a newer build's files, which Capgo's own updater downloads (only those it lacks). Android's launcher has no web view
// to run that script in, so it drives the plugin's updater class itself. The download runs off the main thread; the switch
// (`use`) is the launcher's, only with no game open, and the next game's bridge starts on it (Capgo rolls it back if no page
// says it is ready). Its catalogue is read before the switch: one needing a newer bridge is never switched to (contract 6).
object LiveUpdate {
    private const val PREFS = "CapWebViewSettings" // Capacitor's and Capgo's own (WebView.WEBVIEW_PREFS_NAME)
    private const val TRIED = "mulassa-live-tried" // the last build switched to here: if it is not current later, it failed
    private const val FAILED = "mulassa-live-failed" // builds Capgo rolled back on this app binary: never fetched again
    private const val SERVER = "mulassa-live-server" // debug builds: a site typed in the account sheet, over version.json's `live`
    private val running = AtomicBoolean(false) // one check at a time, whichever launcher activity (a recreated one too) asks

    // A downloaded bundle's id and build, ready to switch to, or null. Blocking: call it off the main thread.
    fun download(ctx: Context): Pair<String, String>? {
        if (!running.compareAndSet(false, true)) return null
        try { return check(ctx) } finally { running.set(false) }
    }

    private fun check(ctx: Context): Pair<String, String>? = runCatching {
        firstStart(ctx)
        val here = JSONObject(WebBundle.active(ctx).open(ctx, "/version.json")?.use { it.readBytes().decodeToString() } ?: return null)
        val debug = ctx.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0
        // debug builds also follow a LAN site over plain http (tools/app/live-server.mjs); a store build, https only
        val base = (server(ctx).takeIf { debug && it.isNotEmpty() } ?: here.optString("live")).trimEnd('/').takeIf { it.startsWith("https://") || (debug && it.startsWith("http://")) } ?: return null
        val https = base.startsWith("https://")
        if (debug) httpsOnly(https) // a debug build moved back to an https site gets the plugin's check back
        val there = JSONObject(fetch("$base/app-bundle.json"))
        val build = there.optString("build")
        val updater = updater(ctx).also { it.httpsOnly = https }
        if (build.isEmpty() || build == here.optString("build") || build in failed(ctx, updater) || !newer(there, here)) return null
        val have = updater.getBundleInfoByName(build)?.takeIf { it.status == BundleStatus.SUCCESS || it.status == BundleStatus.PENDING }
        val bundle = have ?: run {
            val files = there.getJSONArray("manifest")
            val manifest = JSONArray((0 until files.length()).map { i ->
                files.getJSONObject(i).let { f -> JSONObject(f.toString()).put("download_url", "$base/${encodePath(f.getString("file_name"))}") }
            })
            updater.downloadManifest("$base/app-bundle.json", build, "", "", manifest) // url: required, unused
        }
        val catalogue = WebBundle(File(File(ctx.filesDir, "versions"), bundle.id)).open(ctx, "/catalogue.json")?.use { it.readBytes().decodeToString() }
        if (catalogue == null || WebBundle.parse(catalogue) == null) return null // contract 6
        bundle.id to build
    }.onFailure { android.util.Log.w("MulassaLive", "live update check failed: $it") }.getOrNull() // offline is the usual case

    // The site a debug build follows instead of its bundle's (the account sheet's field); empty: the bundle's.
    fun server(ctx: Context): String = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(SERVER, "")!!.trim()
    fun server(ctx: Context, url: String) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(SERVER, url.trim()).apply()

    // Only forwards (vite.config.js `seq`), as native.js isNewerBuild: a bundle from before `seq` compares as any other build.
    private fun newer(there: JSONObject, here: JSONObject): Boolean {
        val a = there.optLong("seq"); val b = here.optLong("seq")
        return a <= 0 || b <= 0 || a > b
    }

    // Makes the downloaded bundle the one the next bridge (and the launcher's catalogue) reads. Main thread, no game open.
    fun use(ctx: Context, id: String, build: String): Boolean {
        val ok = updater(ctx).set(id) == true
        if (ok) ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(TRIED, build).apply()
        return ok
    }

    // Capacitor and Capgo both reset the served bundle the first time a game's bridge starts on a new app binary, which would
    // drop a switch made from the launcher before any game opened: their first start is done here instead, as they do it
    // (Capacitor's Bridge.isNewBinary; Capgo's cleanupObsoleteVersions with resetWhenUpdate), so they find it done.
    // To check again on every Capgo upgrade (patches/@capgo+capacitor-updater*.patch is another reason to look).
    private fun firstStart(ctx: Context) {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val info = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        val code = PackageInfoCompat.getLongVersionCode(info).toInt().toString()
        val name = info.versionName ?: ""
        if (prefs.getString("lastBinaryVersionCode", null) != code || prefs.getString("lastBinaryVersionName", null) != name) {
            // a new binary starts clean: its served bundle, and which builds failed or were last tried on the old one
            prefs.edit().putString("lastBinaryVersionCode", code).putString("lastBinaryVersionName", name).putString("serverBasePath", "")
                .remove(TRIED).remove(FAILED).commit()
        }
        val known = prefs.getString("LatestNativeBuildVersion", null).takeUnless { it.isNullOrEmpty() } ?: prefs.getString("LatestVersionNative", "")
        if (known == code) return
        // An app upgrade: the old app's bundles go. A game opened meanwhile has the plugin do the same at once; both sides
        // only reset and delete, so the overlap is harmless.
        if (!known.isNullOrEmpty()) updater(ctx).run {
            reset(true)
            list(false).forEach { runCatching { delete(it.id) } }
            cleanupDeltaCache()
        }
        prefs.edit().putString("LatestNativeBuildVersion", code).commit()
    }

    // The builds never to fetch again: the last one switched to here, once it is no longer the current one, was rolled back by
    // Capgo (no page said ready). Only the launcher switches (native.js watchUpdates stays off under it), so nothing else moves it.
    private fun failed(ctx: Context, updater: CapgoUpdater): Set<String> {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val failed = prefs.getStringSet(FAILED, null).orEmpty().toMutableSet()
        val tried = prefs.getString(TRIED, null)
        if (tried != null && updater.currentBundle.versionName != tried) {
            failed += tried
            prefs.edit().putStringSet(FAILED, failed).remove(TRIED).apply()
        }
        return failed
    }

    // The plugin's updater, set up as CapacitorUpdaterPlugin.load() does for downloading and switching, without stats.
    // by name: a WorkManager Worker, and WorkManager is the plugin's dependency, not the app's
    private val downloadService get() = Class.forName("ee.forgr.capacitor_updater.DownloadService")
    private val logger = Logger("MulassaLive").also { // the plugin's load() gives its download classes a logger too
        CryptoCipher.setLogger(it); DownloadWorkerManager.setLogger(it)
        downloadService.getMethod("setLogger", Logger::class.java).invoke(null, it)
    }
    // one for the process: each instance starts its own thread pool
    @Volatile private var shared: CapgoUpdater? = null
    private fun updater(ctx: Context): CapgoUpdater = shared ?: synchronized(this) { shared ?: newUpdater(ctx).also { shared = it } }
    private fun newUpdater(ctx: Context) = CapgoUpdater(logger).apply {
        val info = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        editor = prefs.edit()
        appContext = ctx.applicationContext
        documentsDir = ctx.filesDir
        noBackupDir = ctx.noBackupFilesDir
        CAP_SERVER_PATH = "serverBasePath" // WebView.CAP_SERVER_PATH
        appId = ctx.packageName
        versionBuild = info.versionName ?: ""
        versionCode = PackageInfoCompat.getLongVersionCode(info).toInt().toString()
        versionOs = android.os.Build.VERSION.RELEASE
        statsUrl = "" // as capacitor.config.json: no stats
    }

    private fun fetch(url: String): String = (URL(url).openConnection() as HttpURLConnection).run {
        connectTimeout = 8000; readTimeout = 8000; useCaches = false
        try { if (responseCode != 200) error("HTTP $responseCode") else inputStream.use { it.readBytes().decodeToString() } } finally { disconnect() }
    }

    // Capgo's downloads refuse http unless its config says so (httpsOnly), and its switch for that is package-private.
    private fun httpsOnly(on: Boolean) {
        downloadService.getDeclaredMethod("setHttpsOnly", Boolean::class.javaPrimitiveType)
            .apply { isAccessible = true }.invoke(null, on)
    }

    private fun encodePath(p: String) = p.split('/').joinToString("/") { android.net.Uri.encode(it) } // as encodeURI in native.js
}
