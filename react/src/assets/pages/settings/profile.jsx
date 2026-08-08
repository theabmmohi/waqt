import {
  useContext,
  useRef,
  useState
} from "react"
import {
  CircularProgress,
  Typography,
  TextField,
  Avatar,
  Button,
  Stack
} from "@mui/material"
import { Theme } from "@/main"
import Supabase from "@/supabase"
import {
  getLocalSettings,
  saveLocalSettings
} from "@/localSettings"

import SaveIcon from "@mui/icons-material/Save"

export default function Profile({setSnack}) {
  const { user } = useContext(Theme)
  const fileRef = useRef()
  const local = !user ? getLocalSettings() : null
  const email = user?.email ?? ""
  const [name, setName]     = useState(user?.user_metadata?.full_name  ?? local?.full_name ?? "")
  const [bio, setBio]       = useState(user?.user_metadata?.bio        ?? local?.bio        ?? "")
  const [avatar, setAvatar] = useState(user?.user_metadata?.avatar_url ?? "")
  const [saving, setSaving] = useState(false)
  const [file, setFile]     = useState(null)
  const save = async () => {
    if (!user) {
      saveLocalSettings({ full_name: name.trim(), bio: bio.trim() })
      setSnack("Saved")
      return
    }
    if (!navigator.onLine) return setSnack("No internet connection")
    setSaving(true)
    try {
      let avatar_url = avatar
      if (file) {
        const { error } = await Supabase.storage.from("avatar").upload(user.id, file, { upsert: true, contentType: file.type })
        if (error) throw error
        const { data } = Supabase.storage.from("avatar").getPublicUrl(user.id)
        avatar_url = `${data.publicUrl}?ts=${Date.now()}`
        setAvatar(avatar_url)
        setFile(null)
      }
      const { error } = await Supabase.auth.updateUser({ data: { full_name: name.trim(), bio: bio.trim(), avatar_url } })
      if (error) throw error
      saveLocalSettings({ full_name: name.trim(), bio: bio.trim() })
      setSnack("Saved")
    } catch (err) {
      setSnack(!navigator.onLine ? "No internet connection" : "Failed to save")
    } finally {setSaving(false)}
  }
  return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5, p: 2.5 }}>
      <Stack sx={{ flexDirection: "row", alignItems: "center" }}>
        <Avatar src={avatar} onClick={() => user && fileRef.current.click()} sx={{ border: "2px solid", borderColor: "text.primary", cursor: user ? "pointer" : "default", height: 72, width: 72 }}>{(user?.user_metadata?.full_name ?? name)?.[0]?.toUpperCase() ?? "?"}</Avatar>
        <Stack sx={{ px: 2.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Profile Photo</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{user ? "Click to change | Max 2 MB" : "Sign in to add a photo"}</Typography>
        </Stack>
        <input hidden type="file" accept="image/*" ref={fileRef} onChange={e => {
          const file = e.target.files[0]
          if (!file) return
          if (file.size > 2 * 1048576) return setSnack("File too large, max 2 MB")
          if (file.type === "image/heic" || file.type === "image/heif") return setSnack("HEIC/HEIF not supported")
          setAvatar(URL.createObjectURL(file))
          setFile(file)
        }}/>
      </Stack>
      <TextField size="small" label="Full Name" value={name} onChange={e => setName(e.target.value)}/>
      <TextField size="small" label="Email" value={email} disabled slotProps={{ input: { readOnly: true } }} helperText={user ? "Email cannot be changed" : "Sign in to set an email"}/>
      <TextField size="small" label="Bio" value={bio} multiline rows={4} onChange={e => {if (e.target.value.length <= 160) setBio(e.target.value)}} helperText={bio.length !== 160 ? `${bio.length}/160` : "Max Character Limit Reached"}/>
      <Button disableElevation onClick={save} disabled={saving} variant={saving ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={saving ? <CircularProgress size={14}/> : <SaveIcon/>}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </Stack>
  </Stack>)
}
