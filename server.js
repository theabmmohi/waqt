import { initializeApp, cert } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import express from "express"
import cron from "node-cron"
import cors from "cors"
import "dotenv/config"
import {
  CalculationMethod,
  Coordinates,
  PrayerTimes,
  Madhab
} from "adhan"

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

server.use(cors({origin: "https://app.abm.ami.bd"}))
server.use(express.json())

let GHreleaseCache = { data: null, expiresAt: 0 }





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
    const { message } = req.body
    if (!message) return
    const chatId = message.chat.id
    const text = message.text?.trim()
    if (text?.startsWith("/start")) {
      const [, uid] = text.split(" ")
      const chatId = message.chat.id
      let reply = `Welcome to Waqt Bot!\n\nYour Chat ID is:\n\`${chatId}\`\n\nCopy this and paste it in the Waqt app under Settings → Notifications → Telegram.`
      if (uid) {
        const { data, error } = await supabase.auth.admin.updateUserById(uid, { user_metadata: {teleChatId: chatId} })
        reply = error ? error.message : `Your Telegram is now connected with your Waqt account (${data.user.email})`
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
  } catch (err) { console.error("Error At /webhook/telegram: ", err) }
})

server.post("/settings/notifications/webPush/status", async (req, res) => {
  try {
    const user = await getUser(req)
    const { fcmToken } = req.body
    const existing = user.user_metadata?.fcmTokens ?? []
    res.json({
      success: true,
      subscribed: !!fcmToken && existing.includes(fcmToken)
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})

server.post("/settings/notifications/webPush/subscribe", async (req, res) => {
  try {
    const user = await getUser(req)
    const { fcmToken } = req.body
    if (!fcmToken) throw new Error("No FCM Token Provided")
    const existing = user.user_metadata?.fcmTokens ?? []
    const fcmTokens = [...new Set([...existing, fcmToken])]
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, fcmTokens }
    })
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
    const existing = user.user_metadata?.fcmTokens ?? []
    const filtered = existing.filter(t => t !== fcmToken)
    const fcmTokens = filtered.length ? filtered : null
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, fcmTokens }
    })
    res.json({
      success: true,
      message: "Push Notifications Unsubscribed"
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})

server.post("/settings/notifications/telegram/validateID", async (req, res) => {
  try {
    const user = await getUser(req)
    const chatID = user.user_metadata?.teleChatId
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
    const username = tele.result.chat.username
    res.json({
      success: true,
      message: `${username ? `@${username}` : "Your Telegram"} Is Linked With Your Waqt Account`
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
    let fcmTokens
    if (scope === "global") fcmTokens = null
    else if (scope === "others" && fcmToken) fcmTokens = [fcmToken]
    if (fcmTokens !== undefined) await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {...user.user_metadata, fcmTokens}
    })
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
server.listen(8000, () => console.log("Server Running On Port: 8000"))