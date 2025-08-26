import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthGuard } from '../hooks/useAuthGuard'
import { useNavigate } from 'react-router-dom'

export default function NotificationBell() {
  const { user } = useAuthGuard()
  const [unread, setUnread] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'notifications'), where('status','==','unread'))
    const unsub = onSnapshot(q, snap => setUnread(snap.size))
    return () => unsub()
  }, [user?.uid])

  return (
    <button aria-label="Notifications" onClick={()=>navigate('/app/notifications')} className="relative">
      <span className="material-icons">notifications</span>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">{unread}</span>
      )}
    </button>
  )
}