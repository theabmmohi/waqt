import { useState } from "react"
import {
  Stack,
  Box
} from "@mui/material"
import { red, blue } from "@mui/material/colors"

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
  const alignGreen    = theme.palette.success.main
  const errorRed      = red[500]
  /////
  const [heading,  setHeading]  = useState(329)
  const [qibla,    setQibla]    = useState(117)
  /////
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
    { angle: 0,   label: "N", color: red[500],       size: 15, weight: 800 },
    { angle: 90,  label: "E", color: textSecondary,  size: 13, weight: 700 },
    { angle: 180, label: "S", color: blue[500],        size: 13, weight: 800 },
    { angle: 270, label: "W", color: textSecondary,  size: 13, weight: 700 },
  ]
  const needleColor = aligned ? alignGreen : primary
  return (
    <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", gap: 3, px: 2, py: 3 }}>
      <Box sx={{ position: "relative", width: S, height: S }}>
        <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
          <g transform={`translate(${CX},${CY}) rotate(${-heading})`}>
            {ticks.map(({ angle, innerR, outerR, strokeW, stroke }) => (<line key={angle} transform={`rotate(${angle})`} x1="0" y1={-innerR} x2="0" y2={-outerR} stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" />))}
            {degreeLabels.map(({ angle, label }) => (<text key={label} transform={`rotate(${angle}) translate(0,-102)`} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={textSecondary} fontFamily="monospace">{label}</text>))}
            {cardinals.map(({ angle, label, color, size, weight }) => (<text key={label} transform={`rotate(${angle}) translate(0,-102)`} textAnchor="middle" dominantBaseline="middle" fontSize={size} fontWeight={weight} fill={color} fontFamily="monospace">{label}</text>))}
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