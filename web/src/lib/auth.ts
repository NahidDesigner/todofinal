import { User, createUserWithEmailAndPassword, getIdTokenResult, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, updateProfile } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

export type AppUser = User & { role?: 'admin' | 'user' }

export async function signUp(email: string, password: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) await updateProfile(cred.user, { displayName })
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    displayName,
    role: 'user',
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    fcmTokens: [],
    settings: { notifications: { inApp: true, push: true, email: false } }
  }, { merge: true })
  await getIdTokenResult(cred.user, true)
  return cred.user
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await getIdTokenResult(cred.user, true)
  await updateDoc(doc(db, 'users', cred.user.uid), { lastSeenAt: serverTimestamp() })
  return cred.user
}

export async function signOut() { await fbSignOut(auth) }

export function listenAuth(callback: (user: AppUser | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null)
    const token = await getIdTokenResult(user, true)
    const role = token.claims?.role as any
    callback(Object.assign(user, { role }))
  })
}