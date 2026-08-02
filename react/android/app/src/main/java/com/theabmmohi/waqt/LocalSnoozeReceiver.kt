package com.theabmmohi.waqt

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

/**
 * Fires when a "Remind Me Later" alarm (scheduled by NotificationActionReceiver) goes off.
 * Rebuilds and shows the snooze reminder entirely on-device — no server round-trip needed
 * to actually display it.
 */
class LocalSnoozeReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_PRAYER = "prayer"
        const val EXTRA_WAQT_END = "waqtEnd"
        const val EXTRA_ACTIONS_JSON = "actionsJson"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val prayer = intent.getStringExtra(EXTRA_PRAYER) ?: return
        val waqtEndMs = intent.getLongExtra(EXTRA_WAQT_END, -1L)
        if (waqtEndMs <= 0L) return
        val now = System.currentTimeMillis()
        if (waqtEndMs <= now) return // window ended before this snooze fired; nothing to show

        val originalActionsJson = intent.getStringExtra(EXTRA_ACTIONS_JSON)
        val markPrayedAction = findAction(originalActionsJson, "mark_prayed")
        val apiUrl = markPrayedAction?.optString("api", null)
        val rowId = markPrayedAction?.optJSONObject("body")?.optString("id", null)

        val actions = JSONArray()
        if (markPrayedAction != null) actions.put(markPrayedAction)

        val remainingMs = waqtEndMs - now
        if (remainingMs > 4 * 60_000 && apiUrl != null && rowId != null) {
            // Still meaningful time left — allow snoozing again, mirroring server-side logic.
            val remindAgain = JSONObject()
            remindAgain.put("id", "remind_later")
            remindAgain.put("title", "Remind Me Later")
            remindAgain.put("api", apiUrl)
            val bodyObj = JSONObject()
            bodyObj.put("id", rowId)
            bodyObj.put("action", "remind_later")
            bodyObj.put("source", "native")
            remindAgain.put("body", bodyObj)
            actions.put(remindAgain)
        }

        val notifId = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
        NotificationHelper.showNotification(
            context,
            notifId,
            "Reminder: $prayer",
            "Have you prayed $prayer yet?",
            "/",
            actions.toString(),
            prayer,
            waqtEndMs.toString()
        )
    }

    private fun findAction(actionsJson: String?, id: String): JSONObject? {
        if (actionsJson == null) return null
        return try {
            val arr = JSONArray(actionsJson)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                if (obj.optString("id") == id) return obj
            }
            null
        } catch (e: Exception) {
            null
        }
    }
}
