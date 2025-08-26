import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

if (import.meta.env.VITE_BASE_PATH && import.meta.env.VITE_BASE_PATH !== '/') {
  const base = document.createElement('base')
  base.href = import.meta.env.VITE_BASE_PATH.endsWith('/') ? import.meta.env.VITE_BASE_PATH : import.meta.env.VITE_BASE_PATH + '/'
  document.head.appendChild(base)
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)