import { createContext, useContext, useEffect, useState, useCallback } from "react"
import en from "./en"
import bn from "./bn"

const dictionaries = { en, bn }
const STORAGE_KEY = "waqt_lang"

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
})

// Fills {placeholders} in a string with values from vars, e.g.
// interpolate("until {name} begins at {time}", { name: "Asr", time: "4:12 PM" })
function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match))
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved === "bn" ? "bn" : "en"
    } catch {
      return "en"
    }
  })

  const setLang = useCallback((next) => {
    const safe = next === "bn" ? "bn" : "en"
    setLangState(safe)
    try { localStorage.setItem(STORAGE_KEY, safe) } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback((key, vars) => {
    const dict = dictionaries[lang] || dictionaries.en
    const str = dict[key] ?? dictionaries.en[key] ?? key
    return interpolate(str, vars)
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Usage: const { t, lang, setLang } = useTranslation()
export function useTranslation() {
  return useContext(LanguageContext)
}
