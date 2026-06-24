import {
  useEffect,
  useState
} from "react"
import {
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
    try {
      if (isSignUp) {
        const { data, error } = await Supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name.trim() } }
        })
        if (error) throw error
        if (data.user?.identities?.length === 0) show("An account with this email already exists!")
        else if (data.user?.confirmed_at) show("Account already confirmed! Please sign in.")
        else show("Check your email to confirm your account!")
      } else {
        const { error } = await Supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate("/")
      }
    } catch (e) {show(titleCase(e.message))}
  }
  const handleForgot = async () => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!email) return show("Please enter your email address first")
    if (!validEmail) return show("Please enter a valid email address")
    try {
      const { error } = await Supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      show("Password reset email sent!")
    } catch (e) {show(titleCase(e.message))}
  }
  const handlePasskey = async () => {
    try {
      const { error } = await Supabase.auth.signInWithPasskey()
      if (error) throw error
      navigate("/")
    } catch (e) {show(titleCase(e.message))}
  }
  const handleGoogle = async () => {
    try {
      const { error } = await Supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      })
      if (error) throw error
    } catch (e) {show(titleCase(e.message))}
  }
  return (
    <Box sx={{ maxWidth: 500, mx: "auto", p: 5 }}>
      <Typography variant="h5" sx={{ textAlign: "center", my: 2.5 }}>{isSignUp ? "Create Account" : "Sign In"}</Typography>
      <FormControl component="form" onSubmit={handleSubmit} sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
        {isSignUp && (<TextField fullWidth size="small" label="Full Name" value={name} onChange={e => setName(e.target.value)}/>)}
        <TextField fullWidth size="small" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}/>
        <TextField fullWidth size="small" label="Password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} slotProps={{ input: { endAdornment: (<IconButton size="small" onClick={() => setShowPass(!showPass)}>{showPass ? <VisibilityIcon/> : <VisibilityOffIcon/>}</IconButton>) } }}/>
        <Stack direction="row" sx={{ width: "100%", justifyContent: "space-between" }}>
          {!isSignUp ? <Button onClick={handleForgot}>Forgot Password</Button> : <Box/>}
          <Button onClick={() => { setIsSignUp(!isSignUp); setPassword(""); setName("") }}>{isSignUp ? "Sign In Instead" : "Create Account"}</Button>
        </Stack>
        <Button sx={{ width: "75%" }} type="submit" variant="contained">{isSignUp ? "Sign Up" : "Sign In"}</Button>
        <Divider sx={{ width: "100%" }}>Or Continue With</Divider>
        <Stack sx={{ width: "75%", gap: 2.5 }}>
          <Button variant="outlined" startIcon={<GoogleIcon/>} onClick={handleGoogle} sx={{ color: "text.primary" }}>Google</Button>
          {!isSignUp && isPasskeySupported && (<Button variant="outlined" startIcon={<KeyIcon/>} onClick={handlePasskey} sx={{ color: "text.primary" }}>Passkey</Button>)}
        </Stack>
        <Snackbar open={open} onClose={() => setOpen(false)} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
      </FormControl>
    </Box>
  )
}