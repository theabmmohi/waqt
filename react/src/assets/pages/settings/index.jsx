import {
  useLocation,
  useNavigate,
  Routes,
  Route
} from "react-router-dom"
import {
  useContext,
  useEffect,
  Suspense,
  lazy,
  useState
} from "react"
import {
  Typography,
  Snackbar,
  Divider,
  Button,
  Slide,
  Stack,
  Tabs,
  Tab
} from "@mui/material"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
import { Theme } from "@/main"
import PageLoader from "@asset/loader"

import WifiOffIcon from "@mui/icons-material/WifiOff"
import NotificationsIcon from "@mui/icons-material/Notifications"
import SecurityIcon from "@mui/icons-material/Security"
import PersonIcon from "@mui/icons-material/Person"
import TuneIcon from "@mui/icons-material/Tune"

const Profile       = lazy(() => import("@page/settings/profile"))
const Notifications = lazy(() => import("@page/settings/notifications"))
const Preferences   = lazy(() => import("@page/settings/preferences"))
const Security      = lazy(() => import("@page/settings/security"))

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  const recheck = () => setOnline(navigator.onLine)
  useEffect(() => {
    window.addEventListener("online", recheck)
    window.addEventListener("offline", recheck)
    return () => {
      window.removeEventListener("online", recheck)
      window.removeEventListener("offline", recheck)
    }
  }, [])
  return [online, recheck]
}

function OfflineTab({onRetry}) {
  return (<Stack sx={{ p: 4, alignItems: "center", justifyContent: "center", gap: 1.5, height: "100%" }}>
    <WifiOffIcon sx={{ fontSize: 40, color: "text.secondary" }}/>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>You're offline</Typography>
    <Button size="small" variant="outlined" onClick={onRetry}>Retry</Button>
  </Stack>)
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useContext(Theme)
  const [snack, setSnack] = useState("")
  const [online, recheck] = useOnline()
  const tabs = user ? ["profile", "notifications", "preferences", "security"] : ["profile", "preferences"]
  const active = tabs.find(x => location.pathname.includes(x)) ?? tabs[0]
  const mobile = useMediaQuery(useTheme().breakpoints.down("sm"))
  return (<Stack direction={{ xs: "column", sm: "row" }} sx={{ height: "100%", overflow: "hidden" }}>
    <Stack sx={{ overflowY: "auto", minHeight: 0 }}>
      <Tabs orientation={mobile ? "horizontal" : "vertical"} variant={mobile ? "fullWidth" : "standard"} value={active} onChange={(_, x) => { if (x) navigate(`/settings/${x}`, { replace: !true }) }} sx={{ minHeight: 0, flexShrink: 0, "& .MuiTabs-scroller": { overflowY: mobile ? "visible" : "auto", minHeight: 0, }, "& .MuiTab-root": { py: mobile ? undefined : 2.5 } }}>
        <Tab value="profile" icon={<PersonIcon/>}/>
        {user && <Tab value="notifications" icon={<NotificationsIcon/>}/>}
        <Tab value="preferences" icon={<TuneIcon/>}/>
        {user && <Tab value="security" icon={<SecurityIcon/>}/>}
      </Tabs>
    </Stack>
    <Divider flexItem orientation={mobile ? "horizontal" : "vertical"}/>
    <Stack sx={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
      <Suspense fallback={<PageLoader/>}>
        <Routes>
          <Route path="profile" element={<Profile setSnack={setSnack}/>}/>
          {user && <Route path="notifications" element={online ? <Notifications setSnack={setSnack}/> : <OfflineTab onRetry={recheck}/>}/>}
          <Route path="preferences" element={<Preferences setSnack={setSnack}/>}/>
          {user && <Route path="security" element={online ? <Security setSnack={setSnack}/> : <OfflineTab onRetry={recheck}/>}/>}
          <Route path="*" element={<Preferences setSnack={setSnack}/>}/>
        </Routes>
      </Suspense>
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}
