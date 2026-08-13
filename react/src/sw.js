/* global clients */
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw"
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching"
import { registerRoute, NavigationRoute } from "workbox-routing"
import { initializeApp } from "firebase/app"
import { clientsClaim } from "workbox-core"

precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()
self.skipWaiting()

// SPA offline support: any navigation not otherwise precached (e.g. reloading or
// deep-linking directly into /dashboard, /qibla, /settings/preferences while offline)
// falls back to the cached app shell, letting React Router handle it client-side.
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))

self.addEventListener("activate", (e) => {
  // Fallback for browsers without Background Sync (e.g. Safari/iOS): opportunistically
  // retry any queued offline actions whenever the service worker activates.
  e.waitUntil(flushQueuedActions().catch(() => {}))
})

const app = initializeApp({
  appId: "1:696930371666:web:42887d9261a17671ca378b",
  apiKey: "AIzaSyDbp0UHNrX4mp5Z6SMr81sGQwjYrFIgNeA",
  storageBucket: "waqt-fcm.firebasestorage.app",
  authDomain: "waqt-fcm.firebaseapp.com",
  messagingSenderId: "696930371666",
  projectId: "waqt-fcm"
})
const messaging = getMessaging(app)
const shownNotifTags = new Set()

onBackgroundMessage(messaging, (payload) => {
  const { title, body, url, notifId } = payload.data ?? {}
  const actions = payload.data?.actions ? JSON.parse(payload.data.actions) : []
  const tag = notifId ?? `${title ?? ""}-${body ?? ""}`
  if (shownNotifTags.has(tag)) return
  shownNotifTags.add(tag)
  if (shownNotifTags.size > 50) {
    shownNotifTags.delete(shownNotifTags.values().next().value)
  }
  self.registration.showNotification(title ?? "Waqt", {
    body: body ?? "",
    tag,
    renotify: false,
    icon: "/icon.png",
    badge: "/icon.png",
    actions: actions.slice(0, 3).map(a => ({ action: a.id, title: a.title })),
    data: { url: url ?? payload.fcmOptions?.link ?? "/", actionsMeta: actions }
  })
})

const SYNC_TAG = "waqt-retry-actions"
const DB_NAME = "waqt-offline"
const STORE = "pending-actions"

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function queueAction(api, body) {
  const db = await openQueueDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).add({ api, body, queuedAt: Date.now() })
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function flushQueuedActions() {
  const db = await openQueueDb()
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const item of items) {
    try {
      const res = await fetch(item.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body ?? {})
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const delTx = db.transaction(STORE, "readwrite")
      delTx.objectStore(STORE).delete(item.id)
    } catch (err) {
      // Still offline or server still unreachable — leave it queued, next sync/online event retries.
      db.close()
      throw err
    }
  }
  db.close()
}

self.addEventListener("sync", (e) => {
  if (e.tag === SYNC_TAG) e.waitUntil(flushQueuedActions().catch(() => {}))
})

self.addEventListener("notificationclick", (e) => {
  const clickedAction = e.action
  const meta = e.notification.data?.actionsMeta?.find(a => a.id === clickedAction)
  e.notification.close()
  if (clickedAction && meta?.api) {
    e.waitUntil(
      fetch(meta.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta.body ?? {})
      }).catch(async (err) => {
        console.error("Prayer action failed, queuing for retry:", err)
        try {
          await queueAction(meta.api, meta.body ?? {})
          // Background Sync isn't supported everywhere (notably Safari/iOS) — if it's
          // missing, the queued item just waits for the next successful notificationclick
          // or app launch to flush; otherwise, ask the browser to retry once back online.
          if ("sync" in self.registration) {
            await self.registration.sync.register(SYNC_TAG)
          }
        } catch (queueErr) {
          console.error("Failed to queue offline action:", queueErr)
        }
      })
    )
    return
  }
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const targetUrl = meta?.url ?? e.notification.data?.url ?? "/"
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.navigate(targetUrl); return existing.focus() }
      return clients.openWindow(targetUrl)
    })
  )
})