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
import { getPwaPrompt, clearPwaPrompt } from "@/main"
import { Browser } from "@capacitor/browser"
import { App as Cap } from "@capacitor/app"
import { useTranslation } from "@/i18n"
import api from "@/api"
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt"
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import AndroidIcon from "@mui/icons-material/Android"

const ApkDownloadManager = registerPlugin("ApkDownloadManager")
const APK_DOWNLOAD_URL = `${api.defaults.baseURL}/download/android/latest`
const APK_VERSION_URL = `${api.defaults.baseURL}/download/android/version`
export default function Installations() {
  const { t } = useTranslation()
  const isNativeApp = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
  const [snack, setSnack] = useState("")
  const [currentVersion, setCurrentVersion] = useState(null)
  const [latestVersion, setLatestVersion] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [pwaPrompt, setPwaPrompt] = useState(null)
  const [pwaInstalled, setPwaInstalled] = useState(null)
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
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true
    if (standalone) {
      setPwaInstalled(true)
    } else if (navigator.getInstalledRelatedApps) {
      navigator.getInstalledRelatedApps()
        .then((apps) => setPwaInstalled(apps.length > 0))
        .catch((err) => { console.error("getInstalledRelatedApps failed:", err); setPwaInstalled(false) })
    } else {
      setPwaInstalled(false)
    }
    setPwaPrompt(getPwaPrompt())
    const promptHandler = () => setPwaPrompt(getPwaPrompt())
    const installedHandler = () => setPwaInstalled(true)
    window.addEventListener("pwa-prompt-ready", promptHandler)
    window.addEventListener("appinstalled", installedHandler)
    return () => {
      window.removeEventListener("pwa-prompt-ready", promptHandler)
      window.removeEventListener("appinstalled", installedHandler)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])
  useEffect(() => {
    if (!isNativeApp) return
    Filesystem.readdir({ directory: Directory.Cache, path: "" })
      .then(({ files }) => Promise.all(
        files
          .filter((f) => /^waqt-.*\.apk$/i.test(f.name))
          .map((f) => Filesystem.deleteFile({ directory: Directory.Cache, path: f.name }).catch((err) => console.error(`Failed to clear cached APK ${f.name}:`, err)))
      ))
      .catch((err) => console.error("Cache cleanup failed:", err))
    ApkDownloadManager.cleanupStale().catch((err) => console.error("Stale download cleanup failed:", err))
  }, [isNativeApp])
  const mode = isNativeApp ? "native" : pwaInstalled ? "pwa" : "web"
  const apkUpdateAvailable = useMemo(() => (
    currentVersion && latestVersion && currentVersion !== latestVersion
  ), [currentVersion, latestVersion])
  const [downloadedApk, setDownloadedApk] = useState(null)
  const [savedToDownloads, setSavedToDownloads] = useState(false)
  const downloadApk = async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadProgress(0)
    setDownloadedApk(null)
    setSavedToDownloads(false)
    const filename = `waqt-${latestVersion || "latest"}.apk`
    const progressListener = await FileTransfer.addListener("progress", (event) => {
      if (event.contentLength > 0) setDownloadProgress(Math.round((event.bytes / event.contentLength) * 100))
    })
    try {
      const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: filename })
      await FileTransfer.downloadFile({ url: APK_DOWNLOAD_URL, path: uri, progress: true })
      setDownloadedApk({ uri, filename })
    } catch (err) {
      setSnack(err?.message ?? t("install.snack.downloadFailed"))
    } finally {
      progressListener.remove()
      setDownloading(false)
    }
  }
  const installApk = async () => {
    if (!downloadedApk) return
    try {
      await FileOpener.open({ filePath: downloadedApk.uri, contentType: "application/vnd.android.package-archive" })
    } catch (err) {
      console.error("Opening installer failed:", err)
      setSnack(err?.message ?? t("install.snack.openInstallerFailed"))
    }
  }
  const saveApk = async () => {
    if (!downloadedApk) return
    try {
      await ApkDownloadManager.enqueue({ url: APK_DOWNLOAD_URL, filename: downloadedApk.filename })
      setSavedToDownloads(true)
      setSnack(t("install.snack.savingToDownloads"))
    } catch (err) {
      console.error("Save to Downloads failed:", err)
      setSnack(err?.message ?? t("install.snack.saveFailed"))
    }
  }
  const downloadApkInBrowser = async () => {
    if (Capacitor.isNativePlatform()) await Browser.open({ url: APK_DOWNLOAD_URL })
    else window.open(APK_DOWNLOAD_URL, "_blank", "noopener,noreferrer")
  }
  const installPwa = async () => {
    if (!pwaPrompt) return setSnack(t("install.snack.pwaManualPrompt"))
    await pwaPrompt.prompt()
    const { outcome } = await pwaPrompt.userChoice
    if (outcome === "accepted") setPwaInstalled(true)
    clearPwaPrompt()
    setPwaPrompt(null)
  }
  const cardSx = { flexDirection: "row", alignItems: "center", minHeight: 76, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5, gap: 2.5 }
  if (mode === "native") return (<Stack sx={{ p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, alignSelf: "center", width: { xs: "100%", sm: 600 }, gap: 2.5, p: 2.5 }}>
      <Typography variant="h6" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }}><AndroidIcon sx={{ fontSize: 24 }}/>{t("install.native.title")}</Typography>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ color: "text.secondary" }}>{t("install.native.currentVersion")}</Typography>
        <Typography sx={{ fontWeight: 600 }}>{currentVersion ?? "—"}</Typography>
      </Stack>
      <Divider/>
      <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ color: "text.secondary" }}>{t("install.native.latestVersion")}</Typography>
        <Typography sx={{ fontWeight: 600 }}>{latestVersion ?? "—"}</Typography>
      </Stack>
      <Divider/>
      {downloading ? (
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{t("install.native.downloading", { progress: downloadProgress })}</Typography>
          <LinearProgress variant="determinate" value={downloadProgress} sx={{ borderRadius: 1 }} />
        </Stack>
      ) : downloadedApk ? (
        <Stack sx={{ gap: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{t("install.native.downloadedReady")}</Typography>
          <Stack sx={{ flexDirection: "row", gap: 1.5 }}>
            {!savedToDownloads && <Button fullWidth disableElevation variant="outlined" onClick={saveApk}>{t("install.native.save")}</Button>}
            <Button fullWidth disableElevation variant="contained" startIcon={<SystemUpdateAltIcon />} onClick={installApk}>{t("install.native.install")}</Button>
          </Stack>
        </Stack>
      ) : apkUpdateAvailable ? (
        <Button disableElevation variant="contained" startIcon={<SystemUpdateAltIcon />} onClick={downloadApk}>{t("install.native.updateTo", { version: latestVersion })}</Button>
      ) : (
        <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
          <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>{t("install.native.upToDate")}</Typography>
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
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{t("install.web.androidApk")}</Typography>
        </Stack>
        <Stack sx={{ alignItems: "flex-end", width: 110, flexShrink: 0 }}>
          <Button size="small" variant="outlined" onClick={downloadApkInBrowser} sx={{ width: 100 }}>{t("install.web.download")}</Button>
        </Stack>
      </Stack>
      {!isNativeApp && pwaInstalled === false && (
        <Stack sx={cardSx}>
          <InstallDesktopIcon sx={{ fontSize: 32, flexShrink: 0 }}/>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{t("install.web.webApp")}</Typography>
          </Stack>
          <Stack sx={{ alignItems: "flex-end", width: 110, flexShrink: 0 }}>
            <Button size="small" variant="outlined" onClick={installPwa} sx={{ width: 100 }}>{t("install.web.installBtn")}</Button>
          </Stack>
        </Stack>
      )}
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}