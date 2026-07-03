import { Turnstile as TS } from "@marsidev/react-turnstile"
import { useContext, forwardRef } from "react"
import { Theme } from "@/react"
const SITE_KEY = "0x4AAAAAADut2bR5XmgZEyqr"
const Turnstile = forwardRef(function Turnstile({ onVerify, onError, onExpire }, ref) {
  const { dark } = useContext(Theme)
  const theme = dark === "dark" ? "dark" : dark === "light" ? "light" : "auto"
  return (
    <TS
      ref={ref}
      key={theme}
      siteKey={SITE_KEY}
      options={{ theme }}
      onSuccess={onVerify}
      onError={onError}
      onExpire={() => { onExpire?.(); onVerify?.(null) }}
    />
  )
})
export default Turnstile