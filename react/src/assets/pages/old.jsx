import {
  useContext,
  useEffect,
  useRef,
  useState
} from "react"
import {
  CircularProgress,
  Typography,
  Snackbar,
  Divider,
  Slide,
  Stack,
  Box
} from "@mui/material"
import { useTheme, alpha } from "@mui/material/styles"
import {
  PrayerTimes,
  Coordinates,
  CalculationMethod,
  Madhab,
  SunnahTimes,
  Qibla as AQ
} from "adhan"
import { Theme } from "@/react"

import NightlightRoundIcon from "@mui/icons-material/NightlightRound"
import WbTwilightIcon      from "@mui/icons-material/WbTwilight"
import WbSunnyIcon         from "@mui/icons-material/WbSunny"
import BedtimeIcon         from "@mui/icons-material/Bedtime"
import LensIcon            from "@mui/icons-material/Lens"

// ── helpers ──────────────────────────────────────────────────────────────────

const CALC_METHODS = {
  MuslimWorldLeague:     CalculationMethod.MuslimWorldLeague,
  NorthAmerica:          CalculationMethod.NorthAmerica,
  Egyptian:              CalculationMethod.Egyptian,
  UmmAlQura:             CalculationMethod.UmmAlQura,
  Karachi:               CalculationMethod.Karachi,
  Tehran:                CalculationMethod.Tehran,
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
  Singapore:             CalculationMethod.Singapore,
}

const MADHAB_MAP = {
  hanafi:  Madhab.Hanafi,
  shafi:   Madhab.Shafi,
  maliki:  Madhab.Shafi,
  hanbali: Madhab.Shafi,
}

function buildPrayerTimes(coords, calcMethod, madhab, date = new Date()) {
  const coordinates = new Coordinates(coords.lat, coords.lon)
  const params      = (CALC_METHODS[calcMethod] ?? CalculationMethod.Karachi)()
  params.madhab     = MADHAB_MAP[madhab] ?? Madhab.Hanafi
  return new PrayerTimes(coordinates, date, params)
}

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
]

function localeDate(date, tzOffset) {
  return tzOffset != null
    ? new Date(date.getTime() + (tzOffset - date.getTimezoneOffset()) * 60000)
    : date
}

function toGregorian(date, tzOffset) {
  const d = localeDate(date, tzOffset)
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    ...(tzOffset != null ? { timeZone: "UTC" } : {}),
  })
}

function toHijri(date, tzOffset) {
  try {
    const d = localeDate(date, tzOffset)
    const parts = d.toLocaleDateString("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric", year: "numeric",
      ...(tzOffset != null ? { timeZone: "UTC" } : {}),
    }).split("/")
    // en-u-ca-islamic-umalqura returns M/D/Y
    const month = parseInt(parts[0], 10) - 1
    const day   = parseInt(parts[1], 10)
    const year  = parseInt(parts[2], 10)
    return `${day} ${HIJRI_MONTHS[month] ?? ""} ${year} AH`
  } catch {
    return ""
  }
}

function formatTime(date, fmt) {
  if (!(date instanceof Date) || isNaN(date)) return "--:--"
  return date.toLocaleTimeString("en-US", fmt === "24h"
    ? { hour: "2-digit", minute: "2-digit", hour12: false }
    : { hour: "numeric",  minute: "2-digit", hour12: true  }
  )
}

function countdown(target) {
  const diff = target - Date.now()
  if (diff <= 0) return "00:00:00"
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000)  / 1000)
  return [h, m, s].map(x => String(x).padStart(2, "0")).join(":")
}

function locationLabel(meta) {
  if (meta?.city?.name) {
    return [meta.city.name, meta.city.admin1, meta.city.country].filter(Boolean).join(", ")
  }
  if (meta?.coords) {
    return `${meta.coords.lat.toFixed(3)}°, ${meta.coords.lon.toFixed(3)}°`
  }
  return null
}

// ── prayer row ────────────────────────────────────────────────────────────────

function PrayerRow({ name, time, fmt, isCurrent, isNext }) {
  const theme = useTheme()
  return (
    <Stack sx={{
      flexDirection: "row",
      alignItems:   "center",
      borderRadius: 1,
      px: 2, py: 1.5,
      gap: 1.5,
      backgroundColor: isCurrent
        ? alpha(theme.palette.primary.main, 0.12)
        : isNext
          ? alpha(theme.palette.primary.main, 0.05)
          : "transparent",
      transition: "background-color 0.4s ease",
    }}>
      <LensIcon sx={{
        fontSize: 8,
        color: isCurrent ? "primary.main" : isNext ? "primary.main" : "divider",
        opacity: isCurrent ? 1 : isNext ? 0.5 : 1,
      }}/>
      <Typography sx={{
        flex:       1,
        fontWeight: isCurrent ? 700 : isNext ? 600 : 400,
        color:      isCurrent ? "primary.main" : isNext ? "text.primary" : "text.secondary",
        fontSize:   "0.95rem",
      }}>{name}</Typography>
      <Typography sx={{
        fontFamily: "monospace",
        fontWeight: isCurrent ? 700 : 500,
        color:      isCurrent ? "primary.main" : "text.primary",
        fontSize:   "0.95rem",
      }}>{formatTime(time, fmt)}</Typography>
    </Stack>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user }   = useContext(Theme)
  const theme      = useTheme()
  const meta       = user?.user_metadata
  const fmt        = meta?.timeFormat ?? "12h"

  const [times,    setTimes]    = useState(null)
  const [extra,    setExtra]    = useState(null)   // { midnight, lastThird }
  const [now,      setNow]      = useState(new Date())
  const [snack,    setSnack]    = useState("")
  const [noLoc,    setNoLoc]    = useState(false)
  const [tzOffset, setTzOffset] = useState(null)  // minutes from UTC derived from coords
  const tickRef = useRef(null)

  // fetch timezone offset from coordinates
  useEffect(() => {
    if (!meta?.coords) return
    const { lat, lon } = meta.coords
    fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`)
      .then(r => r.json())
      .then(data => {
        // currentUtcOffset.seconds / 60 gives minutes
        const mins = data?.currentUtcOffset?.seconds != null
          ? data.currentUtcOffset.seconds / 60
          : null
        setTzOffset(mins)
      })
      .catch(() => setTzOffset(null)) // fall back to device timezone
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // build prayer times once
  useEffect(() => {
    if (!meta?.coords) { setNoLoc(true); return }
    try {
      const pt  = buildPrayerTimes(meta.coords, meta.calcMethod, meta.madhab)
      const sun = new SunnahTimes(pt)
      setTimes(pt)
      setExtra({ midnight: sun.middleOfTheNight, lastThird: sun.lastThirdOfTheNight })
    } catch (err) {
      setSnack(err?.message ?? "Failed to calculate prayer times")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // live clock
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  // rebuild at midnight
  useEffect(() => {
    if (!meta?.coords) return
    const msUntilMidnight = (() => {
      const t = new Date(); t.setHours(24, 0, 0, 0); return t - now
    })()
    const id = setTimeout(() => {
      const pt  = buildPrayerTimes(meta.coords, meta.calcMethod, meta.madhab)
      const sun = new SunnahTimes(pt)
      setTimes(pt)
      setExtra({ midnight: sun.middleOfTheNight, lastThird: sun.lastThirdOfTheNight })
    }, msUntilMidnight)
    return () => clearTimeout(id)
  }, [now.getDate()]) // eslint-disable-line react-hooks/exhaustive-deps

  // derive ordered prayers + current/next
  const prayers = times ? [
    { key: "fajr",    name: "Fajr",           time: times.fajr },
    { key: "sunrise", name: "Sunrise",         time: times.sunrise },
    { key: "dhuhr",   name: "Dhuhr",           time: times.dhuhr },
    { key: "asr",     name: "Asr",             time: times.asr },
    { key: "maghrib", name: "Maghrib",         time: times.maghrib },
    { key: "isha",    name: "Isha",            time: times.isha },
    { key: "midnight",name: "Midnight",        time: extra?.midnight },
    { key: "lastThird",name:"Last Third",      time: extra?.lastThird },
  ] : []

  // current prayer via adhan
  const currentPrayer = times ? times.currentPrayer(now) : null
  const nextPrayerKey = times ? times.nextPrayer(now)    : null

  // When nextPrayer is "none" (after Isha), the next prayer is tomorrow's Fajr.
  // Build tomorrow's prayer times so we can show the correct time + countdown.
  const tomorrowTimes = (nextPrayerKey === "none" && meta?.coords)
    ? (() => {
        try {
          const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
          return buildPrayerTimes(meta.coords, meta.calcMethod, meta.madhab, tomorrow)
        } catch { return null }
      })()
    : null

  const nextTime = (() => {
    if (!times || !nextPrayerKey) return null
    if (nextPrayerKey === "none") return tomorrowTimes?.fajr ?? null
    return times[nextPrayerKey] ?? null
  })()

  const NEXT_LABEL = {
    fajr:    "Fajr",
    sunrise: "Sunrise",
    dhuhr:   "Dhuhr",
    asr:     "Asr",
    maghrib: "Maghrib",
    isha:    "Isha",
    none:    "Fajr",
  }
  const nextPrayer = nextPrayerKey  // keep existing JSX references working

  const locLabel = locationLabel(meta)

  if (noLoc) return (
    <Stack sx={{ alignItems: "center", justifyContent: "center", height: "100%", gap: 1, p: 2.5 }}>
      <WbSunnyIcon sx={{ fontSize: 48, color: "text.secondary" }}/>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>Location not set</Typography>
      <Typography sx={{ color: "text.secondary", textAlign: "center" }}>
        Go to Settings → Preferences to set your location.
      </Typography>
    </Stack>
  )

  if (!times) return (
    <Stack sx={{ alignItems: "center", justifyContent: "center", height: "100%" }}>
      <CircularProgress/>
    </Stack>
  )

  return (
    <Stack sx={{ gap: 2.5, p: 2.5 }}>

      {/* ── date card ── */}
      <Stack sx={{
        border: "1px solid", borderColor: "divider", borderRadius: 1,
        alignSelf: "center", width: "100%", maxWidth: 600, p: 2.5, gap: 0.5,
      }}>
        <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1 }}>
          {locLabel ?? ""}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {toGregorian(now, tzOffset)}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {toHijri(now, tzOffset)}
        </Typography>
      </Stack>

      {/* ── next prayer hero ── */}
      <Stack sx={{
        border: "1px solid", borderColor: "primary.main",
        borderRadius: 1, alignSelf: "center", width: "100%", maxWidth: 600,
        p: 2.5, gap: 0.5,
        backgroundColor: alpha(theme.palette.primary.main, 0.06),
      }}>
        <Typography variant="caption" sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1 }}>
          Next Prayer
        </Typography>
        <Stack sx={{ flexDirection: "row", alignItems: "baseline", gap: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1 }}>
            {NEXT_LABEL[nextPrayer ?? "none"]}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontFamily: "monospace" }}>
            {nextTime ? formatTime(nextTime, fmt) : "--:--"}
          </Typography>
        </Stack>
        <Typography sx={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 300, color: "text.primary", letterSpacing: 2 }}>
          {nextTime ? countdown(nextTime) : "--:--:--"}
        </Typography>
      </Stack>

      {/* ── prayer times list ── */}
      <Stack sx={{
        border: "1px solid", borderColor: "divider", borderRadius: 1,
        alignSelf: "center", width: "100%", maxWidth: 600,
        py: 1,
      }}>
        {prayers.map(({ key, name, time }, i) => {
          const isCurrent = currentPrayer === key
          const isNext    = nextPrayer    === key
          return (
            <Box key={key}>
              {i > 0 && <Divider sx={{ mx: 2 }}/>}
              {/* section divider before midnight */}
              {key === "midnight" && (
                <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1, px: 2, py: 1 }}>
                  <BedtimeIcon sx={{ fontSize: 14, color: "text.secondary" }}/>
                  <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1 }}>
                    Sunnah Times
                  </Typography>
                  <Divider sx={{ flex: 1 }}/>
                </Stack>
              )}
              <PrayerRow
                name={name}
                time={time}
                fmt={fmt}
                isCurrent={isCurrent}
                isNext={isNext}
              />
            </Box>
          )
        })}
      </Stack>

      {/* ── extras row ── */}
      <Stack sx={{
        flexDirection: "row", gap: 2.5,
        alignSelf: "center", width: "100%", maxWidth: 600,
      }}>
        <Stack sx={{ flex: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, gap: 0.5, alignItems: "center" }}>
          <WbTwilightIcon sx={{ color: "text.secondary", fontSize: 20 }}/>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Sunrise</Typography>
          <Typography sx={{ fontFamily: "monospace", fontWeight: 600 }}>{formatTime(times.sunrise, fmt)}</Typography>
        </Stack>
        <Stack sx={{ flex: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, gap: 0.5, alignItems: "center" }}>
          <NightlightRoundIcon sx={{ color: "text.secondary", fontSize: 20 }}/>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Midnight</Typography>
          <Typography sx={{ fontFamily: "monospace", fontWeight: 600 }}>{formatTime(extra?.midnight, fmt)}</Typography>
        </Stack>
        <Stack sx={{ flex: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, gap: 0.5, alignItems: "center" }}>
          <BedtimeIcon sx={{ color: "text.secondary", fontSize: 20 }}/>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Last Third</Typography>
          <Typography sx={{ fontFamily: "monospace", fontWeight: 600 }}>{formatTime(extra?.lastThird, fmt)}</Typography>
        </Stack>
      </Stack>

      <Snackbar
        open={!!snack}
        onClose={() => setSnack("")}
        message={snack}
        autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Stack>
  )
}
