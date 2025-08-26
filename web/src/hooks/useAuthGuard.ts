import { useEffect, useState } from 'react'
import { AppUser } from '../lib/auth'
import { listenAuth } from '../lib/auth'

export function useAuthGuard() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const unsub = listenAuth((u) => { setUser(u); setLoading(false) })
    return () => unsub()
  }, [])
  return { user, loading }
}