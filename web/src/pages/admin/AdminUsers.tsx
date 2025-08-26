import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore'
import { db, app } from '../../lib/firebase'
import { z } from 'zod'
import { getFunctions, httpsCallable } from 'firebase/functions'

const createSchema = z.object({ email: z.string().email(), displayName: z.string().min(1), role: z.enum(['admin','user']) })

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({ email: '', displayName: '', role: 'user' })
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, snap => {
      const arr: any[] = []
      snap.forEach(d=>arr.push({ id: d.id, ...(d.data() as any) }))
      setUsers(arr)
    })
    return () => unsub()
  }, [])

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    const parsed = createSchema.safeParse(form)
    if (!parsed.success) return
    const fn = httpsCallable(getFunctions(app), 'adminCreateUser')
    await fn(parsed.data)
    setForm({ email: '', displayName: '', role: 'user' })
  }

  async function setRole(uid: string, role: 'admin'|'user') {
    const fn = httpsCallable(getFunctions(app), 'setUserRole')
    await fn({ uid, role })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createUser} className="bg-white p-3 rounded border grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <div>
          <label className="text-sm">Email</label>
          <input className="w-full border rounded px-2 py-1" value={form.email} onChange={e=>setForm(f=>({...f, email: e.target.value}))} />
        </div>
        <div>
          <label className="text-sm">Display name</label>
          <input className="w-full border rounded px-2 py-1" value={form.displayName} onChange={e=>setForm(f=>({...f, displayName: e.target.value}))} />
        </div>
        <div>
          <label className="text-sm">Role</label>
          <select className="w-full border rounded px-2 py-1" value={form.role} onChange={e=>setForm(f=>({...f, role: e.target.value}))}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button className="bg-sky-600 text-white px-3 py-2 rounded">Create user</button>
      </form>

      <table className="min-w-full bg-white rounded border">
        <thead>
          <tr className="text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Role</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.displayName || '-'}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">
                <button className="px-2 py-1 text-sm bg-gray-200 rounded mr-2" onClick={()=>setRole(u.id, u.role==='admin'?'user':'admin')}>{u.role==='admin'?'Demote to user':'Promote to admin'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}