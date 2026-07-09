/* eslint-disable react-refresh/only-export-components */
import { BrowserRouter } from "react-router-dom"
import { registerSW } from "virtual:pwa-register"
import { createRoot } from "react-dom/client"
import { App as Cap } from "@capacitor/app"
import {
  createContext,
  StrictMode,
  useEffect,
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
import Supabase from "@/supabase"
import App from "@/waqt"
import "@/style.css"
export const Theme = createContext()

function Back() {
  useEffect(() => {
    const listener = Cap.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else Cap.exitApp()
    })
    return () => { listener.remove() }
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
            <Back/>
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