/* global clients */
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw"
import { precacheAndRoute } from "workbox-precaching"
import { initializeApp } from "firebase/app"
import { clientsClaim } from "workbox-core"

precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()
self.skipWaiting()

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
    badge: "/favicon-32x32.png",
    actions: actions.slice(0, 2).map(a => ({ action: a.id, title: a.title })),
    data: { url: url ?? payload.fcmOptions?.link ?? "/", actionsMeta: actions }
  })
})

self.addEventListener("notificationclick", (e) => {
  const clickedAction = e.action
  const meta = e.notification.data?.actionsMeta?.find(a => a.id === clickedAction)
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const targetUrl = meta?.url ?? e.notification.data?.url ?? "/"
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.navigate(targetUrl); return existing.focus() }
      return clients.openWindow(targetUrl)
    })
  )
})