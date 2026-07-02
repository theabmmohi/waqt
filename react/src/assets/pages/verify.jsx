import {
  useEffect,
  useState,
  useRef
} from "react"
import {
  useNavigate,
  useLocation
} from "react-router-dom"
import {
  CircularProgress,
  Typography,
  Snackbar,
  Slide,
  Stack,
  Box
} from "@mui/material"

const OTP_LENGTH = 6
const COOLDOWN = 5 * 60

export default function Verify() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const email = state?.email
  const type = state?.type
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""))
  const [verifying, setVerifying] = useState(false)
  const [snack, setSnack] = useState("")
  const inputsRef = useRef([])
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef(null)
  //useEffect(() => { if (!email || !type) navigate("/auth", { replace: true }) }, [email, type, navigate])
  useEffect(() => () => clearInterval(cooldownRef.current), [])
  useEffect(() => {if (digits.every(d => d !== "") && !verifying) verify(digits.join(""))}, [digits])
  const startCooldown = () => {
    setCooldown(COOLDOWN)
    clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => setCooldown(prev => { if (prev <= 1) { clearInterval(cooldownRef.current); return 0 } return prev - 1 }), 1000)
  }
  const cooldownLabel = cooldown > 0 ? (() => { const m = Math.floor(cooldown / 60); const sec = cooldown % 60; return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s` })() : null
  const verify = async () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setSnack("submitted")




  }
  return (<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Stack sx={{ gap: 0.5 }}>
        <Typography variant="h6" fontWeight="bold">{type === "recovery" ? "Reset Password" : "Verify Email"}</Typography>
        <Typography variant="body2" color="text.secondary">Enter the 6-digit code sent to <strong>{email}</strong></Typography>
      </Stack>
      <Stack>
        <Stack sx={{ flexDirection: "row", justifyContent: "center", opacity: verifying ? 0.5 : 1, transition: "opacity 0.2s" }}>
          {digits.map((digit, i) => (
            <Box key={i} component="input" inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"} value={digit}
              ref={el => inputsRef.current[i] = el} disabled={verifying}
              onChange={e => {
                const text = e.target.value.replace(/\D/g, "")
                if (text.length > 1) {
                  const next = [...digits]
                  text.split("").forEach((char, j) => { if (i + j < OTP_LENGTH) next[i + j] = char })
                  setDigits(next)
                  inputsRef.current[Math.min(i + text.length, OTP_LENGTH - 1)]?.focus()
                  return
                }
                const char = text.slice(-1)
                const next = [...digits]; next[i] = char; setDigits(next)
                if (char && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus()
              }}
              onKeyDown={e => {
                if (e.key === "Backspace") {
                  if (digits[i]) { const next = [...digits]; next[i] = ""; setDigits(next) }
                  else if (i > 0) { const next = [...digits]; next[i - 1] = ""; setDigits(next); inputsRef.current[i - 1]?.focus() }
                  e.preventDefault()
                }
                if (e.key === "ArrowLeft" && i > 0) inputsRef.current[i - 1]?.focus()
                if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus()
              }}
              onPaste={e => {
                e.preventDefault()
                const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "")
                if (!text) return
                const next = [...digits]
                text.split("").forEach((char, j) => { if (i + j < OTP_LENGTH) next[i + j] = char })
                setDigits(next)
                inputsRef.current[Math.min(i + text.length, OTP_LENGTH - 1)]?.focus()
              }}
              sx={{
                width: 48, height: 52, backgroundColor: "transparent",
                border: "1px solid",
                borderColor: digits[i] ? "primary.main" : "divider",
                marginLeft: i === 0 ? 0 : "-1px",
                zIndex: digits[i] ? 1 : 0,
                borderRadius: i === 0 ? "4px 0 0 4px" : i === OTP_LENGTH - 1 ? "0 4px 4px 0" : 0,
                fontSize: 22, fontWeight: 700,
                textAlign: "center", outline: "none",
                caretColor: "transparent", cursor: verifying ? "not-allowed" : "text",
                transition: "border-color 0.15s, background 0.15s",
                position: "relative", color: "text.primary",
                "&:focus": {
                  borderColor: "primary.main",
                  zIndex: 2, backgroundColor: "action.hover"
                }
              }}
            />
          ))}
        </Stack>
        {verifying && <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 1.5 }}><CircularProgress size={14}/><Typography variant="caption" color="text.secondary">Verifying...</Typography></Stack>}
      </Stack>
      <Stack>
        <Typography variant="caption" color="text.secondary">
          Didn't receive it?{" "}
        <Box component="span" onClick={cooldown === 0 ? startCooldown : undefined} sx={{ color: cooldown > 0 ? "text.disabled" : "primary.main", cursor: cooldown > 0 ? "default" : "pointer", textDecoration: cooldown > 0 ? "none" : "underline", textUnderlineOffset: 3 }}>
          {cooldown > 0 ? `Resend in ${cooldownLabel}` : "Resend code"}
        </Box>
        </Typography>
      </Stack>
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}