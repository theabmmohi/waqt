/* eslint-disable react-refresh/only-export-components */
import { LocalNotifications } from "@capacitor/local-notifications"
import { PushNotifications } from "@capacitor/push-notifications"
import { BrowserRouter } from "react-router-dom"
import { registerSW } from "virtual:pwa-register"
import { createRoot } from "react-dom/client"
import { App as Cap } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"
import {
  createContext,
  StrictMode,
  useContext,
  useEffect,
  useRef,
  useState
} from "react"
import {
  ThemeProvider,
  CssBaseline
} from "@mui/material"
import {
  lightTheme,
  darkTheme
} from "@/theme"
import Preloader from "@asset/preloader"
import { subscribeWeb } from "@/firebase"
import Supabase from "@/supabase"
import api from "@/api"
import App from "@/waqt"
import "@/style.css"
export const Theme = createContext()
let nativeFcmToken = null
export function getNativeFcmToken() { return nativeFcmToken }

function useNativePush() {
  const { user } = useContext(Theme)
  const tokenRef = useRef(null)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let regListener, receivedListener, actionListener
    (async () => {
      await LocalNotifications.requestPermissions()
      const { display } = await PushNotifications.requestPermissions()
      if (display !== "granted") return
      await PushNotifications.register()
      regListener = await PushNotifications.addListener("registration", ({ value: fcmToken }) => {
        tokenRef.current = fcmToken
        nativeFcmToken = fcmToken
        if (user) api.post("/settings/notifications/webPush/subscribe", { fcmToken }).catch(err => console.error("FCM token registration failed:", err))
      })
      receivedListener = await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
        const { title, body, url, actions } = notification.data ?? {}
        const parsedActions = (actions ? JSON.parse(actions) : []).slice(0, 2)
        const notifId = Date.now() % 2147483647
        const actionTypeId = parsedActions.length ? `push_${notifId}` : undefined
        if (actionTypeId) {
          await LocalNotifications.registerActionTypes({
            types: [{
              actions: parsedActions.map(a => ({ id: a.id, title: a.title })),
              id: actionTypeId
            }]
          })
        }
        await LocalNotifications.schedule({
          notifications: [{
            id: notifId,
            title: title ?? "Waqt",
            body: body ?? "",
            extra: { url: url ?? "/", actionsMeta: parsedActions },
            actionTypeId
          }]
        })
      })
      actionListener = await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
        const meta = event.notification.extra?.actionsMeta?.find(a => a.id === event.actionId)
        const url = meta?.url ?? event.notification.extra?.url ?? "/"
        window.location.href = url
      })
    })()
    return () => { regListener?.remove(); receivedListener?.remove(); actionListener?.remove() }
  }, [])
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || !tokenRef.current) return
    api.post("/settings/notifications/webPush/subscribe", { fcmToken: tokenRef.current })
      .catch(err => console.error("FCM token re-sync failed:", err))
  }, [user])
}

function useWebPushResync() {
  const { user } = useContext(Theme)
  useEffect(() => {
    if (Capacitor.isNativePlatform() || !user) return
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return
    if (Notification.permission !== "granted") return
    subscribeWeb()
      .then(fcmToken => fcmToken && api.post("/settings/notifications/webPush/subscribe", { fcmToken }))
      .catch(err => console.error("Web push token re-sync failed:", err))
  }, [user])
}

function Helper() {
  useNativePush()
  useWebPushResync()
  useEffect(() => {
    const backListener = Cap.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else Cap.exitApp()
    })
    const urlListener = Cap.addListener("appUrlOpen", async ({ url }) => {
      if (!url.includes("login-callback")) return
      try {
        const code = new URL(url).searchParams.get("code")
        if (!code) { alert("No code in callback URL: " + url); return }
        const { error } = await Supabase.auth.exchangeCodeForSession(code)
        if (error) { alert("Exchange failed: " + error.message); return }
        await Browser.close()
        window.location.href = "/"
      } catch (e) {
        alert("Callback error: " + e.message)
      }
    })
    return () => { backListener.remove(); urlListener.remove() }
  }, [])
  return null
}

function React() {
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState(() => localStorage.getItem("AppTheme") || "system")
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches)
  useEffect(() => {
    const start = Date.now()
    const done = () => {
      const remaining = Math.max(0, 1000 - (Date.now() - start))
      setTimeout(() => {
        setLeaving(true)
        setTimeout(() => setReady(true), 500)
      }, remaining)
    }
    Promise.all([
      document.fonts.ready,
      new Promise(res => {
        if (document.readyState === "complete") res()
        else window.addEventListener("load", res, { once: true })
      }),
      Supabase.auth.getUser().then(({ data }) => {
        setUser(data?.user ?? null)
      })
    ]).then(done)
    const { data: listener } = Supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e) => setDark(e.matches)
    query.addEventListener("change", handler)
    return () => {
      query.removeEventListener("change", handler)
      listener.subscription.unsubscribe()
    }
  }, [])
  const isDark = mode === "dark" || (mode === "system" && dark)
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute("content", isDark ? "#000000" : "#ffffff")
  }, [isDark])
  const toggle = (x) => {
    setMode(x)
    localStorage.setItem("AppTheme", x)
  }
  return (
    <Theme.Provider value={{ dark: mode, toggle, user }}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
        <CssBaseline/>
        {!ready && <Preloader leaving={leaving}/>}
        {(leaving || ready) && (
          <BrowserRouter>
            <Helper/>
            <App/>
          </BrowserRouter>
        )}
      </ThemeProvider>
    </Theme.Provider>
  )
}

createRoot(document.getElementById("waqt")).render(
  <StrictMode>
    <React/>
  </StrictMode>
)

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault()
  window.location.reload()
})

registerSW({ immediate: true })
