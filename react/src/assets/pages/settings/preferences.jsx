import {
  useContext,
  useEffect,
  useRef,
  useState
} from "react"
import {
  ToggleButtonGroup,
  CircularProgress,
  Autocomplete,
  ToggleButton,
  FormControl,
  InputLabel,
  Typography,
  TextField,
  MenuItem,
  Select,
  Button,
  Stack
} from "@mui/material"
import { Theme } from "@/main"
import { Geolocation } from "@capacitor/geolocation"
import { Capacitor } from "@capacitor/core"
import Supabase from "@/supabase"
import {
  getLocalSettings,
  saveLocalSettings
} from "@/localSettings"
import api from "@/api"

import MyLocationIcon from "@mui/icons-material/MyLocation"
import SaveIcon from "@mui/icons-material/Save"

export default function Preferences({setSnack}) {
  const { user } = useContext(Theme)
  const [drawerPos, setDrawerPos] =         useState(() => localStorage.getItem("drawerPos") || "l")
  const [locationType, setLocationType] =   useState("gps")
  const [timeFormat, setTimeFormat] =       useState("12h")
  const [calcMethod, setCalcMethod] =       useState("Karachi")
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
          setSnack("Permission denied — enable location for Waqt in your device settings")
          return
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 })
        lat = pos.coords.latitude
        lon = pos.coords.longitude
      } else {
        if (!navigator.geolocation) return setSnack("This Device Doesn't Support GPS")
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
      setSnack(err?.message ?? "Failed To Get Location")
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
    if (locationType === "gps"    && !coords) return setSnack("Set your location")
    if (locationType === "manual" && !city  ) return setSnack("Select a city")
    const payload = {
      ...(locationType === "gps" ? {city: null} : {city}),
      timeFormat, locationType, tz,
      coords, calcMethod, madhab
    }
    if (!user) {
      // Guest mode — no account yet, keep settings on-device. These get merged
      // into the account automatically if/when this person signs up.
      saveLocalSettings(payload)
      setSnack("Saved")
      return
    }
    if (!navigator.onLine) return setSnack("No internet connection")
    setSaving(true)
    try {
      const { error } = await Supabase.auth.updateUser({ data: payload })
      if (error) throw error
      saveLocalSettings(payload)
      api.post("/prayer/resync").catch(() => {}) // recompute waqts now instead of waiting for the hourly sync
      setSnack("Saved")
    } catch (err) {
      setSnack(!navigator.onLine ? "No internet connection" : "Failed to save")
    } finally {setSaving(false)}
  }
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const data = user ? (getLocalSettings() ?? user.user_metadata) : getLocalSettings()
    if (!data) return
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
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
        <Typography sx={{ minWidth: "50%" }}>App Drawer Position :</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" sx={{ flex: 1 }} value={drawerPos} onChange={(_, v) => {
          if (!v) return
          setDrawerPos(v)
          localStorage.setItem("drawerPos", v)
          setSnack(`Drawer Position Set To ${v === "r" ? "Right" : "Left"}`)
          window.dispatchEvent(new CustomEvent("drawerpos-change", { detail: v }))
        }}>
          <ToggleButton value="l">Left</ToggleButton>
          <ToggleButton value="r">Right</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  </Stack>)
}
