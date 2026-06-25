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
  Link,
  Box
} from "@mui/material"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
import Supabase from "@/supabase"
import { Theme } from "@/react"
import api from "@/api"

import NotificationsIcon from "@mui/icons-material/Notifications"
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import MyLocationIcon from "@mui/icons-material/MyLocation"
import VisibilityIcon from "@mui/icons-material/Visibility"
import SecurityIcon from "@mui/icons-material/Security"
import TelegramIcon from "@mui/icons-material/Telegram"
import DevicesIcon from "@mui/icons-material/Devices"
import WebhookIcon from "@mui/icons-material/Webhook"
import LinkOffIcon from "@mui/icons-material/LinkOff"
import PersonIcon from "@mui/icons-material/Person"
import LinkIcon from "@mui/icons-material/Link"
import SaveIcon from "@mui/icons-material/Save"
import TuneIcon from "@mui/icons-material/Tune"
import KeyIcon from "@mui/icons-material/Key"

function Profile({setSnack}) {
  const { user } = useContext(Theme)
  const fileRef = useRef()
  const email = user?.email ?? ""
  const [name, setName]     = useState(user?.user_metadata?.full_name  ?? "")
  const [bio, setBio]       = useState(user?.user_metadata?.bio        ?? "")
  const [avatar, setAvatar] = useState(user?.user_metadata?.avatar_url ?? "")
  const [saving, setSaving] = useState(false)
  const [file, setFile]     = useState(null)
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
      const { error } = await Supabase.auth.updateUser({ data: { full_name: name.trim(), bio: bio.trim(), avatar_url } })
      if (error) throw error
      setSnack("Profile Saved")
    }
    catch (err) { setSnack(err?.message ?? "Sorry, Internal Error") }
    finally { setSaving(false) }
  }
  return (
    <FormControl sx={{ alignSelf: "center", maxWidth: 600, width: "100%", gap: 2.5, p: 2.5 }}>
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
      <TextField size="small" label="Bio" value={bio} multiline rows={4} onChange={e => { if (e.target.value.length <= 160) setBio(e.target.value) }} helperText={bio.length !== 160 ? `${bio.length}/160` : "Max Character Limit Reached"}/>
      <Button disableElevation onClick={save} disabled={saving} variant={saving ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={saving ? <CircularProgress size={14}/> : <SaveIcon/>}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </FormControl>
  )
}

function Notifications({setSnack}) {
  const { user } = useContext(Theme)
  const [browEnabled, setBrowEnabled]     = useState(false)
  const [browLoading, setBrowLoading]     = useState(false)
  const [teleLoading, setTeleLoading]     = useState(true)
  const [teleLinking, setTeleLinking]     = useState(false)
  const [teleUnLinking, setTeleUnLinking] = useState(false)
  const [teleLinked, setTeleLinked]       = useState(false)
  const [teleId, setTeleId]               = useState("")
  const toggleBrow = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator))
      return setSnack("Push notifications not supported on this device")
    setBrowLoading(true)
    try {
      if (browEnabled) {
        const reg = await navigator.serviceWorker.ready
        const subscription = await reg.pushManager.getSubscription()
        if (subscription) await subscription.unsubscribe()
        await api.post("/settings/notifications/webPush/unsubscribe")
        setBrowEnabled(false)
        setSnack("Browser notifications disabled")
      } else {
        const { data: { key } } = await api.post("/settings/notifications/webPush/getPublic")
        const reg = await navigator.serviceWorker.ready
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key
        })
        const { data } = await api.post("/settings/notifications/webPush/subscribe", { subscription })
        if (!data.success) throw new Error(data.message)
        setBrowEnabled(true)
        setSnack("Browser notifications enabled")
      }
    } catch (err) {
      if (err.name === "NotAllowedError") setSnack("Permission denied — allow notifications in browser settings")
      else setSnack(err?.message ?? "Something went wrong")
    } finally { setBrowLoading(false) }
  }
  const teleSubmit = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!teleLinked) {
      setTeleLinking(true)
      try {
        const { error } = await Supabase.auth.updateUser({ data: { teleChatId: teleId.trim() } })
        if (error) throw error
        const { data } = await api.post("/settings/notifications/telegram/validateID")
        if (!data.success) {
          await Supabase.auth.updateUser({ data: { teleChatId: null } })
          setTeleLinked(false)
          setTeleId("")
          throw new Error(data.message)
        }
        setTeleLinked(true)
        setSnack(data.message)
      } catch (err) { setSnack(err?.message ?? "Something went wrong") }
      finally { setTeleLinking(false) }
    } else {
      setTeleUnLinking(true)
      try {
        const { error } = await Supabase.auth.updateUser({ data: { teleChatId: null } })
        if (error) throw error
        setTeleLinked(false)
        setTeleId("")
        setSnack("Telegram Account Disconnected")
      } catch (err) { setSnack(err?.message ?? "Something went wrong") }
      finally { setTeleUnLinking(false) }
    }
  }
  useEffect(() => {
    const teleChatId = user?.user_metadata?.teleChatId
    if (teleChatId) {
      setTeleLinked(true)
      setTeleId(teleChatId)
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setBrowEnabled(!!sub)
        })
      })
    }
    setTeleLoading(false)
  }, [])
  return (
    <Stack sx={{ alignSelf: "center", maxWidth: 600, width: "100%", gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", border: "1px solid", borderColor: "divider", borderRadius: 2.5, p: 2.5, gap: 2.5 }}>
        <Stack sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><WebhookIcon sx={{ fontSize: 24 }}/>Browser Notifications</Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {browEnabled ? "Notifications are enabled." : "Allow Waqt sending reminders from browser."}
          </Typography>
        </Stack>
        <Stack sx={{ justifyContent: "center" }}>
          {browLoading ?
            <CircularProgress size={25}/> :
            <Switch checked={browEnabled} onChange={toggleBrow}/>
          }
        </Stack>
      </Stack>
      <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><TelegramIcon sx={{ fontSize: 24 }}/> Telegram Notifications</Typography>
        <Stack sx={{ "& .MuiTypography-root": { color: "text.secondary" } }}>
          {teleLoading ?
            <CircularProgress size={50} sx={{ alignSelf: "center" }}/> :
            (<Stack sx={{ gap: 2.5 }}>
              {!teleLinked ?
                (<Stack sx={{ gap: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>How to connect your Telegram account:</Typography>
                  <Typography>1. Open our official Telegram bot <Link href="https://t.me/WaqtOfficialBot" target="_blank" rel="noopener noreferrer"><strong>@WaqtOfficialBot</strong></Link></Typography>
                  <Typography>2. Start the bot — it will send your <strong>Chat ID</strong></Typography>
                  <Typography>3. Paste the Chat ID below and tap <strong>Link</strong></Typography>
                </Stack>) :
                (<Stack>
                  <Typography>Linked with a Telegram account. Tap <strong>Unlink</strong> to disconnect.</Typography>
                </Stack>)
              }
              <FormControl component="form" onSubmit={teleSubmit} sx={{ flexDirection: "row", display: "flex", gap: 1 }}>
                <TextField required size="small" label="Chat ID" type="number" disabled={teleLinked} value={teleId} onChange={e => setTeleId(e.target.value)}/>
                <Button disableElevation type="submit" disabled={teleLinking || teleUnLinking} variant={(teleLinking || teleUnLinking) ? "outlined" : "contained"} startIcon={teleLinked ? (teleUnLinking ? <CircularProgress size={14}/> : <LinkOffIcon/>) : (teleLinking ? <CircularProgress size={14}/> : <LinkIcon/>)}>
                  {teleLinked ? (teleUnLinking ? "Unlinking..." : "Unlink") : (teleLinking ? "Linking..." : "Link")}
                </Button>
              </FormControl>
            </Stack>)
          }
        </Stack>
      </Stack>
    </Stack>
  )
}

function Preferences({setSnack}) {
  return (
    <>preferences</>
  )
}

function Security({setSnack}) {
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
        <ToggleButtonGroup fullWidth={mobile} exclusive orientation={mobile ? "horizontal" : "vertical"} value={active} onChange={(_, x) => { if (x) navigate(`/settings/${x}`, { replace: true }) }} sx={{ "& .MuiToggleButton-root": { borderRadius: 0 } }}>
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