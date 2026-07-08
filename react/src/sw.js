/* global clients */
import { precacheAndRoute } from "workbox-precaching"
import { clientsClaim } from "workbox-core"
precacheAndRoute(self.__WB_MANIFEST)
self.skipWaiting()
clientsClaim()
self.addEventListener("message", (e) => { if (e.data?.type === "SKIP_WAITING") self.skipWaiting() })
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {}
  const title = data.title ?? "Waqt"
  const options = {
    body: data.body ?? "",
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    data: { url: data.url ?? "/" }
  }
  e.waitUntil(self.registration.showNotification(title, options))
})
self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow(e.notification.data?.url ?? "/")
    })
  )
})