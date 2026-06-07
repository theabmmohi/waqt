import {
  Typography,
  Stack, Box
} from "@mui/material"
import AcUnitIcon from "@mui/icons-material/AcUnit"
export default function Preloader({ leaving }) {
  return(
    <Stack sx={{
      transition: "opacity 0.5s ease, transform 0.5s ease",
      transform: leaving ? "scale(1.06)" : "scale(1)",
      pointerEvents: leaving ? "none" : "auto",
      opacity: leaving ? 0 : 1,
      position: "fixed",
      height: "100dvh",
      width: "100vw",
      zIndex: 9999,
      inset: 0
    }}>
      <Stack sx={{ justifyContent: "center", alignItems: "center", flex: 1 }}>
        <Box sx={{ backgroundColor: "action.hover", borderRadius: "50%", display: "flex", p: 1 }}>
          <AcUnitIcon sx={{ fontSize: 96 }} />
        </Box>
      </Stack>
      <Stack sx={{ alignItems: "center", gap: 1, py: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", lineHeight: 1 }}>Waqt</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1 }}>by @theabmmohi</Typography>
      </Stack>
    </Stack>
  )
}