import {
  useContext,
  useEffect,
  useState
} from "react"
import {
  CircularProgress,
  Typography,
  Snackbar,
  Divider,
  Slide,
  Stack,
  Box
} from "@mui/material"
import {
  CalculationMethod,
  PrayerTimes,
  Coordinates,
  SunnahTimes,
  Madhab,
  Qibla
} from "adhan"
import { useTheme, alpha } from "@mui/material/styles"
import { Theme } from "@/react"

export default function Dashboard() {
  const { user }   = useContext(Theme)
  const theme      = useTheme()
  const meta       = user?.user_metadata
  const fmt        = meta?.timeFormat ?? "12h"
  const [snack, setSnack] = useState("")
  
  return(<Stack sx={{ gap: 2.5, p: 2.5 }}>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Typography>Tuesday, 30 Jun 2026</Typography>
      <Typography>15 Muharram 1448 AH</Typography>
    </Stack>
    <Stack sx={{ border: "1px solid", borderColor: "primary.main", backgroundColor: alpha(theme.palette.primary.main, 0.05), alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Stack>
        <Typography>Now</Typography>
        <Typography>Isha</Typography>
        <Typography>08:20 PM - 03:43 AM</Typography>
      </Stack>
      <Stack>
        <Typography>Next</Typography>
        <Typography>Fajr</Typography>
        <Typography>04:14:42</Typography>
      </Stack>
    </Stack>
    <Stack sx={{ border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      
    </Stack>
    <Stack sx={{ flexDirection: "row", border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 2.5, p: 2.5 }}>
      <Stack>
        1
      </Stack>
      <Stack>
        2
      </Stack>
      <Stack>
        3
      </Stack>
    </Stack>
    <Snackbar open={!!snack} onClose={() => setSnack("")} message={snack} autoHideDuration={snack ? Math.max(2500, snack.length * 100) : 2500} slots={{ transition: Slide }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}/>
  </Stack>)
}