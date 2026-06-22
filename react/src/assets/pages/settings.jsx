import {
  useLocation,
  useNavigate,
  Routes,
  Route
} from "react-router-dom"
import {
  useContext,
  useEffect,
  useRef,
  useState
} from "react"
import {
  ToggleButtonGroup,
  CircularProgress,
  InputAdornment,
  ToggleButton,
  FormControl,
  InputLabel,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  Snackbar,
  Toolbar,
  Divider,
  Tooltip,
  Select,
  Button,
  Switch,
  Slide,
  Stack,
  Chip,
  Box
} from "@mui/material"
import Supabase from "@/supabase"
import { Theme } from "@/react"

import NotificationsIcon from "@mui/icons-material/Notifications"
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import MyLocationIcon from "@mui/icons-material/MyLocation"
import VisibilityIcon from "@mui/icons-material/Visibility"
import SecurityIcon from "@mui/icons-material/Security"
import TelegramIcon from "@mui/icons-material/Telegram"
import DevicesIcon from "@mui/icons-material/Devices"
import PersonIcon from "@mui/icons-material/Person"
import LinkIcon from "@mui/icons-material/Link"
import SaveIcon from "@mui/icons-material/Save"
import TuneIcon from "@mui/icons-material/Tune"
import KeyIcon from "@mui/icons-material/Key"

function Profile() {

  return (
    <>profile</>
  )
}

function Notifications() {

  return (
    <>notifications</>
  )
}

function Preferences() {

  return (
    <>preferences</>
  )
}

function Security() {

  return (
    <>security</>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = ["profile", "notifications", "preferences", "security"].find(x => location.pathname.includes(x)) ?? "profile"
  return (
    <Stack>
      <ToggleButtonGroup fullWidth exclusive value={active} onChange={(_, x) => {if(x) navigate(`/settings/${x}`)}} sx={{ borderRadius: 0, "& .MuiToggleButton-root" : { borderRadius: 0 } }}>
        <ToggleButton value="profile"><PersonIcon/></ToggleButton>
        <ToggleButton value="notifications"><NotificationsIcon/></ToggleButton>
        <ToggleButton value="preferences"><TuneIcon/></ToggleButton>
        <ToggleButton value="security"><SecurityIcon/></ToggleButton>
      </ToggleButtonGroup>
      <Divider/>
      <Stack>
        <Routes>
          <Route path="profile" element={<Profile/>}/>
          <Route path="notifications" element={<Notifications/>}/>
          <Route path="preferences" element={<Preferences/>}/>
          <Route path="security" element={<Security/>}/>
          <Route path="*" element={<Profile/>}/>
        </Routes>
      </Stack>
    </Stack>
  )
}