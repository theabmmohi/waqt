import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import express from "express"
import cors from "cors"
import "dotenv/config"

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

server.use(cors())
server.use(express.json())





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





server.get("/", async (req, res) => {
  res.type("text").send("Im Alive!")
})

server.post("/settings/notifications/telegram/validateID", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token) throw new Error("Unauthorized - Token Required")
    const { data, error } = await supabase.auth.getUser(token)
    if (error) throw new Error(error.message)
    const chatID = data.user?.user_metadata?.teleChatId
    if (!chatID) throw new Error("No Telegram Chat ID Provided In This Account")
    const resp = await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatID,
        text: `Your telegram is now connected with your Waqt account *_(${data.user.email})_*`,
        parse_mode: "Markdown"
      })
    })
    const tele = await resp.json()
    if (!tele.ok) {
      if (tele.error_code === 403) throw new Error("Bot Isn't Started Or Blocked By User")
      throw new Error(tele.description ?? "Telegram Error")
    }
    res.json({
      success: true,
      message: `${tele.result.chat.username ?? "Your Telegram"} Is Linked With Your Waqt Account`
    })
  } catch (err) {res.json({
    success: false,
    message: err?.message ?? "Server Error"
  })}
})





server.listen(8000, () => console.log("Server Running On Port: 8000"))