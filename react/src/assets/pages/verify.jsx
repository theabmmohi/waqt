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
  Typography,
  Snackbar,
  Slide,
  Stack,
  Link,
  Box
} from "@mui/material"
import Turnstile from "@asset/turnstile"
import Supabase from "@/supabase"

const OTP_LENGTH = 6

export default function Verify() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""))
  const [verifying, setVerifying] = useState(false)
  const [snack, setSnack] = useState("")
  const [captchaToken, setCaptchaToken] = useState(null)
  const inputsRef = useRef([])
  const turnstileRef = useRef()
  const resetCaptcha = () => { turnstileRef.current?.reset(); setCaptchaToken(null) }
  useEffect(() => {if (!state) navigate("/", { replace: true })}, [navigate])
  useEffect(() => {if (digits.every(d => d !== "") && !verifying) verify(digits.join(""))}, [digits])
  const verify = async (otp) => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (state?.type === "signup") try {
      setVerifying(true)
      const { error } = await Supabase.auth.verifyOtp({
        email: state?.email,
        type: state?.type,
        token: otp
      })
      if (error) throw error
      navigate("/", { replace: true })
    } catch (err) {
      setDigits(Array(OTP_LENGTH).fill(""))
      setSnack(err.message)
    } finally {setVerifying(false)}
  }
  const resend = async () => {
    if (!captchaToken) return setSnack("Please complete the CAPTCHA first")
    if (state?.type === "signup") try {
      const { error } = await Supabase.auth.resend({
        email: state?.email,
        type: state?.type,
        options: { captchaToken }
      })
      if (error) throw error
      setSnack("Email Sent Successfully")
    } catch (err) {setSnack(err.message)} finally {resetCaptcha()}
  }
  if (!state) return null
  return (<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Stack>
        <Typography variant="h6" fontWeight="bold">{state?.title}</Typography>
        <Typography variant="body2" color="text.secondary">{state?.desc}</Typography>
      </Stack>
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
      <Typography sx={{ alignSelf: "end" }}>
        <Link onClick={() => resend()}>Resend?</Link>
      </Typography>
    </Stack>
    <Stack sx={{ alignItems: "center" }}>
      <Turnstile ref={turnstileRef} onVerify={setCaptchaToken} onError={() => setCaptchaToken(null)}/>
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}