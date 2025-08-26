import { useEffect, useMemo, useState } from 'react'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, where, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthGuard } from '../hooks/useAuthGuard'
import { format } from 'date-fns'
import { z } from 'zod'

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().optional()
})

type Task = { id: string; title: string; description?: string; dueAt?: any; status: 'todo'|'in_progress'|'done'; isAssigned: boolean; ownerId: string; createdAt?: any; updatedAt?: any }

export default function Dashboard() {
  const { user } = useAuthGuard()
  const [tasks, setTasks] = useState<Task[]>([])
  const [tab, setTab] = useState<'today'|'upcoming'|'overdue'|'completed'>('today')
  const [form, setForm] = useState({ title: '', description: '', dueAt: '' })

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'tasks'), where('ownerId','==', user.uid), where('isAssigned','==', false))
    const unsub = onSnapshot(q, (snap)=>{
      const arr: Task[] = []
      snap.forEach(doc=>arr.push({ id: doc.id, ...(doc.data() as any) }))
      setTasks(arr)
    })
    return () => unsub()
  }, [user?.uid])

  const filtered = useMemo(()=>{
    const now = new Date()
    const start = new Date(now); start.setHours(0,0,0,0)
    const end = new Date(now); end.setHours(23,59,59,999)
    return tasks.filter(t => {
      const due = t.dueAt?.toDate ? t.dueAt.toDate() : (t.dueAt ? new Date(t.dueAt) : undefined)
      if (tab==='completed') return t.status==='done'
      if (t.status==='done') return false
      if (!due) return tab==='upcoming'
      if (tab==='today') return due >= start && due <= end
      if (tab==='overdue') return due < start
      if (tab==='upcoming') return due > end
      return true
    }).sort((a,b)=>{
      const ad = a.dueAt?.toDate ? a.dueAt.toDate().getTime() : (a.dueAt ? new Date(a.dueAt).getTime() : 0)
      const bd = b.dueAt?.toDate ? b.dueAt.toDate().getTime() : (b.dueAt ? new Date(b.dueAt).getTime() : 0)
      if (ad !== bd) return ad - bd
      const ac = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
      const bc = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
      return bc - ac
    })
  }, [tasks, tab])

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const parsed = taskSchema.safeParse(form)
    if (!parsed.success) return
    await addDoc(collection(db, 'tasks'), {
      title: form.title,
      description: form.description || undefined,
      dueAt: form.dueAt ? new Date(form.dueAt) : undefined,
      status: 'todo',
      isAssigned: false,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    setForm({ title: '', description: '', dueAt: '' })
  }

  async function toggleStatus(t: Task) {
    const next = t.status === 'todo' ? 'in_progress' : (t.status === 'in_progress' ? 'done' : 'todo')
    await updateDoc(doc(db, 'tasks', t.id), { status: next, updatedAt: serverTimestamp() })
  }

  async function removeTask(id: string) { await deleteDoc(doc(db, 'tasks', id)) }

  return (
    <div className="space-y-6">
      <form onSubmit={createTask} className="bg-white p-4 rounded shadow flex flex-col gap-3">
        <div className="font-semibold">Create Task</div>
        <input placeholder="Title" className="border rounded px-3 py-2" value={form.title} onChange={e=>setForm(f=>({...f, title: e.target.value}))} />
        <textarea placeholder="Description" className="border rounded px-3 py-2" value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} />
        <div>
          <label className="text-sm mr-2">Due date</label>
          <input type="date" value={form.dueAt} onChange={e=>setForm(f=>({...f, dueAt: e.target.value}))} className="border rounded px-3 py-1" />
        </div>
        <button className="self-start bg-sky-600 text-white px-4 py-2 rounded">Add</button>
      </form>

      <div className="flex gap-2">
        {(['today','upcoming','overdue','completed'] as const).map(k=> (
          <button key={k} onClick={()=>setTab(k)} className={`px-3 py-1 rounded ${tab===k? 'bg-sky-600 text-white':'bg-gray-200'}`}>{k[0].toUpperCase()+k.slice(1)}</button>
        ))}
      </div>

      <ul className="space-y-2">
        {filtered.map(t => (
          <li key={t.id} className="bg-white p-3 rounded border flex items-center justify-between">
            <div>
              <div className="font-medium">{t.title}</div>
              {t.description && <div className="text-sm text-gray-600">{t.description}</div>}
              {t.dueAt && (
                <div className="text-xs text-gray-500">Due {format(t.dueAt.toDate ? t.dueAt.toDate() : new Date(t.dueAt), 'yyyy-MM-dd')}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-gray-100">{t.status}</span>
              <button onClick={()=>toggleStatus(t)} className="px-2 py-1 text-sm bg-gray-200 rounded">Next</button>
              <button onClick={()=>removeTask(t.id)} className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}