import { createContext, useState, useEffect, StrictMode } from "react"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { BrowserRouter } from "react-router-dom"
import { createRoot }    from "react-dom/client"
import { lightTheme, darkTheme } from "@/theme"
import App from "@/app"
import "@/main.css"
export const ThemeCtx = createContext()

function Root() {
  const [mode, setMode] = useState(() => localStorage.getItem("theme") || "system")
  const [systemDark, setSystemDark] = useState( () => window.matchMedia("(prefers-color-scheme: dark)").matches )
  
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e) => setSystemDark(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  
  const isDark = mode === "dark" || (mode === "system" && systemDark)
  const toggle = (val) => {
    setMode(val)
    localStorage.setItem("theme", val)
  }
  
  return (
    <ThemeCtx.Provider value={{ dark: mode, toggle }}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
        <CssBaseline/>
        <BrowserRouter>
          <App/>
        </BrowserRouter>
      </ThemeProvider>
    </ThemeCtx.Provider>
  )
}
createRoot(document.getElementById("dcu")).render(
  <StrictMode>
    <Root/>
  </StrictMode>
)