const KEY = "waqt-guest-settings"
const FIELDS = ["timeFormat", "locationType", "tz", "coords", "calcMethod", "madhab", "city", "full_name", "bio"]

export function getLocalSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLocalSettings(partial) {
  try {
    const current = getLocalSettings() ?? {}
    const next = { ...current, ...partial }
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    // e.g. private browsing storage quota — nothing we can do, fail silently
    return null
  }
}

// Wholesale overwrite (not merge) — used when the cache should stop reflecting
// guest-mode edits and start mirroring an actual account's saved preferences.
export function replaceLocalSettings(source) {
  try {
    const next = pickSettingsFields(source)
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    return null
  }
}

export function clearLocalSettings() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

// Only pull the known prayer-calculation fields out of an arbitrary object
// (e.g. user_metadata), so we never accidentally merge unrelated keys.
export function pickSettingsFields(source) {
  if (!source) return {}
  return FIELDS.reduce((acc, key) => {
    if (source[key] !== undefined && source[key] !== null) acc[key] = source[key]
    return acc
  }, {})
}
