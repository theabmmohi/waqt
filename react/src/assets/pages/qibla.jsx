const Kaaba = {lat: 21.422487, lon: 39.826206}

import {
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef
} from "react"
import {
  CircularProgress,
  Typography,
  Snackbar,
  Divider,
  Button,
  Stack,
  Slide,
  Box
} from "@mui/material"
import { red, green, blue } from "@mui/material/colors"
import { useTheme, alpha } from "@mui/material/styles"
import { Qibla as AQ, Coordinates } from "adhan"
import { Theme } from "@/react"

import StraightenIcon from "@mui/icons-material/Straighten"
import ExploreIcon from "@mui/icons-material/Explore"
import NearMeIcon from "@mui/icons-material/NearMe"
import ErrorIcon from "@mui/icons-material/Error"

function getCardinal(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"]
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

function haversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const rLat1 = lat1 * Math.PI / 180
  const rLat2 = lat2 * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rLat1) * Math.cos(rLat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = c * 6371
  if (d >= 1) return(`${Math.round(d).toLocaleString()} km`)
  else return (`${Math.round(d * 1000).toLocaleString()} m`)
}

export default function Qibla() {
  const { user } = useContext(Theme)
  const theme = useTheme()
  const textPrimary   = theme.palette.text.primary
  const textSecondary = theme.palette.text.secondary
  const dividerColor  = theme.palette.divider
  const bgPaper       = theme.palette.background.paper
  const primary       = theme.palette.primary.main
  const [comStatus, setComStatus]   = useState("idle")
  const [heading, setHeading]       = useState(0)
  const [qibla,   setQibla]         = useState(0)
  const [dist, setDist]             = useState("0 km")
  const [snack, setSnack]           = useState("")
  const hasAbsoluteRef = useRef(false)
  const smoothedRef    = useRef(null)
  const rafRef         = useRef(null)
  const rawRef         = useRef(null)
  const cleanupRef     = useRef(null)
  const aligned = Math.abs(((heading - qibla + 540) % 360) - 180) < 1.5
  const S  = 280
  const CX = S / 2
  const CY = S / 2
  const ticks = Array.from({ length: 180 }, (_, i) => {
    const angle      = i * 2
    const isCardinal = angle % 90 === 0
    const isMajor    = angle % 30 === 0
    const isMedium   = angle % 10 === 0
    const outerR     = 136
    const innerR     = isCardinal ? 114 : isMajor ? 118 : isMedium ? 122 : 127
    const strokeW    = isCardinal ? 2 : isMajor ? 1.5 : 1
    const stroke     = isCardinal ? textPrimary : isMajor ? textSecondary : dividerColor
    return { angle, innerR, outerR, strokeW, stroke }
  })
  const degreeLabels = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30
    if (angle % 90 === 0) return null
    return { angle, label: String(angle) }
  }).filter(Boolean)
  const cardinals = [
    { angle: 0,   label: "N", color: red[500],      size: 15, weight: 800 },
    { angle: 90,  label: "E", color: textSecondary, size: 13, weight: 700 },
    { angle: 180, label: "S", color: blue[500],     size: 13, weight: 800 },
    { angle: 270, label: "W", color: textSecondary, size: 13, weight: 700 },
  ]
  const startCompass = useCallback(() => {
    if (comStatus !== "idle" && comStatus !== "unsupported") return
    setComStatus("measuring")
    hasAbsoluteRef.current = false
    rawRef.current         = null
    smoothedRef.current    = null
    const ALPHA = 0.08
    const handleAbsolute = (e) => {
      if (e.alpha === null) return
      if (!hasAbsoluteRef.current) setComStatus("supported")
      hasAbsoluteRef.current = true
      const a = (e.alpha % 360 + 360) % 360
      const faceDown = e.beta !== null && Math.abs(e.beta) > 90
      rawRef.current = faceDown ? (540 - a) % 360 : (360 - a) % 360
    }
    const handleRelative = (e) => {
      if (hasAbsoluteRef.current) return
      if (e.webkitCompassHeading != null) {
        if (!hasAbsoluteRef.current) setComStatus("supported")
        hasAbsoluteRef.current = true
        rawRef.current = e.webkitCompassHeading
      } else if (e.absolute && e.alpha !== null) {
        if (!hasAbsoluteRef.current) setComStatus("supported")
        hasAbsoluteRef.current = true
        rawRef.current = (360 - e.alpha + 360) % 360
      }
    }
    const unsupportedTimer = setTimeout(() => {
      if (!hasAbsoluteRef.current) setComStatus("unsupported")
    }, 2000)
    const tick = () => {
      if (rawRef.current !== null) {
        if (smoothedRef.current === null) smoothedRef.current = rawRef.current
        else {
          let delta = rawRef.current - smoothedRef.current
          if (delta >  180) delta -= 360
          if (delta < -180) delta += 360
          smoothedRef.current = (smoothedRef.current + ALPHA * delta + 360) % 360
        }
        setHeading(smoothedRef.current)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    const attach = () => {
      window.addEventListener("deviceorientationabsolute", handleAbsolute, true)
      window.addEventListener("deviceorientation",         handleRelative, true)
    }
    const detach = () => {
      clearTimeout(unsupportedTimer)
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("deviceorientationabsolute", handleAbsolute, true)
      window.removeEventListener("deviceorientation",         handleRelative, true)
    }
    cleanupRef.current = detach
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === "granted") attach()
        else { clearTimeout(unsupportedTimer); setComStatus("unsupported") }
      }).catch(() => { clearTimeout(unsupportedTimer); setComStatus("unsupported") })
    } else {
      attach()
    }
  }, [comStatus])
  useEffect(() => () => cleanupRef.current?.(), [])
  useEffect(() => {
    const coords = user?.user_metadata?.coords
    if (!coords) return setSnack("Set Your Location In Settings To Get Direction And Distance")
    setQibla(Math.round(AQ(new Coordinates(coords.lat, coords.lon))))
    setDist(haversine(Kaaba.lat, Kaaba.lon, coords.lat, coords.lon))
  }, [])
  return (<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "50%", alignSelf: "center", position: "relative", width: S, height: S }}>
        <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
          <g transform={`translate(${CX},${CY}) rotate(${-heading})`}>
            {ticks.map(({ angle, innerR, outerR, strokeW, stroke }) => (<line key={angle} transform={`rotate(${angle})`} x1="0" y1={-innerR} x2="0" y2={-outerR} stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />))}
            {degreeLabels.map(({ angle, label }) => (<text key={label} transform={`rotate(${angle}) translate(0,-102)`} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={textSecondary} fontFamily="monospace">{label}</text>))}
            {cardinals.map(({ angle, label, color, size, weight }) => (<text key={label} transform={`rotate(${angle}) translate(0,-102)`} textAnchor="middle" dominantBaseline="middle" fontSize={size} fontWeight={weight} fill={color} fontFamily="monospace">{label}</text>))}
          </g>
          <circle cx={CX} cy={CY} r={63} fill={bgPaper} stroke={aligned ? green[500]: primary} strokeWidth={2.5}/>
          <line x1={CX} y1={CY - 77} x2={CX} y2={CY - 63} stroke={aligned ? green[500] : primary} strokeWidth={2.5} strokeLinecap="round"/>
          <text x={CX} y={CY + 6} textAnchor="middle" dominantBaseline="middle" fontFamily="monospace">
            <tspan fontSize={15} fontWeight={600} fill={primary} dy={+5}>{getCardinal(heading)}</tspan>
            <tspan fontSize={35} fontWeight={300} fill={textPrimary} dy={-5} dx={+5}>{Math.round(((heading % 360) + 360) % 360)}</tspan>
            <tspan fontSize={20} fontWeight={300} fill={textPrimary} dy={-5}>°</tspan>
          </text>
        </svg>
        {comStatus !== "supported" && (
          <Stack onClick={comStatus === "idle" || comStatus === "unsupported" ? startCompass : undefined} sx={{ cursor: comStatus === "idle" || comStatus === "unsupported" ? "pointer" : "default", position: "absolute", borderRadius: "50%", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)", backgroundColor: alpha(textPrimary, 0.25), inset: 0, gap: 2.5 }}>
            {comStatus === "idle" && (<>
              <ExploreIcon sx={{ fontSize: 64, color: bgPaper }} />
              <Typography variant="h6" sx={{ textAlign: "center", width: "70%", color: bgPaper, fontWeight: 600, textShadow: `0 1px 4px ${alpha(textPrimary, 0.5)}` }}>Tap to enable compass</Typography>
            </>)}
            {comStatus === "measuring" && (<>
              <CircularProgress size={32} sx={{ color: bgPaper }} />
              <Typography variant="h6" sx={{ color: bgPaper, fontWeight: 600 }}>Detecting…</Typography>
            </>)}
            {comStatus === "unsupported" && (<>
              <ErrorIcon sx={{ fontSize: 64, color: bgPaper }} />
              <Typography variant="h6" sx={{ textAlign: "center", width: "70%", color: bgPaper, fontWeight: 600, textShadow: `0 1px 4px ${alpha(textPrimary, 0.5)}` }}>Compass not available. Tap to retry.</Typography>
            </>)}
          </Stack>
        )}
      </Box>
    </Stack>
    <Stack sx={{ flexDirection: "row", justifyContent: "center", border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", gap: 1 }}>
        <NearMeIcon/>
        <Typography>{qibla}{"\u00B0"}</Typography>
      </Stack>
      <Stack sx={{ flexDirection: "row", gap: 1 }}>
        <StraightenIcon/>
        <Typography>{dist}</Typography>
      </Stack>
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>
  )
}