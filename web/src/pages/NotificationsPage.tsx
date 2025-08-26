import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthGuard } from '../hooks/useAuthGuard'
import { useNavigate } from 'react-router-dom'

export default function NotificationsPage() {
  const { user } = useAuthGuard()
  const [notifs, setNotifs] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, snap => {
      const arr: any[] = []
      snap.forEach(d=>arr.push({ id: d.id, ...(d.data() as any) }))
      setNotifs(arr)
    })
    return () => unsub()
  }, [user?.uid])

  async function markRead(id: string) {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { status: 'read' as const })
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Notifications</h2>
      <ul className="space-y-2">
        {notifs.map(n => (
          <li key={n.id} className={`p-3 border rounded bg-white flex items-center justify-between ${n.status==='unread' ? 'border-sky-200' : ''}`}>
            <div>
              <div className="font-medium">{n.title}</div>
              <div className="text-sm text-gray-600">{n.message}</div>
            </div>
            <div className="flex items-center gap-2">
              {n.taskId && <button className="px-2 py-1 text-sm bg-gray-200 rounded" onClick={()=>navigate('/app')}>Open task</button>}
              {n.status==='unread' && <button className="px-2 py-1 text-sm bg-sky-600 text-white rounded" onClick={()=>markRead(n.id)}>Mark read</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}