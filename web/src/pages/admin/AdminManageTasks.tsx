import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function AdminManageTasks() {
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('isAssigned','==', true))
    const unsub = onSnapshot(q, snap => {
      const arr: any[] = []
      snap.forEach(d=>arr.push({ id: d.id, ...(d.data() as any) }))
      setTasks(arr)
    })
    return () => unsub()
  }, [])

  const sorted = useMemo(()=> tasks.sort((a,b)=>{
    const ad = a.dueAt?.toDate ? a.dueAt.toDate().getTime() : 0
    const bd = b.dueAt?.toDate ? b.dueAt.toDate().getTime() : 0
    if (ad !== bd) return ad - bd
    const ac = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
    const bc = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
    return bc - ac
  }), [tasks])

  async function save(t: any) {
    await updateDoc(doc(db, 'tasks', t.id), {
      title: t.title,
      description: t.description || null,
      dueAt: t.dueAt?.toDate ? t.dueAt : (t.dueAt ? new Date(t.dueAt) : null),
      updatedAt: serverTimestamp(),
    })
  }

  async function remove(id: string) { await deleteDoc(doc(db, 'tasks', id)) }

  return (
    <div className="space-y-2">
      {sorted.map(t => (
        <div key={t.id} className="bg-white p-3 rounded border grid grid-cols-1 md:grid-cols-[1fr_2fr_200px_160px] gap-2 items-center">
          <input className="border rounded px-2 py-1" value={t.title} onChange={e=>setTasks(ts=>ts.map(x=>x.id===t.id?{...x,title:e.target.value}:x))} />
          <input className="border rounded px-2 py-1" value={t.description||''} onChange={e=>setTasks(ts=>ts.map(x=>x.id===t.id?{...x,description:e.target.value}:x))} />
          <input type="date" className="border rounded px-2 py-1" value={t.dueAt? new Date(t.dueAt.toDate?t.dueAt.toDate():t.dueAt).toISOString().slice(0,10):''} onChange={e=>setTasks(ts=>ts.map(x=>x.id===t.id?{...x,dueAt:e.target.value}:x))} />
          <div className="flex gap-2">
            <button className="px-2 py-1 text-sm bg-gray-200 rounded" onClick={()=>save(t)}>Save</button>
            <button className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded" onClick={()=>remove(t.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}