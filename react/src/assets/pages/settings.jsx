import {
  useLocation, useNavigate,
  Routes, Route
} from "react-router-dom"
import {
  useContext, useEffect,
  useRef, useState
} from "react"
import {
  ToggleButtonGroup, CircularProgress, InputAdornment, DialogActions, Tab,
  DialogContent, Autocomplete, ToggleButton, DialogTitle, FormControl,
  IconButton, InputLabel, Typography, TextField, MenuItem, Snackbar, Tabs,
  Divider, Avatar, Dialog, Select, Button, Switch, Slide, Stack, Link,
} from "@mui/material"
import { Theme, getNativeFcmToken, clearNativeFcmToken } from "@/main"
import { useTranslation } from "@/i18n"
import { LocalNotifications } from "@capacitor/local-notifications"
import { PushNotifications } from "@capacitor/push-notifications"
import { Geolocation } from "@capacitor/geolocation"
import { subscribeWeb, unsubscribeWeb } from "@/firebase"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
import { Capacitor } from "@capacitor/core"
import Supabase from "@/supabase"
import api from "@/api"

import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew"
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
  const { t } = useTranslation()
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
      setSnack(t("settings.profile.saved"))
    } catch (err) {setSnack(err?.message ?? t("settings.profile.internalError"))} finally {setSaving(false)}
  }
  return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", alignItems: "center" }}>
        <Avatar src={avatar} onClick={() => fileRef.current.click()} sx={{ border: "2px solid", borderColor: "text.primary", cursor: "pointer", height: 72, width: 72 }}>{user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "?"}</Avatar>
        <Stack sx={{ px: 2.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{t("settings.profile.photoLabel")}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{t("settings.profile.photoHint")}</Typography>
        </Stack>
        <input hidden type="file" accept="image/*" ref={fileRef} onChange={e => {
          const file = e.target.files[0]
          if (!file) return
          if (file.size > 2 * 1048576) return setSnack(t("settings.profile.fileTooLarge"))
          if (file.type === "image/heic" || file.type === "image/heif") return setSnack(t("settings.profile.heicUnsupported"))
          setAvatar(URL.createObjectURL(file))
          setFile(file)
        }}/>
      </Stack>
      <TextField size="small" label={t("settings.profile.fullName")} value={name} onChange={e => setName(e.target.value)}/>
      <TextField size="small" label={t("settings.profile.email")} value={email} disabled slotProps={{ input: { readOnly: true } }} helperText={t("settings.profile.emailHelper")}/>
      <TextField size="small" label={t("settings.profile.bio")} value={bio} multiline rows={4} onChange={e => {if (e.target.value.length <= 160) setBio(e.target.value)}} helperText={bio.length !== 160 ? `${bio.length}/160` : t("settings.profile.charLimitReached")}/>
      <Button disableElevation onClick={save} disabled={saving} variant={saving ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={saving ? <CircularProgress size={14}/> : <SaveIcon/>}>
        {saving ? t("settings.profile.saving") : t("settings.profile.save")}
      </Button>
    </Stack>
  </Stack>)
}

function Notifications({setSnack}) {
  const { user } = useContext(Theme)
  const { t } = useTranslation()
  const [teleUnLinking, setTeleUnLinking] = useState(false)
  const [browEnabled, setBrowEnabled]     = useState(false)
  const [browLoading, setBrowLoading]     = useState(true )
  const [teleLinking, setTeleLinking]     = useState(false)
  const [teleLinked, setTeleLinked]       = useState(false)
  const [showCon, setShowCon]             = useState(false)
  const [teleId, setTeleId]               = useState("")
  const pollRef = useRef()
  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.post("/settings/notifications/telegram/status")
        if (data.success && data.chatId) {
          setTeleLinked(true)
          setTeleId(data.chatId)
          clearInterval(pollRef.current)
        }
      } catch { return }
    }, 2500)
    setTimeout(() => clearInterval(pollRef.current), 120000)
  }
  const toggleBrowWeb = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return setSnack(t("settings.notif.notSupported"))
    setBrowLoading(true)
    try {
      if (browEnabled) {
        const fcmToken = await subscribeWeb()
        if (fcmToken) await api.post("/settings/notifications/webPush/unsubscribe", { fcmToken })
        await Supabase.auth.updateUser({ data: { webPushNotif: false } })
        setBrowEnabled(false)
        setSnack(t("settings.notif.browserDisabled"))
      } else {
        const fcmToken = await subscribeWeb()
        if (!fcmToken) throw new Error(t("settings.notif.notSupported"))
        const { data } = await api.post("/settings/notifications/webPush/subscribe", { fcmToken, platform: "web" })
        if (!data.success) throw new Error(data.message)
        await Supabase.auth.updateUser({ data: { webPushNotif: true } })
        setBrowEnabled(true)
        setSnack(t("settings.notif.browserEnabled"))
      }
    } catch (err) {
      if (err.name === "NotAllowedError") setSnack(t("settings.notif.permissionDenied"))
      else setSnack(err?.message ?? t("settings.notif.somethingWrong"))
    } finally { setBrowLoading(false) }
  }
  const toggleBrowNative = async () => {
    setBrowLoading(true)
    try {
      if (browEnabled) {
        const fcmToken = getNativeFcmToken()
        if (fcmToken) await api.post("/settings/notifications/webPush/unsubscribe", { fcmToken })
        clearNativeFcmToken()
        await Supabase.auth.updateUser({ data: { platformNotif: false } })
        setBrowEnabled(false)
        setSnack(t("settings.notif.deviceDisabled"))
      } else {
        let { receive } = await PushNotifications.checkPermissions()
        if (receive === "prompt") ({ receive } = await PushNotifications.requestPermissions())
        if (receive !== "granted") {
          setSnack(t("settings.notif.permissionDeniedDevice"))
          return
        }
        let { display } = await LocalNotifications.checkPermissions()
        if (display === "prompt") ({ display } = await LocalNotifications.requestPermissions())
        if (display !== "granted") {
          setSnack(t("settings.notif.permissionDeniedLocal"))
          return
        }
        await PushNotifications.register()
        await Supabase.auth.updateUser({ data: { platformNotif: true } })
        setBrowEnabled(true)
        setSnack(t("settings.notif.enabled"))
      }
    } catch (err) {
      setSnack(err?.message ?? t("settings.notif.somethingWrong"))
    } finally { setBrowLoading(false) }
  }
  const toggleBrow = Capacitor.isNativePlatform() ? toggleBrowNative : toggleBrowWeb
  const teleSubmit = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!teleLinked) {
      setTeleLinking(true)
      try {
        const { data } = await api.post("/settings/notifications/telegram/validateID", { chatId: teleId.trim() })
        if (!data.success) throw new Error(data.message)
        setTeleLinked(true)
        setTeleId(data.chatId)
        setSnack(data.message)
      } catch (err) {setSnack(err?.message ?? t("settings.notif.internalError"))} finally {setTeleLinking(false)}
    } else {
      setTeleUnLinking(true)
      try {
        const { data } = await api.post("/settings/notifications/telegram/unlink")
        if (!data.success) throw new Error(data.message)
        setTeleLinked(false)
        setTeleId("")
        setSnack(data.message)
      } catch (err) {setSnack(err?.message ?? t("settings.notif.internalError"))} finally {setTeleUnLinking(false)}
    }
  }
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let cancelled = false
    let liveRegListener
    const tasks = []
    tasks.push(api.post("/settings/notifications/telegram/status").then(({ data }) => {
      if (cancelled) return
      if (data.success && data.chatId) {
        setTeleLinked(true)
        setTeleId(data.chatId)
      }
    }).catch(() => {}))
    if (Capacitor.isNativePlatform()) {
      tasks.push(PushNotifications.checkPermissions().then(({ receive }) => {
        if (receive !== "granted") return setBrowEnabled(false)
        const existingToken = getNativeFcmToken()
        if (existingToken) return api.post("/settings/notifications/webPush/status", { fcmToken: existingToken }).then(({ data }) => { if (!cancelled) setBrowEnabled(!!data.subscribed) })
        setBrowEnabled(false)
        PushNotifications.addListener("registration", () => { if (!cancelled) setBrowEnabled(true) }).then(handle => { liveRegListener = handle })
      }).catch(() => { if (!cancelled) setBrowEnabled(false) }))
    }
    if ("serviceWorker" in navigator && "Notification" in window) {
      if (Notification.permission === "granted") setBrowEnabled(false)
      else tasks.push(subscribeWeb().then(fcmToken => {
        if (!fcmToken) return setBrowEnabled(false)
        return api.post("/settings/notifications/webPush/status", { fcmToken }).then(({ data }) => { if (!cancelled) setBrowEnabled(!!data.subscribed) })
      }).catch(() => { if (!cancelled) setBrowEnabled(false) }))
    }
    Promise.allSettled(tasks).then(() => { if (!cancelled) {
      setBrowLoading(false)
      setShowCon(true)
    } })
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => { cancelled = true; liveRegListener?.remove() }
  }, [user?.id])
  return (<Stack sx={{ p: 2.5 }}>
    {showCon && (
      <Stack sx={{ alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5 }}>
        <Stack sx={{ flexDirection: "row", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><WebhookIcon sx={{ fontSize: 24 }}/>{Capacitor.isNativePlatform() ? t("settings.notif.appNotifications") : t("settings.notif.browserNotifications")}</Typography>
          </Stack>
          <Stack sx={{ justifyContent: "center" }}>
            <Switch checked={browEnabled} onChange={toggleBrow} disabled={browLoading}/>
          </Stack>
        </Stack>
        <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
          <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><TelegramIcon sx={{ fontSize: 24 }}/>{t("settings.notif.telegramNotifications")}</Typography>
          <Stack sx={{ "& .MuiTypography-root": { color: "text.secondary" } }}>
            <Stack sx={{ gap: 2.5 }}>
              {!teleLinked ?
                (<Stack sx={{ gap: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{t("settings.notif.howToConnect")}</Typography>
                  <Typography>{t("settings.notif.step1")} <Link href={`https://t.me/WaqtOfficialBot?start=${user?.id}`} target="_blank" rel="noopener noreferrer" onClick={startPolling}><strong>@WaqtOfficialBot</strong></Link></Typography>
                  <Typography>{t("settings.notif.step2")}</Typography>
                  <Typography>{t("settings.notif.step3")}</Typography>
                </Stack>) :
                (<Stack>
                  <Typography>{t("settings.notif.linkedMessage")}</Typography>
                </Stack>)
              }
              <FormControl component="form" onSubmit={teleSubmit} sx={{ flexDirection: "row", display: "flex", gap: 1 }}>
                <TextField required size="small" label={t("settings.notif.chatIdLabel")} type="number" disabled={teleLinked} value={teleId} onChange={e => setTeleId(e.target.value)}/>
                <Button disableElevation type="submit" disabled={teleLinking || teleUnLinking} variant={(teleLinking || teleUnLinking) ? "outlined" : "contained"} startIcon={teleLinked ? (teleUnLinking ? <CircularProgress size={14}/> : <LinkOffIcon/>) : (teleLinking ? <CircularProgress size={14}/> : <LinkIcon/>)}>
                  {teleLinked ? (teleUnLinking ? t("settings.notif.unlinking") : t("settings.notif.unlink")) : (teleLinking ? t("settings.notif.linking") : t("settings.notif.link"))}
                </Button>
              </FormControl>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    )}
  </Stack>)
}

function Preferences({setSnack}) {
  const { user } = useContext(Theme)
  const { t, setLang } = useTranslation()
  const [drawerPos, setDrawerPos] =         useState(() => localStorage.getItem("drawerPos") || "l")
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
  const getCoords = async () => {
    setCoordsLoading(true)
    try {
      let lat, lon
      if (Capacitor.isNativePlatform()) {
        let { location } = await Geolocation.checkPermissions()
        if (location === "prompt" || location === "prompt-with-rationale") ({ location } = await Geolocation.requestPermissions())
        if (location !== "granted") {
          setSnack(t("settings.pref.locationPermissionDenied"))
          return
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 })
        lat = pos.coords.latitude
        lon = pos.coords.longitude
      } else {
        if (!navigator.geolocation) return setSnack(t("settings.pref.gpsNotSupported"))
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }))
        lat = pos.coords.latitude
        lon = pos.coords.longitude
      }
      setCoords({ lat, lon })
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto`)
        const { timezone } = await res.json()
        setTz(timezone)
      } catch { setTz("") }
    } catch (err) {
      setSnack(err?.message ?? t("settings.pref.locationFailed"))
    } finally {
      setCoordsLoading(false)
    }
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
    if (locationType === "gps"    && !coords) return setSnack(t("settings.pref.locationRequired"))
    if (locationType === "manual" && !city  ) return setSnack(t("settings.pref.cityRequired"))
    setSaving(true)
    try {
      const { error } = await Supabase.auth.updateUser({ data: {
        ...(locationType === "gps" ? {city: null} : {city}),
        language, timeFormat, locationType,
        coords, calcMethod, madhab, tz
      } })
      if (error) throw error
      setSnack(t("settings.pref.saved"))
    } catch (err) {setSnack(err?.message ?? t("settings.pref.internalError"))} finally {setSaving(false)}
  }
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const data = user?.user_metadata
    if (!data) return
    if (data.language)     { setLanguage(data.language); setLang(data.language) }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
  return (<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
        <Typography sx={{ minWidth: "50%" }}>{t("settings.pref.language")}</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" sx={{ flex: 1 }} value={language} onChange={(_, v) => { if (v) { setLanguage(v); setLang(v) } }}>
          <ToggleButton value="en">{t("settings.pref.english")}</ToggleButton>
          <ToggleButton value="bn">বাংলা</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
        <Typography sx={{ minWidth: "50%" }}>{t("settings.pref.timeFormat")}</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" sx={{ flex: 1 }} value={timeFormat} onChange={(_, v) => { if (v) setTimeFormat(v) }}>
          <ToggleButton value="24h">24H</ToggleButton>
          <ToggleButton value="12h">12H</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
        <Typography sx={{ minWidth: "50%" }}>{t("settings.pref.locationType")}</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" sx={{ flex: 1 }} value={locationType} onChange={(_, v) => { if (v) setLocationType(v) }}>
          <ToggleButton value="gps">{t("settings.pref.gps")}</ToggleButton>
          <ToggleButton value="manual">{t("settings.pref.manual")}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack>
        {locationType === "gps" && (
          <Stack sx={{ flexDirection: "row", gap: 2.5 }}>
            <TextField fullWidth size="small" label={t("settings.pref.coordinates")} disabled value={coords ? `${coords.lat}, ${coords.lon}` : ""} slotProps={{ input: { readOnly: true } }}></TextField>
            <Button disableElevation onClick={getCoords} disabled={coordsLoading} variant={coordsLoading ? "outlined" : "contained"} sx={{ px: 2.5 }} startIcon={coordsLoading ? <CircularProgress size={14}/> : <MyLocationIcon/>}>
              {coordsLoading ? t("settings.pref.updating") : t("settings.pref.update")}
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
            renderInput={(params) => <TextField {...params} size="small" label={t("settings.pref.findCity")}/>}
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
        <TextField fullWidth size="small" label={t("settings.pref.timezone")} disabled value={tz} slotProps={{ input: { readOnly: true } }}></TextField>
      </Stack>
      <FormControl>
        <InputLabel id="calcMethodLabel">{t("settings.pref.calcMethod")}</InputLabel>
        <Select labelId="calcMethodLabel" id="calcMethod" label={t("settings.pref.calcMethod")} value={calcMethod} onChange={(e) => setCalcMethod(e.target.value)}>
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
        <InputLabel id="madhabLabel">{t("settings.pref.madhabLabel")}</InputLabel>
        <Select labelId="madhabLabel" id="madhab" label={t("settings.pref.madhabLabel")} value={madhab} onChange={(e) => setMadhab(e.target.value)}>
          <MenuItem value="hanafi">{t("madhab.hanafi")}</MenuItem>
          <MenuItem value="shafi">{t("madhab.shafii")}</MenuItem>
          <MenuItem value="maliki">{t("madhab.maliki")}</MenuItem>
          <MenuItem value="hanbali">{t("madhab.hanbali")}</MenuItem>
        </Select>
      </FormControl>
      <Button disableElevation onClick={save} disabled={saving} variant={saving ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={saving ? <CircularProgress size={14}/> : <SaveIcon/>}>
        {saving ? t("settings.pref.saving") : t("settings.pref.save")}
      </Button>
    </Stack>
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
        <Typography sx={{ minWidth: "50%" }}>{t("settings.pref.drawerPosition")}</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" sx={{ flex: 1 }} value={drawerPos} onChange={(_, v) => {
          if (!v) return
          setDrawerPos(v)
          localStorage.setItem("drawerPos", v)
          setSnack(t("settings.pref.drawerSetTo", { side: v === "r" ? t("settings.pref.right") : t("settings.pref.left") }))
          window.dispatchEvent(new CustomEvent("drawerpos-change", { detail: v }))
        }}>
          <ToggleButton value="l">{t("settings.pref.left")}</ToggleButton>
          <ToggleButton value="r">{t("settings.pref.right")}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  </Stack>)
}

function Security({setSnack}) {
  const { t } = useTranslation()
  const [editingPasskey, setEditingPasskey] = useState(null)
  const [passUpdating, setPassUpdating]     = useState(false)
  const [pkRemoving, setPkRemoving]         = useState(false)
  const [pkAdding, setPkAdding]             = useState(false)
  const [seOPass, setSeOPass]               = useState(false)
  const [seNPass, setSeNPass]               = useState(false)
  const [othersR, setOthersR]               = useState(false)
  const [oldPass, setOldPass]               = useState("")
  const [newPass, setNewPass]               = useState("")
  const [conPass, setConPass]               = useState("")
  const [passkeys, setPasskeys]             = useState([])
  const updatePassword = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!oldPass) return setSnack(t("settings.security.oldPasswordRequired"))
    if (!newPass) return setSnack(t("settings.security.newPasswordRequired"))
    if (newPass !== conPass) return setSnack(t("settings.security.passwordMismatch"))
    setPassUpdating(true)
    try {
      const { error } = await Supabase.auth.updateUser({ password: newPass, current_password: oldPass })
      if (error) throw error
      setOldPass("")
      setNewPass("")
      setConPass("")
      setSnack(t("settings.security.passwordUpdated"))
    } catch (err) {setSnack(err?.message ?? t("settings.security.internalError"))} finally {setPassUpdating(false)}
  }
  const addPasskey = async () => {
    setPkAdding(true)
    try {
      const { data, error } = await Supabase.auth.registerPasskey()
      if (error) throw error
      const fn = data?.friendly_name
      setPasskeys(prev => [...prev, data])
      setSnack(t("settings.security.addedPasskey", { name: fn ? ` - ${fn}` : "" }))
    } catch (err) {setSnack(err?.message ?? t("settings.security.internalError"))} finally {setPkAdding(false)}
  }
  const renamePasskey = async () => {
    try {
      const { error } = await Supabase.auth.passkey.update({
        friendlyName: editingPasskey.friendly_name,
        passkeyId: editingPasskey.id
      })
      if (error) throw error
      setPasskeys(prev => prev.map(passkey => passkey.id === editingPasskey.id ? {...passkey, friendly_name: editingPasskey.friendly_name} : passkey))
      setSnack(t("settings.security.passkeyRenamed"))
    } catch (err) {setSnack(err?.message ?? t("settings.security.internalError"))} finally{setEditingPasskey(null)}
  }
  const removePasskey = async () => {
    setPkRemoving(true)
    try {
      const { error } = await Supabase.auth.passkey.delete({ passkeyId: editingPasskey.id })
      if (error) throw error
      setPasskeys(prev => prev.filter(passkey => passkey.id !== editingPasskey.id))
      setEditingPasskey(null)
      setSnack(t("settings.security.passkeyDeleted"))
    } catch (err) {setSnack(err?.message ?? t("settings.security.internalError"))} finally{setPkRemoving(false)}
  }
  const logout = async (scope) => {
    setOthersR(true)
    try {
      const fcmToken = Capacitor.isNativePlatform()
        ? getNativeFcmToken()
        : ("serviceWorker" in navigator ? await subscribeWeb().catch(() => null) : null)
      await api.post("/settings/security/sessions/logout", { scope, fcmToken })
      if (scope === "global" && "serviceWorker" in navigator) await unsubscribeWeb().catch(() => {})
      const { error } = await Supabase.auth.signOut({ scope })
      if (error) throw error
      setSnack(scope === "global" ? t("settings.security.loggedOutAll") : t("settings.security.loggedOutOthers"))
    } catch (err) {setSnack(err?.message ?? t("settings.security.internalError"))} finally{setOthersR(false)}
  }
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await Supabase.auth.passkey.list()
        if (error) throw error
        setPasskeys(data ?? [])
      } catch (err) {setSnack(err?.message ?? t("settings.security.internalError"))}
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5 }}>
      <Stack component="form" onSubmit={updatePassword} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><LockResetIcon sx={{ fontSize: 24 }}/>{t("settings.security.updatePassword")}</Typography>
        <TextField fullWidth size="small" label={t("settings.security.oldPassword")} type={seOPass ? "text" : "password"} value={oldPass} onChange={e => setOldPass(e.target.value)} slotProps={{ input: { endAdornment: (
          <InputAdornment>
            <IconButton onClick={() => setSeOPass(!seOPass)}>
              {seOPass ? <VisibilityOffIcon/> : <VisibilityIcon/>}
            </IconButton>
          </InputAdornment>
        ) } }}/>
        <TextField fullWidth size="small" label={t("settings.security.newPassword")} type={seNPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} slotProps={{ input: { endAdornment: (
          <InputAdornment>
            <IconButton onClick={() => setSeNPass(!seNPass)}>
              {seNPass ? <VisibilityOffIcon/> : <VisibilityIcon/>}
            </IconButton>
          </InputAdornment>
        ) } }}/>
        <TextField fullWidth size="small" label={t("settings.security.confirmPassword")} type="password" value={conPass} onChange={e => setConPass(e.target.value)}/>
        <Button disableElevation type="submit" disabled={passUpdating} variant={passUpdating ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={passUpdating ? <CircularProgress size={14}/> : <LockIcon/>}>
          {passUpdating ? t("settings.security.updating") : t("settings.security.update")}
        </Button>
      </Stack>
      <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><FingerprintIcon sx={{ fontSize: 24 }}/>{t("settings.security.managePasskeys")}</Typography>
        {passkeys.length === 0 ? (
          <Typography>{t("settings.security.noPasskeys")}</Typography>
        ) : (
          passkeys.map(passkey => (
            <Stack key={passkey.id} sx={{ flexDirection: "row", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5 }}>
              <Stack sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{passkey.friendly_name}</Typography>
                <Typography>{t("settings.security.added")}<span sx={{ fontFamily: "monospace" }}> {new Date(passkey.created_at).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"})} </span></Typography>
              </Stack>
              <IconButton onClick={() => {if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setEditingPasskey(passkey)}} sx={{ alignSelf: "center" }}><EditIcon/></IconButton>
            </Stack>
          ))
        )}
        <Button disableElevation onClick={addPasskey} disabled={pkAdding} variant={pkAdding ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={pkAdding ? <CircularProgress size={14}/> : <AddIcon/>}>
          {pkAdding ? t("settings.security.adding") : t("settings.security.addPasskey")}
        </Button>
        <Dialog component="form" open={Boolean(editingPasskey)} onClose={() => setEditingPasskey(null)} onSubmit={e => {e.preventDefault(); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); renamePasskey()}}>
          <DialogTitle>{t("settings.security.editPasskey")}</DialogTitle>
          <DialogContent>
            <TextField label={t("settings.security.passkeyName")} size="small" value={editingPasskey?.friendly_name} onChange={e => setEditingPasskey(prev => ({...prev, friendly_name: e.target.value}))} sx={{ mt: 1 }}/>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingPasskey(null)} disabled={pkRemoving}>{t("settings.security.cancel")}</Button>
            <Button type="submit" disabled={pkRemoving}>{t("settings.security.rename")}</Button>
            <Button onClick={removePasskey} disabled={pkRemoving} sx={{ color: "error.main" }} startIcon={pkRemoving ? <CircularProgress size={14}/> : null}>
              {pkRemoving ? t("settings.security.deleting") : t("settings.security.delete")}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
      <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><PowerSettingsNewIcon sx={{ fontSize: 24 }}/>{t("settings.security.manageSessions")}</Typography>
        <Typography>{t("settings.security.logoutFrom")}</Typography>
        <Stack sx={{ flexDirection: "row", gap: 2.5 }}>
          <Button fullWidth disableElevation onClick={() => logout("others")} variant={othersR ? "outlined" : "contained"} disabled={othersR}>{t("settings.security.otherDevices")}</Button>
          <Button fullWidth disableElevation onClick={() => logout("global")} variant="contained">{t("settings.security.allDevices")}</Button>
        </Stack>
      </Stack>
    </Stack>
  </Stack>)
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  const [snack, setSnack] = useState("")
  const active = ["profile", "notifications", "preferences", "security"].find(x => location.pathname.includes(x)) ?? "profile"
  const mobile = useMediaQuery(useTheme().breakpoints.down("sm"))
  return (<Stack direction={{ xs: "column", sm: "row" }} sx={{ height: "100%", overflow: "hidden" }}>
    <Stack sx={{ overflowY: "auto", minHeight: 0 }}>
      <Tabs orientation={mobile ? "horizontal" : "vertical"} variant={mobile ? "fullWidth" : "standard"} value={active} onChange={(_, x) => { if (x) navigate(`/settings/${x}`, { replace: !true }) }} sx={{ minHeight: 0, flexShrink: 0, "& .MuiTabs-scroller": { overflowY: mobile ? "visible" : "auto", minHeight: 0, }, "& .MuiTab-root": { py: mobile ? undefined : 2.5 } }}>
        <Tab value="profile" icon={<PersonIcon/>}/>
        <Tab value="notifications" icon={<NotificationsIcon/>}/>
        <Tab value="preferences" icon={<TuneIcon/>}/>
        <Tab value="security" icon={<SecurityIcon/>}/>
      </Tabs>
    </Stack>
    <Divider flexItem orientation={mobile ? "horizontal" : "vertical"}/>
    <Stack sx={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
      <Routes>
        <Route path="profile" element={<Profile setSnack={setSnack}/>}/>
        <Route path="notifications" element={<Notifications setSnack={setSnack}/>}/>
        <Route path="preferences" element={<Preferences setSnack={setSnack}/>}/>
        <Route path="security" element={<Security setSnack={setSnack}/>}/>
        <Route path="*" element={<Profile setSnack={setSnack}/>}/>
      </Routes>
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}