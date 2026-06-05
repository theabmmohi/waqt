import "dotenv/config"
import nodemailer from "nodemailer"
import express from "express"
import cors from "cors"
import {
  Webhook
} from "svix"
import {
  createClient
} from "@supabase/supabase-js"

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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: process.env.TG_ADMIN_CID,
        text: message,
        parse_mode: "Markdown"
      })
    });
  } catch(error) {
    console.error("Error at notifyAdmin: ", error);
  }
}





server.get("/", async (req, res) => {
  res.type("text").send("Im Alive!")
})

server.post("/webhook/resend/email/received", express.raw({ type: 'application/json' }), async (req, res) => {
  const webhook = new Webhook(process.env.RESEND_MRWH_SIGNINGSECRET)
  try {
    const data = webhook.verify(req.body, req.headers).data
    const response = await fetch(`https://api.resend.com/emails/${data.email_id}`, { headers: { Authorization: `Bearer ${process.env.SMTP_PASS}` } })
    const email = await response.json()
    
    await notify(email.text || email.html || "No Body")
    res.sendStatus(200)
  } catch {
    res.sendStatus(400)
  }
})





server.listen(8000, () => console.log("Server Running On Port: 8000"))