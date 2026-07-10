import { initializeApp } from "firebase/app"
import {
  deleteToken as fbDeleteToken,
  getToken as fbGetToken,
  getMessaging,
  isSupported,
  onMessage
} from "firebase/messaging"
const key = "BMMcgYgujvVNnheTOZ_TN2hYWGwcu6JefeibwNbX9KzkyzzI4k_vCMb5RtL4LgF9vvrTBQQT1dX3PqBFunLITR0"
const app = initializeApp({
  appId: "1:696930371666:web:42887d9261a17671ca378b",
  apiKey: "AIzaSyDbp0UHNrX4mp5Z6SMr81sGQwjYrFIgNeA",
  storageBucket: "waqt-fcm.firebasestorage.app",
  authDomain: "waqt-fcm.firebaseapp.com",
  messagingSenderId: "696930371666",
  projectId: "waqt-fcm"
})
let messagingPromise
async function getWebMessaging() {
  if (!messagingPromise) messagingPromise = isSupported().then(supported => supported ? getMessaging(app) : null)
  return messagingPromise
}

export async function subscribeWeb() {
  const messaging = await getWebMessaging()
  if (!messaging) return null
  const registration = await navigator.serviceWorker.ready
  return fbGetToken(messaging, { vapidKey: key, serviceWorkerRegistration: registration })
}
export async function unsubscribeWeb() {
  const messaging = await getWebMessaging()
  if (!messaging) return
  await fbDeleteToken(messaging)
}
export async function onForegroundMessage(callback) {
  const messaging = await getWebMessaging()
  if (!messaging) return () => {}
  return onMessage(messaging, callback) ?? (() => {})
}
export default app