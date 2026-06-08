import {
  useLocation,
  useNavigate,
  Routes,
  Route
} from "react-router-dom"
import {
  Typography,
  Stack
} from "@mui/material"

import NotificationsIcon from "@mui/icons-material/Notifications"
import SecurityIcon from "@mui/icons-material/Security"
import PaletteIcon from "@mui/icons-material/Palette"
import PersonIcon from "@mui/icons-material/Person"
import TuneIcon from "@mui/icons-material/Tune"

const tabs = [
  { label: "Profile",       path: "/settings/profile",       icon: <PersonIcon/>},
  { label: "Notifications", path: "/settings/notifications", icon: <NotificationsIcon/>},
  { label: "Preferences",   path: "/settings/preferences",   icon: <TuneIcon/>},
  { label: "Appearance",    path: "/settings/appearance",    icon: <PaletteIcon/>},
  { label: "Security",      path: "/settings/security",      icon: <SecurityIcon/>},
]

function Placeholder({ label, icon }) {
  return (
    <Stack sx={{
      justifyContent: "center",
      gap: 1.5, opacity: 0.25,
      alignItems: "center",
      flex: 1,
      py: 10
    }}>
      <Stack sx={{
        color: "text.secondary",
        display: "flex",
        fontSize: 48
      }}>{icon}</Stack>
      <Typography variant="body2" sx={{
        color: "text.secondary",
        letterSpacing: "0.08em"
      }}>{label}</Typography>
    </Stack>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const current = tabs.findIndex(t => location.pathname.startsWith(t.path))
  const activeIndex = current === -1 ? 0 : current
  
  return (
    <Stack sx={{ minHeight: "100%", flexDirection: { xs: "column", sm: "row" }, alignItems: "stretch" }}>
      <Stack sx={{
        borderBottom: { xs: "1px solid", sm: "none" },
        flexDirection: { xs: "row", sm: "column" },
        overflowX: { xs: "auto", sm: "visible" },
        borderRight: { sm: "1px solid" },
        borderColor: "divider",
        alignSelf: "stretch",
        width: { sm: 220 },
        px: { sm: 1.5 },
        flexShrink: 0,
        pt: { sm: 3 },
        pb: { sm: 2 },
        gap: 0.5
      }}>
        <Typography variant="overline" sx={{
          display: { xs: "none", sm: "block" },
          color: "text.secondary",
          letterSpacing: "0.14em",
          fontSize: "0.65rem",
          px: 1.5,
          pb: 1
        }}>Settings</Typography>
        {tabs.map((tab, i) => {
          const active = i === activeIndex
          return (
            <Stack
              key={tab.path}
              alignItems="center"
              justifyContent="center"
              onClick={() => navigate(tab.path)}
              sx={{
                flexDirection: { xs: "column", sm: "row" },
                flex: { xs: 1, sm: "unset" },
                flexShrink: { xs: 0, sm: 1 },
                transition: "background-color 0.2s ease",
                gap: { xs: 0.5, sm: 1.5 },
                px: { xs: 0, sm: 1.5 },
                py: { xs: 1.2, sm: 1.2 },
                position: "relative",
                borderRadius: { xs: 0, sm: 2.5 },
                cursor: "pointer",
                "&:hover": { backgroundColor: { xs: "transparent", sm: active ? "action.selected" : "action.hover" } },
                "&::before": {
                  display: { xs: "none", sm: active ? "block" : "none" },
                  backgroundColor: "primary.main",
                  position: "absolute",
                  borderRadius: 4,
                  content: '""',
                  bottom: "20%",
                  top: "20%",
                  left: -6,
                  width: 3
                }
              }}
            >
              <Stack sx={{
                color: active ? "primary.main" : "text.secondary",
                transition: "color 0.2s ease",
                flexDirection: "column",
                alignItems: "center",
                "& .MuiSvgIcon-root": { fontSize: { xs: 22, sm: 20 } }
              }}>{tab.icon}</Stack>
              <Typography variant="body2" sx={{
                color: active ? "text.primary" : "text.secondary",
                display: { xs: "none", sm: "block" },
                fontWeight: active ? 600 : 400,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap"
              }}>{tab.label}</Typography>
              <Typography variant="caption" sx={{
                color: active ? "primary.main" : "text.secondary",
                display: { xs: "block", sm: "none" },
                fontWeight: active ? 600 : 400,
                textAlign: "center",
                fontSize: "0.6rem",
                lineHeight: 1
              }}>{tab.label}</Typography>
            </Stack>
          )
        })}
      </Stack>
      <Stack sx={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <Routes>
          <Route path="profile"       element={<Placeholder label="Profile"       icon={<PersonIcon sx={{ fontSize: 48 }}/>}/>}/>
          <Route path="notifications" element={<Placeholder label="Notifications" icon={<NotificationsIcon sx={{ fontSize: 48 }}/>}/>}/>
          <Route path="preferences"   element={<Placeholder label="Preferences"   icon={<TuneIcon sx={{ fontSize: 48 }}/>}/>}/>
          <Route path="appearance"    element={<Placeholder label="Appearance"    icon={<PaletteIcon sx={{ fontSize: 48 }}/>}/>}/>
          <Route path="security"      element={<Placeholder label="Security"      icon={<SecurityIcon sx={{ fontSize: 48 }}/>}/>}/>
          <Route path="*"             element={<Placeholder label="Profile"       icon={<PersonIcon sx={{ fontSize: 48 }}/>}/>}/>
        </Routes>
      </Stack>
    </Stack>
  )
}