import {
  useLocation, useNavigate,
  Routes, Route
} from "react-router-dom"
import {
  useContext, useEffect,
  useRef, useState
} from "react"
import {
  ToggleButtonGroup, CircularProgress, InputAdornment, DialogActions,
  DialogContent, Autocomplete, ToggleButton, DialogTitle, Link,
  FormControl, IconButton, InputLabel, Typography,
  TextField, MenuItem, Snackbar, Divider, Avatar,
  Dialog, Select, Button, Switch, Slide, Stack
} from "@mui/material"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
import Supabase from "@/supabase"
import { Theme } from "@/main"
import api from "@/api"

import NotificationsIcon from "@mui/icons-material/Notifications"
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import FingerprintIcon from "@mui/icons-material/Fingerprint"
import MyLocationIcon from "@mui/icons-material/MyLocation"
import VisibilityIcon from "@mui/icons-material/Visibility"
import LockResetIcon from "@mui/icons-material/LockReset"
import SecurityIcon from "@mui/icons-material/Security"
import TelegramIcon from "@mui/icons-material/Telegram"
import LinkOffIcon from "@mui/icons-material/LinkOff"
import WebhookIcon from "@mui/icons-material/Webhook"
import PersonIcon from "@mui/icons-material/Person"
import EditIcon from "@mui/icons-material/Edit"
import LinkIcon from "@mui/icons-material/Link"
import LockIcon from "@mui/icons-material/Lock"
import SaveIcon from "@mui/icons-material/Save"
import TuneIcon from "@mui/icons-material/Tune"
import AddIcon from "@mui/icons-material/Add"

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
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setSaving(false)}
  }
  return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", maxWidth: 600, width: "100%", gap: 2.5, p: 2.5 }}>
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
      <TextField size="small" label="Bio" value={bio} multiline rows={4} onChange={e => {if (e.target.value.length <= 160) setBio(e.target.value)}} helperText={bio.length !== 160 ? `${bio.length}/160` : "Max Character Limit Reached"}/>
      <Button disableElevation onClick={save} disabled={saving} variant={saving ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={saving ? <CircularProgress size={14}/> : <SaveIcon/>}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </Stack>
  </Stack>)
}

function Notifications({setSnack}) {
  const { user } = useContext(Theme)
  const [teleUnLinking, setTeleUnLinking] = useState(false)
  const [browEnabled, setBrowEnabled]     = useState(false)
  const [browLoading, setBrowLoading]     = useState(false)
  const [teleLoading, setTeleLoading]     = useState(true )
  const [teleLinking, setTeleLinking]     = useState(false)
  const [teleLinked, setTeleLinked]       = useState(false)
  const [teleId, setTeleId]               = useState("")
  const pollRef = useRef()
  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      const { data } = await Supabase.auth.getUser()
      const chatId = data?.user?.user_metadata?.teleChatId
      if (chatId) {
        setTeleLinked(true)
        setTeleId(chatId)
        clearInterval(pollRef.current)
      }
    }, 3000)
    setTimeout(() => clearInterval(pollRef.current), 120000)
  }
  const toggleBrow = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return setSnack("Push notifications not supported on this device")
    setBrowLoading(true)
    try {
      if (browEnabled) {
        const reg = await navigator.serviceWorker.ready
        const subscription = await reg.pushManager.getSubscription()
        if (subscription) await subscription.unsubscribe()
        await api.post("/settings/notifications/webPush/unsubscribe", { endpoint: subscription.endpoint })
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
      } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setTeleLinking(false)}
    } else {
      setTeleUnLinking(true)
      try {
        const { error } = await Supabase.auth.updateUser({ data: { teleChatId: null } })
        if (error) throw error
        setTeleLinked(false)
        setTeleId("")
        setSnack("Telegram Account Disconnected")
      } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setTeleUnLinking(false)}
    }
  }
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
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
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Stack sx={{ alignSelf: "center", maxWidth: 600, width: "100%", gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
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
      <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><TelegramIcon sx={{ fontSize: 24 }}/>Telegram Notifications</Typography>
        <Stack sx={{ "& .MuiTypography-root": { color: "text.secondary" } }}>
          {teleLoading ?
            <CircularProgress size={50} sx={{ alignSelf: "center" }}/> :
            (<Stack sx={{ gap: 2.5 }}>
              {!teleLinked ?
                (<Stack sx={{ gap: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>How to connect your Telegram account:</Typography>
                  <Typography>1. Open our official Telegram bot <Link href={`https://t.me/WaqtOfficialBot?start=${user?.id}`} target="_blank" rel="noopener noreferrer" onClick={startPolling}><strong>@WaqtOfficialBot</strong></Link></Typography>
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
  const { user } = useContext(Theme)
  const [locationType, setLocationType] =   useState("gps")
  const [timeFormat, setTimeFormat] =       useState("12h")
  const [calcMethod, setCalcMethod] =       useState("Karachi")
  const [language, setLanguage] =           useState("en")
  const [madhab, setMadhab] =               useState("hanafi")
  const [coords, setCoords] =               useState(null)
  const [coordsLoading, setCoordsLoading] = useState(false)
  const [cityLoading, setCityLoading] =     useState(false)
  const [cityInput, setCityInput] =         useState("")
  const [cityOpts, setCityOpts] =           useState([])
  const [saving, setSaving] =               useState(false)
  const [city, setCity] =                   useState(null)
  const [tz, setTz] =                       useState("")
  const timerRef = useRef()
  const getCoords = () => {
    if (!navigator.geolocation) return setSnack("This Device Doesn't Support GPS")
    setCoordsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setCoords({ lat, lon })
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto`)
          const { timezone } = await res.json()
          setTz(timezone)
        } catch {setTz("")}
        setCoordsLoading(false)
      },
      (err) => {
        setSnack(err.message ?? "Failed To Get Location")
        setCoordsLoading(false)
      }
    )
  }
  const citySearch = (query) => {
    clearTimeout(timerRef.current)
    if (!query || query.length < 2) return setCityOpts([])
    timerRef.current = setTimeout(async() => {
      setCityLoading(true)
      try{
        const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`)
        const data = await resp.json()
        setCityOpts(data.results ?? [])
      } catch {setCityOpts([])} finally {setCityLoading(false)}
    }, 250)
  }
  const save = async () => {
    if (locationType === "gps"    && !coords) return setSnack("Please set your current location. Required for calculation")
    if (locationType === "manual" && !city  ) return setSnack("Please select a city. Required for calculation")
    setSaving(true)
    try {
      const { error } = await Supabase.auth.updateUser({ data: {
        ...(locationType === "gps" ? {city: null} : {city}),
        language, timeFormat, locationType,
        coords, calcMethod, madhab, tz
      } })
      if (error) throw error
      setSnack("Preferences Saved")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setSaving(false)}
  }
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const data = user?.user_metadata
    if (!data) return
    if (data.language)     setLanguage(data.language)
    if (data.timeFormat)   setTimeFormat(data.timeFormat)
    if (data.locationType) setLocationType(data.locationType)
    if (data.coords)       setCoords(data.coords)
    if (data.calcMethod)   setCalcMethod(data.calcMethod)
    if (data.madhab)       setMadhab(data.madhab)
    if (data.tz)           setTz(data.tz)
    if (data.city) {
      setCity(data.city)
      setCityInput([data.city.name, data.city.admin1, data.city.admin2, data.city.admin3, data.city.country].filter(Boolean).join(", "))
      if (data.coords) setCoords(data.coords)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps
  return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", maxWidth: 600, width: "100%", gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
        <Typography sx={{ minWidth: "50%" }}>Language :</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" sx={{ flex: 1 }} value={language} onChange={(_, v) => { if (v) setLanguage(v) }}>
          <ToggleButton value="en">English</ToggleButton>
          <ToggleButton value="bn">বাংলা</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
        <Typography sx={{ minWidth: "50%" }}>Time Format :</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" sx={{ flex: 1 }} value={timeFormat} onChange={(_, v) => { if (v) setTimeFormat(v) }}>
          <ToggleButton value="24h">24H</ToggleButton>
          <ToggleButton value="12h">12H</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
        <Typography sx={{ minWidth: "50%" }}>Location Type :</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" sx={{ flex: 1 }} value={locationType} onChange={(_, v) => { if (v) setLocationType(v) }}>
          <ToggleButton value="gps">GPS</ToggleButton>
          <ToggleButton value="manual">Manual</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack>
        {locationType === "gps" && (
          <Stack sx={{ flexDirection: "row", gap: 2.5 }}>
            <TextField fullWidth size="small" label="Coordinates" disabled value={coords ? `${coords.lat}, ${coords.lon}` : ""} slotProps={{ input: { readOnly: true } }}></TextField>
            <Button disableElevation onClick={getCoords} disabled={coordsLoading} variant={coordsLoading ? "outlined" : "contained"} sx={{ px: 2.5 }} startIcon={coordsLoading ? <CircularProgress size={14}/> : <MyLocationIcon/>}>
              {coordsLoading ? "updating..." : "Update"}
            </Button>
          </Stack>
        )}
        {locationType === "manual" && (
          <Autocomplete
            options={cityOpts}
            loading={cityLoading}
            value={city}
            inputValue={cityInput}
            onInputChange={(_, v, reason) => { setCityInput(v); if (reason === "input") citySearch(v) }}
            getOptionLabel={(o) => [o.name, o.admin1, o.admin2, o.admin3, o.country].filter(Boolean).join(", ")}
            getOptionKey={(o) => o.id}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            filterOptions={(x) => x}
            renderInput={(params) => <TextField {...params} size="small" label="Find City"/>}
            onChange={(_, v) => {
              setCity(v)
              setTz(v?.timezone ?? "")
              if (v) setCoords({ lat: v.latitude, lon: v.longitude })
              else setCoords(null)
            }}
          />
        )}
      </Stack>
      <Stack>
        <TextField fullWidth size="small" label="Timezone" disabled value={tz} slotProps={{ input: { readOnly: true } }}></TextField>
      </Stack>
      <FormControl>
        <InputLabel id="calcMethodLabel">Calculation Method</InputLabel>
        <Select labelId="calcMethodLabel" id="calcMethod" label="Calculation Method" value={calcMethod} onChange={(e) => setCalcMethod(e.target.value)}>
          <MenuItem value="MuslimWorldLeague">Muslim World League</MenuItem>
          <MenuItem value="NorthAmerica">Islamic Society of North America</MenuItem>
          <MenuItem value="Egyptian">Egyptian General Authority</MenuItem>
          <MenuItem value="UmmAlQura">Umm al-Qura (Makkah)</MenuItem>
          <MenuItem value="Karachi">Univ. of Islamic Sciences, Karachi</MenuItem>
          <MenuItem value="Tehran">Institute of Geophysics, Tehran</MenuItem>
          <MenuItem value="MoonsightingCommittee">Moonsighting Committee</MenuItem>
          <MenuItem value="Singapore">Majlis Ugama Islam Singapura</MenuItem>
        </Select>
      </FormControl>
      <FormControl>
        <InputLabel id="madhabLabel">Madhab</InputLabel>
        <Select labelId="madhabLabel" id="madhab" label="Madhab" value={madhab} onChange={(e) => setMadhab(e.target.value)}>
          <MenuItem value="hanafi">Hanafi</MenuItem>
          <MenuItem value="shafi">Shafi'i</MenuItem>
          <MenuItem value="maliki">Maliki</MenuItem>
          <MenuItem value="hanbali">Hanbali</MenuItem>
        </Select>
      </FormControl>
      <Button disableElevation onClick={save} disabled={saving} variant={saving ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={saving ? <CircularProgress size={14}/> : <SaveIcon/>}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </Stack>
  </Stack>)
}

function Security({setSnack}) {
  const [editingPasskey, setEditingPasskey] = useState(null)
  const [passUpdating, setPassUpdating]     = useState(false)
  const [pkRemoving, setPkRemoving]         = useState(false)
  const [pkAdding, setPkAdding]             = useState(false)
  const [seOPass, setSeOPass]               = useState(false)
  const [seNPass, setSeNPass]               = useState(false)
  const [oldPass, setOldPass]               = useState("")
  const [newPass, setNewPass]               = useState("")
  const [conPass, setConPass]               = useState("")
  const [passkeys, setPasskeys]             = useState([])
  const updatePassword = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!oldPass) return setSnack("Please enter your old password")
    if (!newPass) return setSnack("Please enter a new password")
    if (newPass !== conPass) return setSnack("Passwords do not match")
    setPassUpdating(true)
    try {
//    const { error } = await Supabase.auth.updateUser({ password: newPass, currentPassword: oldPass })
      const { error } = await Supabase.auth.updateUser({ password: newPass, current_password: oldPass })
      if (error) throw error
      setOldPass("")
      setNewPass("")
      setConPass("")
      setSnack("Password Updated Successfully")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setPassUpdating(false)}
  }
  const addPasskey = async () => {
    setPkAdding(true)
    try {
      const { data, error } = await Supabase.auth.registerPasskey()
      if (error) throw error
      const fn = data?.friendly_name
      setPasskeys(prev => [...prev, data])
      setSnack(`Added Passkey${fn ? ` - ${fn}` : ""}`)
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setPkAdding(false)}
  }
  const renamePasskey = async () => {
    try {
      const { error } = await Supabase.auth.passkey.update({
        friendlyName: editingPasskey.friendly_name,
        passkeyId: editingPasskey.id
      })
      if (error) throw error
      setPasskeys(prev => prev.map(passkey => passkey.id === editingPasskey.id ? {...passkey, friendly_name: editingPasskey.friendly_name} : passkey))
      setSnack("Passkey Renamed")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally{setEditingPasskey(null)}
  }
  const removePasskey = async () => {
    setPkRemoving(true)
    try {
      const { error } = await Supabase.auth.passkey.delete({ passkeyId: editingPasskey.id })
      if (error) throw error
      setPasskeys(prev => prev.filter(passkey => passkey.id !== editingPasskey.id))
      setEditingPasskey(null)
      setSnack("Passkey Deleted")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally{setPkRemoving(false)}
  }
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await Supabase.auth.passkey.list()
        if (error) throw error
        setPasskeys(data ?? [])
      } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")}
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Stack sx={{ alignSelf: "center", maxWidth: 600, width: "100%", gap: 2.5, p: 2.5 }}>
      <Stack component="form" onSubmit={updatePassword} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><LockResetIcon sx={{ fontSize: 24 }}/>Update Password</Typography>
        <TextField fullWidth size="small" label="Old password" type={seOPass ? "text" : "password"} value={oldPass} onChange={e => setOldPass(e.target.value)} slotProps={{ input: { endAdornment: (
          <InputAdornment>
            <IconButton onClick={() => setSeOPass(!seOPass)}>
              {seOPass ? <VisibilityOffIcon/> : <VisibilityIcon/>}
            </IconButton>
          </InputAdornment>
        ) } }}/>
        <TextField fullWidth size="small" label="New password" type={seNPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} slotProps={{ input: { endAdornment: (
          <InputAdornment>
            <IconButton onClick={() => setSeNPass(!seNPass)}>
              {seNPass ? <VisibilityOffIcon/> : <VisibilityIcon/>}
            </IconButton>
          </InputAdornment>
        ) } }}/>
        <TextField fullWidth size="small" label="Confirm password" type="password" value={conPass} onChange={e => setConPass(e.target.value)}/>
        <Button disableElevation type="submit" disabled={passUpdating} variant={passUpdating ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={passUpdating ? <CircularProgress size={14}/> : <LockIcon/>}>
          {passUpdating ? "Updating..." : "Update"}
        </Button>
      </Stack>
      <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><FingerprintIcon sx={{ fontSize: 24 }}/>Manage Passkeys</Typography>
        {passkeys.length === 0 ? (
          <Typography>No Passkeys Added Yet</Typography>
        ) : (
          passkeys.map(passkey => (
            <Stack key={passkey.id} sx={{ flexDirection: "row", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5 }}>
              <Stack sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{passkey.friendly_name}</Typography>
                <Typography>Added:<span sx={{ fontFamily: "monospace" }}> {new Date(passkey.created_at).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"})} </span></Typography>
              </Stack>
              <IconButton onClick={() => {if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setEditingPasskey(passkey)}} sx={{ alignSelf: "center" }}><EditIcon/></IconButton>
            </Stack>
          ))
        )}
        <Button disableElevation onClick={addPasskey} disabled={pkAdding} variant={pkAdding ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={pkAdding ? <CircularProgress size={14}/> : <AddIcon/>}>
          {pkAdding ? "Adding..." : "Add Passkey"}
        </Button>
        <Dialog component="form" open={Boolean(editingPasskey)} onClose={() => setEditingPasskey(null)} onSubmit={e => {e.preventDefault(); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); renamePasskey()}}>
          <DialogTitle>Edit Passkey</DialogTitle>
          <DialogContent>
            <TextField label="Passkey Name" size="small" value={editingPasskey?.friendly_name} onChange={e => setEditingPasskey(prev => ({...prev, friendly_name: e.target.value}))} sx={{ mt: 1 }}/>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingPasskey(null)} disabled={pkRemoving}>Cancel</Button>
            <Button type="submit" disabled={pkRemoving}>Rename</Button>
            <Button onClick={removePasskey} disabled={pkRemoving} sx={{ color: "error.main" }} startIcon={pkRemoving ? <CircularProgress size={14}/> : null}>
              {pkRemoving ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Stack>
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
        <ToggleButtonGroup fullWidth={mobile} exclusive orientation={mobile ? "horizontal" : "vertical"} value={active} onChange={(_, x) => { if (x) navigate(`/settings/${x}`, { replace: !true }) }} sx={{ "& .MuiToggleButton-root": { borderRadius: 0 } }}>
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