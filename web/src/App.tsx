import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthGuard } from './hooks/useAuthGuard'
import { signOut } from './lib/auth'
import NotificationBell from './components/NotificationBell'
import { useEffect } from 'react'
import { initFcmAndSaveToken } from './lib/fcm'

export default function App() {
  const { user } = useAuthGuard()
  const navigate = useNavigate()
  useEffect(() => { if (user) { initFcmAndSaveToken().catch(console.error) } }, [user?.uid])
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="bg-white border-r p-4 space-y-4">
        <div className="text-xl font-bold">Smart TODO</div>
        <nav className="flex flex-col gap-2">
          <NavLink to="/app" end className={({isActive})=>isActive? 'font-semibold text-sky-600':'text-gray-700'}>My Tasks</NavLink>
          <NavLink to="/app/assigned" className={({isActive})=>isActive? 'font-semibold text-sky-600':'text-gray-700'}>Assigned to Me</NavLink>
          <NavLink to="/app/learning" className={({isActive})=>isActive? 'font-semibold text-sky-600':'text-gray-700'}>Learning</NavLink>
          <NavLink to="/app/notifications" className={({isActive})=>isActive? 'font-semibold text-sky-600':'text-gray-700'}>Notifications</NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/app/admin" className={({isActive})=>isActive? 'font-semibold text-sky-600':'text-gray-700'}>Admin</NavLink>
          )}
        </nav>
      </aside>
      <main className="p-4">
        <header className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">Signed in as {user?.displayName || user?.email}</div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button className="px-3 py-1 rounded bg-gray-100" onClick={async ()=>{ await signOut(); navigate('/auth') }}>Sign out</button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}