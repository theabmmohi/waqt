import { useEffect, useState } from "react"
import {
  CircularProgress,
  Typography,
  Divider,
  Snackbar,
  Button,
  Chip,
  Slide,
  Stack,
  Box
} from "@mui/material"
import api from "@/api"

import ShareIcon from "@mui/icons-material/Share"

const LOCAL_KEY = "waqt-last-hadith"

function Section({label, children, rtl}) {
  if (!children) return null
  return (
    <Stack sx={{ gap: 0.5 }}>
      <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.2 }}>{label}</Typography>
      <Typography sx={{ direction: rtl ? "rtl" : "ltr", textAlign: rtl ? "right" : "left", fontFamily: rtl ? "serif" : undefined, fontSize: rtl ? "1.15rem" : undefined, lineHeight: 1.8 }}>
        {children}
      </Typography>
    </Stack>
  )
}

export default function Hadith() {
  const [hadith, setHadith] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null") } catch { return null }
  })
  const [loading, setLoading] = useState(!hadith)
  const [snack, setSnack] = useState("")

  useEffect(() => {
    api.get("/hadith/today").then(({ data }) => {
      if (data?.success && data.hadith) {
        setHadith(data.hadith)
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data.hadith)) } catch { /* ignore */ }
      } else if (!hadith) {
        setSnack(data?.message ?? "Couldn't load today's hadith")
      }
    }).catch(() => { if (!hadith) setSnack("You're offline — showing the last hadith we have") })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const share = async () => {
    if (!hadith) return
    const text = `${hadith.hadeeth_bn ?? hadith.hadeeth_en ?? ""}\n\n— ${hadith.attribution_en ?? ""}`.trim()
    try {
      if (navigator.share) await navigator.share({ title: "Waqt — Hadith of the Day", text, url: `${location.origin}/hadith` })
      else { await navigator.clipboard.writeText(text); setSnack("Copied to clipboard") }
    } catch { /* user cancelled the share sheet — nothing to do */ }
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (new URLSearchParams(location.search).get("share") === "1" && hadith) {
      share()
      window.history.replaceState({}, "", "/hadith")
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadith])

  if (loading) {
    return <Stack sx={{ alignItems: "center", justifyContent: "center", height: "100%", py: 8 }}><CircularProgress size={28}/></Stack>
  }

  return (
    <Stack sx={{ p: 2.5, alignItems: "center" }}>
      <Stack sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, width: { xs: "100%", sm: 600 }, gap: 2.5, p: 2.5 }}>
        {hadith ? (
          <>
            <Stack sx={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{hadith.attribution_en || "Hadith"}</Typography>
                {hadith.reference && <Typography variant="body2" sx={{ color: "text.secondary" }}>{hadith.reference}</Typography>}
              </Box>
              <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                {hadith.grade_en && <Chip size="small" label={hadith.grade_en} color="success" variant="outlined"/>}
                <Button size="small" startIcon={<ShareIcon/>} onClick={share}>Share</Button>
              </Stack>
            </Stack>
            <Divider/>
            <Section label="Arabic" rtl>{hadith.hadeeth_ar}</Section>
            <Divider/>
            <Section label="বাংলা অনুবাদ">{hadith.hadeeth_bn}</Section>
            <Section label="ব্যাখ্যা">{hadith.explanation_bn}</Section>
            <Divider/>
            <Section label="English Translation">{hadith.hadeeth_en}</Section>
            <Section label="Explanation">{hadith.explanation_en}</Section>
            <Divider/>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Source: HadeethEnc.com</Typography>
          </>
        ) : (
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>No hadith available right now — check back later.</Typography>
        )}
      </Stack>
      <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={3500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
    </Stack>
  )
}
