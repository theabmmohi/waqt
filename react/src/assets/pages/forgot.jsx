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
import { useTranslation } from "@/i18n"
import Supabase from "@/supabase"

export default function Forgot() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
  useEffect(() => {if (!state) navigate("/", { replace: true })}, [navigate, state])
  const sendOtp = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!email) return setSnack(t("forgot.snack.emailRequired"))
    if (!captchaToken) return setSnack(t("forgot.snack.captchaRequired"))
    setSubmitting(true)
    try {
      const { error } = await Supabase.auth.resetPasswordForEmail(email, { captchaToken })
      if (error) throw error
      navigate("/verify", { state: {
        email, type: "recovery",
        title: t("forgot.verify.title"),
        desc: t("forgot.verify.desc", { email })
      } })
    } catch (err) {setSnack(err.message)} finally {setSubmitting(false); resetCaptcha()}
  }
  const updatePassword = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!newPass || !conPass) return setSnack(t("forgot.snack.bothFieldsRequired"))
    if (newPass !== conPass) return setSnack(t("forgot.snack.passwordMismatch"))
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
        <Typography variant="h6" fontWeight="bold">{t("forgot.email.title")}</Typography>
        <Typography variant="body2" color="text.secondary">{t("forgot.email.subtitle")}</Typography>
      </Stack>
      <FormControl component="form" onSubmit={sendOtp} sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
        <TextField fullWidth size="small" label={t("forgot.label.email")} type="email" value={email} onChange={e => setEmail(e.target.value)}/>
        <Button disableElevation sx={{ width: "75%" }} type="submit" disabled={submitting} variant={submitting ? "outlined" : "contained"} startIcon={submitting ? <CircularProgress size={14}/> : null}>
          {submitting ? t("forgot.button.sending") : t("forgot.button.sendOtp")}
        </Button>
      </FormControl>
    </Stack>
    <Stack sx={{ alignItems: "center" }}>
      <Turnstile ref={turnstileRef} onVerify={setCaptchaToken} onError={() => setCaptchaToken(null)}/>
    </Stack></>)}
    {state?.type === "pass" && (<Stack component="form" onSubmit={updatePassword} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <TextField fullWidth size="small" label={t("forgot.label.newPassword")} type={seNPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} slotProps={{ input: { endAdornment: (
          <InputAdornment>
            <IconButton onClick={() => setSeNPass(!seNPass)}>
              {seNPass ? <VisibilityOffIcon/> : <VisibilityIcon/>}
            </IconButton>
          </InputAdornment>
        ) } }}/>
        <TextField fullWidth size="small" label={t("forgot.label.confirmPassword")} type="password" value={conPass} onChange={e => setConPass(e.target.value)}/>
        <Button disableElevation type="submit" disabled={passUpdating} variant={passUpdating ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={passUpdating ? <CircularProgress size={14}/> : <LockIcon/>}>
          {passUpdating ? t("forgot.button.updating") : t("forgot.button.update")}
        </Button>
    </Stack>)}
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}