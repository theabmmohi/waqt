import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import webpush from "web-push"
import express from "express"
import cors from "cors"
import "dotenv/config"
import {
  
} from "adhan"

const supabase = createClient(process.env.SB_URL, process.env.SB_SECRET)
const server = express()
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  secure: true
})

server.use(cors({origin: "app.abm.ami.bd"}))
server.use(express.json())
webpush.setVapidDetails(
  process.env.VAPID_MAILTO,
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
)





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
  } catch(error) {
    console.error("Error at notifyAdmin: ", error)
  }
}

async function getUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) throw new Error("Unauthorized — Token Required")
  const { data, error } = await supabase.auth.getUser(token)
  if (error) throw new Error(error)
  return data.user
}





server.get("/", async (req, res) => {
  res.type("text").send("Im Alive!")
})

server.post("/webhook/telegram", async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== process.env.TG_HOOK_SCRT) return res.sendStatus(403)
  res.sendStatus(200)
  try {
    const { message } = req.body
    if (!message) return
    const chatId = message.chat.id
    const text = message.text?.trim()
    if (text === "/start") await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Welcome to Waqt Bot!\n\nYour Chat ID is:\n\`${chatId}\`\n\nCopy this and paste it in the Waqt app under Settings → Notifications → Telegram.`,
        parse_mode: "Markdown"
      })
    })
  } catch (err) { console.error("Error At /webhook/telegram: ", err) }
})

server.post("/settings/notifications/webPush/getPublic", (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC })
})

server.post("/settings/notifications/webPush/subscribe", async (req, res) => {
  try {
    const user = await getUser(req)
    const { subscription } = req.body
    if (!subscription) throw new Error("No Subscription Provided")
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, pushSubscription: subscription }
    })
    res.json({
      success: true,
      message: "WebPush Subscribed"
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})

server.post("/settings/notifications/webPush/unsubscribe", async (req, res) => {
  try {
    const user = await getUser(req)
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, pushSubscription: null }
    })
    res.json({
      success: true,
      message: "WebPush Unsubscribed"
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





server.listen(8000, () => console.log("Server Running On Port: 8000"))