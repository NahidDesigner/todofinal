import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, app } from '../../lib/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'

export default function AdminAssignTask() {
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', description: '', dueAt: '', assignedToId: '' })

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('displayName'))
    const unsub = onSnapshot(q, snap => {
      const arr: any[] = []
      snap.forEach(d=>arr.push({ id: d.id, ...(d.data() as any) }))
      setUsers(arr)
    })
    return () => unsub()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const fn = httpsCallable(getFunctions(app), 'assignTask')
    const dueAt = form.dueAt ? new Date(form.dueAt).getTime() : undefined
    await fn({ ...form, dueAt })
    setForm({ title: '', description: '', dueAt: '', assignedToId: '' })
  }

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded border grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
      <div>
        <label className="text-sm">Title</label>
        <input className="w-full border rounded px-2 py-1" value={form.title} onChange={e=>setForm(f=>({...f, title: e.target.value}))} />
      </div>
      <div>
        <label className="text-sm">Description</label>
        <input className="w-full border rounded px-2 py-1" value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} />
      </div>
      <div>
        <label className="text-sm">Due date</label>
        <input type="date" className="w-full border rounded px-2 py-1" value={form.dueAt} onChange={e=>setForm(f=>({...f, dueAt: e.target.value}))} />
      </div>
      <div>
        <label className="text-sm">Assignee</label>
        <select className="w-full border rounded px-2 py-1" value={form.assignedToId} onChange={e=>setForm(f=>({...f, assignedToId: e.target.value}))}>
          <option value="">Select user</option>
          {users.map(u=> (
            <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
          ))}
        </select>
      </div>
      <button className="bg-sky-600 text-white px-3 py-2 rounded">Assign</button>
    </form>
  )
}