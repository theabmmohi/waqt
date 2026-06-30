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
  Stack,
  Box
} from "@mui/material"
import Dashboard from "@page/dashboard"
import Settings from "@page/settings"
import Supabase from "@/supabase"
import Qibla from "@page/qibla"
import { Theme } from "@/react"
import Auth from "@page/auth"

import PersonalVideoIcon from "@mui/icons-material/PersonalVideo"
import DashboardIcon from "@mui/icons-material/Dashboard"
import LightModeIcon from "@mui/icons-material/LightMode"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import GpsFixedIcon from "@mui/icons-material/GpsFixed"
import SettingsIcon from "@mui/icons-material/Settings"
import AcUnitIcon from "@mui/icons-material/AcUnit"
import LogoutIcon from "@mui/icons-material/Logout"
import CloseIcon from "@mui/icons-material/Close"
import MenuIcon from "@mui/icons-material/Menu"

export default function App() {
  const widgetRoutes = ["/", "/qibla"]
  const navigate = useNavigate()
  const location = useLocation()
  const { dark, toggle, user } = useContext(Theme)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)
  const openDrawer = () => setDrawerOpen(true)
  const handleLogout = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
    } finally {await Supabase.auth.signOut()}
    closeDrawer()
    navigate("/")
  }
  const navs = [
    { icon: <DashboardIcon/>, label: "Dashboard", route: "/" },
    { icon: <GpsFixedIcon/>, label: "Qibla", route: "/qibla" }
  ]
  const isAuth = location.pathname === "/auth"
  const showWidget = user && widgetRoutes.includes(location.pathname)
  useEffect(() => {
    if (!showWidget) return
    const script = document.createElement("script")
    script.src = "https://www.supportkori.com/widget.js"
    script.dataset.id = "theabmmohi"
    script.dataset.message = "Support Waqt?"
    script.dataset.color = "#FFDD00"
    script.dataset.position = "right"
    document.body.appendChild(script)
    return () => {
      script.remove()
      document.querySelectorAll("[data-supportkori], #supportkori-widget, .supportkori-widget").forEach(el => el.remove())
    }
  }, [showWidget])
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
          <Drawer disableScrollLock anchor="left" open={drawerOpen} onClose={closeDrawer} sx={{ display: "flex", minWidth: "25vw", maxWidth: "75vw", "& .MuiDrawer-paper": { minWidth: "25vw", maxWidth: "75vw" } }}>
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
            <Stack sx={{ flexDirection: "row" }}>
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
            <Stack sx={{ flexDirection: "row" }}>
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
              <Stack sx={{ p: 0.5, justifyContent: "center" }}>
                <IconButton onClick={() => {navigate("/settings"); closeDrawer() }} sx={{ backgroundColor: location.pathname.startsWith("/settings") ? "background.default" : "" }}>
                  <SettingsIcon/>
                </IconButton>
              </Stack>
            </Stack>
          </Drawer>
        )}
        <Box sx={{ height: "100%", position: "relative" }}>
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/" replace/> : <Auth/>}/>
            <Route path="/settings/*" element={!user ? <Navigate to="/" replace/> : <Settings/>}/>
            <Route path="/qibla" element={<Qibla/>}/>
            <Route path="/*" element={user ? <Dashboard/> : <Auth/>}/>
          </Routes>
        </Box>
      </Box>
    </Box>
  )
}