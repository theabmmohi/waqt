import {
  Typography,
  Stack, Box
} from "@mui/material"
import AcUnitIcon from "@mui/icons-material/AcUnit"
export default function Preloader() {
  return(
    <Stack sx={{ height: "100dvh", width: "100vw" }}>
      <Stack sx={{ justifyContent: "center", alignItems: "center", flex: 1 }}>
        <Box sx={{ backgroundColor: "action.hover", borderRadius: "50%", display: "flex", p: 1 }}>
          <AcUnitIcon sx={{ fontSize: 64 }} />
        </Box>
      </Stack>
      <Stack sx={{ alignItems: "center", gap: 1, py: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", lineHeight: 1 }}>Im ABM</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1 }}>by @theabmmohi</Typography>
      </Stack>
    </Stack>
  )
}