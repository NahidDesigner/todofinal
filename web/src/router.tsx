import { createHashRouter, Navigate } from 'react-router-dom'
import App from './App'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import AssignedTasksPage from './pages/AssignedTasksPage'
import LearningPage from './pages/LearningPage'
import NotificationsPage from './pages/NotificationsPage'
import AdminPage from './pages/admin/AdminPage'
import { useAuthGuard } from './hooks/useAuthGuard'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuthGuard()
  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <Navigate to="/auth" replace />
  return children
}

export const router = createHashRouter([
  { path: '/auth', element: <AuthPage /> },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'assigned', element: <AssignedTasksPage /> },
      { path: 'learning', element: <LearningPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'admin/*', element: <AdminPage /> },
    ]
  },
  { path: '*', element: <Navigate to="/app" replace /> }
])