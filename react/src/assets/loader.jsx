import { CircularProgress, Stack } from "@mui/material"

export default function PageLoader() {
  return (
    <Stack sx={{ alignItems: "center", justifyContent: "center", height: "100%", width: "100%", py: 8 }}>
      <CircularProgress size={28}/>
    </Stack>
  )
}
