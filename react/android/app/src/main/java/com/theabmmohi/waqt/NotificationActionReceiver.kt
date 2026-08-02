package com.theabmmohi.waqt

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Handles taps on notification action buttons ("Mark as Prayed", "Remind Me Later").
 *
 * - mark_prayed: enqueued via WorkManager with a NETWORK_CONNECTED constraint + exponential
 *   backoff, so it's guaranteed to eventually reach the server even if tapped while offline.
 * - remind_later: scheduled entirely on-device via AlarmManager — no network required at all.
 *   A best-effort (non-retrying) copy is also sent to the server so the DB / other channels
 *   (Telegram, web) stay roughly in sync, but nothing blocks or depends on it succeeding.
 */
class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_API = "api"
        const val EXTRA_BODY = "body"
        const val EXTRA_NOTIF_ID = "notifId"
        const val EXTRA_ACTION_ID = "actionId"
        const val EXTRA_PRAYER = "prayer"
        const val EXTRA_WAQT_END = "waqtEnd"
        const val EXTRA_ACTIONS_JSON = "actionsJson"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val notifId = intent.getIntExtra(EXTRA_NOTIF_ID, -1)
        if (notifId != -1) {
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)
                ?.cancel(notifId)
        }

        val actionId = intent.getStringExtra(EXTRA_ACTION_ID)
        val api = intent.getStringExtra(EXTRA_API)
        val body = intent.getStringExtra(EXTRA_BODY) ?: "{}"

        if (actionId == "remind_later") {
            scheduleLocalSnooze(context, intent)
            // Best-effort only: don't retry hard, the local alarm above is the source of truth.
            if (api != null) enqueueAction(context, api, body, retry = false)
            return
        }

        // mark_prayed (and anything else server-backed): guaranteed eventual delivery.
        if (api != null) enqueueAction(context, api, body, retry = true)
    }

    private fun enqueueAction(context: Context, api: String, body: String, retry: Boolean) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val data = Data.Builder()
            .putString(PrayerActionWorker.KEY_API, api)
            .putString(PrayerActionWorker.KEY_BODY, body)
            .build()
        val requestBuilder = OneTimeWorkRequestBuilder<PrayerActionWorker>()
            .setInputData(data)
            .setConstraints(constraints)
        if (retry) {
            requestBuilder.setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
        }
        WorkManager.getInstance(context).enqueue(requestBuilder.build())
    }

    private fun scheduleLocalSnooze(context: Context, intent: Intent) {
        val prayer = intent.getStringExtra(EXTRA_PRAYER) ?: return
        val waqtEndMs = intent.getStringExtra(EXTRA_WAQT_END)?.toLongOrNull() ?: return
        val now = System.currentTimeMillis()
        if (waqtEndMs <= now) return // window already over, nothing to schedule

        val fireAt = now + (waqtEndMs - now) / 2
        val originalActionsJson = intent.getStringExtra(EXTRA_ACTIONS_JSON)

        val alarmIntent = Intent(context, LocalSnoozeReceiver::class.java).apply {
            putExtra(LocalSnoozeReceiver.EXTRA_PRAYER, prayer)
            putExtra(LocalSnoozeReceiver.EXTRA_WAQT_END, waqtEndMs)
            putExtra(LocalSnoozeReceiver.EXTRA_ACTIONS_JSON, originalActionsJson)
        }
        val requestCode = prayer.hashCode() xor waqtEndMs.hashCode()
        val piFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        val pendingIntent = PendingIntent.getBroadcast(context, requestCode, alarmIntent, piFlags)

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        // Inexact-while-idle: no special "exact alarm" permission needed, and prayer-reminder
        // timing doesn't need to-the-second precision.
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pendingIntent)
    }
}
