import { useState } from 'react'
import AdminUsers from './AdminUsers'
import AdminAssignTask from './AdminAssignTask'
import AdminManageTasks from './AdminManageTasks'
import { useAuthGuard } from '../../hooks/useAuthGuard'

export default function AdminPage() {
  const [tab, setTab] = useState<'users'|'assign'|'manage'>('users')
  const { user } = useAuthGuard()
  if (user?.role !== 'admin') return <div className="text-sm text-gray-600">Not authorized</div>
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={()=>setTab('users')} className={`px-3 py-1 rounded ${tab==='users'?'bg-sky-600 text-white':'bg-gray-200'}`}>Users</button>
        <button onClick={()=>setTab('assign')} className={`px-3 py-1 rounded ${tab==='assign'?'bg-sky-600 text-white':'bg-gray-200'}`}>Assign Task</button>
        <button onClick={()=>setTab('manage')} className={`px-3 py-1 rounded ${tab==='manage'?'bg-sky-600 text-white':'bg-gray-200'}`}>Manage Assigned</button>
      </div>
      {tab==='users' && <AdminUsers />}
      {tab==='assign' && <AdminAssignTask />}
      {tab==='manage' && <AdminManageTasks />}
    </div>
  )
}