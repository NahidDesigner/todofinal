import { useState } from 'react'
import { z } from 'zod'
import { signIn, signUp } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

const schema = z.object({
  mode: z.enum(['signin','signup']),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional()
})

export default function AuthPage() {
  const [form, setForm] = useState({ mode: 'signin', email: '', password: '', displayName: '' })
  const [error, setError] = useState<string|undefined>()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    const parsed = schema.safeParse(form)
    if (!parsed.success) { setError(parsed.error.errors[0]?.message); return }
    try {
      setLoading(true)
      if (form.mode === 'signin') {
        await signIn(form.email, form.password)
      } else {
        await signUp(form.email, form.password, form.displayName)
      }
      navigate('/app')
    } catch (err: any) {
      setError(err?.message || 'Auth failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-6 rounded shadow space-y-4">
        <h1 className="text-xl font-semibold">{form.mode === 'signin' ? 'Sign in' : 'Sign up'}</h1>
        {error && <div className="text-red-600 text-sm" role="alert">{error}</div>}
        {form.mode === 'signup' && (
          <div>
            <label className="block text-sm mb-1">Display name</label>
            <input className="w-full border rounded px-3 py-2" value={form.displayName} onChange={e=>setForm(f=>({...f, displayName: e.target.value}))} />
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="w-full border rounded px-3 py-2" value={form.email} onChange={e=>setForm(f=>({...f, email: e.target.value}))} />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={form.password} onChange={e=>setForm(f=>({...f, password: e.target.value}))} />
        </div>
        <button disabled={loading} className="w-full bg-sky-600 text-white rounded py-2">{loading ? 'Please wait…' : 'Continue'}</button>
        <button type="button" className="w-full text-sm text-sky-700" onClick={()=>setForm(f=>({...f, mode: f.mode==='signin'?'signup':'signin'}))}>
          {form.mode==='signin' ? 'Create an account' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}