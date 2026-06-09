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
  CircularProgress,
  ToggleButtonGroup,
  InputAdornment,
  ToggleButton,
  Typography,
  IconButton,
  TextField,
  Snackbar,
  Divider,
  Tooltip,
  Button,
  Switch,
  Slide,
  Stack,
  Chip,
  Box
} from "@mui/material"
import Supabase from "@/supabase"
import { Theme } from "@/react"

import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import VisibilityIcon   from "@mui/icons-material/Visibility"
import NotificationsIcon from "@mui/icons-material/Notifications"
import MyLocationIcon   from "@mui/icons-material/MyLocation"
import TelegramIcon     from "@mui/icons-material/Telegram"
import SecurityIcon     from "@mui/icons-material/Security"
import DeleteIcon       from "@mui/icons-material/Delete"
import PersonIcon       from "@mui/icons-material/Person"
import DevicesIcon      from "@mui/icons-material/Devices"
import KeyIcon          from "@mui/icons-material/Key"
import TuneIcon         from "@mui/icons-material/Tune"
import LinkIcon         from "@mui/icons-material/Link"
import SaveIcon         from "@mui/icons-material/Save"

// ── shared snack hook ─────────────────────────────────────────────────────────
function useSnack() {
  const [snack, setSnack]   = useState("")
  const [open,  setOpen]    = useState(false)
  const show = (msg) => { setSnack(msg); setOpen(true) }
  const titleCase = (str) => str.replace(/\b\w/g, c => c.toUpperCase())
  const SnackBar = (
    <Snackbar
      open={open}
      onClose={() => setOpen(false)}
      message={snack}
      autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500}
      slots={{ transition: Slide }}
    />
  )
  return { show, titleCase, SnackBar }
}

// ── shared section wrapper ────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <Stack sx={{ gap: 2 }}>
      {title && (
        <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.65rem" }}>
          {title}
        </Typography>
      )}
      {children}
    </Stack>
  )
}

// ── shared save button row ────────────────────────────────────────────────────
function SaveRow({ onSave, loading }) {
  return (
    <Stack sx={{ alignItems: "flex-end" }}>
      <Button
        variant="contained" disableElevation
        startIcon={loading ? <CircularProgress size={14} color="inherit"/> : <SaveIcon/>}
        onClick={onSave} disabled={loading}
        sx={{ minWidth: 120 }}
      >
        {loading ? "Saving…" : "Save"}
      </Button>
    </Stack>
  )
}

const tabs = [
  { label: "Profile",       path: "/settings/profile",       icon: <PersonIcon/>},
  { label: "Notifications", path: "/settings/notifications", icon: <NotificationsIcon/>},
  { label: "Preferences",   path: "/settings/preferences",   icon: <TuneIcon/>},
  { label: "Security",      path: "/settings/security",      icon: <SecurityIcon/>}
]

function Profile() {
  const { user } = useContext(Theme)
  const { show, titleCase, SnackBar } = useSnack()
  const fileRef = useRef()

  const [name,    setName]    = useState(user?.user_metadata?.full_name ?? "")
  const [bio,     setBio]     = useState(user?.user_metadata?.bio       ?? "")
  const [avatar,  setAvatar]  = useState(user?.user_metadata?.avatar_url ?? "")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const email = user?.email ?? ""

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return show("Image must be under 2 MB")
    setUploading(true)
    try {
      const ext  = file.name.split(".").pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await Supabase.storage.from("avatars").upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = Supabase.storage.from("avatars").getPublicUrl(path)
      setAvatar(data.publicUrl + "?t=" + Date.now())
      show("Avatar updated!")
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return show("Name cannot be empty")
    setLoading(true)
    try {
      const { error } = await Supabase.auth.updateUser({
        data: { full_name: name.trim(), bio: bio.trim(), avatar_url: avatar }
      })
      if (error) throw error
      show("Profile saved!")
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack sx={{ gap: 4, p: 3, maxWidth: 520 }}>
      <Section title="Profile">
        {/* Avatar */}
        <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 2.5 }}>
          <Box
            onClick={() => fileRef.current?.click()}
            sx={{
              width: 72, height: 72, borderRadius: "50%",
              background: avatar ? `url(${avatar}) center/cover` : "action.hover",
              backgroundColor: "action.hover",
              border: "2px solid", borderColor: "divider",
              cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", position: "relative",
              "&:hover .overlay": { opacity: 1 }
            }}
          >
            {!avatar && <PersonIcon sx={{ color: "text.disabled", fontSize: 32 }}/>}
            <Stack className="overlay" sx={{
              position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.45)",
              alignItems: "center", justifyContent: "center",
              opacity: 0, transition: "opacity 0.2s ease"
            }}>
              {uploading
                ? <CircularProgress size={20} sx={{ color: "#fff" }}/>
                : <Typography variant="caption" sx={{ color: "#fff", fontSize: "0.6rem", fontWeight: 600 }}>CHANGE</Typography>
              }
            </Stack>
          </Box>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange}/>
          <Stack sx={{ gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Profile Photo</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Click to upload · Max 2 MB</Typography>
          </Stack>
        </Stack>

        <TextField fullWidth size="small" label="Full Name"
          value={name} onChange={e => setName(e.target.value)}/>

        <TextField fullWidth size="small" label="Email" value={email}
          disabled slotProps={{ input: { readOnly: true } }}
          helperText="Email cannot be changed"/>

        <TextField fullWidth size="small" label="Bio" multiline rows={3}
          inputProps={{ maxLength: 160 }}
          value={bio} onChange={e => setBio(e.target.value)}
          helperText={`${bio.length}/160`}/>
      </Section>

      <SaveRow onSave={handleSave} loading={loading}/>
      {SnackBar}
    </Stack>
  )
}

function Notifications() {
  const { user } = useContext(Theme)
  const { show, titleCase, SnackBar } = useSnack()

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [chatId,      setChatId]      = useState(user?.user_metadata?.tg_chat_id ?? "")
  const [tgLoading,   setTgLoading]   = useState(false)
  const [tgEnabled,   setTgEnabled]   = useState(!!user?.user_metadata?.tg_chat_id)

  // Check current push permission state on mount
  useEffect(() => {
    if ("Notification" in window) {
      setPushEnabled(Notification.permission === "granted")
    }
  }, [])

  const handlePushToggle = async () => {
    if (!("Notification" in window)) return show("Push notifications not supported on this device")
    if (pushEnabled) {
      // Can't revoke programmatically — guide user
      show("To disable, clear site permissions in your browser settings")
      return
    }
    setPushLoading(true)
    try {
      const result = await Notification.requestPermission()
      if (result === "granted") {
        setPushEnabled(true)
        show("Push notifications enabled!")
      } else {
        show("Permission denied — check browser settings")
      }
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setPushLoading(false)
    }
  }

  const handleSaveChatId = async () => {
    if (!chatId.trim()) return show("Please enter your Telegram Chat ID")
    setTgLoading(true)
    try {
      const { error } = await Supabase.auth.updateUser({ data: { tg_chat_id: chatId.trim() } })
      if (error) throw error
      setTgEnabled(true)
      show("Telegram connected!")
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setTgLoading(false)
    }
  }

  const handleDisconnectTg = async () => {
    setTgLoading(true)
    try {
      const { error } = await Supabase.auth.updateUser({ data: { tg_chat_id: null } })
      if (error) throw error
      setChatId("")
      setTgEnabled(false)
      show("Telegram disconnected")
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setTgLoading(false)
    }
  }

  const botLink = `https://t.me/WaqtBot?start=${user?.id ?? ""}`

  return (
    <Stack sx={{ gap: 4, p: 3, maxWidth: 520 }}>

      {/* Push */}
      <Section title="Push Notifications">
        <Stack sx={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2 }}>
          <Stack sx={{ gap: 0.4 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Browser Push</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {pushEnabled ? "Notifications are enabled" : "Allow prayer time alerts in this browser"}
            </Typography>
          </Stack>
          {pushLoading
            ? <CircularProgress size={22}/>
            : <Switch checked={pushEnabled} onChange={handlePushToggle}/>
          }
        </Stack>
      </Section>

      <Divider/>

      {/* Telegram */}
      <Section title="Telegram Notifications">
        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
          Get prayer reminders directly on Telegram. Two ways to connect:
        </Typography>

        {/* Option 1 — Auto link */}
        <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2, gap: 1.5 }}>
          <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
            <LinkIcon sx={{ fontSize: 18, color: "primary.main" }}/>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Auto Connect</Typography>
            <Chip label="Recommended" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }}/>
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Click the link — the bot will auto-link your account using your Supabase ID.
          </Typography>
          <Button
            variant="outlined" size="small"
            startIcon={<TelegramIcon/>}
            href={botLink} target="_blank" rel="noopener noreferrer"
            sx={{ alignSelf: "flex-start", textTransform: "none" }}
          >
            Open @WaqtBot
          </Button>
        </Stack>

        {/* Option 2 — Manual Chat ID */}
        <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2, gap: 1.5 }}>
          <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
            <TelegramIcon sx={{ fontSize: 18, color: "primary.main" }}/>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Manual Chat ID</Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Message <strong>@userinfobot</strong> on Telegram to get your Chat ID, then paste it here.
          </Typography>
          <TextField
            fullWidth size="small" label="Telegram Chat ID"
            placeholder="e.g. 123456789"
            value={chatId} onChange={e => setChatId(e.target.value)}
            disabled={tgLoading}
          />
          <Stack sx={{ flexDirection: "row", gap: 1 }}>
            <Button
              variant="contained" disableElevation size="small"
              startIcon={tgLoading ? <CircularProgress size={14} color="inherit"/> : <SaveIcon/>}
              onClick={handleSaveChatId} disabled={tgLoading}
            >
              {tgLoading ? "Saving…" : "Save"}
            </Button>
            {tgEnabled && (
              <Button
                variant="outlined" color="error" size="small"
                onClick={handleDisconnectTg} disabled={tgLoading}
              >
                Disconnect
              </Button>
            )}
          </Stack>
        </Stack>
      </Section>

      {SnackBar}
    </Stack>
  )
}

const CALC_METHODS = [
  { value: "MWL",       label: "Muslim World League" },
  { value: "ISNA",      label: "Islamic Society of North America" },
  { value: "Egypt",     label: "Egyptian General Authority" },
  { value: "Makkah",    label: "Umm Al-Qura, Makkah" },
  { value: "Karachi",   label: "University of Islamic Sciences, Karachi" },
  { value: "Tehran",    label: "Institute of Geophysics, Tehran" },
  { value: "Jafari",    label: "Shia Ithna Ashari (Jafari)" },
]

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা (Bengali)" },
  { value: "ar", label: "العربية (Arabic)" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "tr", label: "Türkçe (Turkish)" },
  { value: "id", label: "Bahasa Indonesia" },
]

function Preferences() {
  const { user } = useContext(Theme)
  const { show, titleCase, SnackBar } = useSnack()

  const meta = user?.user_metadata ?? {}

  const [lang,       setLang]       = useState(meta.language       ?? "en")
  const [calcMethod, setCalcMethod] = useState(meta.calc_method    ?? "Karachi")
  const [timeFormat, setTimeFormat] = useState(meta.time_format    ?? "12h")
  const [locMode,    setLocMode]    = useState(meta.loc_mode        ?? "gps")
  const [city,       setCity]       = useState(meta.city           ?? "")
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsCoords,  setGpsCoords]  = useState(
    meta.lat && meta.lon ? `${parseFloat(meta.lat).toFixed(4)}, ${parseFloat(meta.lon).toFixed(4)}` : ""
  )
  const [loading,    setLoading]    = useState(false)

  const handleGps = () => {
    if (!navigator.geolocation) return show("Geolocation not supported on this device")
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        setGpsCoords(`${lat.toFixed(4)}, ${lon.toFixed(4)}`)
        setGpsLoading(false)
        show("Location captured!")
      },
      () => {
        setGpsLoading(false)
        show("Could not get location — check browser permissions")
      },
      { timeout: 10000 }
    )
  }

  const handleSave = async () => {
    if (locMode === "manual" && !city.trim()) return show("Please enter a city name")
    const coords = gpsCoords.split(",").map(s => s.trim())
    const payload = {
      language:    lang,
      calc_method: calcMethod,
      time_format: timeFormat,
      loc_mode:    locMode,
      city:        locMode === "manual" ? city.trim() : meta.city,
      lat:         locMode === "gps" && coords[0] ? coords[0] : meta.lat,
      lon:         locMode === "gps" && coords[1] ? coords[1] : meta.lon,
    }
    setLoading(true)
    try {
      const { error } = await Supabase.auth.updateUser({ data: payload })
      if (error) throw error
      show("Preferences saved!")
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack sx={{ gap: 4, p: 3, maxWidth: 520 }}>

      <Section title="Language & Display">
        <TextField select fullWidth size="small" label="Language"
          value={lang} onChange={e => setLang(e.target.value)}
          SelectProps={{ native: true }}>
          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </TextField>

        <Stack sx={{ gap: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Time Format</Typography>
          <ToggleButtonGroup exclusive size="small" value={timeFormat}
            onChange={(_, v) => { if (v) setTimeFormat(v) }}>
            <ToggleButton value="12h" sx={{ px: 3 }}>12h</ToggleButton>
            <ToggleButton value="24h" sx={{ px: 3 }}>24h</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Section>

      <Divider/>

      <Section title="Prayer Calculation">
        <TextField select fullWidth size="small" label="Calculation Method"
          value={calcMethod} onChange={e => setCalcMethod(e.target.value)}
          SelectProps={{ native: true }}>
          {CALC_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </TextField>
      </Section>

      <Divider/>

      <Section title="Location">
        <Stack sx={{ gap: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Location Mode</Typography>
          <ToggleButtonGroup exclusive size="small" value={locMode}
            onChange={(_, v) => { if (v) setLocMode(v) }}>
            <ToggleButton value="gps"    sx={{ px: 3 }}>GPS</ToggleButton>
            <ToggleButton value="manual" sx={{ px: 3 }}>Manual</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {locMode === "gps" ? (
          <Stack sx={{ flexDirection: "row", gap: 1.5, alignItems: "center" }}>
            <TextField
              fullWidth size="small" label="Coordinates" value={gpsCoords}
              placeholder="Tap Detect to get location"
              slotProps={{ input: { readOnly: true } }}
            />
            <Button
              variant="outlined" size="small"
              startIcon={gpsLoading ? <CircularProgress size={14}/> : <MyLocationIcon/>}
              onClick={handleGps} disabled={gpsLoading}
              sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {gpsLoading ? "Getting…" : "Detect"}
            </Button>
          </Stack>
        ) : (
          <TextField fullWidth size="small" label="City Name"
            placeholder="e.g. Dhaka"
            value={city} onChange={e => setCity(e.target.value)}
            helperText="Enter the city whose prayer times you want to use"/>
        )}
      </Section>

      <SaveRow onSave={handleSave} loading={loading}/>
      {SnackBar}
    </Stack>
  )
}

function Security() {
  const { user } = useContext(Theme)
  const { show, titleCase, SnackBar } = useSnack()

  // ── password change ──────────────────────────────────────────────────────
  const [curPass,     setCurPass]     = useState("")
  const [newPass,     setNewPass]     = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [showCur,     setShowCur]     = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [passLoading, setPassLoading] = useState(false)

  const handleChangePassword = async () => {
    if (!newPass)               return show("Please enter a new password")
    if (newPass.length < 8)     return show("Password must be at least 8 characters")
    if (newPass !== confirmPass) return show("Passwords do not match")
    setPassLoading(true)
    try {
      const { error } = await Supabase.auth.updateUser({ password: newPass })
      if (error) throw error
      setCurPass(""); setNewPass(""); setConfirmPass("")
      show("Password updated successfully!")
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setPassLoading(false)
    }
  }

  // ── passkeys ─────────────────────────────────────────────────────────────
  // Requires: supabase-js >= 2.105.0 + experimental.passkey: true in client
  const [passkeys,    setPasskeys]    = useState([])
  const [pkLoading,   setPkLoading]   = useState(false)
  const [pkFetching,  setPkFetching]  = useState(true)

  useEffect(() => {
    const fetchPasskeys = async () => {
      try {
        const { data, error } = await Supabase.auth.passkey.list()
        if (error) throw error
        setPasskeys(data ?? [])
      } catch {
        // silently ignore — passkeys may not be enabled on this project yet
      } finally {
        setPkFetching(false)
      }
    }
    fetchPasskeys()
  }, [])

  const handleRegisterPasskey = async () => {
    setPkLoading(true)
    try {
      const { data, error } = await Supabase.auth.registerPasskey()
      if (error) throw error
      setPasskeys(prev => [...prev, data])
      show("Passkey registered!")
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setPkLoading(false)
    }
  }

  const handleRemovePasskey = async (passkeyId) => {
    try {
      const { error } = await Supabase.auth.passkey.delete({ passkeyId })
      if (error) throw error
      setPasskeys(prev => prev.filter(p => p.id !== passkeyId))
      show("Passkey removed")
    } catch (e) {
      show(titleCase(e.message))
    }
  }

  // ── sessions ─────────────────────────────────────────────────────────────
  const [sessions,     setSessions]     = useState([])
  const [sessLoading,  setSessLoading]  = useState(false)
  const [sessFetching, setSessFetching] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // current session only — Supabase doesn't expose full session list client-side
        const { data: { session } } = await Supabase.auth.getSession()
        if (session) setSessions([session])
      } catch {
        // ignore
      } finally {
        setSessFetching(false)
      }
    }
    fetchSessions()
  }, [])

  const handleSignOutAll = async () => {
    setSessLoading(true)
    try {
      const { error } = await Supabase.auth.signOut({ scope: "global" })
      if (error) throw error
      show("Signed out from all devices")
    } catch (e) {
      show(titleCase(e.message))
    } finally {
      setSessLoading(false)
    }
  }

  const handleSignOutCurrent = async () => {
    setSessLoading(true)
    try {
      const { error } = await Supabase.auth.signOut({ scope: "local" })
      if (error) throw error
    } catch (e) {
      show(titleCase(e.message))
      setSessLoading(false)
    }
  }

  // ── delete account ────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [delLoading,    setDelLoading]    = useState(false)

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return show('Type DELETE (uppercase) to confirm')
    setDelLoading(true)
    try {
      // Calls your server-side route which uses the secret key to delete
      const { data: { session } } = await Supabase.auth.getSession()
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error((await res.json()).message ?? "Delete failed")
      await Supabase.auth.signOut()
    } catch (e) {
      show(titleCase(e.message))
      setDelLoading(false)
    }
  }

  return (
    <Stack sx={{ gap: 4, p: 3, maxWidth: 520 }}>

      {/* ── Change Password ── */}
      <Section title="Change Password">
        <TextField fullWidth size="small" label="Current Password"
          type={showCur ? "text" : "password"}
          value={curPass} onChange={e => setCurPass(e.target.value)}
          slotProps={{ input: { endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShowCur(v => !v)}>
                {showCur ? <VisibilityOffIcon fontSize="small"/> : <VisibilityIcon fontSize="small"/>}
              </IconButton>
            </InputAdornment>
          )}}}
        />
        <TextField fullWidth size="small" label="New Password"
          type={showNew ? "text" : "password"}
          value={newPass} onChange={e => setNewPass(e.target.value)}
          helperText="Minimum 8 characters"
          slotProps={{ input: { endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShowNew(v => !v)}>
                {showNew ? <VisibilityOffIcon fontSize="small"/> : <VisibilityIcon fontSize="small"/>}
              </IconButton>
            </InputAdornment>
          )}}}
        />
        <TextField fullWidth size="small" label="Confirm New Password"
          type="password"
          value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
        />
        <Stack sx={{ alignItems: "flex-end" }}>
          <Button variant="contained" disableElevation
            startIcon={passLoading ? <CircularProgress size={14} color="inherit"/> : <KeyIcon/>}
            onClick={handleChangePassword} disabled={passLoading}
            sx={{ minWidth: 160 }}
          >
            {passLoading ? "Updating…" : "Update Password"}
          </Button>
        </Stack>
      </Section>

      <Divider/>

      {/* ── Passkeys ── */}
      <Section title="Passkeys (Beta)">
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Sign in with Face ID, Touch ID, or a hardware key — no password needed.
        </Typography>

        {pkFetching ? (
          <CircularProgress size={20}/>
        ) : passkeys.length > 0 ? (
          <Stack sx={{ gap: 1 }}>
            {passkeys.map((pk, i) => (
              <Stack key={pk.id} sx={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                border: "1px solid", borderColor: "divider", borderRadius: 2.5, px: 2, py: 1.2
              }}>
                <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1.5 }}>
                  <KeyIcon sx={{ fontSize: 18, color: "text.secondary" }}/>
                  <Stack>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Passkey {i + 1}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Added {new Date(pk.created_at).toLocaleDateString()}
                    </Typography>
                  </Stack>
                </Stack>
                <Tooltip title="Remove passkey">
                  <IconButton size="small" color="error" onClick={() => handleRemovePasskey(pk.id)}>
                    <DeleteIcon fontSize="small"/>
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>No passkeys registered yet</Typography>
        )}

        <Stack sx={{ alignItems: "flex-start" }}>
          <Button variant="outlined" size="small"
            startIcon={pkLoading ? <CircularProgress size={14}/> : <KeyIcon/>}
            onClick={handleRegisterPasskey} disabled={pkLoading}
          >
            {pkLoading ? "Registering…" : "Add Passkey"}
          </Button>
        </Stack>
      </Section>

      <Divider/>

      {/* ── Active Sessions ── */}
      <Section title="Active Sessions">
        {sessFetching ? (
          <CircularProgress size={20}/>
        ) : (
          <Stack sx={{
            border: "1px solid", borderColor: "divider", borderRadius: 2.5, px: 2, py: 1.5, gap: 0.5
          }}>
            <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1.5 }}>
              <DevicesIcon sx={{ fontSize: 18, color: "primary.main" }}/>
              <Stack>
                <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Current session</Typography>
                  <Chip label="Active" size="small" color="success" variant="outlined"
                    sx={{ height: 16, fontSize: "0.58rem" }}/>
                </Stack>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {user?.email}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        )}

        <Stack sx={{ flexDirection: "row", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" size="small" color="warning"
            startIcon={sessLoading ? <CircularProgress size={14}/> : <DevicesIcon/>}
            onClick={handleSignOutAll} disabled={sessLoading}
          >
            Sign out all devices
          </Button>
          <Button variant="outlined" size="small"
            onClick={handleSignOutCurrent} disabled={sessLoading}
          >
            Sign out here
          </Button>
        </Stack>
      </Section>

      <Divider/>

      {/* ── Delete Account ── */}
      <Section title="Danger Zone">
        <Stack sx={{
          border: "1px solid", borderColor: "error.main",
          borderRadius: 3, p: 2.5, gap: 2,
          backgroundColor: "error.main", backgroundImage: "none",
          bgcolor: (t) => t.palette.mode === "dark" ? "rgba(211,47,47,0.08)" : "rgba(211,47,47,0.04)"
        }}>
          <Stack sx={{ gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>
              Delete Account
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Permanently deletes your account and all data. This cannot be undone.
            </Typography>
          </Stack>
          <TextField fullWidth size="small" placeholder='Type DELETE to confirm'
            value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderColor: "error.main" } }}
          />
          <Stack sx={{ alignItems: "flex-start" }}>
            <Button variant="contained" color="error" disableElevation size="small"
              startIcon={delLoading ? <CircularProgress size={14} color="inherit"/> : <DeleteIcon/>}
              onClick={handleDeleteAccount}
              disabled={delLoading || deleteConfirm !== "DELETE"}
            >
              {delLoading ? "Deleting…" : "Delete My Account"}
            </Button>
          </Stack>
        </Stack>
      </Section>

      {SnackBar}
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
            <Stack key={tab.path} alignItems="center" justifyContent="center" onClick={() => navigate(tab.path)} sx={{
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
                backgroundColor: "primary.main",
                display: { xs: "none", sm: active ? "block" : "none" },
                position: "absolute",
                borderRadius: 4,
                content: '""',
                bottom: "20%",
                top: "20%",
                left: -6,
                width: 3
              }
            }}>
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