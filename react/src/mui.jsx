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
    primary:    { main: "#ea580c" },
    secondary:  { main: "#fb923c" },
    text: {
      primary:   "#1c0a00",
      secondary: "#78350f"
    },
    background: {
      default: "#fff7ed",
      paper:   "#ffffff"
    }
  }
})
export const darkTheme = createTheme({
  ...base,
  palette: {
    mode: "dark",
    primary:   { main: "#ffffff" },
    secondary: { main: "#aaaaaa" },
    text: {
      primary:   "#ffffff",
      secondary: "#aaaaaa"
    },
    background: {
      default: "#000000",
      paper:   "#111111"
    }
  }
})