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
  InputAdornment,
  FormControl,
  Typography,
  IconButton,
  TextField,
  Snackbar,
  Divider,
  Button,
  Slide,
  Stack
} from "@mui/material"
import {
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon
} from "@mui/icons-material"
import Turnstile from "@asset/turnstile"
import Supabase from "@/supabase"

export default function Forgot() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const turnstileRef = useRef()
  const [email, setEmail] = useState("")
  const [newPass, setNewPass] = useState("")
  const [conPass, setConPass] = useState("")
  const [seNPass, setSeNPass] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [snack, setSnack] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [passUpdating, setPassUpdating] = useState(false)
  const resetCaptcha = () => { turnstileRef.current?.reset(); setCaptchaToken(null) }
  useEffect(() => {if (!state) navigate("/", { replace: true })}, [navigate])
  const sendOtp = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!email) return setSnack("Email is required")
    if (!captchaToken) return setSnack("Please complete the CAPTCHA first")
    setSubmitting(true)
    try {
      const { error } = await Supabase.auth.resetPasswordForEmail(email, { captchaToken })
      if (error) throw error
      navigate("/verify", { state: {
        email, type: "recovery",
        title: "Verify your Email",
        desc: `We sent a 6-digit code to ${email}`
      } })
    } catch (err) {setSnack(err.message)} finally {setSubmitting(false); resetCaptcha()}
  }
  const updatePassword = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!newPass || !conPass) return setSnack("Both fields are required")
    if (newPass !== conPass) return setSnack("Passwords do not match")
    setPassUpdating(true)
    try {
      const { error } = await Supabase.auth.updateUser({ password: newPass })
      if (error) throw error
      navigate("/", { replace: true })
    } catch (err) {setSnack(err.message)} finally {setPassUpdating(false)}
  }
  if(!state) return null
  return (<Stack sx={{ gap: 2.5, p: 2.5 }}>
    {state?.type === "email" && (<><Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Stack>
        <Typography variant="h6" fontWeight="bold">Reset Password</Typography>
        <Typography variant="body2" color="text.secondary">Enter your email address to reset password</Typography>
      </Stack>
      <FormControl component="form" onSubmit={sendOtp} sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
        <TextField fullWidth size="small" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}/>
        <Button disableElevation sx={{ width: "75%" }} type="submit" disabled={submitting} variant={submitting ? "outlined" : "contained"} startIcon={submitting ? <CircularProgress size={14}/> : null}>
          {submitting ? "Sending..." : "Send OTP"}
        </Button>
      </FormControl>
    </Stack>
    <Stack sx={{ alignItems: "center" }}>
      <Turnstile ref={turnstileRef} onVerify={setCaptchaToken} onError={() => setCaptchaToken(null)}/>
    </Stack></>)}
    {state?.type === "pass" && (<Stack component="form" onSubmit={updatePassword} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <TextField fullWidth size="small" label="New password" type={seNPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} slotProps={{ input: { endAdornment: (
          <InputAdornment>
            <IconButton onClick={() => setSeNPass(!seNPass)}>
              {seNPass ? <VisibilityOffIcon/> : <VisibilityIcon/>}
            </IconButton>
          </InputAdornment>
        ) } }}/>
        <TextField fullWidth size="small" label="Confirm password" type="password" value={conPass} onChange={e => setConPass(e.target.value)}/>
        <Button disableElevation type="submit" disabled={passUpdating} variant={passUpdating ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={passUpdating ? <CircularProgress size={14}/> : <LockIcon/>}>
          {passUpdating ? "Updating..." : "Update"}
        </Button>
    </Stack>)}
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}