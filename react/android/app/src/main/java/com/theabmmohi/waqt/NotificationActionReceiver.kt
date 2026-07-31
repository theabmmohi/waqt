package com.theabmmohi.waqt
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class NotificationActionReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "NotifActionReceiver"
        const val EXTRA_API = "api"
        const val EXTRA_BODY = "body"
        const val EXTRA_NOTIF_ID = "notifId"
        private val executor = Executors.newCachedThreadPool()
    }
    override fun onReceive(context: Context, intent: Intent) {
        val apiUrl = intent.getStringExtra(EXTRA_API) ?: return
        val body = intent.getStringExtra(EXTRA_BODY) ?: "{}"
        val notifId = intent.getIntExtra(EXTRA_NOTIF_ID, -1)
        if (notifId != -1) {
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)
                ?.cancel(notifId)
        }
        val pendingResult = goAsync()
        executor.execute {
            try {
                val connection = URL(apiUrl).openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                OutputStreamWriter(connection.outputStream).use { it.write(body) }
                val code = connection.responseCode
                if (code !in 200..299) {
                    Log.w(TAG, "Action request failed: HTTP $code for $apiUrl")
                }
                connection.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Failed to deliver notification action to $apiUrl", e)
            } finally {
                pendingResult.finish()
            }
        }
    }
}