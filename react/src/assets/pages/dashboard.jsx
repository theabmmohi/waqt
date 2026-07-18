import {
  useContext,
  useEffect,
  useState
} from "react"
import {
  Typography,
  Snackbar,
  Slide,
  Stack
} from "@mui/material"
import {
  CalculationMethod,
  PrayerTimes,
  Coordinates,
  SunnahTimes,
  Madhab
} from "adhan"
import { useTheme, alpha } from "@mui/material/styles"
import { Theme } from "@/main"

import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import WbTwilightIcon from "@mui/icons-material/WbTwilight"
import WbSunnyIcon from "@mui/icons-material/WbSunny"

export default function Dashboard() {
  const { user }   = useContext(Theme)
  const theme      = useTheme()
  const meta       = user?.user_metadata
  const fmt        = meta?.timeFormat ?? "12h"
  const tz         = meta?.tz || Intl.DateTimeFormat().resolvedOptions().timeZone
  const [snack, setSnack] = useState(() => !meta?.coords ? "Set Your Location In Settings To Get Prayer Times" : "")
  const [now, setNow]     = useState(new Date())
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
  const prayerTimes = coords ? new PrayerTimes(coords, now, params) : null
  const sunnahTimes = coords && prayerTimes ? new SunnahTimes(prayerTimes) : null
  const timeStr = (d) => {
    if (!d) return "--:--"
    const s = d.toLocaleTimeString([], fmt === "24h"
      ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }
      : { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })
    return fmt === "24h" ? s : s.replace(/^(\d):/, "0$1:").replace(/:(\d)(?=\s)/, ":0$1").replace(/:(\d)(\D)/, ":0$1$2")
  }
  const tzDate       = new Date(now.toLocaleString("en-US", { timeZone: tz }))
  const tomorrowFajr = prayerTimes ? new PrayerTimes(coords, new Date(tzDate.getTime() + 86400000), params).fajr : null
  const namedPrayers = prayerTimes ? [
    { name: "Fajr",    time: prayerTimes.fajr,    end: prayerTimes.sunrise },
    { name: "Dhuhr",   time: prayerTimes.dhuhr,   end: prayerTimes.asr },
    { name: "Asr",     time: prayerTimes.asr,     end: prayerTimes.maghrib },
    { name: "Maghrib", time: prayerTimes.maghrib, end: prayerTimes.isha },
    { name: "Isha",    time: prayerTimes.isha,    end: tomorrowFajr }
  ] : []
  const forbiddenWindows = prayerTimes ? [
    { name: "Sunrise",  start: prayerTimes.sunrise, end: new Date(prayerTimes.sunrise.getTime() + 15 * 60000) },
    { name: "Zawal",    start: new Date(prayerTimes.dhuhr.getTime() - 10 * 60000), end: prayerTimes.dhuhr },
    { name: "Sunset",   start: new Date(prayerTimes.maghrib.getTime() - 15 * 60000), end: prayerTimes.maghrib }
  ] : []
  const activeForbidden = forbiddenWindows.find(w => now >= w.start && now < w.end) ?? null
  const mergedRows = prayerTimes ? [
    ...namedPrayers.map(p => ({ kind: "prayer", name: p.name, time: p.time, end: p.end })),
    ...forbiddenWindows.map(w => ({ kind: "forbidden", name: w.name, time: w.start, end: w.end }))
  ].sort((a, b) => a.time.getTime() - b.time.getTime()) : []
  let currentIndex = -1
  if (prayerTimes) {
    for (let i = namedPrayers.length - 1; i >= 0; i--) {
      if (now >= namedPrayers[i].time) { currentIndex = i; break }
    }
  }
  const fajrEnded = currentIndex === 0 && now >= prayerTimes?.sunrise
  const current = currentIndex >= 0 && !fajrEnded ? namedPrayers[currentIndex] : null
  const currentEnd = current ? current.end : null
  let next = null
  if (prayerTimes) {
    next = fajrEnded
      ? namedPrayers[1]
      : (currentIndex < namedPrayers.length - 1
        ? namedPrayers[currentIndex + 1]
        : { name: "Fajr", time: tomorrowFajr })
  }
  const countdown = next ? Math.max(0, next.time.getTime() - now.getTime()) : 0
  const ch = Math.floor(countdown / 3600000)
  const cm = Math.floor((countdown % 3600000) / 60000)
  const cs = Math.floor((countdown % 60000) / 1000)
  const countdownStr = `${String(ch).padStart(2,"0")}:${String(cm).padStart(2,"0")}:${String(cs).padStart(2,"0")}`
  const [hijri, setHijri] = useState("Loading…")
  const todayKey = `${tzDate.getFullYear()}-${tzDate.getMonth()}-${tzDate.getDate()}`
  useEffect(() => {
    const [yyyy, month, day] = todayKey.split("-")
    const dd = String(Number(day)).padStart(2, "0")
    const mm = String(Number(month) + 1).padStart(2, "0")
    fetch(`https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`)
      .then(res => res.json())
      .then(data => {
        const h = data?.data?.hijri
        if (h) setHijri(`${h.day} ${h.month.en.normalize("NFD").replace(/[\u0300-\u036f]/g, "")} ${h.year} AH`)
        else setHijri("")
      })
      .catch(() => setHijri(""))
  }, [todayKey])
  const gregorian = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: tz }).format(now)
  const imsak = prayerTimes ? new Date(prayerTimes.fajr.getTime() - 10 * 60000) : null
  const [holidays, setHolidays] = useState([])
  useEffect(() => {
    if (!hijri) return
    const yearMatch = hijri.match(/(\d{4}) AH/)
    if (!yearMatch) return
    fetch(`https://api.aladhan.com/v1/islamicHolidaysByHijriYear/${yearMatch[1]}`)
      .then(res => res.json())
      .then(data => setHolidays(Array.isArray(data?.data) ? data.data.slice(0, 3) : []))
      .catch(() => setHolidays([]))
  }, [hijri])
  return(<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, overflow: "hidden", maxWidth: 600, p: 2.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{gregorian}</Typography>
      <Typography sx={{ color: "text.secondary" }}>{hijri}</Typography>
    </Stack>
    <Stack sx={{ flexDirection: "row", alignItems: "center", border: "1px solid", borderColor: "primary.main", backgroundColor: alpha(theme.palette.primary.main, 0.05), alignSelf: "center", width: "100%", borderRadius: 1, overflow: "hidden", maxWidth: 600, gap: 2.5, p: 2.5, justifyContent: "space-between" }}>
      <Stack>
        <Typography sx={{ color: "text.secondary" }}>Now</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{current ? current.name : (fajrEnded ? "Duha (Voluntary)" : "—")}</Typography>
        <Typography sx={{ color: "text.secondary" }}>{current ? `${timeStr(current.time)} - ${timeStr(currentEnd)}` : (fajrEnded ? `${timeStr(prayerTimes?.sunrise)} - ${timeStr(prayerTimes?.dhuhr)}` : "Set location")}</Typography>
      </Stack>
      <Stack sx={{ alignItems: "flex-end" }}>
        <Typography sx={{ color: "text.secondary" }}>Next</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{next ? next.name : "—"}</Typography>
        <Typography sx={{ color: "text.secondary", fontFamily: "monospace" }}>{next ? countdownStr : "--:--:--"}</Typography>
      </Stack>
    </Stack>
    <Stack sx={{ flexDirection: "row", alignSelf: "center", width: "100%", maxWidth: 600, gap: 2.5 }}>
      <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", p: 2.5 }}>
        <WbTwilightIcon sx={{ color: "text.secondary" }}/>
        <Typography sx={{ color: "text.secondary" }}>Sunrise</Typography>
        <Typography sx={{ fontWeight: 600 }}>{timeStr(prayerTimes?.sunrise)}</Typography>
      </Stack>
      <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", p: 2.5 }}>
        <WbSunnyIcon sx={{ color: "text.secondary" }}/>
        <Typography sx={{ color: "text.secondary" }}>Sunset</Typography>
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
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, overflow: "hidden", maxWidth: 600, gap: 1.5, p: 2.5 }}>
      <Typography sx={{ fontWeight: 700 }}>Extra Prayer Info</Typography>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Typography sx={{ color: "text.secondary" }}>Imsak</Typography>
        <Typography sx={{ fontFamily: "monospace" }}>{timeStr(imsak)}</Typography>
      </Stack>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Typography sx={{ color: "text.secondary" }}>Midnight (Islamic)</Typography>
        <Typography sx={{ fontFamily: "monospace" }}>{timeStr(sunnahTimes?.middleOfTheNight)}</Typography>
      </Stack>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Typography sx={{ color: "text.secondary" }}>Last Third of Night</Typography>
        <Typography sx={{ fontFamily: "monospace" }}>{timeStr(sunnahTimes?.lastThirdOfTheNight)}</Typography>
      </Stack>
      {holidays.length > 0 && (<>
        <Typography sx={{ fontWeight: 700, mt: 1 }}>Upcoming Islamic Holidays</Typography>
        {holidays.map((h, i) => (
          <Stack key={i} sx={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Typography sx={{ color: "text.secondary" }}>{h.name}</Typography>
            <Typography sx={{ color: "text.secondary" }}>{h.date}</Typography>
          </Stack>
        ))}
      </>)}
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}