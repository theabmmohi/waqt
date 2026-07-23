/* eslint-disable react-refresh/only-export-components */
import { LocalNotifications } from "@capacitor/local-notifications"
import { PushNotifications } from "@capacitor/push-notifications"
import { ScreenOrientation } from "@capacitor/screen-orientation"
import { registerSW } from "virtual:pwa-register"
import { BrowserRouter } from "react-router-dom"
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
import { LanguageProvider } from "@/i18n"
import { subscribeWeb } from "@/firebase"
import Supabase from "@/supabase"
import api from "@/api"
import App from "@/waqt"
import "@/style.css"
export const Theme = createContext()
let nativeFcmToken = null
export function getNativeFcmToken() { return nativeFcmToken }
export function clearNativeFcmToken() { nativeFcmToken = null }

let deferredPwaPrompt = null
export function getPwaPrompt() { return deferredPwaPrompt }
export function clearPwaPrompt() { deferredPwaPrompt = null }
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault()
  deferredPwaPrompt = e
  window.dispatchEvent(new Event("pwa-prompt-ready"))
})

if (Capacitor.isNativePlatform()) ScreenOrientation.lock({ orientation: "portrait" }).catch((err) => console.error("Native orientation lock failed:", err))
else if (screen.orientation?.lock) screen.orientation.lock("portrait").catch((err) => console.error("Web orientation lock failed:", err))

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add("native-app")
  const viewport = document.querySelector('meta[name="viewport"]')
  if (viewport) viewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")
}

export const passkeyShimReady = Capacitor.isNativePlatform()
  ? import("@capgo/capacitor-passkey")
      .then(({ CapacitorPasskey }) => CapacitorPasskey.autoShimWebAuthn())
      .catch((err) => console.error("Native passkey shim failed:", err))
  : Promise.resolve()

function useNativePush() {
  const { user } = useContext(Theme)
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let regListener, regErrorListener
    (async () => {
      regListener = await PushNotifications.addListener("registration", ({ value: fcmToken }) => {
        nativeFcmToken = fcmToken
        if (userRef.current) api.post("/settings/notifications/webPush/subscribe", { fcmToken, platform: "app" }).catch(err => console.error("FCM token registration failed:", err))
      })
      regErrorListener = await PushNotifications.addListener("registrationError", (err) => {
        console.error("FCM registration error:", err)
      })
    })()
    return () => { regListener?.remove(); regErrorListener?.remove() }
  }, [])
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return
    if (!user.user_metadata?.platformNotif) return
    (async () => {
      try {
        const existingToken = getNativeFcmToken()
        if (existingToken) {
          await api.post("/settings/notifications/webPush/subscribe", { fcmToken: existingToken, platform: "app" }).catch(err => console.error("FCM token resync failed:", err))
          return
        }
        const { receive } = await PushNotifications.checkPermissions()
        if (receive !== "granted") return
        const { display } = await LocalNotifications.checkPermissions()
        if (display !== "granted") return
        await PushNotifications.register()
      } catch (err) {
        console.error("Silent FCM re-registration failed:", err)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.user_metadata?.platformNotif])
}

function useWebPushResync() {
  const { user } = useContext(Theme)
  useEffect(() => {
    if (Capacitor.isNativePlatform() || !user) return
    if (!user.user_metadata?.webPushNotif) return
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return
    if (Notification.permission !== "granted") return
    subscribeWeb()
      .then(fcmToken => fcmToken && api.post("/settings/notifications/webPush/subscribe", { fcmToken, platform: "web" }))
      .catch(err => console.error("Web push token re-sync failed:", err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.user_metadata?.webPushNotif])
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
      if (url.includes("push")) {
        try {
          const target = new URL(url).searchParams.get("url") ?? "/"
          window.location.href = target
        } catch (e) {
          console.error("Push deep link error:", e)
        }
        return
      }
      if (!url.includes("login-callback")) return
      try {
        const code = new URL(url).searchParams.get("code")
        if (!code) { console.error("No code in callback URL:", url); return }
        const { error } = await Supabase.auth.exchangeCodeForSession(code)
        if (error) { console.error("Exchange failed:", error.message); return }
        await Browser.close()
        window.location.href = "/"
      } catch (e) {
        console.error("Callback error:", e.message)
      }
    })
    return () => { backListener.remove(); urlListener.remove() }
  }, [])
  return null
}

const isNativeApp = Capacitor.isNativePlatform()
const isPwa = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
const showPreloader = !isNativeApp && !isPwa

function React() {
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState(() => localStorage.getItem("AppTheme") || "system")
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches)
  useEffect(() => {
    const start = Date.now()
    const done = () => {
      if (!showPreloader) { setReady(true); return }
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
        {showPreloader && !ready && <Preloader leaving={leaving}/>}
        {(ready || (showPreloader && leaving)) && (
          <BrowserRouter>
            <LanguageProvider>
              <Helper/>
              <App/>
            </LanguageProvider>
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