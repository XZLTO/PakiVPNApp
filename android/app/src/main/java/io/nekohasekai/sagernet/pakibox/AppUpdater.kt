package io.nekohasekai.sagernet.pakibox
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class AppUpdater(private val context: Context) {

    private val TAG = "AppUpdater"

    private val client = OkHttpClient()
    private val githubRepoOwner = "XZLTO"
    private val githubRepoName = "PakiVPNAndroid"
    private val githubApiUrl = "https://api.github.com/repos/$githubRepoOwner/$githubRepoName/releases/latest"

    // Проверка наличия новой версии
    fun checkForUpdate(listener: (UpdateResult) -> Unit) {
        val request = Request.Builder()
            .url(githubApiUrl)
            .build()

        client.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: IOException) {
                listener(UpdateResult.Error(e.message ?: "Unknown error"))
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                if (!response.isSuccessful) {
                    listener(UpdateResult.Error("Failed to fetch update info"))
                    return
                }

                val json = response.body?.string() ?: return
                val releaseJson = JSONObject(json)
                val latestVersion = releaseJson.getString("tag_name").replace("v", "")
                val currentVersion = getCurrentVersion()
                Log.w(TAG, "CurrentVersion:" + currentVersion)

                if (isNewVersionAvailable(currentVersion, latestVersion)) {
                    val assets = releaseJson.getJSONArray("assets")
                    val architecture = getDeviceArchitecture()
                    var downloadUrl: String? = null

                    // Find the appropriate APK for the device's architecture
                    for (i in 0 until assets.length()) {
                        val asset = assets.getJSONObject(i)
                        val name = asset.getString("name")
                        when (architecture) {
                            "arm64-v8a" -> if (name.contains("arm64-v8a")) {
                                downloadUrl = asset.getString("browser_download_url")
                                break
                            }
                            "armeabi-v7a" -> if (name.contains("armeabi-v7a")) {
                                downloadUrl = asset.getString("browser_download_url")
                                break
                            }
                        }
                    }

                    if (downloadUrl != null) {
                        listener(UpdateResult.NewVersionAvailable(latestVersion, downloadUrl))
                    } else {
                        listener(UpdateResult.Error("No compatible APK found for architecture $architecture"))
                    }
                } else {
                    listener(UpdateResult.NoUpdateAvailable)
                }
            }
        })
    }

    // Загрузка новой версии
    fun downloadUpdate(downloadUrl: String, listener: (DownloadResult) -> Unit) {
        val request = Request.Builder()
            .url(downloadUrl)
            .build()

        client.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: IOException) {
                listener(DownloadResult.Error(e.message ?: "Download failed"))
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                if (!response.isSuccessful) {
                    listener(DownloadResult.Error("Failed to download update"))
                    return
                }

                val apkData = response.body?.bytes() ?: return
                val apkFile = saveApkToStorage(apkData)

                if (apkFile != null) {
                    listener(DownloadResult.Success(apkFile))
                } else {
                    listener(DownloadResult.Error("Failed to save APK"))
                }
            }
        })
    }

    // Установка APK
    fun installApk(apkFile: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.provider",
            apkFile
        )

        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        context.startActivity(intent)
    }

    private fun getCurrentVersion(): String {
        try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            return pInfo.versionName ?: "0.0.0"
        } catch (e: PackageManager.NameNotFoundException) {
            return "0.0.0"
        }
    }

    private fun isNewVersionAvailable(currentVersion: String, latestVersion: String): Boolean {
        val currentParts = currentVersion.split(".").map { it.toInt() }
        val latestParts = latestVersion.split(".").map { it.toInt() }

        for (i in 0 until minOf(currentParts.size, latestParts.size)) {
            if (latestParts[i] > currentParts[i]) return true
            if (latestParts[i] < currentParts[i]) return false
        }

        return latestParts.size > currentParts.size
    }

    private fun saveApkToStorage(apkData: ByteArray): File? {
        return try {
            val downloadsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            val apkFile = File(downloadsDir, "update_${System.currentTimeMillis()}.apk")

            FileOutputStream(apkFile).use { fos ->
                fos.write(apkData)
            }

            apkFile
        } catch (e: Exception) {
            null
        }
    }

    private fun getDeviceArchitecture(): String {
        return when {
            Build.SUPPORTED_64_BIT_ABIS.contains("arm64-v8a") -> "arm64-v8a"
            Build.SUPPORTED_ABIS.contains("armeabi-v7a") -> "armeabi-v7a"
            else -> "arm64-v8a" // default to arm64 if unknown
        }
    }

    sealed class UpdateResult {
        object NoUpdateAvailable : UpdateResult()
        data class NewVersionAvailable(val version: String, val downloadUrl: String) : UpdateResult()
        data class Error(val message: String) : UpdateResult()
    }

    sealed class DownloadResult {
        data class Success(val apkFile: File) : DownloadResult()
        data class Error(val message: String) : DownloadResult()
    }
}