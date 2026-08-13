import {
  useContext,
  useEffect,
  Suspense,
  useState,
  lazy
} from "react"
import {
  useLocation,
  useNavigate,
  Navigate,
  Routes,
  Route
} from "react-router-dom"
import {
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Typography,
  Divider,
  Toolbar,
  AppBar,
  Avatar,
  Button,
  Drawer,
  Badge,
  Stack,
  Box
} from "@mui/material"
import { subscribeWeb } from "@/firebase"
import { Theme, getNativeFcmToken } from "@/main"
import { App as Cap } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import Supabase from "@/supabase"
import PageLoader from "@asset/loader"
import api from "@/api"

const Installations = lazy(() => import("@page/installations"))
const Hadith         = lazy(() => import("@page/hadith"))
const Onboarding     = lazy(() => import("@page/onboarding"))
const Dashboard      = lazy(() => import("@page/dashboard"))
const Settings       = lazy(() => import("@page/settings"))
const Forgot         = lazy(() => import("@page/forgot"))
const Tasbih         = lazy(() => import("@page/tasbih"))
const Verify         = lazy(() => import("@page/verify"))
const About          = lazy(() => import("@page/about"))
const Qibla          = lazy(() => import("@page/qibla"))
const Auth           = lazy(() => import("@page/auth"))

import PersonalVideoIcon from "@mui/icons-material/PersonalVideo"
import LinearScaleIcon from "@mui/icons-material/LinearScale"
import MenuBookIcon from "@mui/icons-material/MenuBook"
import DashboardIcon from "@mui/icons-material/Dashboard"
import LightModeIcon from "@mui/icons-material/LightMode"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import GpsFixedIcon from "@mui/icons-material/GpsFixed"
import SettingsIcon from "@mui/icons-material/Settings"
import AndroidIcon from "@mui/icons-material/Android"
import AcUnitIcon from "@mui/icons-material/AcUnit"
import LogoutIcon from "@mui/icons-material/Logout"
import LoginIcon from "@mui/icons-material/Login"
import CloseIcon from "@mui/icons-material/Close"
import InfoIcon from "@mui/icons-material/Info"
import MenuIcon from "@mui/icons-material/Menu"

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dark, toggle, user } = useContext(Theme)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPos, setDrawerPos] = useState(() => localStorage.getItem("drawerPos") || "l")
  useEffect(() => {
    const handler = (e) => setDrawerPos(e.detail)
    window.addEventListener("drawerpos-change", handler)
    return () => window.removeEventListener("drawerpos-change", handler)
  }, [])
  const [updateAvail, setUpdateAvail] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)
  const openDrawer = () => setDrawerOpen(true)
  const handleLogout = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const fcmToken = await subscribeWeb().catch(() => null)
        if (fcmToken) await api.post("/settings/notifications/webPush/unsubscribe", { fcmToken })
      }
      if (Capacitor.isNativePlatform()) {
        const fcmToken = getNativeFcmToken()
        if (fcmToken) await api.post("/settings/notifications/webPush/unsubscribe", { fcmToken })
      }
    } finally {await Supabase.auth.signOut({ scope: "local" })}
    localStorage.setItem("waqt-guest-mode", "1")
    closeDrawer()
    navigate("/")
  }
  const navs = [
    { icon: <DashboardIcon/>, label: "Dashboard", route: "/" },
    { icon: <LinearScaleIcon sx={{ transform: "rotate(-45deg)" }}/>, label: "Tasbih", route: "/tasbih" },
    { icon: <GpsFixedIcon/>, label: "Qibla", route: "/qibla" },
    { icon: <MenuBookIcon/>, label: "Hadith", route: "/hadith" },
  ]
  useEffect(() => {
    const segments = location.pathname.split("/").filter(Boolean)
      .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1))
    document.title = segments.length ? `${segments.join(" | ")} - Waqt` : "Waqt"
  }, [location.pathname])
  const isAuth = location.pathname === "/auth"
  const isOnboarding = location.pathname === "/onboarding"
  const hideChrome = isAuth || isOnboarding
  const rowDir = drawerPos === "r" ? "row-reverse" : "row"
  useEffect(() => {
    const publicPaths = ["/auth", "/forgot", "/verify", "/onboarding", "/installations", "/about"]
    // First launch (or post-logout) with no account and no guest choice made yet —
    // gate everything behind the auth screen until they sign in or pick "Continue as Guest".
    if (!user && localStorage.getItem("waqt-guest-mode") !== "1" && !publicPaths.includes(location.pathname)) {
      navigate("/auth", { replace: true })
      return
    }
    // Fresh guest / fresh account (from sign-up or first Google sign-in) — walk them
    // through preferences once before they land on the dashboard.
    if (localStorage.getItem("waqt-needs-onboarding") === "1" && !isAuth && !isOnboarding) {
      navigate("/onboarding", { replace: true })
    }
  }, [user, location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
    Promise.all([
      Cap.getInfo().then((info) => info.version).catch(() => null),
      fetch(`${api.defaults.baseURL}/download/android/version`)
        .then((res) => res.json())
        .then((data) => data.version ?? null)
        .catch(() => null)
    ]).then(([current, latest]) => {
      setUpdateAvail(Boolean(current && latest && current !== latest))
    })
  }, [])
  useEffect(() => {
    if (document.querySelector('script[src="/supportKori.js"]')) return
    const script = document.createElement("script")
    script.src = "/supportKori.js"
    script.onload = () => document.querySelectorAll(".sk-button, .sk-iframe-container").forEach(el => el.style.display = "none")
    document.body.appendChild(script)
  }, [])
  useEffect(() => {
    document.querySelectorAll(".sk-button, .sk-iframe-container").forEach(el => {
      el.style.display = drawerOpen ? "" : "none"
      el.style.right = drawerOpen && drawerPos === "l" ? "20px" : ""
      el.style.left  = drawerOpen && drawerPos === "r" ? "20px" : ""
    })
    if (!drawerOpen) window.postMessage("close-sk-widget", "*")
  }, [drawerOpen, drawerPos])
  return (
    <Box sx={{ flexDirection: "column", height: "100dvh", display: "flex", width: "100vw" }}>
      {!hideChrome && (
        <>
          <AppBar position="sticky" elevation={0} color="default" sx={{ zIndex: (x) => x.zIndex.drawer + 1 }}>
            <Toolbar>
              <Stack sx={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 1 }}>
                <Stack onClick={() => navigate("/")} sx={{ borderColor: "divider", alignItems: "center", justifyContent: "center", borderRadius: 1, width: 44, height: 44, p: 1 }}>
                  <AcUnitIcon sx={{ color: "text.primary" }}/>
                </Stack>
                <Stack>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold", lineHeight: 1 }}>Waqt</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1 }}>Every Prayer, Right On Time</Typography>
                </Stack>
              </Stack>
              <IconButton onClick={drawerOpen ? closeDrawer : openDrawer}>
                <Box sx={{ position: "relative", width: 24, height: 24 }}>
                  <MenuIcon sx={{
                    top: 0, left: 0, position: "absolute",
                    transition: "all 0.3s ease",
                    opacity: drawerOpen ? 0 : 1,
                    transform: drawerOpen ? "rotate(90deg)" : "rotate(0deg)"
                  }}/>
                  <CloseIcon sx={{
                    top: 0, left: 0, position: "absolute",
                    transition: "all 0.3s ease",
                    opacity: drawerOpen ? 1 : 0,
                    transform: drawerOpen ? "rotate(0deg)" : "rotate(-90deg)"
                  }}/>
                </Box>
              </IconButton>
            </Toolbar>
          </AppBar>
          <Divider/>
        </>
      )}
      <Box sx={{ position: "relative", overflowY: "auto", flex: 1 }}>
        {!hideChrome && (
          <Drawer disableScrollLock anchor={drawerPos === "r" ? "right" : "left"} open={drawerOpen} onClose={closeDrawer} sx={{ display: "flex", minWidth: "25vw", maxWidth: "75vw", "& .MuiDrawer-paper": { minWidth: "25vw", maxWidth: "75vw" } }}>
            <Toolbar/>
            <Divider/>
            <Stack sx={{ overflowY: "auto", gap: 1, flex: 1, p: 2.5 }}>
              {navs.map(item => {
                const active = location.pathname === item.route
                return (
                  <Button
                    fullWidth disableElevation
                    key={item.label}
                    variant={active ? "contained" : "outlined"}
                    color={active ? "primary" : "inherit"}
                    startIcon={item.icon}
                    onClick={() => { navigate(item.route); closeDrawer() }}
                    sx={{ justifyContent: "flex-start" }}
                  >{item.label}</Button>
                )
              })}
            </Stack>
            <Divider/>
            <Stack sx={{ flexDirection: rowDir }}>
              <Badge color="primary" variant="dot" invisible={!updateAvail || location.pathname === "/installations"} overlap="rectangular" sx={{ flex: 1, "& .MuiBadge-badge": { top: 10, right: 10 } }}>
                <Button fullWidth disableElevation
                  sx={{ border: "none", borderRadius: 0, py: 1.25 }}
                  variant={location.pathname === "/installations" ? "contained" : "outlined"}
                  color={location.pathname === "/installations" ? "primary" : "inherit"}
                  onClick={() => { navigate("/installations"); closeDrawer() }}
                  startIcon={<AndroidIcon/>}
                >Installations</Button>
              </Badge>
              <Divider orientation="vertical"/>
              <Stack sx={{ p: 0.5, justifyContent: "center", backgroundColor: location.pathname.startsWith("/about") ? "primary.main" : "" }}>
                <IconButton onClick={() => {navigate("/about"); closeDrawer()}}>
                  <InfoIcon sx={{ color: location.pathname.startsWith("/about") ? "background.default" : "" }} />
                </IconButton>
              </Stack>
            </Stack>
            <Divider/>
            <Stack sx={{ flexDirection: rowDir }}>
              <Stack sx={{ justifyContent: "center", alignItems: "center", flex: 1}}>
                <ToggleButtonGroup fullWidth exclusive size="small" onChange={(_, val) => { if (val) toggle(val) }} value={dark} sx={{ borderRadius: 0, height: "100%", "& .MuiToggleButton-root": { borderRadius: 0, border: "none" }, "& .MuiToggleButtonGroup-grouped:not(:last-of-type)": { borderRight: "1px solid", borderColor: "divider" } }}>
                  <ToggleButton value="light"><LightModeIcon/></ToggleButton>
                  <ToggleButton value="system"><PersonalVideoIcon/></ToggleButton>
                  <ToggleButton value="dark"><DarkModeIcon/></ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Divider orientation="vertical"/>
              <Stack sx={{ p: 0.5, justifyContent: "center" }}>
                {user ? (
                  <IconButton onClick={handleLogout}>
                    <LogoutIcon/>
                  </IconButton>
                ) : (
                  <IconButton onClick={() => { navigate("/auth"); closeDrawer() }}>
                    <LoginIcon/>
                  </IconButton>
                )}
              </Stack>
            </Stack>
            <Divider/>
            <Stack sx={{ flexDirection: rowDir }}>
              {user ? (<>
                <Stack sx={{ px: 0.5, justifyContent: "center" }}>
                  <Avatar src={user?.user_metadata?.avatar_url}>{user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "?"}</Avatar>
                </Stack>
                <Divider orientation="vertical"/>
                <Stack sx={{ justifyContent: "center", overflowX: "hidden", flex: 1, p: 1 }}>
                  <Typography noWrap variant="subtitle1" sx={{ fontWeight: "bold", lineHeight: 1 }}>
                    {user?.user_metadata?.full_name ?? "User"}
                  </Typography>
                  <Typography noWrap variant="caption" sx={{ color: "text.secondary", lineHeight: 1 }}>
                    {user?.email ?? ""}
                  </Typography>
                </Stack>
              </>) : (
                <Stack onClick={() => { navigate("/auth"); closeDrawer() }} sx={{ justifyContent: "center", overflowX: "hidden", flex: 1, p: 1, cursor: "pointer" }}>
                  <Typography noWrap variant="subtitle1" sx={{ fontWeight: "bold", lineHeight: 1 }}>Guest</Typography>
                  <Typography noWrap variant="caption" sx={{ color: "text.secondary", lineHeight: 1 }}>Sign in to sync your settings</Typography>
                </Stack>
              )}
              <Divider orientation="vertical"/>
              <Stack sx={{ p: 0.5, justifyContent: "center", backgroundColor: location.pathname.startsWith("/settings") ? "primary.main" : "" }}>
                <IconButton onClick={() => {navigate("/settings"); closeDrawer()}}>
                  <SettingsIcon sx={{ color: location.pathname.startsWith("/settings") ? "background.default" : "" }} />
                </IconButton>
              </Stack>
            </Stack>
          </Drawer>
        )}
        <Box sx={{ height: "100%", position: "relative" }}>
          <Suspense fallback={<PageLoader/>}>
            <Routes>
              <Route path="/auth" element={user ? <Navigate to="/" replace/> : <Auth/>}/>
              <Route path="/onboarding" element={<Onboarding/>}/>
              <Route path="/forgot" element={<Forgot/>}/>
              <Route path="/verify" element={<Verify/>}/>
              <Route path="/settings/*" element={<Settings/>}/>
              <Route path="/about" element={<About/>}/>
              <Route path="/installations" element={<Installations/>}/>
              <Route path="/qibla" element={<Qibla/>}/>
              <Route path="/tasbih" element={<Tasbih/>}/>
              <Route path="/hadith" element={<Hadith/>}/>
              <Route path="/*" element={<Dashboard/>}/>
            </Routes>
          </Suspense>
        </Box>
      </Box>
    </Box>
  )
}