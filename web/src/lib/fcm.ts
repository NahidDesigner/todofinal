import { messagingPromise } from './firebase'
import { getToken, onMessage } from 'firebase/messaging'
import { httpsCallable, getFunctions } from 'firebase/functions'
import { app } from './firebase'

export async function initFcmAndSaveToken(): Promise<string | null> {
  const messaging = await messagingPromise
  if (!messaging) return null
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null
  const vapidKey = undefined // use Firebase console key if needed
  const token = await getToken(messaging, { vapidKey }).catch(() => null)
  if (!token) return null
  const fn = httpsCallable(getFunctions(app), 'saveFcmToken')
  await fn({ token })
  return token
}

export function onForegroundMessage(callback: (payload: any) => void) {
  messagingPromise.then((messaging) => {
    if (!messaging) return
    onMessage(messaging, (payload) => callback(payload))
  })
}