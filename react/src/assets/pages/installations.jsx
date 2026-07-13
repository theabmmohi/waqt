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
import { getPwaPrompt, clearPwaPrompt } from "@/main"
import { Browser } from "@capacitor/browser"
import { App as Cap } from "@capacitor/app"
import api from "@/api"
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt"
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import AndroidIcon from "@mui/icons-material/Android"

const SaveToDownloads = registerPlugin("SaveToDownloads")
const ApkDownloadManager = registerPlugin("ApkDownloadManager")
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
    /* eslint-disable react-hooks/set-state-in-effect */
    setPwaInstalled(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true)
    setPwaPrompt(getPwaPrompt())
    const handler = () => setPwaPrompt(getPwaPrompt())
    window.addEventListener("pwa-prompt-ready", handler)
    return () => window.removeEventListener("pwa-prompt-ready", handler)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])
  useEffect(() => {
    if (!isNativeApp) return
    ApkDownloadManager.cleanupStale().catch((err) => console.error("Stale download cleanup failed:", err))
  }, [isNativeApp])
  const mode = isNativeApp ? "native" : pwaInstalled ? "pwa" : "web"
  const apkUpdateAvailable = useMemo(() => (
    currentVersion && latestVersion && currentVersion !== latestVersion
  ), [currentVersion, latestVersion])
  const [downloadedApk, setDownloadedApk] = useState(null)
  const downloadApk = async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadProgress(0)
    setDownloadedApk(null)
    const filename = `waqt-${latestVersion || "latest"}.apk`
    try {
      const { id } = await ApkDownloadManager.enqueue({ url: APK_DOWNLOAD_URL, filename })
      // Poll Android's real DownloadManager for progress — the OS itself
      // renders the notification/progress bar, this just drives our own UI.
      await new Promise((resolve, reject) => {
        const poll = setInterval(async () => {
          try {
            const { status, bytesDownloaded, totalBytes } = await ApkDownloadManager.getStatus({ id })
            if (totalBytes > 0) setDownloadProgress(Math.round((bytesDownloaded / totalBytes) * 100))
            if (status === "successful") { clearInterval(poll); resolve() }
            else if (status === "failed") { clearInterval(poll); reject(new Error("Download failed")) }
          } catch (err) {
            clearInterval(poll)
            reject(err)
          }
        }, 400)
      })
      const { uri } = await Filesystem.getUri({ directory: Directory.External, path: `Download/${filename}` })
      setDownloadedApk({ uri, filename, id })
    } catch (err) {
      setSnack(err?.message ?? "Sorry, download failed")
    } finally {
      setDownloading(false)
    }
  }
  const installApk = async () => {
    if (!downloadedApk) return
    try {
      await FileOpener.open({ filePath: downloadedApk.uri, contentType: "application/vnd.android.package-archive" })
    } catch (err) {
      console.error("Opening installer failed:", err)
      setSnack(err?.message ?? "Sorry, couldn't open the installer")
    }
  }
  const saveApk = async () => {
    if (!downloadedApk) return
    try {
      await SaveToDownloads.save({ path: downloadedApk.uri, filename: downloadedApk.filename, mimeType: "application/vnd.android.package-archive" })
      setSnack(`Saved to Downloads as "${downloadedApk.filename}"`)
      await ApkDownloadManager.remove({ id: downloadedApk.id }).catch((err) => console.error("Cleanup after save failed:", err))
      setDownloadedApk(null)
    } catch (err) {
      console.error("Save to Downloads failed:", err)
      setSnack(err?.message ?? "Sorry, couldn't save to Downloads")
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
    clearPwaPrompt()
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
      ) : downloadedApk ? (
        <Stack sx={{ gap: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Update downloaded — install now or save it for later</Typography>
          <Stack sx={{ flexDirection: "row", gap: 1.5 }}>
            <Button fullWidth disableElevation variant="outlined" onClick={saveApk}>Save</Button>
            <Button fullWidth disableElevation variant="contained" startIcon={<SystemUpdateAltIcon />} onClick={installApk}>Install</Button>
          </Stack>
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