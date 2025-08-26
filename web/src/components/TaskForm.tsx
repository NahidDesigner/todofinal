import { useState } from 'react'

export default function TaskForm({ onSubmit }: { onSubmit: (data: { title: string; description?: string; dueAt?: string }) => void }) {
  const [form, setForm] = useState({ title: '', description: '', dueAt: '' })
  return (
    <form onSubmit={(e)=>{ e.preventDefault(); onSubmit(form); setForm({ title: '', description: '', dueAt: '' }) }} className="bg-white p-4 rounded shadow flex flex-col gap-3">
      <div className="font-semibold">Create Task</div>
      <input placeholder="Title" className="border rounded px-3 py-2" value={form.title} onChange={e=>setForm(f=>({...f, title: e.target.value}))} />
      <textarea placeholder="Description" className="border rounded px-3 py-2" value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} />
      <div>
        <label className="text-sm mr-2">Due date</label>
        <input type="date" value={form.dueAt} onChange={e=>setForm(f=>({...f, dueAt: e.target.value}))} className="border rounded px-3 py-1" />
      </div>
      <button className="self-start bg-sky-600 text-white px-4 py-2 rounded">Add</button>
    </form>
  )
}