import {
  useEffect,
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
import Supabase from "@/supabase"

import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import VisibilityIcon from "@mui/icons-material/Visibility"
import GoogleIcon from "@mui/icons-material/Google"
import KeyIcon from "@mui/icons-material/Key"

export default function Auth() {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isPasskeySupported, setIsPasskeySupported] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [snack, setSnack] = useState("")
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const show = (msg) => { setSnack(msg); setOpen(true) }
  const titleCase = (str) => str.replace(/\b\w/g, c => c.toUpperCase())
  useEffect(() => {
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((result) => { if (result) setIsPasskeySupported(true) })
        .catch(() => setIsPasskeySupported(false))
    }
  }, [])
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!email || !password) return show("Email and password are required")
    if (!validEmail) return show("Please enter a valid email address")
    if (isSignUp && !name.trim()) return show("Please enter your name")
    setSubmitting(true)
    try {
      if (isSignUp) {
        const { data, error } = await Supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: undefined
          }
        })
        if (error) throw error
        if (data.user?.identities?.length === 0) return show("An account with this email already exists!")
        if (data.user?.confirmed_at) return show("Account already confirmed! Please sign in.")
        navigate("/verify", { state: {
          email, type: "signup",
          title: "Verify your Email",
          desc: `We sent a 6-digit code to ${email}`
        } })
      } else {
        const { error } = await Supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate("/")
      }
    } catch (e) {show(titleCase(e.message))} finally {setSubmitting(false)}
  }
  const handleForgot = async () => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!email) return show("Please enter your email address first")
    if (!validEmail) return show("Please enter a valid email address")
    setForgotLoading(true)
    try {
      const { error } = await Supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      show("Password reset email sent!")
    } catch (e) {show(titleCase(e.message))} finally {setForgotLoading(false)}
  }
  const handlePasskey = async () => {
    setPasskeyLoading(true)
    try {
      const { error } = await Supabase.auth.signInWithPasskey()
      if (error) throw error
      navigate("/")
    } catch (e) {show(titleCase(e.message))} finally {setPasskeyLoading(false)}
  }
  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await Supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      })
      if (error) throw error
    } catch (e) {show(titleCase(e.message))} finally {setGoogleLoading(false)}
  }
  return (
    <Box sx={{ maxWidth: 500, mx: "auto", p: 5 }}>
      <Typography variant="h5" sx={{ textAlign: "center", my: 2.5 }}>{isSignUp ? "Create Account" : "Sign In"}</Typography>
      <FormControl component="form" onSubmit={handleSubmit} sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
        {isSignUp && (<TextField fullWidth size="small" label="Full Name" value={name} onChange={e => setName(e.target.value)}/>)}
        <TextField fullWidth size="small" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}/>
        <TextField fullWidth size="small" label="Password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} slotProps={{ input: { endAdornment: (<IconButton size="small" onClick={() => setShowPass(!showPass)}>{showPass ? <VisibilityIcon/> : <VisibilityOffIcon/>}</IconButton>) } }}/>
        <Stack direction="row" sx={{ width: "100%", justifyContent: "space-between" }}>
          {!isSignUp ? <Button onClick={handleForgot} disabled={forgotLoading} startIcon={forgotLoading ? <CircularProgress size={14}/> : null}>{forgotLoading ? "Sending..." : "Forgot Password"}</Button> : <Box/>}
          <Button onClick={() => { setIsSignUp(!isSignUp); setPassword(""); setName("") }}>{isSignUp ? "Sign In Instead" : "Create Account"}</Button>
        </Stack>
        <Button disableElevation sx={{ width: "75%" }} type="submit" disabled={submitting} variant={submitting ? "outlined" : "contained"} startIcon={submitting ? <CircularProgress size={14}/> : null}>
          {submitting ? (isSignUp ? "Signing Up..." : "Signing In...") : (isSignUp ? "Sign Up" : "Sign In")}
        </Button>
        <Divider sx={{ width: "100%" }}>Or Continue With</Divider>
        <Stack sx={{ width: "75%", gap: 2.5 }}>
          <Button variant="outlined" startIcon={googleLoading ? <CircularProgress size={14}/> : <GoogleIcon/>} onClick={handleGoogle} disabled={googleLoading} sx={{ color: "text.primary" }}>{googleLoading ? "Redirecting..." : "Google"}</Button>
          {!isSignUp && isPasskeySupported && (<Button variant="outlined" startIcon={passkeyLoading ? <CircularProgress size={14}/> : <KeyIcon/>} onClick={handlePasskey} disabled={passkeyLoading} sx={{ color: "text.primary" }}>{passkeyLoading ? "Verifying..." : "Passkey"}</Button>)}
        </Stack>
        <Snackbar open={open} onClose={() => setOpen(false)} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
      </FormControl>
    </Box>
  )
}