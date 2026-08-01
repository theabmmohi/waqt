import { initializeApp, cert } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import express from "express"
import cron from "node-cron"
import cors from "cors"
import "dotenv/config"
import { CalculationMethod, Coordinates, PrayerTimes, Madhab } from "adhan"

process.on("uncaughtException", async (err) => {
  await notify(`🔥 *Uncaught exception* — exiting for supervisor restart:\n${err?.stack ?? err?.message ?? err}`)
  process.exit(1)
})
process.on("unhandledRejection", async (err) => {
  await notify(`🔥 *Unhandled rejection* — exiting for supervisor restart:\n${err?.stack ?? err?.message ?? err}`)
  process.exit(1)
})

const REQUIRED_ENV = ["SB_URL", "SB_SECRET", "FB_PRIVATE_KEY", "FB_CLIENT_EMAIL", "FB_PROJECT_ID", "API_URL"]
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k])
if (missingEnv.length) {
  // Can't use notify() here — TG_BOT_TOKEN/TG_ADMIN_CID may themselves be among the missing vars.
  console.error(`Missing required env vars: ${missingEnv.join(", ")}`)
  process.exit(1)
}

const supabase = createClient(process.env.SB_URL, process.env.SB_SECRET)
const firebase = initializeApp({ credential: cert({
  privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  clientEmail: process.env.FB_CLIENT_EMAIL,
  projectId: process.env.FB_PROJECT_ID
}) })
const server = express()
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }, secure: true
})

const APP_ORIGIN = "https://app.abm.ami.bd"
server.use(cors({origin: APP_ORIGIN}))
server.use(express.json())

let GHreleaseCache = { data: null, expiresAt: 0 }

const CALC_METHOD_MAP = {
  MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
  NorthAmerica: CalculationMethod.NorthAmerica,
  Egyptian: CalculationMethod.Egyptian,
  UmmAlQura: CalculationMethod.UmmAlQura,
  Karachi: CalculationMethod.Karachi,
  Tehran: CalculationMethod.Tehran,
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
  Singapore: CalculationMethod.Singapore
}
const civilDate = (d, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d)
  const y = Number(parts.find(p => p.type === "year").value)
  const m = Number(parts.find(p => p.type === "month").value)
  const dd = Number(parts.find(p => p.type === "day").value)
  return new Date(y, m - 1, dd, 12, 0, 0)
}

function todaysWaqts(meta, dayOffset = 0) {
  if (!meta?.coords || !meta?.tz) return []
  const coords = new Coordinates(meta.coords.lat, meta.coords.lon)
  const madhab = meta.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi
  const params = (CALC_METHOD_MAP[meta.calcMethod] ?? CalculationMethod.MuslimWorldLeague)()
  params.madhab = madhab
  const calcDate = civilDate(new Date(Date.now() + dayOffset * 86400000), meta.tz)
  const pt = new PrayerTimes(coords, calcDate, params)
  const tomorrowFajr = new PrayerTimes(coords, new Date(calcDate.getTime() + 86400000), params).fajr
  const MIN = 60000
  const startAdj = (d, exact = false) => d ? new Date(d.getTime() + (exact ? 0 : MIN)) : null
  const endAdj = (d) => d ? new Date(d.getTime() - MIN) : null
  return [
    { prayer: "Fajr",    start: startAdj(pt.fajr),          end: endAdj(pt.sunrise) },
    { prayer: "Dhuhr",   start: startAdj(pt.dhuhr),         end: endAdj(pt.asr) },
    { prayer: "Asr",     start: startAdj(pt.asr),           end: endAdj(pt.maghrib) },
    { prayer: "Maghrib", start: startAdj(pt.maghrib, true), end: endAdj(pt.isha) },
    { prayer: "Isha",    start: startAdj(pt.isha),          end: endAdj(tomorrowFajr) }
  ]
}

async function syncUserWaqts(user) {
  const meta = user.user_metadata
  if (!meta?.coords) return
  const rows = [0, 1].flatMap(off => todaysWaqts(meta, off))
    .filter(w => w.start && w.start.getTime() > Date.now())
    .map(w => ({
      user_id: user.id, prayer: w.prayer,
      waqt_start: w.start.toISOString(), waqt_end: w.end.toISOString(),
      fire_at: w.start.toISOString(), stage: "initial"
    }))
  if (!rows.length) return
  const { error } = await supabase.from("scheduled_notifications")
    .upsert(rows, { onConflict: "user_id,prayer,waqt_start", ignoreDuplicates: true })
  if (error) await notify(`⚠️ Error syncing waqts for ${user.id}:\n${error.message}`)
}

async function syncAllUsers() {
  const { data: channelRows, error: chErr } = await supabase.from("notification_channels").select("user_id")
  if (chErr) return await notify(`⚠️ Error listing notification channels for waqt sync:\n${chErr.message}`)
  const activeUserIds = new Set(channelRows.map(c => c.user_id))
  if (!activeUserIds.size) return
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return await notify(`⚠️ Error listing users for waqt sync:\n${error.message}`)
    for (const user of data.users) {
      if (activeUserIds.has(user.id)) await syncUserWaqts(user)
    }
    if (data.users.length < 200) break
    page++
  }
}

async function handlePrayerAction(id, action) {
  const { data: row, error } = await supabase.from("scheduled_notifications").select("*").eq("id", id).maybeSingle()
  if (error) { await notify(`⚠️ Error fetching row for prayer action ${id}:\n${error.message}`); return { ok: false } }
  if (!row || row.handled) return { ok: false }
  if (action === "mark_prayed") {
    const { error: logErr } = await supabase.from("prayer_logs").upsert(
      { user_id: row.user_id, prayer: row.prayer, waqt_start: row.waqt_start },
      { onConflict: "user_id,prayer,waqt_start", ignoreDuplicates: true }
    )
    if (logErr) await notify(`⚠️ Error logging prayer for ${id}:\n${logErr.message}`)
    const { error: updErr } = await supabase.from("scheduled_notifications").update({ handled: true }).eq("id", id)
    if (updErr) await notify(`⚠️ Error marking notification handled for ${id}:\n${updErr.message}`)
    return { ok: !logErr && !updErr }
  }
  if (action === "remind_later") {
    const { error: updErr } = await supabase.from("scheduled_notifications").update({ handled: true }).eq("id", id)
    if (updErr) { await notify(`⚠️ Error marking notification handled for ${id}:\n${updErr.message}`); return { ok: false } }
    const now = Date.now()
    const end = new Date(row.waqt_end).getTime()
    if (end <= now) return { ok: true } // window already over, nothing to schedule
    const fireAt = new Date(now + (end - now) / 2)
    const { error: insErr } = await supabase.from("scheduled_notifications").insert({
      user_id: row.user_id, prayer: row.prayer,
      waqt_start: row.waqt_start, waqt_end: row.waqt_end,
      fire_at: fireAt.toISOString(), stage: "snooze"
    })
    if (insErr) { await notify(`⚠️ Error scheduling snooze reminder for ${id}:\n${insErr.message}`); return { ok: false } }
    return { ok: true }
  }
  return { ok: false }
}

async function dispatchDueNotifications() {
  const { data: due, error } = await supabase.from("scheduled_notifications")
    .select("*").eq("sent", false).lte("fire_at", new Date().toISOString())
    .order("fire_at", { ascending: true }).limit(300)
  if (error) return await notify(`⚠️ Error fetching due notifications:\n${error.message}`)
  if (!due.length) return

  // Group rows whose fire_at falls within ~10 minutes of each other into the same
  // batch, so users due around the same time share one channel lookup + one sent-update
  // instead of each row hitting Supabase individually.
  const MERGE_WINDOW_MS = 10 * 60000
  const batches = []
  for (const row of due) {
    const t = new Date(row.fire_at).getTime()
    let batch = batches.find(b => Math.abs(b.anchor - t) <= MERGE_WINDOW_MS)
    if (!batch) { batch = { anchor: t, rows: [] }; batches.push(batch) }
    batch.rows.push(row)
  }

  const sentIds = []
  for (const batch of batches) {
    const userIds = [...new Set(batch.rows.map(r => r.user_id))]
    const { data: channels, error: chErr } = await supabase
      .from("notification_channels").select("*").in("user_id", userIds)
    if (chErr) { await notify(`⚠️ Error batch-fetching channels for dispatch:\n${chErr.message}`); continue }
    const channelsByUser = new Map()
    for (const c of channels ?? []) {
      if (!channelsByUser.has(c.user_id)) channelsByUser.set(c.user_id, [])
      channelsByUser.get(c.user_id).push(c)
    }

    await Promise.allSettled(batch.rows.map(async row => {
      const alreadyEnded = new Date(row.waqt_end).getTime() <= Date.now()
      if (!alreadyEnded) {
        try { await deliverWaqtReminder(row, channelsByUser.get(row.user_id) ?? []) }
        catch (err) { await notify(`⚠️ Error delivering reminder ${row.id}:\n${err.message}`) }
      }
    }))
    sentIds.push(...batch.rows.map(r => r.id))
  }

  if (sentIds.length) await supabase.from("scheduled_notifications").update({ sent: true }).in("id", sentIds)
}

async function deliverWaqtReminder(row, channels) {
  if (!channels) {
    const { data } = await supabase.from("notification_channels").select("*").eq("user_id", row.user_id)
    channels = data
  }
  if (!channels?.length) return
  const remainingMs = new Date(row.waqt_end).getTime() - Date.now()
  const title = row.stage === "snooze" ? `Reminder: ${row.prayer}` : `${row.prayer} time has started`
  const body = row.stage === "snooze" ? `Have you prayed ${row.prayer} yet?` : `It's time for ${row.prayer}. Tap to open Waqt.`
  const actions = [
    { id: "mark_prayed", title: "Mark as Prayed" },
    ...(remainingMs > 4 * 60000 ? [{ id: "remind_later", title: "Remind Me Later" }] : [])
  ]
  const appTokens = channels.filter(c => c.type === "fcm" && c.metadata?.platform === "app").map(c => c.identifier)
  const webTokens = channels.filter(c => c.type === "fcm" && c.metadata?.platform === "web").map(c => c.identifier)
  const teleChat = channels.find(c => c.type === "telegram")?.identifier

  for (const tokens of [appTokens, webTokens]) {
    if (!tokens.length) continue
    const res = await sendPush(tokens, { title, body, url: "/", actions: actions.map(a => ({ id: a.id, title: a.title, api: `${process.env.API_URL}/prayer/action`, body: { id: row.id, action: a.id } })) })
    if (res.invalidTokens?.length) await supabase.from("notification_channels").delete().eq("type", "fcm").in("identifier", res.invalidTokens)
    if (res.successCount > 0) return
  }
  if (teleChat) {
    await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: teleChat, text: `🕌 *${title}*\n${body}`, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [actions.map(a => ({ text: a.title, callback_data: `${a.id}:${row.id}` }))] }
      })
    })
  }
}

let syncing = false
cron.schedule("0 * * * *", async () => {
  if (syncing) return await notify("⏭️ Skipped waqt sync — previous run still in progress")
  syncing = true
  try { await syncAllUsers() } finally { syncing = false }
})

let dispatching = false
cron.schedule("*/3 * * * *", async () => {
  if (dispatching) return await notify("⏭️ Skipped notification dispatch — previous run still in progress")
  dispatching = true
  try { await dispatchDueNotifications() } finally { dispatching = false }
})

async function pruneEndedNotifications() {
  const { data, error } = await supabase.from("scheduled_notifications")
    .delete().lt("waqt_end", new Date().toISOString()).select("id")
  if (error) return await notify(`⚠️ Error pruning ended notifications:\n${error.message}`)
  if (data?.length) await notify(`🧹 Pruned ${data.length} ended notification row(s)`)
}

let pruning = false
cron.schedule("0 3 * * *", async () => {
  if (pruning) return await notify("⏭️ Skipped notification pruning — previous run still in progress")
  pruning = true
  try { await pruneEndedNotifications() } finally { pruning = false }
})





async function sendPush(tokens, { title, body, url = "/", actions = [] }) {
  if (!tokens?.length) return { successCount: 0, failureCount: 0, invalidTokens: [] }
  const cappedActions = actions.slice(0, 2)
  const notifId = Date.now() % 2147483647
  const message = {
    webpush: { fcmOptions: { link: url } },
    android: { priority: "high" },
    tokens, data: {
      actions: JSON.stringify(cappedActions),
      notifId: String(notifId),
      title, body, url
    }
  }
  const res = await getMessaging(firebase).sendEachForMulticast(message)
  const invalidTokens = res.responses
    .map((r, i) => (!r.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(r.error?.code) ? tokens[i] : null))
    .filter(Boolean)
  return { successCount: res.successCount, failureCount: res.failureCount, invalidTokens }
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function mail ({ sender, to, subject, body, html, unsubscribe }) {
  try {
    if (!to || !subject || !body) throw new Error("Expecting \"to\", \"subject\" and \"body\"")
    const headers = {}
    if (unsubscribe) {
      headers["List-Unsubscribe"] = `<${unsubscribe}>`
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    }
    await mailer.sendMail({
      from: `${sender||process.env.APP_NAME||"Mail"} <${process.env.SMTP_FROM}>`,
      replyTo: process.env.MAIL_REPLYTO,
      to, subject, headers,
      ...(html?{html: body}:{text: body})
    })
  } catch (error) { throw error }
}

async function notify (message) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TG_ADMIN_CID,
        text: message,
        parse_mode: "Markdown"
      })
    })
  } catch(error) { console.error("Error at notifyAdmin: ", error) }
}

async function getUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) throw new Error("Unauthorized — Token Required")
  const { data, error } = await supabase.auth.getUser(token)
  if (error) throw new Error(error)
  return data.user
}

async function GHlatestRelease() {
  if (GHreleaseCache.data && Date.now() < GHreleaseCache.expiresAt) return GHreleaseCache.data
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}/releases/latest`, {
    headers: {
      "User-Agent": "waqt-server",
      "Accept": "application/vnd.github+json",
      ...(process.env.GITHUB_TOKN ? { "Authorization": `Bearer ${process.env.GITHUB_TOKN}` } : {})
    }
  })
  if (!res.ok) {
    let body
    try { body = await res.json() } catch { body = { message: await res.text() } }
    const err = new Error(body.message || `GitHub API returned ${res.status}`)
    err.status = res.status
    err.details = body
    throw err
  }
  const data = await res.json()
  GHreleaseCache = { data, expiresAt: Date.now() + 600_000 }
  return data
}





server.get("/download/android/version", async (_, res) => {
  try {
    const data = await GHlatestRelease()
    res.json({ version: data.tag_name?.replace(/^v/, "") ?? null })
  } catch (err) { res.status(500).json({ error: err.message, details: err.details }) }
})

server.get("/download/android/latest", async (_, res) => {
  try {
    const data = await GHlatestRelease()
    const asset = data.assets?.find(a => a.name.endsWith(".apk"))
    if (!asset) return res.status(404).send("No APK found in latest release")
    res.redirect(302, asset.browser_download_url)
  } catch (err) { res.status(500).json({ error: err.message, details: err.details }) }
})

server.post("/webhook/telegram", async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== process.env.TG_HOOK_SCRT) return res.sendStatus(403)
  res.sendStatus(200)
  try {
    const { message, callback_query } = req.body
    if (callback_query) {
      const [action, id] = (callback_query.data ?? "").split(":")
      const { ok } = await handlePrayerAction(id, action)
      await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callback_query.id,
          text: !ok ? "Couldn't process — try again in the app" : action === "mark_prayed" ? "Marked as prayed ✅" : "We'll remind you again later ⏰"
        })
      })
      return
    }
    if (!message) return
    const chatId = message.chat.id
    const text = message.text?.trim()
    if (text?.startsWith("/start")) {
      const [, uid] = text.split(" ")
      const chatId = message.chat.id
      let reply = `Welcome to Waqt Bot!\n\nYour Chat ID is:\n\`${chatId}\`\n\nCopy this and paste it in the Waqt app under Settings → Notifications → Telegram.`
      if (uid) {
        const { error } = await supabase
          .from("notification_channels")
          .upsert(
            { user_id: uid, type: "telegram", identifier: String(chatId), last_used_at: new Date().toISOString() },
            { onConflict: "type,identifier" }
          )
        if (!error) {
          const { data, error: userErr } = await supabase.auth.admin.getUserById(uid)
          reply = userErr ? userErr.message : `Your Telegram is now connected with your Waqt account (${data.user.email})`
        } else {
          reply = error.message
        }
      }
      await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parse_mode: "Markdown",
          chat_id: chatId,
          text: reply
        })
      })
    }
  } catch (err) { await notify(`⚠️ Error at /webhook/telegram:\n${err.message}`) }
})

server.post("/webhook/release", async (req, res) => {
  if (req.headers["x-release-secret"] !== process.env.RELEASE_HOOK_SECRET) return res.sendStatus(403)
  res.sendStatus(200)
  GHreleaseCache = { data: null, expiresAt: 0 }
  const version = req.body?.version
  try {
    const { data: channels, error } = await supabase
      .from("notification_channels")
      .select("identifier")
      .eq("type", "fcm")
      .eq("metadata->>platform", "app")
    if (error) throw new Error(error.message)
    const tokens = channels.map(c => c.identifier)
    if (!tokens.length) return await notify(`📦 Release ${version ?? "?"} published — no app tokens to notify.`)
    let successCount = 0, failureCount = 0
    const invalidTokens = []
    for (const batch of chunk(tokens, 500)) {
      const result = await sendPush(batch, {
        title: "Update Available",
        body: `Waqt ${version ?? ""} is ready to install.`,
        url: "/installations"
      })
      successCount += result.successCount
      failureCount += result.failureCount
      invalidTokens.push(...result.invalidTokens)
    }
    if (invalidTokens.length) {
      const { error: pruneErr } = await supabase.from("notification_channels").delete().eq("type", "fcm").in("identifier", invalidTokens)
      if (pruneErr) await notify(`⚠️ Error pruning invalid tokens:\n${pruneErr.message}`)
    }
    await notify(`📦 *Release ${version ?? "?"}* notified\n${successCount} sent | ${failureCount} failed | ${invalidTokens.length} pruned`)
  } catch (err) {
    await notify(`⚠️ Release webhook failed for ${version ?? "?"}:\n${err.message}`)
  }
})

server.post("/prayer/action", async (req, res) => {
  try {
    const { id, action } = req.body
    if (!id || !["mark_prayed", "remind_later"].includes(action)) throw new Error("Invalid request")
    const { ok } = await handlePrayerAction(id, action)
    res.json({ success: ok })
  } catch (err) {
    await notify(`⚠️ Error at /prayer/action:\n${err.message}`)
    res.json({ success: false, message: err?.message ?? "Server Error" })
  }
})

server.post("/prayer/resync", async (req, res) => {
  try {
    const user = await getUser(req)
    await syncUserWaqts(user)
    res.json({ success: true })
  } catch (err) { res.json({ success: false, message: err?.message ?? "Server Error" }) }
})

server.post("/settings/notifications/webPush/status", async (req, res) => {
  try {
    const user = await getUser(req)
    const { fcmToken } = req.body
    if (!fcmToken) return res.json({ success: true, subscribed: false })
    const { data, error } = await supabase
      .from("notification_channels")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "fcm")
      .eq("identifier", fcmToken)
      .maybeSingle()
    if (error) throw new Error(error.message)
    res.json({
      success: true,
      subscribed: !!data
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})

server.post("/settings/notifications/webPush/subscribe", async (req, res) => {
  try {
    const user = await getUser(req)
    const { fcmToken, platform } = req.body
    if (!fcmToken) throw new Error("No FCM Token Provided")
    const metadata = platform === "app" || platform === "web" ? { platform } : {}
    const { error } = await supabase
      .from("notification_channels")
      .upsert(
        { user_id: user.id, type: "fcm", identifier: fcmToken, metadata, last_used_at: new Date().toISOString() },
        { onConflict: "type,identifier" }
      )
    if (error) throw new Error(error.message)
    res.json({
      success: true,
      message: "Push Notifications Subscribed"
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})

server.post("/settings/notifications/webPush/unsubscribe", async (req, res) => {
  try {
    const user = await getUser(req)
    const { fcmToken } = req.body
    if (fcmToken) {
      const { error } = await supabase
        .from("notification_channels")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "fcm")
        .eq("identifier", fcmToken)
      if (error) throw new Error(error.message)
    }
    res.json({
      success: true,
      message: "Push Notifications Unsubscribed"
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})

server.post("/settings/notifications/telegram/status", async (req, res) => {
  try {
    const user = await getUser(req)
    const { data, error } = await supabase
      .from("notification_channels")
      .select("identifier")
      .eq("user_id", user.id)
      .eq("type", "telegram")
      .maybeSingle()
    if (error) throw new Error(error.message)
    res.json({
      success: true,
      chatId: data?.identifier ?? null
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})

server.post("/settings/notifications/telegram/validateID", async (req, res) => {
  try {
    const user = await getUser(req)
    const { chatId } = req.body
    let chatID = chatId
    if (!chatID) {
      const { data: channel, error: fetchErr } = await supabase
        .from("notification_channels")
        .select("identifier")
        .eq("user_id", user.id)
        .eq("type", "telegram")
        .maybeSingle()
      if (fetchErr) throw new Error(fetchErr.message)
      chatID = channel?.identifier
    }
    if (!chatID) throw new Error("No Telegram Chat ID Found In This Account")
    const resp = await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatID,
        text: `Your Telegram is now connected with your Waqt account (${user.email})`,
        parse_mode: "Markdown"
      })
    })
    const tele = await resp.json()
    if (!tele.ok) {
      if (tele.error_code === 400) throw new Error("Bot Isn't Started By User")
      if (tele.error_code === 403) throw new Error("Bot Is Blocked By User")
      throw new Error(tele.description ?? "Telegram Error")
    }
    const { error: upsertErr } = await supabase
      .from("notification_channels")
      .upsert(
        { user_id: user.id, type: "telegram", identifier: String(chatID), last_used_at: new Date().toISOString() },
        { onConflict: "type,identifier" }
      )
    if (upsertErr) throw new Error(upsertErr.message)
    const username = tele.result.chat.username
    res.json({ success: true, chatId: String(chatID), message: `${username ? `@${username}` : "Your Telegram"} Is Linked With Your Waqt Account` })
  } catch (err) { res.json({ success: false, message: err?.message ?? "Server Error" }) }
})

server.post("/settings/notifications/telegram/unlink", async (req, res) => {
  try {
    const user = await getUser(req)
    const { error } = await supabase
      .from("notification_channels")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "telegram")
    if (error) throw new Error(error.message)
    res.json({
      success: true,
      message: "Telegram Account Disconnected"
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})

server.post("/settings/security/sessions/logout", async (req, res) => {
  try {
    const user = await getUser(req)
    const { scope, fcmToken } = req.body
    if (scope === "global" || (scope === "others" && fcmToken)) {
      let query = supabase.from("notification_channels").delete().eq("user_id", user.id).eq("type", "fcm")
      if (scope === "others") query = query.neq("identifier", fcmToken)
      const { error } = await query
      if (error) throw new Error(error.message)
    }
    res.json({
      success: true,
      message: scope === "global" ? "Removed All FCM Tokens" : "Removed Other Devices' FCM Tokens"
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})





server.get("/", (_, res) => res.type("text").send("Im Alive!"))
const httpServer = server.listen(8000, () => console.log("Server Running On Port: 8000"))
httpServer.on("error", async (err) => {
  await notify(`🔥 Server failed to start:\n${err.message}`)
  process.exit(1)
})
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`${sig} received — shutting down gracefully`)
    httpServer.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10000).unref() // force-exit if close hangs
  })
}