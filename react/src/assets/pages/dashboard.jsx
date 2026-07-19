import {
  useContext,
  useEffect,
  useState
} from "react"
import { useNavigate } from "react-router-dom"
import {
  Typography,
  Snackbar,
  Slide,
  Button,
  Stack,
  Box,
  LinearProgress
} from "@mui/material"
import {
  CalculationMethod,
  PrayerTimes,
  Coordinates,
  Madhab
} from "adhan"
import { useTheme, alpha } from "@mui/material/styles"
import { Theme } from "@/main"

import HourglassBottomIcon from "@mui/icons-material/HourglassBottom"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import LinearScaleIcon from "@mui/icons-material/LinearScale"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import NightsStayIcon from "@mui/icons-material/NightsStay"
import RestaurantIcon from "@mui/icons-material/Restaurant"
import WbTwilightIcon from "@mui/icons-material/WbTwilight"
import WbSunnyIcon from "@mui/icons-material/WbSunny"

const SIZE   = 200
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function Dashboard() {
  const navigate   = useNavigate()
  const { user }   = useContext(Theme)
  const theme      = useTheme()
  const meta       = user?.user_metadata
  const fmt        = meta?.timeFormat ?? "12h"
  const tz         = meta?.tz || Intl.DateTimeFormat().resolvedOptions().timeZone
  const [snack, setSnack]         = useState(() => !meta?.coords ? "Set Your Location In Settings To Get Prayer Times" : "")
  const [now, setNow]             = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const coords = meta?.coords ? new Coordinates(meta.coords.lat, meta.coords.lon) : null
  const madhab = meta?.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi
  const methodMap = {
    MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
    NorthAmerica: CalculationMethod.NorthAmerica,
    Egyptian: CalculationMethod.Egyptian,
    UmmAlQura: CalculationMethod.UmmAlQura,
    Karachi: CalculationMethod.Karachi,
    Tehran: CalculationMethod.Tehran,
    MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
    Singapore: CalculationMethod.Singapore
  }
  const params = (methodMap[meta?.calcMethod] ?? CalculationMethod.MuslimWorldLeague)()
  params.madhab = madhab
  const civilDate = (d, timeZone) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d)
    const y = Number(parts.find(p => p.type === "year").value)
    const m = Number(parts.find(p => p.type === "month").value)
    const dd = Number(parts.find(p => p.type === "day").value)
    return new Date(y, m - 1, dd, 12, 0, 0)
  }
  const calcDate    = civilDate(now, tz)
  const todayKey    = `${calcDate.getFullYear()}-${calcDate.getMonth()}-${calcDate.getDate()}`
  const prayerTimes = coords ? new PrayerTimes(coords, calcDate, params) : null
  const timeStr = (d) => {
    if (!d) return "--:--"
    const s = d.toLocaleTimeString([], fmt === "24h"
      ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }
      : { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })
    return fmt === "24h" ? s : s.replace(/^(\d):/, "0$1:").replace(/:(\d)(?=\s)/, ":0$1").replace(/:(\d)(\D)/, ":0$1$2")
  }
  const MIN = 60000
  const startAdj = (d, exact = false) => d ? new Date(d.getTime() + (exact ? 0 : MIN)) : null
  const endAdj   = (d) => d ? new Date(d.getTime() - MIN) : null
  const [fastAnswer, setFastAnswer] = useState(() => {
    try { return localStorage.getItem(`fastAnswer:${todayKey}`) } catch { return null }
  })
  const confirmFasting = () => {
    try { localStorage.setItem(`fastAnswer:${todayKey}`, "yes") } catch {}
    setFastAnswer("yes")
  }
  const tomorrowFajrRaw = prayerTimes ? new PrayerTimes(coords, new Date(calcDate.getTime() + 86400000), params).fajr : null
  const tomorrowFajr    = startAdj(tomorrowFajrRaw)
  const namedPrayers = prayerTimes ? [
    { name: "Fajr",    time: startAdj(prayerTimes.fajr),               end: endAdj(prayerTimes.sunrise) },
    { name: "Dhuhr",   time: startAdj(prayerTimes.dhuhr),              end: endAdj(prayerTimes.asr) },
    { name: "Asr",     time: startAdj(prayerTimes.asr),                end: endAdj(prayerTimes.maghrib) },
    { name: "Maghrib", time: startAdj(prayerTimes.maghrib, true),      end: endAdj(prayerTimes.isha) },
    { name: "Isha",    time: startAdj(prayerTimes.isha),               end: endAdj(tomorrowFajrRaw) }
  ] : []
  const forbiddenWindows = prayerTimes ? [
    { name: "Sunrise",  start: startAdj(prayerTimes.sunrise), end: endAdj(new Date(prayerTimes.sunrise.getTime() + 15 * 60000)) },
    { name: "Zawal",    start: startAdj(new Date(prayerTimes.dhuhr.getTime() - 10 * 60000)), end: endAdj(prayerTimes.dhuhr) },
    { name: "Sunset",   start: startAdj(new Date(prayerTimes.maghrib.getTime() - 15 * 60000)), end: endAdj(prayerTimes.maghrib) }
  ] : []
  const activeForbidden = forbiddenWindows.find(w => now >= w.start && now < w.end) ?? null
  const mergedRows = prayerTimes ? [
    ...namedPrayers.map(p => ({ kind: "prayer", name: p.name, time: p.time, end: p.end })),
    ...forbiddenWindows.map(w => ({ kind: "forbidden", name: w.name, time: w.start, end: w.end }))
  ].sort((a, b) => a.time.getTime() - b.time.getTime()) : []
  let currentIndex = -1
  if (prayerTimes) {
    currentIndex = namedPrayers.findIndex(p => now >= p.time && now < p.end)
  }
  const current = currentIndex >= 0 ? namedPrayers[currentIndex] : null
  const upcomingIndex = prayerTimes ? namedPrayers.findIndex(p => p.time > now) : -1
  const next = prayerTimes
    ? (upcomingIndex >= 0 ? namedPrayers[upcomingIndex] : { name: "Fajr", time: tomorrowFajr })
    : null
  const countdown = next ? Math.max(0, next.time.getTime() - now.getTime()) : 0
  const ch = Math.floor(countdown / 3600000)
  const cm = Math.floor((countdown % 3600000) / 60000)
  const cs = Math.floor((countdown % 60000) / 1000)
  const countdownStr = `${String(ch).padStart(2,"0")}:${String(cm).padStart(2,"0")}:${String(cs).padStart(2,"0")}`
  const [hijri, setHijri] = useState("Loading…")
  const [hijriMonth, setHijriMonth] = useState(null)
  useEffect(() => {
    const [yyyy, month, day] = todayKey.split("-")
    const dd = String(Number(day)).padStart(2, "0")
    const mm = String(Number(month) + 1).padStart(2, "0")
    fetch(`https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`)
      .then(res => res.json())
      .then(data => {
        const h = data?.data?.hijri
        if (h) {
          setHijri(`${h.day} ${h.month.en.normalize("NFD").replace(/[\u0300-\u036f]/g, "")} ${h.year} AH`)
          setHijriMonth(Number(h.month.number))
        } else {
          setHijri("")
        }
      })
      .catch(() => setHijri(""))
  }, [todayKey])
  const gregorian = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: tz }).format(now)
  const activeWindow = current
    ? { start: current.time, end: current.end }
    : activeForbidden
      ? { start: activeForbidden.start, end: activeForbidden.end }
      : null
  const progress = activeWindow
    ? Math.min(1, Math.max(0, (now.getTime() - activeWindow.start.getTime()) / (activeWindow.end.getTime() - activeWindow.start.getTime())))
    : 1
  const offset = CIRCUMFERENCE * (1 - progress)
  const fastStart = endAdj(prayerTimes?.fajr)
  const fastEnd   = prayerTimes?.maghrib ?? null
  const isFasting = !!(fastStart && fastEnd && now >= fastStart && now < fastEnd)
  const fastNotStarted = !!(fastStart && now < fastStart)
  const fastProgress = fastStart && fastEnd
    ? Math.min(1, Math.max(0, (now.getTime() - fastStart.getTime()) / (fastEnd.getTime() - fastStart.getTime())))
    : 0
  const fastRemaining = fastEnd ? Math.max(0, fastEnd.getTime() - now.getTime()) : 0
  const fh = Math.floor(fastRemaining / 3600000)
  const fm = Math.floor((fastRemaining % 3600000) / 60000)
  const fs = Math.floor((fastRemaining % 60000) / 1000)
  const fastRemainingStr = `${String(fh).padStart(2,"0")}:${String(fm).padStart(2,"0")}:${String(fs).padStart(2,"0")}`
  const fastPct = Math.round(fastProgress * 100)
  const fastHeadline = !prayerTimes
    ? "Set your location to track your fast"
    : isFasting
      ? `Fasting | ${fastPct}% done`
      : fastNotStarted
        ? "Fast begins once Sehri ends"
        : "Fast complete for today"
  const fastMessage = () => {
    if (!prayerTimes) return "Add your location in settings to see fasting progress."
    if (fastNotStarted) return `Sehri ends at ${timeStr(fastStart)}. Your fast will begin then.`
    if (!isFasting) return "You've completed today's fast. Enjoy your Iftar!"
    if (fastProgress < 0.1)  return "Just getting started — the day is ahead of you."
    if (fastProgress < 0.25) return "Early hours, stay strong and set your intentions."
    if (fastProgress < 0.4)  return "Good progress so far, keep going."
    if (fastProgress < 0.5)  return "Approaching the halfway mark."
    if (fastProgress < 0.6)  return "Past the halfway mark, the hardest part is behind you."
    if (fastProgress < 0.75) return "More than halfway there, keep your momentum."
    if (fastProgress < 0.85) return "The afternoon stretch — stay patient, you're close."
    if (fastProgress < 0.95) return "Almost there, Iftar is just around the corner."
    if (fastProgress < 0.99) return "So close now — Iftar is only moments away."
    return "Iftar time is here!"
  }
  const isRamadan = hijriMonth === 9
  const fastConfirmed = isRamadan || fastAnswer === "yes"
  return(<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, overflow: "hidden", maxWidth: 600, p: 2.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{gregorian}</Typography>
      <Typography sx={{ color: "text.secondary" }}>{hijri}</Typography>
    </Stack>
    <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 2.5, border: "1px solid", borderColor: "primary.main", backgroundColor: alpha(theme.palette.primary.main, 0.05), alignSelf: "center", width: "100%", borderRadius: 1, overflow: "hidden", maxWidth: 600, p: 2.5 }}>
      <Box sx={{ position: "relative", width: 132, height: 132, flexShrink: 0 }}>
        <Box component="svg" viewBox={`0 0 ${SIZE} ${SIZE}`} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <Box component="circle" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} sx={{ stroke: (t) => t.palette.divider }}/>
          <Box component="circle" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} sx={{ stroke: (t) => activeForbidden ? t.palette.error.main : current ? t.palette.primary.main : t.palette.text.disabled, transition: "stroke-dashoffset 0.3s linear, stroke 0.3s linear" }}/>
        </Box>
        <Stack sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 0.25 }}>
          {activeForbidden ? (
            <>
              <WarningAmberIcon sx={{ color: "error.main" }}/>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1, textAlign: "center", color: "error.main" }}>Forbidden</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{timeStr(activeForbidden.end)}</Typography>
            </>
          ) : current ? (
            <>
              <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1 }}>Now</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1, textAlign: "center" }}>{current.name}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{timeStr(current.end)}</Typography>
            </>
          ) : (
            <Button fullWidth variant="outlined" size="small" sx={{ borderRadius: "50%", aspectRatio: 1, minWidth: 0, px: 2 }} startIcon={<LinearScaleIcon sx={{ transform: "rotate(-45deg)" }}/>} onClick={() => navigate("/tasbih")}>Tasbih</Button>
          )}
        </Stack>
      </Box>
      <Stack sx={{ alignItems: "flex-end", gap: 0.25, flex: 1 }}>
        <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.2, textAlign: "right" }}>Time remaining</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: "monospace", lineHeight: 1.1, textAlign: "right" }}>{next ? countdownStr : "--:--:--"}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "right" }}>{next ? `until ${next.name} begins at ${timeStr(next.time)}` : "Set your location to see prayer times"}</Typography>
      </Stack>
    </Stack>
    {isFasting && (
      <Stack
        onClick={!fastConfirmed ? confirmFasting : undefined}
        sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, overflow: "hidden", maxWidth: 600, cursor: fastConfirmed ? "default" : "pointer" }}
      >
        <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1.5, p: 2.5 }}>
          <HourglassBottomIcon sx={{ color: "text.secondary" }}/>
          <Typography sx={{ fontWeight: 600, flex: 1 }}>{fastConfirmed ? fastHeadline : "Are you fasting today?"}</Typography>
          {!fastConfirmed && <ExpandMoreIcon sx={{ color: "text.secondary" }}/>}
        </Stack>
        {fastConfirmed && (
          <Stack sx={{ gap: 1, px: 2.5, pb: 2.5 }}>
            <LinearProgress variant="determinate" value={fastPct} sx={{ height: 8, borderRadius: 4 }}/>
            <Stack sx={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{fastPct}% complete</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>{fastRemainingStr} left</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{fastMessage()}</Typography>
          </Stack>
        )}
      </Stack>
    )}
    <Stack sx={{ flexDirection: "row", alignSelf: "center", width: "100%", maxWidth: 600, gap: 2.5 }}>
      <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", p: 2.5 }}>
        <WbTwilightIcon sx={{ color: "text.secondary" }}/>
        <Typography sx={{ color: "text.secondary" }}>Sunrise</Typography>
        <Typography sx={{ fontWeight: 600 }}>{timeStr(startAdj(prayerTimes?.sunrise))}</Typography>
      </Stack>
      <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", p: 2.5 }}>
        <WbSunnyIcon sx={{ color: "text.secondary" }}/>
        <Typography sx={{ color: "text.secondary" }}>Sunset</Typography>
        <Typography sx={{ fontWeight: 600 }}>{timeStr(prayerTimes?.maghrib)}</Typography>
      </Stack>
    </Stack>
    <Stack sx={{ flexDirection: "row", alignSelf: "center", width: "100%", maxWidth: 600, gap: 2.5 }}>
      <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", p: 2.5 }}>
        <NightsStayIcon sx={{ color: "text.secondary" }}/>
        <Typography sx={{ color: "text.secondary" }}>Sehri Ends</Typography>
        <Typography sx={{ fontWeight: 600 }}>{timeStr(endAdj(prayerTimes?.fajr))}</Typography>
      </Stack>
      <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", p: 2.5 }}>
        <RestaurantIcon sx={{ color: "text.secondary" }}/>
        <Typography sx={{ color: "text.secondary" }}>Iftar</Typography>
        <Typography sx={{ fontWeight: 600 }}>{timeStr(prayerTimes?.maghrib)}</Typography>
      </Stack>
    </Stack>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, overflow: "hidden", maxWidth: 600, p: 0 }}>
      {mergedRows.map((r, i) => {
        const isForbidden = r.kind === "forbidden"
        const isActiveForbidden = isForbidden && activeForbidden?.name === r.name
        const isCurrentPrayer = !isForbidden && current && r.name === current.name
        return (
          <Stack key={`${r.kind}-${r.name}`} sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", p: 2, gap: 1, borderBottom: i < mergedRows.length - 1 ? "1px solid" : "none", borderColor: "divider", backgroundColor: isActiveForbidden ? alpha(theme.palette.error.main, 0.08) : (isCurrentPrayer ? alpha(theme.palette.primary.main, 0.08) : "transparent") }}>
            <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
              {isForbidden && <WarningAmberIcon sx={{ fontSize: 16, color: "error.main" }}/>}
              <Typography sx={{ fontWeight: isCurrentPrayer || isActiveForbidden ? 700 : 400, color: isForbidden ? "error.main" : "text.primary" }}>{isForbidden ? "Forbidden" : r.name}</Typography>
            </Stack>
            <Typography sx={{ fontWeight: isCurrentPrayer || isActiveForbidden ? 700 : 400, color: isForbidden ? "error.main" : "text.primary", fontFamily: "monospace", whiteSpace: "nowrap" }}>{timeStr(r.time)} - {timeStr(r.end)}</Typography>
          </Stack>
        )
      })}
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}