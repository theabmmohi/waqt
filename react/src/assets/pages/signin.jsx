import {
  useEffect,
  useState
} from "react"
import {
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
import { startAuthentication } from "@simplewebauthn/browser"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/supabase"
import api from "@/api"

import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import VisibilityIcon from "@mui/icons-material/Visibility"
import KeyIcon from "@mui/icons-material/Key"

export default function SignIn() {
  const navigate = useNavigate()
  
  const [isPasskeySupported, setIsPasskeySupported] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) navigate("/")
    })
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((result) => {
        if (result) setIsPasskeySupported(true)
      })
      .catch(() => setIsPasskeySupported(false))
    }
  }, [navigate])
  
  const handleEmail = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!email || !password) {
      setError("Email And Password Are Required")
      setOpen(true)
      return
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate("/")
    } catch(e) {
      setError(e.message)
      setOpen(true)
    }
  }
  
  const handlePasskey = async () => {
    try {
      const { data: d1 } = await api.post("/passkey/options/auth")
      if (!d1.success) throw new Error(d1.message)
      const resp = await startAuthentication({ optionsJSON: d1.options })
      const { data: d2 } = await api.post("/passkey/verify/auth", { response: resp })
      if (!d2.success) throw new Error(d2.message)
      const { error } = await supabase.auth.setSession({
        access_token: d2.access_token,
        refresh_token: d2.refresh_token
      })
      if (error) throw error
      navigate("/")
    } catch(e) {
      setError(e.response?.data?.message || e.message)
      setOpen(true)
    }
  }
  
  const handleForgot = async () => {
    if (!email) {
      setError("Please enter your email address first.")
      setOpen(true)
      return
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      setError("Password reset email sent!")
      setOpen(true)
    } catch(e) {
      setError(e.message)
      setOpen(true)
    }
  }
  
  return (
    <Box sx={{ maxWidth: 500, mx: "auto", p: 5 }}>
      <Typography variant="h5" sx={{ textAlign: "center", my: 2.5 }}>Sign In</Typography>
      <Stack component="form" onSubmit={handleEmail} spacing={2.5} sx={{ alignItems: "center" }}>
        <TextField fullWidth size="small" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}/>
        <TextField fullWidth size="small" label="Password" type={showPass?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} slotProps={{ input: { endAdornment: (<IconButton size="small" onClick={() => setShowPass(!showPass)}>{showPass?<VisibilityIcon/>:<VisibilityOffIcon/>}</IconButton>) } }}/>
        <Stack direction="row" sx={{ width: "100%", justifyContent: "space-between" }}>
          <Button onClick={handleForgot}>Forgot Password</Button>
          <Button onClick={() => navigate("/signup")}>Sign Up</Button>
        </Stack>
        <Button sx={{ width: "75%" }} type="submit" variant="contained">Sign In</Button>
        
        {isPasskeySupported && (<>
          <Divider sx={{ width: "100%"}}>Or Continue With</Divider>
          <Stack spacing={1.25} sx={{ width: "75%" }}>
            <Button variant="outlined" startIcon={<KeyIcon/>} onClick={handlePasskey} sx={{ color: "text.primary" }}>Passkey</Button>
          </Stack>
        </>)}
        
        <Snackbar
          open={open}
          onClose={() => setOpen(false)}
          message={error}
          autoHideDuration={error?Math.max(2500, error.length*100):2500}
          slots={{ transition: Slide }}
        />
      </Stack>
    </Box>
  )
}