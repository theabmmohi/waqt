import {
  Typography,
  Stack,
  Link
} from "@mui/material"
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism"
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip"
import CalculateIcon from "@mui/icons-material/Calculate"
import LocalCafeIcon from "@mui/icons-material/LocalCafe"
import AcUnitIcon from "@mui/icons-material/AcUnit"
import GitHubIcon from "@mui/icons-material/GitHub"
import EmailIcon from "@mui/icons-material/Email"
import GavelIcon from "@mui/icons-material/Gavel"
import CodeIcon from "@mui/icons-material/Code"

const SHOW_SUPPORT = false

const cardSx = { border: "1px solid", borderColor: "divider", alignSelf: "center", width: "100%", borderRadius: 1, maxWidth: 600, gap: 1.5, p: 2.5 }
const headSx = { display: "inline-flex", alignItems: "center", fontWeight: 600, gap: 1 }
export default function About() {return (<Stack sx={{ gap: 2.5, p: 2.5 }}>
  <Stack sx={cardSx}>
    <Typography variant="h6" sx={headSx}><AcUnitIcon sx={{ fontSize: 24 }}/>Waqt</Typography>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      Waqt helps you stay connected to your daily prayers with accurate, location-based prayer
      times, Qibla direction, and timely reminders — available as a native Android app and an
      installable web app, so every prayer stays right on time.
    </Typography>
  </Stack>
  {SHOW_SUPPORT && (
    <Stack sx={cardSx}>
      <Typography variant="h6" sx={headSx}><LocalCafeIcon sx={{ fontSize: 24 }}/>Support Waqt</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Waqt is free to use. Some features rely on services that cost me to keep running — if
        you'd like to help cover that, it's completely optional and always appreciated. Tap the
        menu button and look the bottom-right corner of the screen, or use the link below.
      </Typography>
      <Link href="https://supportkori.com/theabmmohi" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><LocalCafeIcon sx={{ fontSize: 16 }}/>supportkori.com/theabmmohi</Link>
    </Stack>
  )}
  <Stack sx={cardSx}>
    <Typography variant="h6" sx={headSx}><CalculateIcon sx={{ fontSize: 24 }}/>Methodology</Typography>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      Prayer times are calculated using the open-source adhan.js library, based on your location
      (GPS or manually set) and a calculation method of your choice — Muslim World League, ISNA,
      Egyptian, Umm Al-Qura, Karachi, Tehran, Moonsighting Committee, or Singapore — configurable
      in Settings. Hijri calendar dates are sourced from the AlAdhan API. Calculated times are
      estimates; please verify against your local mosque for precise guidance.
    </Typography>
  </Stack>
  <Stack sx={cardSx}>
    <Typography variant="h6" sx={headSx}><CodeIcon sx={{ fontSize: 24 }}/>Developer</Typography>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      I built and maintain Waqt on my own. I'm not a professional developer, so you might spot
      some unconventional approaches here and there — sorry in advance! If something's broken or
      you'd just like to say hi, reach out by email or find me on GitHub.
    </Typography>
    <Stack sx={{ flexDirection: "row", flexWrap: "wrap" }}>
      <Link href="mailto:admin@mail.abm.ami.bd" underline="hover" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><EmailIcon sx={{ fontSize: 16 }}/>admin@mail.abm.ami.bd</Link>
      <Link href="https://github.com/theabmmohi" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><GitHubIcon sx={{ fontSize: 16 }}/>github.com/theabmmohi</Link>
    </Stack>
  </Stack>
  <Stack sx={cardSx}>
    <Typography variant="h6" sx={headSx}><GitHubIcon sx={{ fontSize: 24 }}/>Contribute</Typography>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      Waqt is open source. Contributions, bug reports, and feature suggestions are welcome —
      check out the repository on GitHub to get involved.
    </Typography>
    <Link href="https://github.com/theabmmohi/waqt" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><GitHubIcon sx={{ fontSize: 16 }}/>github.com/theabmmohi/waqt</Link>
  </Stack>
  <Stack sx={cardSx}>
    <Typography variant="h6" sx={headSx}><VolunteerActivismIcon sx={{ fontSize: 24 }}/>Acknowledgements</Typography>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      Waqt wouldn't be possible without these open-source projects and services: adhan.js for
      prayer time calculations, the AlAdhan API for Hijri calendar data, Material UI for the
      interface, Capacitor for native app packaging, and Supabase for authentication and data.
    </Typography>
  </Stack>
  <Stack sx={cardSx}>
    <Typography variant="h6" sx={headSx}><PrivacyTipIcon sx={{ fontSize: 24 }}/>Privacy Policy</Typography>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      We collect only what's needed to run Waqt: your email for account sign-in, your location
      (when you enable GPS) to calculate accurate prayer times, and a device token to deliver
      prayer and reminder notifications. Account and authentication data is handled by Supabase;
      notifications are delivered via Firebase Cloud Messaging; sign-in forms are protected by
      Cloudflare Turnstile. We do not sell your data or share it with advertisers. You can request
      deletion of your account and associated data at any time by contacting us.
    </Typography>
  </Stack>
  <Stack sx={cardSx}>
    <Typography variant="h6" sx={headSx}><GavelIcon sx={{ fontSize: 24 }}/>Terms of Service</Typography>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      By using Waqt, you agree to use the app for its intended purpose and not to misuse, disrupt,
      or attempt unauthorized access to its services. Waqt is provided "as is," without warranty
      of any kind; prayer times and related information are calculated estimates and should not
      be relied upon as the sole source for religious observance — please verify with your local
      mosque or community. We may update these terms or the app's features from time to time.
      Continued use of Waqt after changes constitutes acceptance of the updated terms.
    </Typography>
  </Stack>
</Stack>)}