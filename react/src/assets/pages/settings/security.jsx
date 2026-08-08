import { useEffect, useState } from "react"
import {
  CircularProgress,
  InputAdornment,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  TextField,
  Dialog,
  Button,
  Stack
} from "@mui/material"
import { getNativeFcmToken } from "@/main"
import { subscribeWeb, unsubscribeWeb } from "@/firebase"
import { Capacitor } from "@capacitor/core"
import Supabase from "@/supabase"
import api from "@/api"

import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew"
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import FingerprintIcon from "@mui/icons-material/Fingerprint"
import VisibilityIcon from "@mui/icons-material/Visibility"
import LockResetIcon from "@mui/icons-material/LockReset"
import EditIcon from "@mui/icons-material/Edit"
import LockIcon from "@mui/icons-material/Lock"
import AddIcon from "@mui/icons-material/Add"

export default function Security({setSnack}) {
  const [editingPasskey, setEditingPasskey] = useState(null)
  const [passUpdating, setPassUpdating]     = useState(false)
  const [pkRemoving, setPkRemoving]         = useState(false)
  const [pkAdding, setPkAdding]             = useState(false)
  const [seOPass, setSeOPass]               = useState(false)
  const [seNPass, setSeNPass]               = useState(false)
  const [othersR, setOthersR]               = useState(false)
  const [oldPass, setOldPass]               = useState("")
  const [newPass, setNewPass]               = useState("")
  const [conPass, setConPass]               = useState("")
  const [passkeys, setPasskeys]             = useState([])
  const updatePassword = async (e) => {
    e.preventDefault()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (!oldPass) return setSnack("Please enter your old password")
    if (!newPass) return setSnack("Please enter a new password")
    if (newPass !== conPass) return setSnack("Passwords do not match")
    setPassUpdating(true)
    try {
      const { error } = await Supabase.auth.updateUser({ password: newPass, current_password: oldPass })
      if (error) throw error
      setOldPass("")
      setNewPass("")
      setConPass("")
      setSnack("Password Updated Successfully")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setPassUpdating(false)}
  }
  const addPasskey = async () => {
    setPkAdding(true)
    try {
      const { data, error } = await Supabase.auth.registerPasskey()
      if (error) throw error
      const fn = data?.friendly_name
      setPasskeys(prev => [...prev, data])
      setSnack(`Added Passkey${fn ? ` - ${fn}` : ""}`)
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally {setPkAdding(false)}
  }
  const renamePasskey = async () => {
    try {
      const { error } = await Supabase.auth.passkey.update({
        friendlyName: editingPasskey.friendly_name,
        passkeyId: editingPasskey.id
      })
      if (error) throw error
      setPasskeys(prev => prev.map(passkey => passkey.id === editingPasskey.id ? {...passkey, friendly_name: editingPasskey.friendly_name} : passkey))
      setSnack("Passkey Renamed")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally{setEditingPasskey(null)}
  }
  const removePasskey = async () => {
    setPkRemoving(true)
    try {
      const { error } = await Supabase.auth.passkey.delete({ passkeyId: editingPasskey.id })
      if (error) throw error
      setPasskeys(prev => prev.filter(passkey => passkey.id !== editingPasskey.id))
      setEditingPasskey(null)
      setSnack("Passkey Deleted")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally{setPkRemoving(false)}
  }
  const logout = async (scope) => {
    setOthersR(true)
    try {
      const fcmToken = Capacitor.isNativePlatform()
        ? getNativeFcmToken()
        : ("serviceWorker" in navigator ? await subscribeWeb().catch(() => null) : null)
      await api.post("/settings/security/sessions/logout", { scope, fcmToken })
      if (scope === "global" && "serviceWorker" in navigator) await unsubscribeWeb().catch(() => {})
      const { error } = await Supabase.auth.signOut({ scope })
      if (error) throw error
      setSnack(scope === "global" ? "Logged Out From All Devices" : "Logged Out From Other Devices")
    } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")} finally{setOthersR(false)}
  }
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await Supabase.auth.passkey.list()
        if (error) throw error
        setPasskeys(data ?? [])
      } catch (err) {setSnack(err?.message ?? "Sorry, Internal Error")}
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5 }}>
      <Stack component="form" onSubmit={updatePassword} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><LockResetIcon sx={{ fontSize: 24 }}/>Update Password</Typography>
        <TextField fullWidth size="small" label="Old password" type={seOPass ? "text" : "password"} value={oldPass} onChange={e => setOldPass(e.target.value)} slotProps={{ input: { endAdornment: (
          <InputAdornment>
            <IconButton onClick={() => setSeOPass(!seOPass)}>
              {seOPass ? <VisibilityOffIcon/> : <VisibilityIcon/>}
            </IconButton>
          </InputAdornment>
        ) } }}/>
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
      </Stack>
      <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><FingerprintIcon sx={{ fontSize: 24 }}/>Manage Passkeys</Typography>
        {passkeys.length === 0 ? (
          <Typography>No Passkeys Added Yet</Typography>
        ) : (
          passkeys.map(passkey => (
            <Stack key={passkey.id} sx={{ flexDirection: "row", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5 }}>
              <Stack sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{passkey.friendly_name}</Typography>
                <Typography>Added:<span sx={{ fontFamily: "monospace" }}> {new Date(passkey.created_at).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"})} </span></Typography>
              </Stack>
              <IconButton onClick={() => {if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setEditingPasskey(passkey)}} sx={{ alignSelf: "center" }}><EditIcon/></IconButton>
            </Stack>
          ))
        )}
        <Button disableElevation onClick={addPasskey} disabled={pkAdding} variant={pkAdding ? "outlined" : "contained"} sx={{ alignSelf: "end", minWidth: "25%", px: 2.5 }} startIcon={pkAdding ? <CircularProgress size={14}/> : <AddIcon/>}>
          {pkAdding ? "Adding..." : "Add Passkey"}
        </Button>
        <Dialog component="form" open={Boolean(editingPasskey)} onClose={() => setEditingPasskey(null)} onSubmit={e => {e.preventDefault(); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); renamePasskey()}}>
          <DialogTitle>Edit Passkey</DialogTitle>
          <DialogContent>
            <TextField label="Passkey Name" size="small" value={editingPasskey?.friendly_name} onChange={e => setEditingPasskey(prev => ({...prev, friendly_name: e.target.value}))} sx={{ mt: 1 }}/>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingPasskey(null)} disabled={pkRemoving}>Cancel</Button>
            <Button type="submit" disabled={pkRemoving}>Rename</Button>
            <Button onClick={removePasskey} disabled={pkRemoving} sx={{ color: "error.main" }} startIcon={pkRemoving ? <CircularProgress size={14}/> : null}>
              {pkRemoving ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
      <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
        <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><PowerSettingsNewIcon sx={{ fontSize: 24 }}/>Manage Sessions</Typography>
        <Typography>Logout From:</Typography>
        <Stack sx={{ flexDirection: "row", gap: 2.5 }}>
          <Button fullWidth disableElevation onClick={() => logout("others")} variant={othersR ? "outlined" : "contained"} disabled={othersR}>Other Devices</Button>
          <Button fullWidth disableElevation onClick={() => logout("global")} variant="contained">All Devices</Button>
        </Stack>
      </Stack>
    </Stack>
  </Stack>)
}
