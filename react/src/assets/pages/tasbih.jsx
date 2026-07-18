import {
  useEffect,
  useState,
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

import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight"
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft"
import SensorsOffIcon from "@mui/icons-material/SensorsOff"
import SensorsIcon from "@mui/icons-material/Sensors"
import RestoreIcon from "@mui/icons-material/Restore"

const SIZE = 200
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const DHIKR = [
  { ar: "أَسْتَغْفِرُ اللَّهَ", tr: "Astaghfirullah" },
  { ar: "سُبْحَانَ اللَّهِ", tr: "SubhanAllah" },
  { ar: "الْحَمْدُ لِلَّهِ", tr: "Alhamdulillah" },
  { ar: "اللَّهُ أَكْبَرُ", tr: "Allahu Akbar" },
  { ar: "لَا إِلَٰهَ إِلَّا اللَّهُ", tr: "La ilaha illallah" },
]

const wrap = (i, len) => ((i % len) + len) % len

export default function Tasbih() {
  const [dhikrIdx, setDhikrIdx] = useState(1)
  const [haptic,   setHaptic]   = useState(true)
  const [target,   setTarget]   = useState(33)
  const [snack,    setSnack]    = useState("")
  const [count,    setCount]    = useState(0)
  const [history,  setHistory]  = useState([])
  const dhikr = DHIKR[wrap(dhikrIdx, DHIKR.length)]
  const progress = Math.min(count / target, 1)
  const offset = CIRCUMFERENCE * (1 - progress)

  const buzz = (pattern = 15) => {
    if (haptic && navigator.vibrate) navigator.vibrate(pattern)
  }

  const changeDhikr = (delta) => {
    buzz(15)
    setDhikrIdx((i) => i + delta)
  }

  const handleTap = () => {
    const next = count + 1
    if (next >= target) {
      buzz([40, 60, 40, 60, 80])
      setHistory((h) => [{ tr: dhikr.tr, target, at: Date.now() }, ...h].slice(0, 20))
      setSnack(`${dhikr.tr} × ${target} completed`)
      setCount(0)
    } else {
      buzz(15)
      setCount(next)
    }
  }

  const handleReset = () => {
    buzz(15)
    setCount(0)
  }
  return (<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600 }}>
      <Stack sx={{ flexDirection: "row", "& .MuiButton-root": { border: "none", borderRadius: 0, py: 1.25, color: "text.primary", "&:first-of-type": { borderTopLeftRadius: (theme) => theme.shape.borderRadius }, "&:last-of-type": { borderTopRightRadius: (theme) => theme.shape.borderRadius } } }}>
        <Button variant="outlined" onClick={() => changeDhikr(-1)}><KeyboardArrowLeftIcon/></Button>
        <Divider flexItem orientation="vertical"/>
        <Box sx={{ flex: 1, height: 52, position: "relative", overflow: "hidden" }}>
          {[-1, 0, 1].map((offset) => {
            const idx = dhikrIdx + offset
            const d = DHIKR[wrap(idx, DHIKR.length)]
            return (
              <Box
                key={idx}
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: offset === 0 ? "auto" : "none",
                  transform: `translateX(${offset * 100}%)`,
                  transition: "transform 0.35s ease",
                }}
              >
                <Typography sx={{ color: "text.primary", fontSize: 20 }}>{d.ar}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>{d.tr}</Typography>
              </Box>
            )
          })}
        </Box>
        <Divider flexItem orientation="vertical"/>
        <Button variant="outlined" onClick={() => changeDhikr(1)}><KeyboardArrowRightIcon/></Button>
      </Stack>
      <Divider/>
      <Stack sx={{ alignItems: "center", width: "100%", gap: 2.5, p: 2.5 }}>
        <Box onClick={handleTap} sx={{ position: "relative", width: "75%", maxWidth: SIZE, aspectRatio: 1, cursor: "pointer" }}>
          <Box component="svg" viewBox={`0 0 ${SIZE} ${SIZE}`} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <Box component="circle" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} sx={{ stroke: (theme) => theme.palette.divider }}/>
            <Box component="circle" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} sx={{ stroke: (theme) => theme.palette.primary.main, transition: "stroke-dashoffset 0.3s ease" }}/>
          </Box>
          <Stack sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h3" sx={{ color: "text.primary", fontWeight: 600, lineHeight: 1 }}>{count}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>of {target}</Typography>
          </Stack>
        </Box>
      </Stack>
      <Divider/>
      <Stack sx={{ flexDirection: "row", "& .MuiButton-root": { border: "none", borderRadius: 0, py: 1.25, color: "text.primary", "&:first-of-type": { borderBottomLeftRadius: (theme) => theme.shape.borderRadius }, "&:last-of-type": { borderBottomRightRadius: (theme) => theme.shape.borderRadius } } }}>
        <Button fullWidth variant="outlined" onClick={() => { buzz(15); setHaptic(!haptic) }}>{haptic ? <SensorsOffIcon/> : <SensorsIcon/>}</Button>
        <Divider flexItem orientation="vertical"/>
        <Button fullWidth variant="outlined" onClick={handleReset}><RestoreIcon/></Button>
      </Stack>
    </Stack>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 1, p: 2.5 }}>
      <Typography variant="overline" sx={{ color: "text.secondary" }}>Session history</Typography>
      {history.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>No cycles completed yet</Typography>
      ) : (
        <Stack sx={{ gap: 0.5 }}>
          {history.map((h, i) => (
            <Stack key={h.at} sx={{ flexDirection: "row", justifyContent: "space-between", py: 0.5, borderBottom: i === history.length - 1 ? "none" : "1px solid", borderColor: "divider" }}>
              <Typography variant="body2" sx={{ color: "text.primary" }}>{h.tr}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>× {h.target}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}