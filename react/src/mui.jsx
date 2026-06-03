import { createTheme } from "@mui/material"

const base = {
  shape: {
    borderRadius: 16
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600
        }
      }
    }
  }
}

export const lightTheme = createTheme({
  ...base,
  palette: {
    mode: "light",
    primary:    { main: "#1a56db" },
    secondary:  { main: "#f59e0b" },
    text: {
      primary:   "#0f172a",
      secondary: "#475569"
    },
    background: {
      default: "#eef2ff",
      paper:   "#ffffff"
    }
  }
})

export const darkTheme = createTheme({
  ...base,
  palette: {
    mode: "dark",
    primary:   { main: "#3b82f6" },
    secondary: { main: "#f59e0b" },
    text: {
      primary:   "#f1f5f9",
      secondary: "#94a3b8"
    },
    background: {
      default: "#0f172a",
      paper:   "#1e293b"
    }
  }
})