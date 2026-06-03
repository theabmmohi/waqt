/* eslint-disable react-refresh/only-export-components */
import { BrowserRouter } from "react-router-dom"
import { createRoot } from "react-dom/client"
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
} from "@/mui"
import Preloader from "@asset/preloader"
import App from "@/app"
import "@/style.css"
export const Theme = createContext()
function React() {
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState(() => localStorage.getItem("AppTheme") || "system")
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches)
  
  useEffect(() => {
    const start = Date.now()
    const done = () => {
      const remaining = Math.max(0, 1000 - (Date.now() - start))
      setTimeout(() => setReady(true), remaining)
    }
    
    Promise.all([
      document.fonts.ready,
      new Promise(res => {
        if (document.readyState === "complete") res()
        else window.addEventListener("load", res, { once: true })
      })
    ]).then(done)
    
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e) => (setDark(e.matches))
    query.addEventListener("change", handler)
    return () => query.addEventListener("change", handler)
  }, [])
  
  const isDark = mode === "dark" || (mode === "system" && dark)
  const toggle = (x) => {
    setMode(x)
    localStorage.setItem("AppTheme", x)
  }
  
  if (!ready) return (<Preloader/>)
  return (
    <Theme.Provider value={{ dark: mode, toggle }}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
        <CssBaseline/>
        <BrowserRouter>
          <App/>
        </BrowserRouter>
      </ThemeProvider>
    </Theme.Provider>
  )
}
createRoot(document.getElementById("app")).render(
  <StrictMode>
    <React/>
  </StrictMode>
)