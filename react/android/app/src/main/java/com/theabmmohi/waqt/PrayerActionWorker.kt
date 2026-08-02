package com.theabmmohi.waqt

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class PrayerActionWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        const val KEY_API = "api"
        const val KEY_BODY = "body"
    }

    override suspend fun doWork(): Result {
        val apiUrl = inputData.getString(KEY_API) ?: return Result.failure()
        val body = inputData.getString(KEY_BODY) ?: "{}"
        return try {
            val connection = URL(apiUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            OutputStreamWriter(connection.outputStream).use { it.write(body) }
            val code = connection.responseCode
            connection.disconnect()
            if (code in 200..299) Result.success() else Result.retry()
        } catch (e: Exception) {
            // Network unavailable or request failed — WorkManager will retry with backoff
            // once the NETWORK_CONNECTED constraint is satisfied again.
            Result.retry()
        }
    }
}
