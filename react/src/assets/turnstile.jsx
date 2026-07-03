import { Turnstile as TS } from "@marsidev/react-turnstile"
import { useContext } from "react"
import { Theme } from "@/react"

const SITE_KEY = "0x4AAAAAADut2bR5XmgZEyqr"

export default function Turnstile({ onVerify, onError, onExpire }) {
  const { dark } = useContext(Theme)
  const theme = dark === "dark" ? "dark" : "light"
  return (
    <TS
      key={theme}
      siteKey={SITE_KEY}
      options={{ theme }}
      onSuccess={onVerify}
      onError={onError}
      onExpire={() => { onExpire?.(); onVerify?.(null) }}
    />
  )
}