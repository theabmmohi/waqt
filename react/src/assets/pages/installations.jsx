import {
  useEffect,
  useMemo,
  useState
} from "react"
import {
  LinearProgress, Typography, Snackbar,
  Chip, Button, Slide, Stack
} from "@mui/material"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { FileOpener } from "@capacitor-community/file-opener"
import { FileTransfer } from "@capacitor/file-transfer"
import { Browser } from "@capacitor/browser"
import { App as Cap } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import api from "@/api"

import SmartphoneIcon from "@mui/icons-material/Smartphone"
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop"
import AndroidIcon from "@mui/icons-material/Android"
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import DownloadIcon from "@mui/icons-material/Download"

const APK_DOWNLOAD_URL = `${api.defaults.baseURL}/download/android/latest`
const WEBSITE_URL = "https://app.abm.ami.bd"

export default function Installations() {
  const isNativeApp = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
  const [snack, setSnack] = useState("")
  const [currentVersion, setCurrentVersion] = useState(null)
  const [latestVersion, setLatestVersion] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [pwaPrompt, setPwaPrompt] = useState(null)
  const [pwaInstalled, setPwaInstalled] = useState(false)
  useEffect(() => {
    if (!isNativeApp) return
    Cap.getInfo()
      .then((info) => setCurrentVersion(info.version))
      .catch(() => setCurrentVersion(null))
  }, [isNativeApp])
  useEffect(() => {
    if (!isNativeApp) return
    fetch(APK_DOWNLOAD_URL, { method: "HEAD", redirect: "follow" })
      .then((res) => {
        const match = decodeURIComponent(res.url).match(/(\d+\.\d+\.\d+)/)
        setLatestVersion(match ? match[1] : null)
      })
      .catch(() => setLatestVersion(null))
  }, [isNativeApp])
  useEffect(() => {
    setPwaInstalled(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true)
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e) }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])
  const apkUpdateAvailable = useMemo(() => (
    isNativeApp && currentVersion && latestVersion && currentVersion !== latestVersion
  ), [isNativeApp, currentVersion, latestVersion])
  const downloadApk = async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadProgress(0)
    const filename = `waqt-${latestVersion || "latest"}.apk`
    const progressListener = await FileTransfer.addListener("progress", (event) => {
      if (event.contentLength > 0) setDownloadProgress(Math.round((event.bytes / event.contentLength) * 100))
    })
    try {
      // Cache is app-private and needs no runtime permission on any Android version,
      // unlike Directory.ExternalStorage which Android 11+ blocks entirely.
      const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: filename })
      await FileTransfer.downloadFile({ url: APK_DOWNLOAD_URL, path: uri, progress: true })
      try {
        await FileOpener.open({ filePath: uri, contentType: "application/vnd.android.package-archive" })
      } catch { /* user dismissed the installer chooser, nothing to report */ }
    } catch (err) {
      setSnack(err?.message ?? "Sorry, download failed")
    } finally {
      progressListener.remove()
      setDownloading(false)
    }
  }
  const openExternal = async (url) => {
    if (Capacitor.isNativePlatform()) await Browser.open({ url })
    else window.open(url, "_blank", "noopener,noreferrer")
  }
  const open = async (type) => {
    if (type === "apk") return isNativeApp ? downloadApk() : openExternal(APK_DOWNLOAD_URL)
    if (type === "pwa") {
      if (!pwaPrompt) return
      await pwaPrompt.prompt()
      const { outcome } = await pwaPrompt.userChoice
      if (outcome === "accepted") setPwaInstalled(true)
      setPwaPrompt(null)
      return
    }
    if (type === "web") return openExternal(WEBSITE_URL)
  }
  const renderAction = (type) => {
    switch (type) {
      case "apk": {
        if (!isNativeApp) return (<Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => open("apk")}>Download</Button>)
        if (downloading) return (<Stack sx={{ width: 96, gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{downloadProgress}%</Typography>
          <LinearProgress variant="determinate" value={downloadProgress} sx={{ borderRadius: 1 }} />
        </Stack>)
        if (apkUpdateAvailable) return (<Stack sx={{ alignItems: "flex-end", gap: 0.5 }}>
          <Chip size="small" color="warning" label={`v${latestVersion} available`} />
          <Button size="small" variant="contained" startIcon={<SystemUpdateAltIcon />} onClick={() => open("apk")}>Update</Button>
        </Stack>)
        return (<Stack sx={{ alignItems: "flex-end", gap: 0.5 }}>
          <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Up to date</Typography>
          </Stack>
          {currentVersion && <Typography variant="caption" sx={{ color: "text.secondary" }}>v{currentVersion}</Typography>}
        </Stack>)
      }
      case "pwa": {
        if (pwaInstalled) return <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Installed" />
        if (!pwaPrompt) return <Typography variant="caption" sx={{ color: "text.secondary" }}>Not available on this browser</Typography>
        return (<Button size="small" variant="contained" startIcon={<InstallDesktopIcon />} onClick={() => open("pwa")}>Install</Button>)
      }
      case "web": return (<Button size="small" variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => open("web")}>Open</Button>)
      default: return null
    }
  }
  const CARDS = [
    { type: "apk", icon: AndroidIcon, title: "Android APK", desc: "Direct download for Android devices" },
    { type: "pwa", icon: InstallDesktopIcon, title: "Progressive Web App", desc: "Install as an app from your browser" },
    { type: "web", icon: SmartphoneIcon, title: "Browser Website", desc: "Use directly, no installation needed" }
  ]
  return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5 }}>
      {CARDS.map(({ type, icon: Icon, title, desc }) => (
        <Stack key={type} sx={{ flexDirection: "row", alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }}>
          <Icon sx={{ fontSize: 32 }}/>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{desc}</Typography>
          </Stack>
          {renderAction(type)}
        </Stack>
      ))}
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}
