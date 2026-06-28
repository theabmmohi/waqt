import { createTheme } from "@mui/material"
import { orange, brown, grey} from "@mui/material/colors"
const white = "#ffffff"
const black = "#000000"
const blark = "#1c0a00"
const base = {
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600
        }
      }
    },
    MuiToggleButton: {
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
    primary: { main: orange[700] },
    secondary: { main: orange[400] },
    text: {
      primary: blark,
      secondary: brown[800]
    },
    background: {
      default: orange[50],
      paper: white
    }
  }
})
export const darkTheme = createTheme({
  ...base,
  palette: {
    mode: "dark",
    primary: { main: white },
    secondary: { main: grey[500] },
    text: {
      primary: white,
      secondary: grey[500]
    },
    background: {
      default: black,
      paper: grey[900]
    }
  }
})