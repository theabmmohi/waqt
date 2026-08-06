const KEY = "waqt-guest-settings"
const FIELDS = ["timeFormat", "locationType", "tz", "coords", "calcMethod", "madhab", "city"]

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

// Pending offline saves for an already-logged-in account. Deliberately keyed by
// user.id (not the shared guest key above) so a save that failed offline can't
// leak into a *different* account that later signs in on the same device.
const PENDING_PREFIX = "waqt-pending-settings:"

export function getPendingUserSettings(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + userId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePendingUserSettings(userId, payload) {
  if (!userId) return
  try {
    localStorage.setItem(PENDING_PREFIX + userId, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

export function clearPendingUserSettings(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(PENDING_PREFIX + userId)
  } catch {
    // ignore
  }
}
