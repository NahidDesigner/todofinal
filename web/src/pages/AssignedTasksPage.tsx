import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, app } from '../lib/firebase'
import { useAuthGuard } from '../hooks/useAuthGuard'
import { httpsCallable, getFunctions } from 'firebase/functions'

export default function AssignedTasksPage() {
  const { user } = useAuthGuard()
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'tasks'), where('isAssigned','==', true), where('assignedToId','==', user.uid))
    const unsub = onSnapshot(q, snap => {
      const arr: any[] = []
      snap.forEach(d=>arr.push({ id: d.id, ...(d.data() as any) }))
      setTasks(arr)
    })
    return () => unsub()
  }, [user?.uid])

  const sorted = useMemo(()=> tasks.sort((a,b)=>{
    const ad = a.dueAt?.toDate ? a.dueAt.toDate().getTime() : 0
    const bd = b.dueAt?.toDate ? b.dueAt.toDate().getTime() : 0
    if (ad !== bd) return ad - bd
    const ac = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
    const bc = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
    return bc - ac
  }), [tasks])

  async function setStatus(taskId: string, status: 'todo'|'in_progress'|'done') {
    const fn = httpsCallable(getFunctions(app), 'updateAssignedTaskStatus')
    await fn({ taskId, status })
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Assigned to Me</h2>
      <ul className="space-y-2">
        {sorted.map(t => (
          <li key={t.id} className="bg-white p-3 rounded border flex items-center justify-between">
            <div>
              <div className="font-medium">{t.title}</div>
              {t.description && <div className="text-sm text-gray-600">{t.description}</div>}
              {t.dueAt && <div className="text-xs text-gray-500">Due {t.dueAt.toDate().toLocaleDateString()}</div>}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs bg-gray-100 rounded px-2 py-1">{t.status}</span>
              {t.status !== 'done' && (
                <>
                  {t.status === 'todo' && <button className="px-2 py-1 bg-gray-200 rounded" onClick={()=>setStatus(t.id,'in_progress')}>Start</button>}
                  <button className="px-2 py-1 bg-sky-600 text-white rounded" onClick={()=>setStatus(t.id,'done')}>Mark Done</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}