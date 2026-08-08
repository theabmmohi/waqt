import {
  useContext,
  useEffect,
  useRef,
  useState
} from "react"
import { useNavigate } from "react-router-dom"
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
  Snackbar,
  Divider,
  Select,
  Button,
  Slide,
  Stack,
  Step,
  Stepper,
  StepLabel,
  Box
} from "@mui/material"
import { Geolocation } from "@capacitor/geolocation"
import { Capacitor } from "@capacitor/core"
import { Theme } from "@/main"
import Supabase from "@/supabase"
import api from "@/api"
import {
  getLocalSettings,
  saveLocalSettings
} from "@/localSettings"

import MyLocationIcon from "@mui/icons-material/MyLocation"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import CheckIcon from "@mui/icons-material/Check"

const STEPS = ["Time Format", "Location", "Calculation"]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useContext(Theme)
  const existing = user?.user_metadata ?? getLocalSettings() ?? {}
  const [step, setStep] = useState(0)
  const [timeFormat, setTimeFormat] = useState(existing.timeFormat ?? "12h")
  const [locationType, setLocationType] = useState(existing.locationType ?? "gps")
  const [coords, setCoords] = useState(existing.coords ?? null)
  const [city, setCity] = useState(existing.city ?? null)
  const [cityInput, setCityInput] = useState(existing.city ? [existing.city.name, existing.city.admin1, existing.city.country].filter(Boolean).join(", ") : "")
  const [cityOpts, setCityOpts] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [tz, setTz] = useState(existing.tz ?? "")
  const [calcMethod, setCalcMethod] = useState(existing.calcMethod ?? "MuslimWorldLeague")
  const [madhab, setMadhab] = useState(existing.madhab ?? "shafi")
  const [coordsLoading, setCoordsLoading] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [snack, setSnack] = useState("")
  const timerRef = useRef()
  useEffect(() => () => clearTimeout(timerRef.current), [])
  const getCoords = async () => {
    setCoordsLoading(true)
    try {
      let lat, lon
      if (Capacitor.isNativePlatform()) {
        let { location } = await Geolocation.checkPermissions()
        if (location === "prompt" || location === "prompt-with-rationale") ({ location } = await Geolocation.requestPermissions())
        if (location !== "granted") { setSnack("Permission denied — enable location for Waqt in your device settings"); return }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 })
        lat = pos.coords.latitude; lon = pos.coords.longitude
      } else {
        if (!navigator.geolocation) return setSnack("This device doesn't support GPS")
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }))
        lat = pos.coords.latitude; lon = pos.coords.longitude
      }
      setCoords({ lat, lon })
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto`)
        const { timezone } = await res.json()
        setTz(timezone)
      } catch { setTz("") }
    } catch (err) {
      setSnack(err?.message ?? "Failed to get location")
    } finally { setCoordsLoading(false) }
  }
  const citySearch = (query) => {
    clearTimeout(timerRef.current)
    if (!query || query.length < 2) return setCityOpts([])
    timerRef.current = setTimeout(async () => {
      setCityLoading(true)
      try {
        const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`)
        const data = await resp.json()
        setCityOpts(data.results ?? [])
      } catch { setCityOpts([]) } finally { setCityLoading(false) }
    }, 250)
  }
  const canAdvance = step !== 1 || (locationType === "gps" ? !!coords : !!city)
  const finish = async () => {
    const payload = {
      ...(locationType === "gps" ? { city: null } : { city }),
      timeFormat, locationType, tz, coords, calcMethod, madhab
    }
    localStorage.removeItem("waqt-needs-onboarding")
    if (!user) {
      saveLocalSettings(payload)
      navigate("/", { replace: true })
      return
    }
    setFinishing(true)
    try {
      const { error } = await Supabase.auth.updateUser({ data: payload })
      if (error) throw error
      api.post("/prayer/resync").catch(() => {})
    } catch {
      // Offline or failed — local guest cache already has it as a fallback,
      // and the account can always finish setup later from Settings.
    } finally {
      setFinishing(false)
      navigate("/", { replace: true })
    }
  }
  return (
    <Box sx={{ maxWidth: 600, mx: "auto", p: 5 }}>
      <Typography variant="h5" sx={{ textAlign: "center", mb: 0.5 }}>Let's Set Up Waqt</Typography>
      <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary", mb: 3 }}>
        A few quick preferences so your prayer times are accurate. You can always change any of this later from Settings → Preferences — this is just a one-time walkthrough.
      </Typography>
      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      {step === 0 && (
        <Stack sx={{ gap: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>How should times be displayed?</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>This controls the clock format used everywhere in the app — on the dashboard, in reminders, and in notifications. Pick whichever you read more naturally.</Typography>
          <ToggleButtonGroup exclusive fullWidth value={timeFormat} onChange={(_, v) => { if (v) setTimeFormat(v) }} sx={{ mt: 1 }}>
            <ToggleButton value="12h">12-Hour (e.g. 5:30 PM)</ToggleButton>
            <ToggleButton value="24h">24-Hour (e.g. 17:30)</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      )}
      {step === 1 && (
        <Stack sx={{ gap: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>Where are you praying from?</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>Your location is what makes prayer times, sunrise/sunset, and Qibla direction accurate. Use GPS for automatic detection, or pick a city manually if you'd rather not share your device's location.</Typography>
          <ToggleButtonGroup exclusive fullWidth value={locationType} onChange={(_, v) => { if (v) setLocationType(v) }} sx={{ mt: 1 }}>
            <ToggleButton value="gps">Use GPS</ToggleButton>
            <ToggleButton value="manual">Pick a City</ToggleButton>
          </ToggleButtonGroup>
          {locationType === "gps" ? (
            <Stack sx={{ flexDirection: "row", gap: 2, alignItems: "center", mt: 1 }}>
              <TextField fullWidth size="small" label="Coordinates" disabled value={coords ? `${coords.lat}, ${coords.lon}` : "Not set yet"} slotProps={{ input: { readOnly: true } }}/>
              <Button disableElevation onClick={getCoords} disabled={coordsLoading} variant={coordsLoading ? "outlined" : "contained"} sx={{ px: 2.5, flexShrink: 0 }} startIcon={coordsLoading ? <CircularProgress size={14}/> : <MyLocationIcon/>}>
                {coordsLoading ? "Locating..." : "Detect"}
              </Button>
            </Stack>
          ) : (
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
              renderInput={(params) => <TextField {...params} size="small" label="Search for your city" sx={{ mt: 1 }}/>}
              onChange={(_, v) => {
                setCity(v)
                setTz(v?.timezone ?? "")
                if (v) setCoords({ lat: v.latitude, lon: v.longitude })
                else setCoords(null)
              }}
            />
          )}
        </Stack>
      )}
      {step === 2 && (
        <Stack sx={{ gap: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>Calculation method</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>Different regions and schools of thought calculate Fajr and Isha slightly differently. If you're not sure, your local mosque usually follows one of these — Muslim World League is a safe, widely-used default.</Typography>
          <FormControl>
            <InputLabel id="ob-calcMethod">Calculation Method</InputLabel>
            <Select labelId="ob-calcMethod" label="Calculation Method" value={calcMethod} onChange={(e) => setCalcMethod(e.target.value)}>
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
          <Typography sx={{ fontWeight: 600, mt: 1 }}>Madhab</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>This only changes the Asr calculation — Hanafi uses a longer shadow length than the other three schools, so Asr falls a bit later.</Typography>
          <FormControl>
            <InputLabel id="ob-madhab">Madhab</InputLabel>
            <Select labelId="ob-madhab" label="Madhab" value={madhab} onChange={(e) => setMadhab(e.target.value)}>
              <MenuItem value="hanafi">Hanafi</MenuItem>
              <MenuItem value="shafi">Shafi'i</MenuItem>
              <MenuItem value="maliki">Maliki</MenuItem>
              <MenuItem value="hanbali">Hanbali</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      )}
      <Divider sx={{ my: 3 }}/>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Button disabled={step === 0} startIcon={<ArrowBackIcon/>} onClick={() => setStep(s => s - 1)}>Back</Button>
        {step < STEPS.length - 1 ? (
          <Button disableElevation variant="contained" endIcon={<ArrowForwardIcon/>} disabled={!canAdvance} onClick={() => setStep(s => s + 1)}>Next</Button>
        ) : (
          <Button disableElevation variant="contained" endIcon={finishing ? <CircularProgress size={14}/> : <CheckIcon/>} disabled={finishing} onClick={finish}>
            {finishing ? "Saving..." : "Finish"}
          </Button>
        )}
      </Stack>
      <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
    </Box>
  )
}
