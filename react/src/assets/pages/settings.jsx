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
  Avatar,
  Select,
  Button,
  Switch,
  Slide,
  Stack,
  Chip,
  Box
} from "@mui/material"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
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

function Profile({setSnack}) {
  const { user } = useContext(Theme)
  const fileRef = useRef()
  const email = user?.email ?? ""
  const [name, setName]       = useState(user?.user_metadata?.full_name  ?? "")
  const [bio, setBio]         = useState(user?.user_metadata?.bio        ?? "")
  const [avatar, setAvatar]   = useState(user?.user_metadata?.avatar_url ?? "")
  const [saving, setSaving] = useState(false)
  const [file, setFile]       = useState(null)
  const save = async () => {
    setSaving(true)
    try {
      let avatar_url = avatar
      if (file) {
        const { error } = await Supabase.storage.from("avatar").upload(user.id, file, { upsert: true, contentType: file.type })
        if (error) throw error
        const { data } = Supabase.storage.from("avatar").getPublicUrl(user.id)
        avatar_url = `${data.publicUrl}?ts=${Date.now()}`
        setAvatar(avatar_url)
        setFile(null)
      }
      const { error } = await Supabase.auth.updateUser({ data: { full_name: name, bio, avatar_url } })
      if (error) throw error
      setSnack("Profile Saved")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setSaving(false)}
  }
  return (
    <FormControl sx={{ maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", alignItems: "center" }}>
        <Avatar src={avatar} onClick={() => fileRef.current.click()} sx={{ border: "2px solid", borderColor: "text.primary", cursor: "pointer", height: 72, width: 72 }}>{user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "?"}</Avatar>
        <Stack sx={{ px: 2.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Profile Photo</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Click to change | Max 2 MB</Typography>
        </Stack>
        <input hidden type="file" accept="image/*" ref={fileRef} onChange={e => {
          const file = e.target.files[0]
          if (!file) return
          if (file.size > 2 * 1048576) return setSnack("File Too Large, MAX 2 MB")
          if (file.type === "image/heic" || file.type === "image/heif") return setSnack("HEIC/HEIF Images Not Supported")
          setAvatar(URL.createObjectURL(file))
          setFile(file)
        }}/>
      </Stack>
      <TextField size="small" label="Full Name" value={name} onChange={e => setName(e.target.value)}/>
      <TextField size="small" label="Email" value={email} disabled slotProps={{ input: { readOnly: true } }} helperText="Email cannot be changed"/>
      <TextField size="small" label="Bio" value={bio} multiline rows={4} onChange={e => {if (e.target.value.length <= 160) setBio(e.target.value)}} helperText={bio.length !== 160 ? `${bio.length}/160` : `Max Character Limit Reached`}/>
      <Button disableElevation onClick={save} disabled={saving} variant={saving ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={saving ? <CircularProgress size={14} color="inherit"/> : <SaveIcon/>}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </FormControl>
  )
}

function Notifications({setSnack}) {
useEffect(() => setSnack("notifications"), [])
  return (
    <>notifications</>
  )
}

function Preferences({setSnack}) {
useEffect(() => setSnack("preferences"), [])
  return (
    <>preferences</>
  )
}

function Security({setSnack}) {
useEffect(() => setSnack("security"), [])
  return (
    <>security</>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [snack, setSnack] = useState("")
  
  const active = ["profile", "notifications", "preferences", "security"].find(x => location.pathname.includes(x)) ?? "profile"
  const mobile = useMediaQuery(useTheme().breakpoints.down("sm"))
  
  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ height: "100%" }}>
        <ToggleButtonGroup fullWidth={mobile} exclusive orientation={mobile ? "horizontal" : "vertical"} value={active} onChange={(_, x) => {if(x) navigate(`/settings/${x}`)}} sx={{ "& .MuiToggleButton-root" : { borderRadius: 0 } }}>
          <ToggleButton value="profile"><PersonIcon/></ToggleButton>
          <ToggleButton value="notifications"><NotificationsIcon/></ToggleButton>
          <ToggleButton value="preferences"><TuneIcon/></ToggleButton>
          <ToggleButton value="security"><SecurityIcon/></ToggleButton>
        </ToggleButtonGroup>
        <Divider flexItem orientation={mobile ? "horizontal" : "vertical"}/>
        <Stack sx={{ overflowY: "auto", flex: 1 }}>
          <Routes>
            <Route path="profile" element={<Profile setSnack={setSnack}/>}/>
            <Route path="notifications" element={<Notifications setSnack={setSnack}/>}/>
            <Route path="preferences" element={<Preferences setSnack={setSnack}/>}/>
            <Route path="security" element={<Security setSnack={setSnack}/>}/>
            <Route path="*" element={<Profile setSnack={setSnack}/>}/>
          </Routes>
        </Stack>
      </Stack>
      <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
    </>
  )
}