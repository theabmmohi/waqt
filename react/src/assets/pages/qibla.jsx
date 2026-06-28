import {
  useEffect,
  useState,
  useRef
} from "react"
import {
  Stack,
  Box
} from "@mui/material"
import { red, green, blue } from "@mui/material/colors"
import { useTheme } from "@mui/material/styles"

function getCardinal(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"]
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

export default function Qibla() {
  const theme = useTheme()
  const textPrimary   = theme.palette.text.primary
  const textSecondary = theme.palette.text.secondary
  const dividerColor  = theme.palette.divider
  const bgPaper       = theme.palette.background.paper
  const primary       = theme.palette.primary.main

  const [heading, setHeading] = useState(0)
  const [qibla,   setQibla]   = useState(0)

  const smoothedRef    = useRef(null)
  const rafRef         = useRef(null)
  const rawRef         = useRef(null)
  const hasAbsoluteRef = useRef(false)   // true once a real absolute event arrives

  const aligned = Math.abs(((heading - qibla + 540) % 360) - 180) < 5
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
  const needleColor = aligned ? green[500] : primary

  useEffect(() => {
    const ALPHA = 0.08

    // ── deviceorientationabsolute ──────────────────────────────────────────
    // On Android: `absolute` is true, alpha=0 means magnetic North.
    // Heading = alpha directly (the compass bearing the device faces).
    const handleAbsolute = (e) => {
      if (e.alpha === null) return
      hasAbsoluteRef.current = true
      const alpha = (e.alpha % 360 + 360) % 360
      const faceDown = e.beta !== null && Math.abs(e.beta) > 90
      rawRef.current = faceDown ? (540 - alpha) % 360 : (360 - alpha) % 360
    }

    // ── deviceorientation (fallback) ───────────────────────────────────────
    // iOS uses webkitCompassHeading. Android non-absolute alpha needs 360-alpha.
    const handleRelative = (e) => {
      if (hasAbsoluteRef.current) return  // absolute already handled, skip
      if (e.webkitCompassHeading != null) {
        // iOS — true north heading, ready to use
        rawRef.current = e.webkitCompassHeading
      } else if (e.alpha !== null) {
        // Android fallback (no absolute) — alpha increases counter-clockwise
        rawRef.current = (360 - e.alpha + 360) % 360
      }
    }

    // Smooth on animation frames, decoupled from sensor rate
    const tick = () => {
      if (rawRef.current !== null) {
        if (smoothedRef.current === null) {
          smoothedRef.current = rawRef.current
        } else {
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

    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === "granted") attach()
      })
    } else {
      attach()
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("deviceorientationabsolute", handleAbsolute, true)
      window.removeEventListener("deviceorientation",         handleRelative, true)
    }
  }, [])

  return (
    <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", gap: 3, px: 2, py: 3 }}>
      <Box sx={{ position: "relative", width: S, height: S }}>
        <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
          <g transform={`translate(${CX},${CY}) rotate(${-heading})`}>
            {ticks.map(({ angle, innerR, outerR, strokeW, stroke }) => (
              <line key={angle} transform={`rotate(${angle})`} x1="0" y1={-innerR} x2="0" y2={-outerR}
                stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />
            ))}
            {degreeLabels.map(({ angle, label }) => (
              <text key={label} transform={`rotate(${angle}) translate(0,-102)`}
                textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={textSecondary} fontFamily="monospace">
                {label}
              </text>
            ))}
            {cardinals.map(({ angle, label, color, size, weight }) => (
              <text key={label} transform={`rotate(${angle}) translate(0,-102)`}
                textAnchor="middle" dominantBaseline="middle" fontSize={size} fontWeight={weight} fill={color} fontFamily="monospace">
                {label}
              </text>
            ))}
          </g>
          <circle cx={CX} cy={CY} r={63} fill={bgPaper} stroke={needleColor} strokeWidth={2.5}/>
          <line x1={CX} y1={CY - 77} x2={CX} y2={CY - 63} stroke={needleColor} strokeWidth={2.5} strokeLinecap="round"/>
          <text x={CX} y={CY + 6} textAnchor="middle" dominantBaseline="middle" fontFamily="monospace">
            <tspan fontSize={13} fontWeight={600} fill={primary}>{getCardinal(heading)} </tspan>
            <tspan fontSize={36} fontWeight={300} fill={textPrimary}>{Math.round(((heading % 360) + 360) % 360)}</tspan>
            <tspan fontSize={20} fontWeight={300} fill={textPrimary} dy={-5}>°</tspan>
          </text>
        </svg>
      </Box>
    </Stack>
  )
}
