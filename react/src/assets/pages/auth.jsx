import {
  useEffect,
  useRef,
  useState
} from "react"
import {
  CircularProgress,
  FormControl,
  Typography,
  IconButton,
  TextField,
  Snackbar,
  Divider,
  Button,
  Slide,
  Stack,
  Box
} from "@mui/material"
import { useNavigate } from "react-router-dom"
import { Capacitor } from "@capacitor/core"
import { Browser } from "@capacitor/browser"
import Turnstile from "@asset/turnstile"
import { passkeyShimReady } from "@/main"
import { useTranslation } from "@/i18n"
import Supabase from "@/supabase"

import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import VisibilityIcon from "@mui/icons-material/Visibility"
import GoogleIcon from "@mui/icons-material/Google"
import KeyIcon from "@mui/icons-material/Key"

export default function Auth() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const turnstileRef = useRef()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isPasskeySupported, setIsPasskeySupported] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [snack, setSnack] = useState("")
  const [open, setOpen] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const show = (msg) => { setSnack(msg); setOpen(true) }
  const titleCase = (str) => str.replace(/\b\w/g, c => c.toUpperCase())
  const resetCaptcha = () => { turnstileRef.current?.reset(); setCaptchaToken(null) }
  useEffect(() => {
    let cancelled = false
    passkeyShimReady.then(() => {
      if (cancelled) return
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((result) => { if (result) setIsPasskeySupported(true) })
          .catch(() => setIsPasskeySupported(false))
      }
    })
    return () => { cancelled = true }
  }, [])
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!email || !password) return show(t("auth.snack.emailPasswordRequired"))
    if (!validEmail) return show(t("auth.snack.invalidEmail"))
    if (isSignUp && !name.trim()) return show(t("auth.snack.nameRequired"))
    if (!captchaToken) return show(t("auth.snack.captchaRequired"))
    setSubmitting(true)
    try {
      if (isSignUp) {
        const { data, error } = await Supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: undefined,
            captchaToken
          }
        })
        if (error) throw error
        if (data.user?.identities?.length === 0) return show(t("auth.snack.accountExists"))
        if (data.user?.confirmed_at) return show(t("auth.snack.alreadyConfirmed"))
        navigate("/verify", { state: {
          email, type: "signup",
          title: t("auth.verify.title"),
          desc: t("auth.verify.desc", { email })
        } })
      } else {
        const { error } = await Supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
        if (error) throw error
        navigate("/")
      }
    } catch (e) {show(titleCase(e.message))} finally {setSubmitting(false); resetCaptcha()}
  }
  const handlePasskey = async () => {
    if(!captchaToken) return show(t("auth.snack.captchaRequired"))
    setPasskeyLoading(true)
    try {
      const { error } = await Supabase.auth.signInWithPasskey({ options: {captchaToken} })
      if (error) throw error
      navigate("/")
    } catch (e) {show(titleCase(e.message))} finally {setPasskeyLoading(false); resetCaptcha()}
  }
  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const native = Capacitor.isNativePlatform()
      const { data, error } = await Supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: native ? "com.theabmmohi.waqt://login-callback/" : window.location.origin,
          skipBrowserRedirect: native
        }
      })
      if (error) throw error
      if (native && data?.url) await Browser.open({ url: data.url })
    } catch (e) {show(titleCase(e.message))} finally {setGoogleLoading(false)}
  }
  return (
    <Box sx={{ maxWidth: 500, mx: "auto", p: 5 }}>
      <Typography variant="h5" sx={{ textAlign: "center", my: 2.5 }}>{isSignUp ? t("auth.title.signup") : t("auth.title.signin")}</Typography>
      <FormControl component="form" onSubmit={handleSubmit} sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
        {isSignUp && (<TextField fullWidth size="small" label={t("auth.label.fullName")} value={name} onChange={e => setName(e.target.value)}/>)}
        <TextField fullWidth size="small" label={t("auth.label.email")} type="email" value={email} onChange={e => setEmail(e.target.value)}/>
        <TextField fullWidth size="small" label={t("auth.label.password")} type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} slotProps={{ input: { endAdornment: (<IconButton size="small" onClick={() => setShowPass(!showPass)}>{showPass ? <VisibilityIcon/> : <VisibilityOffIcon/>}</IconButton>) } }}/>
        <Stack direction="row" sx={{ width: "100%", justifyContent: "space-between" }}>
          <Button onClick={() => navigate("/forgot", { state: { type: "email" } })}>{t("auth.button.forgotPassword")}</Button>
          <Button onClick={() => { setIsSignUp(!isSignUp); setPassword(""); setName("") }}>{isSignUp ? t("auth.button.signinInstead") : t("auth.button.createAccount")}</Button>
        </Stack>
        <Button disableElevation sx={{ width: "75%" }} type="submit" disabled={submitting} variant={submitting ? "outlined" : "contained"} startIcon={submitting ? <CircularProgress size={14}/> : null}>
          {submitting ? (isSignUp ? t("auth.button.signingUp") : t("auth.button.signingIn")) : (isSignUp ? t("auth.button.signUp") : t("auth.button.signIn"))}
        </Button>
        <Divider sx={{ width: "100%" }}>{t("auth.divider.orContinueWith")}</Divider>
        <Stack sx={{ width: "75%", gap: 2.5 }}>
          <Button variant="outlined" startIcon={googleLoading ? <CircularProgress size={14}/> : <GoogleIcon/>} onClick={handleGoogle} disabled={googleLoading} sx={{ color: "text.primary" }}>{googleLoading ? t("auth.button.redirecting") : t("auth.button.google")}</Button>
          {!isSignUp && isPasskeySupported && (<Button variant="outlined" startIcon={passkeyLoading ? <CircularProgress size={14}/> : <KeyIcon/>} onClick={handlePasskey} disabled={passkeyLoading} sx={{ color: "text.primary" }}>{passkeyLoading ? t("auth.button.verifying") : t("auth.button.passkey")}</Button>)}
        </Stack>
        <Turnstile ref={turnstileRef} onVerify={setCaptchaToken} onError={() => { setCaptchaToken(null); turnstileRef.current?.reset() }}/>
        <Snackbar open={open} onClose={() => setOpen(false)} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
      </FormControl>
    </Box>
  )
}
