import {
  useContext,
  useEffect,
  useRef,
  useState
} from "react"
import {
  CircularProgress,
  FormControl,
  Typography,
  TextField,
  Switch,
  Button,
  Stack,
  Link
} from "@mui/material"
import { Theme, getNativeFcmToken, clearNativeFcmToken } from "@/main"
import { LocalNotifications } from "@capacitor/local-notifications"
import { PushNotifications } from "@capacitor/push-notifications"
import { subscribeWeb } from "@/firebase"
import { Capacitor } from "@capacitor/core"
import Supabase from "@/supabase"
import api from "@/api"

import TelegramIcon from "@mui/icons-material/Telegram"
import LinkOffIcon from "@mui/icons-material/LinkOff"
import WebhookIcon from "@mui/icons-material/Webhook"
import LinkIcon from "@mui/icons-material/Link"

export default function Notifications({setSnack}) {
  const { user } = useContext(Theme)
  const [teleUnLinking, setTeleUnLinking] = useState(false)
  const [browEnabled, setBrowEnabled]     = useState(false)
  const [browLoading, setBrowLoading]     = useState(true )
  const [teleLinking, setTeleLinking]     = useState(false)
  const [teleLinked, setTeleLinked]       = useState(false)
  const [showCon, setShowCon]             = useState(false)
  const [teleId, setTeleId]               = useState("")
  const pollRef = useRef()
  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.post("/settings/notifications/telegram/status")
        if (data.success && data.chatId) {
          setTeleLinked(true)
          setTeleId(data.chatId)
          clearInterval(pollRef.current)
        }
      } catch { return }
    }, 2500)
    setTimeout(() => clearInterval(pollRef.current), 120000)
  }
  const toggleBrowWeb = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return setSnack("Push notifications not supported on this device")
    setBrowLoading(true)
    try {
      if (browEnabled) {
        const fcmToken = await subscribeWeb()
        if (fcmToken) await api.post("/settings/notifications/webPush/unsubscribe", { fcmToken })
        await Supabase.auth.updateUser({ data: { webPushNotif: false } })
        setBrowEnabled(false)
        setSnack("Browser notifications disabled")
      } else {
        const fcmToken = await subscribeWeb()
        if (!fcmToken) throw new Error("Push notifications not supported on this device")
        const { data } = await api.post("/settings/notifications/webPush/subscribe", { fcmToken, platform: "web" })
        if (!data.success) throw new Error(data.message)
        await Supabase.auth.updateUser({ data: { webPushNotif: true } })
        setBrowEnabled(true)
        api.post("/prayer/resync").catch(() => {}) // schedule today's remaining waqts right away
        setSnack("Browser notifications enabled")
      }
    } catch (err) {
      if (err.name === "NotAllowedError") setSnack("Permission denied — allow notifications in browser settings")
      else setSnack(err?.message ?? "Something went wrong")
    } finally { setBrowLoading(false) }
  }
  const toggleBrowNative = async () => {
    setBrowLoading(true)
    try {
      if (browEnabled) {
        const fcmToken = getNativeFcmToken()
        if (fcmToken) await api.post("/settings/notifications/webPush/unsubscribe", { fcmToken })
        clearNativeFcmToken()
        await Supabase.auth.updateUser({ data: { platformNotif: false } })
        setBrowEnabled(false)
        setSnack("Notifications disabled for this device")
      } else {
        let { receive } = await PushNotifications.checkPermissions()
        if (receive === "prompt") ({ receive } = await PushNotifications.requestPermissions())
        if (receive !== "granted") {
          setSnack("Permission denied — enable notifications for Waqt in your device settings")
          return
        }
        let { display } = await LocalNotifications.checkPermissions()
        if (display === "prompt") ({ display } = await LocalNotifications.requestPermissions())
        if (display !== "granted") {
          setSnack("Permission denied — enable notifications for Waqt in your device settings")
          return
        }
        await PushNotifications.register()
        await Supabase.auth.updateUser({ data: { platformNotif: true } })
        setBrowEnabled(true)
        api.post("/prayer/resync").catch(() => {}) // schedule today's remaining waqts right away
        setSnack("Notifications enabled")
      }
    } catch (err) {
      setSnack(err?.message ?? "Something went wrong")
    } finally { setBrowLoading(false) }
  }
  const toggleBrow = Capacitor.isNativePlatform() ? toggleBrowNative : toggleBrowWeb
  const teleSubmit = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!teleLinked) {
      setTeleLinking(true)
      try {
        const { data } = await api.post("/settings/notifications/telegram/validateID", { chatId: teleId.trim() })
        if (!data.success) throw new Error(data.message)
        setTeleLinked(true)
        setTeleId(data.chatId)
        api.post("/prayer/resync").catch(() => {}) // schedule today's remaining waqts right away
        setSnack(data.message)
      } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setTeleLinking(false)}
    } else {
      setTeleUnLinking(true)
      try {
        const { data } = await api.post("/settings/notifications/telegram/unlink")
        if (!data.success) throw new Error(data.message)
        setTeleLinked(false)
        setTeleId("")
        setSnack(data.message)
      } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setTeleUnLinking(false)}
    }
  }
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let cancelled = false
    let liveRegListener
    const tasks = []
    tasks.push(api.post("/settings/notifications/telegram/status").then(({ data }) => {
      if (cancelled) return
      if (data.success && data.chatId) {
        setTeleLinked(true)
        setTeleId(data.chatId)
      }
    }).catch(() => {}))
    if (Capacitor.isNativePlatform()) {
      tasks.push(PushNotifications.checkPermissions().then(({ receive }) => {
        if (receive !== "granted") return setBrowEnabled(false)
        const existingToken = getNativeFcmToken()
        if (existingToken) return api.post("/settings/notifications/webPush/status", { fcmToken: existingToken }).then(({ data }) => { if (!cancelled) setBrowEnabled(!!data.subscribed) })
        setBrowEnabled(false)
        PushNotifications.addListener("registration", () => { if (!cancelled) setBrowEnabled(true) }).then(handle => { liveRegListener = handle })
      }).catch(() => { if (!cancelled) setBrowEnabled(false) }))
    }
    if ("serviceWorker" in navigator && "Notification" in window) {
      if (Notification.permission === "granted") setBrowEnabled(false)
      else tasks.push(subscribeWeb().then(fcmToken => {
        if (!fcmToken) return setBrowEnabled(false)
        return api.post("/settings/notifications/webPush/status", { fcmToken }).then(({ data }) => { if (!cancelled) setBrowEnabled(!!data.subscribed) })
      }).catch(() => { if (!cancelled) setBrowEnabled(false) }))
    }
    Promise.allSettled(tasks).then(() => { if (!cancelled) {
      setBrowLoading(false)
      setShowCon(true)
    } })
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => { cancelled = true; liveRegListener?.remove() }
  }, [user?.id])
  return (<Stack sx={{ p: 2.5 }}>
    {showCon && (
      <Stack sx={{ alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5 }}>
        <Stack sx={{ flexDirection: "row", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><WebhookIcon sx={{ fontSize: 24 }}/>{Capacitor.isNativePlatform() ? "App Notifications" : "Browser Notifications"}</Typography>
            <Typography variant="body2" color="text.secondary">Includes prayer time reminders, with quick actions to mark as prayed or snooze.</Typography>
          </Stack>
          <Stack sx={{ justifyContent: "center" }}>
            <Switch checked={browEnabled} onChange={toggleBrow} disabled={browLoading}/>
          </Stack>
        </Stack>
        <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
          <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><TelegramIcon sx={{ fontSize: 24 }}/>Telegram Notifications</Typography>
          <Stack sx={{ "& .MuiTypography-root": { color: "text.secondary" } }}>
            <Stack sx={{ gap: 2.5 }}>
              {!teleLinked ?
                (<Stack sx={{ gap: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>How to connect your Telegram account:</Typography>
                  <Typography>1. Open our official Telegram bot <Link href={`https://t.me/WaqtOfficialBot?start=${user?.id}`} target="_blank" rel="noopener noreferrer" onClick={startPolling}><strong>@WaqtOfficialBot</strong></Link></Typography>
                  <Typography>2. Start the bot — it will send your <strong>Chat ID</strong></Typography>
                  <Typography>3. Paste the Chat ID below and tap <strong>Link</strong></Typography>
                </Stack>) :
                (<Stack>
                  <Typography>Linked with a Telegram account. Tap <strong>Unlink</strong> to disconnect.</Typography>
                </Stack>)
              }
              <FormControl component="form" onSubmit={teleSubmit} sx={{ flexDirection: "row", display: "flex", gap: 1 }}>
                <TextField required size="small" label="Chat ID" type="number" disabled={teleLinked} value={teleId} onChange={e => setTeleId(e.target.value)}/>
                <Button disableElevation type="submit" disabled={teleLinking || teleUnLinking} variant={(teleLinking || teleUnLinking) ? "outlined" : "contained"} startIcon={teleLinked ? (teleUnLinking ? <CircularProgress size={14}/> : <LinkOffIcon/>) : (teleLinking ? <CircularProgress size={14}/> : <LinkIcon/>)}>
                  {teleLinked ? (teleUnLinking ? "Unlinking..." : "Unlink") : (teleLinking ? "Linking..." : "Link")}
                </Button>
              </FormControl>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    )}
  </Stack>)
}
