import {
  useEffect,
  useMemo,
  useState
} from "react"
import {
  LinearProgress, Typography, Snackbar,
  Button, Slide, Stack, Divider
} from "@mui/material"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { FileOpener } from "@capacitor-community/file-opener"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { FileTransfer } from "@capacitor/file-transfer"
import { Browser } from "@capacitor/browser"
import { App as Cap } from "@capacitor/app"
import api from "@/api"

import InstallDesktopIcon from "@mui/icons-material/InstallDesktop"
import AndroidIcon from "@mui/icons-material/Android"
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"

const SaveToDownloads = registerPlugin("SaveToDownloads")
const APK_DOWNLOAD_URL = `${api.defaults.baseURL}/download/android/latest`
const APK_VERSION_URL = `${api.defaults.baseURL}/download/android/version`

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
    fetch(APK_VERSION_URL)
      .then((res) => res.json())
      .then((data) => setLatestVersion(data.version ?? null))
      .catch(() => setLatestVersion(null))
  }, [isNativeApp])
  useEffect(() => {
    setPwaInstalled(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true)
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e) }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])
  const mode = isNativeApp ? "native" : pwaInstalled ? "pwa" : "web"
  const apkUpdateAvailable = useMemo(() => (
    currentVersion && latestVersion && currentVersion !== latestVersion
  ), [currentVersion, latestVersion])
  const downloadApk = async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadProgress(0)
    const filename = `waqt-${latestVersion || "latest"}.apk`
    const progressListener = await FileTransfer.addListener("progress", (event) => {
      if (event.contentLength > 0) setDownloadProgress(Math.round((event.bytes / event.contentLength) * 100))
    })
    try {
      const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: filename })
      await FileTransfer.downloadFile({ url: APK_DOWNLOAD_URL, path: uri, progress: true })
      try {
        await FileOpener.open({ filePath: uri, contentType: "application/vnd.android.package-archive" })
      } catch {
        try {
          await SaveToDownloads.save({ path: uri, filename, mimeType: "application/vnd.android.package-archive" })
          setSnack(`Saved to Downloads as "${filename}" — open it from your Files app to install`)
        } catch (saveErr) {
          setSnack(saveErr?.message ?? "Sorry, couldn't save to Downloads")
        }
      }
    } catch (err) {
      setSnack(err?.message ?? "Sorry, download failed")
    } finally {
      progressListener.remove()
      setDownloading(false)
    }
  }
  const downloadApkInBrowser = async () => {
    if (Capacitor.isNativePlatform()) await Browser.open({ url: APK_DOWNLOAD_URL })
    else window.open(APK_DOWNLOAD_URL, "_blank", "noopener,noreferrer")
  }
  const installPwa = async () => {
    if (!pwaPrompt) return setSnack("Open your browser's menu (⋮) and tap \"Install app\" or \"Add to Home screen\"")
    await pwaPrompt.prompt()
    const { outcome } = await pwaPrompt.userChoice
    if (outcome === "accepted") setPwaInstalled(true)
    setPwaPrompt(null)
  }
  const cardSx = { flexDirection: "row", alignItems: "center", minHeight: 76, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }
  if (mode === "native") return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5, p: 2.5 }}>
      <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><AndroidIcon sx={{ fontSize: 24 }}/>App Version</Typography>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ color: "text.secondary" }}>Current version</Typography>
        <Typography sx={{ fontWeight: 600 }}>{currentVersion ?? "—"}</Typography>
      </Stack>
      <Divider/>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ color: "text.secondary" }}>Latest version</Typography>
        <Typography sx={{ fontWeight: 600 }}>{latestVersion ?? "—"}</Typography>
      </Stack>
      <Divider/>
      {downloading ? (
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Downloading update… {downloadProgress}%</Typography>
          <LinearProgress variant="determinate" value={downloadProgress} sx={{ borderRadius: 1 }} />
        </Stack>
      ) : apkUpdateAvailable ? (
        <Button disableElevation variant="contained" startIcon={<SystemUpdateAltIcon />} onClick={downloadApk}>Update to {latestVersion}</Button>
      ) : (
        <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
          <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>You&apos;re on the latest version</Typography>
        </Stack>
      )}
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
  return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5 }}>
      <Stack sx={cardSx}>
        <AndroidIcon sx={{ fontSize: 32, flexShrink: 0 }}/>
        <Stack sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Android APK</Typography>
        </Stack>
        <Stack sx={{ alignItems: "flex-end", width: 110, flexShrink: 0 }}>
          <Button size="small" variant="outlined" onClick={downloadApkInBrowser} sx={{ width: 100 }}>Download</Button>
        </Stack>
      </Stack>
      {mode === "web" && (
        <Stack sx={cardSx}>
          <InstallDesktopIcon sx={{ fontSize: 32, flexShrink: 0 }}/>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Web App</Typography>
          </Stack>
          <Stack sx={{ alignItems: "flex-end", width: 110, flexShrink: 0 }}>
            <Button size="small" variant="outlined" onClick={installPwa} sx={{ width: 100 }}>Install</Button>
          </Stack>
        </Stack>
      )}
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}