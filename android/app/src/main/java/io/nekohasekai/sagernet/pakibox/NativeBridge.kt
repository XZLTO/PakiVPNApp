package io.nekohasekai.sagernet.pakibox

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson
import org.json.JSONObject
import androidx.core.content.edit


class NativeBridge(val context:Context, val webView:WebView) {
    val TAG = "NATIVE BRIDGE"

    private val sharedPrefs = context.getSharedPreferences("WebViewStorage", Context.MODE_PRIVATE)

    private val messageHandlers = mutableMapOf<String, (NativeBridge,List<Any?>) -> Unit>().apply {
        put("test") { bridge,args ->
            val testMessage = args[0] as? String
            bridge.sendToWeb("response", "Test processed")
        }
    }

    @JavascriptInterface
    fun postMessage(message: String) {
        try {
            val json = JSONObject(message)
            val channel = json.getString("channel")
            val args = json.getJSONArray("args")

            val argsList = mutableListOf<Any?>()
            for (i in 0 until args.length()) {
                argsList.add(args.get(i))
            }

            handleNativeMessage(channel, argsList)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun set(key: String, value: String) {
        sharedPrefs.edit() { putString(key, value) }
    }

    @JavascriptInterface
    fun get(key: String): String {
        return sharedPrefs.getString(key, "undefined") ?: "undefined"
    }

    @JavascriptInterface
    fun getPlatform(): String
    {
        return "Android"
    }

    @JavascriptInterface
    fun getVersion(): String
    {
        val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
        return pInfo.versionName ?: "0.0.0"
    }


    private fun handleNativeMessage(channel: String, args: List<Any?>) {
        if(messageHandlers.containsKey(channel))
            messageHandlers[channel]!!.invoke(this, args);
        Log.i(TAG,"Receive message: $channel args:$args")
    }

    fun subscribe(channel: String,func:(NativeBridge,List<Any?>) -> Unit)
    {
        messageHandlers[channel] = func
    }

    fun unsubscribe(channel: String)
    {
        messageHandlers.remove(channel)
    }

        // Метод для отправки сообщения в WebView
    fun sendToWeb(channel: String, vararg args: Any) {
        val map: HashMap<String?, Any?> = HashMap<String?, Any?>()
            map["channel"] = channel;
            map["args"] = args.toList();

        val argsJson = Gson().toJson(map)
        webView.post {
            webView.evaluateJavascript("""
                if (window.NativeBridge) {
                    window.NativeBridge.receiveJSON(`$argsJson`);
                }
            """.trimIndent(), null)
        }
            Log.i(TAG,"Send message: $argsJson")
    }
}