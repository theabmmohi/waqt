import {
  useEffect,
  useState,
} from "react"
import {
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Typography,
  Snackbar,
  Divider,
  Button,
  Stack,
  Slide,
  Fade,
  Box
} from "@mui/material"
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"
import { Capacitor } from "@capacitor/core"
import { useTranslation } from "@/i18n"

import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight"
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft"
import SensorsOffIcon from "@mui/icons-material/SensorsOff"
import RepeatOnIcon from "@mui/icons-material/RepeatOn"
import SensorsIcon from "@mui/icons-material/Sensors"
import AdjustIcon from "@mui/icons-material/Adjust"
import DeleteIcon from "@mui/icons-material/Delete"
import RepeatIcon from "@mui/icons-material/Repeat"

const HISTORY_KEY = "tasbih-history"
const HISTORY_MAX = 200
const DHIKR_IDX_KEY = "tasbih-dhikr-idx"
const SIZE   = 200
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const DHIKR = [
  { key: "subhanAllah",     ar: "سُبْحَانَ اللَّهِ" },
  { key: "alhamdulillah",   ar: "الْحَمْدُ لِلَّهِ" },
  { key: "astaghfirullah",  ar: "أَسْتَغْفِرُ اللَّهَ" },
  { key: "allahuAkbar",     ar: "اللَّهُ أَكْبَرُ" },
  { key: "laIlahaIllallah", ar: "لَا إِلَٰهَ إِلَّا اللَّهُ" },
]
const wrap = (i, len) => ((i % len) + len) % len

export default function Tasbih() {
  const { t } = useTranslation()
  const trOf = (key) => t(`tasbih.dhikr.${key}`)
  const [dhikrIdx, setDhikrIdx] = useState(() => {
    const saved = parseInt(localStorage.getItem(DHIKR_IDX_KEY), 10)
    return Number.isInteger(saved) ? saved : 0
  })
  const [instant,  setInstant]  = useState(false)
  const [repeat,   setRepeat]   = useState(true)
  const [haptic,   setHaptic]   = useState(true)
  const [target,   setTarget]   = useState(100)
  const [snack,    setSnack]    = useState("")
  const [count,    setCount]    = useState(0)
  const [history,  setHistory]  = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY))
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const dhikr = DHIKR[wrap(dhikrIdx, DHIKR.length)]
  const progress = Math.min(count / target, 1)
  const offset = CIRCUMFERENCE * (1 - progress)
  const buzz = (pattern) => {
    if (!haptic) return
    if (Capacitor.isNativePlatform()) {
      if (pattern.length > 1) Haptics.notification({ type: NotificationType.Success }).catch(() => {})
      else Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
      return
    }
    if (navigator.vibrate) navigator.vibrate(pattern)
  }
  const logHistory = (entry) => {
    setHistory((h) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now(), ...entry }, ...h].slice(0, HISTORY_MAX))
  }
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)) } catch { return }
  }, [history])
  useEffect(() => {
    try { localStorage.setItem(DHIKR_IDX_KEY, String(dhikrIdx)) } catch { return }
  }, [dhikrIdx])
  useEffect(() => {
    if (!instant) return
    const id = requestAnimationFrame(() => setInstant(false))
    return () => cancelAnimationFrame(id)
  }, [instant])
  const changeDhikr = (delta, log = true) => {
    buzz([50])
    const nextIdx = dhikrIdx + delta
    if (log && count > 0) logHistory({ dhikrKey: dhikr.key, count })
    setDhikrIdx(nextIdx)
    setCount(0)
  }
  const handleTap = () => {
    buzz([50])
    setCount((c) => {
      if (c + 1 >= target) {
        buzz([60, 80, 60, 80, 100])
        setSnack(t("tasbih.snack.completed", { dhikr: trOf(dhikr.key), target }))
        return target
      }
      return c + 1
    })
  }
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (count !== target) return
    logHistory({ dhikrKey: dhikr.key, count: target })
    const id = setTimeout(() => {
      setInstant(true)
      setCount(0)
      if (repeat) changeDhikr(+1, false)
    }, 500)
    return () => clearTimeout(id)
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, target])
  return (<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600 }}>
      <Stack sx={{ flexDirection: "row", "& .MuiButton-root": { border: "none", borderRadius: 0, py: 1.25, color: "text.primary", "&:first-of-type": { borderTopLeftRadius: (theme) => theme.shape.borderRadius }, "&:last-of-type": { borderTopRightRadius: (theme) => theme.shape.borderRadius } } }}>
        <Button variant="outlined" onClick={() => changeDhikr(-1)}><KeyboardArrowLeftIcon/></Button>
        <Divider flexItem orientation="vertical"/>
        <Box sx={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 52 }}>
          <Fade key={dhikrIdx} in appear timeout={250}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ color: "text.primary", fontSize: 20 }}>{dhikr.ar}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{trOf(dhikr.key)}</Typography>
            </Box>
          </Fade>
        </Box>
        <Divider flexItem orientation="vertical"/>
        <Button variant="outlined" onClick={() => changeDhikr(+1)}><KeyboardArrowRightIcon/></Button>
      </Stack>
      <Divider/>
      <ToggleButtonGroup fullWidth exclusive value={target} onChange={(_, v) => { if (v) setTarget(v) }} sx={{ borderRadius: 0, height: "100%", "& .MuiToggleButton-root": { borderRadius: 0, border: "none" }, "& .MuiToggleButtonGroup-grouped:not(:last-of-type)": { borderRight: "1px solid", borderColor: "divider" } }}>
        <ToggleButton value={33}>33</ToggleButton>
        <ToggleButton value={100}>100</ToggleButton>
        <ToggleButton value={500}>500</ToggleButton>
        <ToggleButton value={1000}>1000</ToggleButton>
      </ToggleButtonGroup>
      <Divider/>
      <Stack onClick={handleTap} sx={{ alignItems: "center", width: "100%", p: 2.5 }}>
        <Box sx={{ position: "relative", width: "75%", maxWidth: SIZE, aspectRatio: 1, cursor: "pointer" }}>
          <Box component="svg" viewBox={`0 0 ${SIZE} ${SIZE}`} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <Box component="circle" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} sx={{ stroke: (theme) => theme.palette.divider }}/>
            <Box component="circle" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} sx={{ stroke: (theme) => theme.palette.primary.main, transition: instant ? "none" : "stroke-dashoffset 0.3s ease" }}/>
          </Box>
          <Stack sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h3" sx={{ color: "text.primary", fontWeight: 600, lineHeight: 1 }}>{count}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>{t("tasbih.count.of", { target })}</Typography>
          </Stack>
        </Box>
      </Stack>
      <Divider/>
      <Stack sx={{ flexDirection: "row", "& .MuiButton-root": { border: "none", borderRadius: 0, py: 1.25, color: "text.primary", "&:first-of-type": { borderBottomLeftRadius: (theme) => theme.shape.borderRadius }, "&:last-of-type": { borderBottomRightRadius: (theme) => theme.shape.borderRadius } } }}>
        <Button fullWidth variant="outlined" onClick={() => { buzz([50]); setHaptic(!haptic); setSnack(haptic ? t("tasbih.snack.hapticOff") : t("tasbih.snack.hapticOn")) }}>{haptic ? <SensorsOffIcon/> : <SensorsIcon/>}</Button>
        <Divider flexItem orientation="vertical"/>
        <Button fullWidth variant="outlined" onClick={() => { buzz([50]); setRepeat(!repeat); setSnack(repeat ? t("tasbih.snack.repeatOff") : t("tasbih.snack.repeatOn")) }}>{repeat ? <RepeatOnIcon/> : <RepeatIcon/>}</Button>
        <Divider flexItem orientation="vertical"/>
        <Button fullWidth variant="outlined" onClick={() => { buzz([50]); if (count > 0) logHistory({ dhikrKey: dhikr.key, count }); setCount(0); setSnack(t("tasbih.snack.reset")) }}><AdjustIcon/></Button>
      </Stack>
    </Stack>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600 }}>
      <Stack sx={{ flexDirection: "row", alignItems: "center", p: 2.5, pb: 1.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, flex: 1 }}>{t("tasbih.history.title")}</Typography>
        <IconButton disabled={!history.length} onClick={() => { setHistory([]); setSnack(t("tasbih.snack.historyCleared")) }}><DeleteIcon/></IconButton>
      </Stack>
      <Divider/>
      <Stack sx={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", px: 2.5, py: 1.25 }}>
        <Typography variant="body2" sx={{ color: "text.primary" }}>{t("tasbih.history.current", { dhikr: trOf(dhikr.key) })}</Typography>
        <Typography variant="body2" sx={{ color: "text.primary" }}>{count}/{target}</Typography>
      </Stack>
      <Divider/>
      <Stack sx={{ maxHeight: 320, overflowY: "auto" }}>
        {!history.length && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 2.5 }}>{t("tasbih.history.empty")}</Typography>
        )}
        {history.map((h, i) => (
          <Stack key={h.id} sx={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", px: 2.5, py: 1.25, ...(i !== history.length - 1 && { borderBottom: "1px solid", borderColor: "divider" }) }}>
            <Typography variant="body2" sx={{ color: "text.primary" }}>{h.dhikrKey ? trOf(h.dhikrKey) : h.dhikr}</Typography>
            <Typography variant="body2" sx={{ color: "text.primary" }}>{h.count}</Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}
