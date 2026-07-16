import {
  useContext,
  useEffect,
  useState
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
import Installations from "@page/installations"
import { App as Cap } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import Dashboard from "@page/dashboard"
import Settings from "@page/settings"
import Forgot from "@page/forgot"
import Verify from "@page/verify"
import Supabase from "@/supabase"
import About from "@page/about"
import Qibla from "@page/qibla"
import Auth from "@page/auth"
import api from "@/api"

import PersonalVideoIcon from "@mui/icons-material/PersonalVideo"
import DashboardIcon from "@mui/icons-material/Dashboard"
import LightModeIcon from "@mui/icons-material/LightMode"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import GpsFixedIcon from "@mui/icons-material/GpsFixed"
import SettingsIcon from "@mui/icons-material/Settings"
import AndroidIcon from "@mui/icons-material/Android"
import AcUnitIcon from "@mui/icons-material/AcUnit"
import LogoutIcon from "@mui/icons-material/Logout"
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
    closeDrawer()
    navigate("/")
  }
  const navs = [
    { icon: <DashboardIcon/>, label: "Dashboard", route: "/" },
    { icon: <GpsFixedIcon/>, label: "Qibla", route: "/qibla" }
  ]
  const isAuth = location.pathname === "/auth"
  const rowDir = drawerPos === "r" ? "row-reverse" : "row"
  useEffect(() => {
    if (!user) return
    document.querySelectorAll(".sk-widget-btn, .sk-widget-iframe-container, script[src*=\"supportkori\"]").forEach(el => el.remove())
    const script = document.createElement("script")
    script.src = "https://www.supportkori.com/widget.js"
    script.dataset.id = "theabmmohi"
    script.dataset.message = "CupHi?"
    script.dataset.color = "#FFDD00"
    script.dataset.position = drawerPos === "r" ? "left" : "right"
    document.body.appendChild(script)
    return () => {
      script.remove()
      document.querySelectorAll(".sk-widget-btn, .sk-widget-iframe-container").forEach(el => el.remove())
    }
  }, [user?.id, drawerPos])
  useEffect(() => {
    document.querySelectorAll(".sk-widget-btn").forEach(el => {
      el.style.transition = "opacity 0.2s ease"
      el.style.opacity = drawerOpen ? "1" : "0"
      el.style.pointerEvents = drawerOpen ? "auto" : "none"
    })
    if (!drawerOpen) {
      document.querySelectorAll(".sk-widget-iframe-container").forEach(el => {
        el.style.display = "none"
      })
    } else {
      document.querySelectorAll(".sk-widget-iframe-container").forEach(el => {
        el.style.display = ""
      })
    }
  }, [drawerOpen])
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
  return (
    <Box sx={{ flexDirection: "column", height: "100dvh", display: "flex", width: "100vw" }}>
      {!isAuth && (
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
              {user && <IconButton onClick={drawerOpen ? closeDrawer : openDrawer}>
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
              </IconButton>}
            </Toolbar>
          </AppBar>
          <Divider/>
        </>
      )}
      <Box sx={{ position: "relative", overflowY: "auto", flex: 1 }}>
        {!isAuth && (
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
                <IconButton onClick={handleLogout}>
                  <LogoutIcon/>
                </IconButton>
              </Stack>
            </Stack>
            <Divider/>
            <Stack sx={{ flexDirection: rowDir }}>
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
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/" replace/> : <Auth/>}/>
            <Route path="/forgot" element={<Forgot/>}/>
            <Route path="/verify" element={<Verify/>}/>
            <Route path="/settings/*" element={!user ? <Navigate to="/" replace/> : <Settings/>}/>
            <Route path="/about" element={<About/>}/>
            <Route path="/installations" element={<Installations/>}/>
            <Route path="/qibla" element={<Qibla/>}/>
            <Route path="/*" element={user ? <Dashboard/> : <Auth/>}/>
          </Routes>
        </Box>
      </Box>
    </Box>
  )
}