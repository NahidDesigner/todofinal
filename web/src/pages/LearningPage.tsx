import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthGuard } from '../hooks/useAuthGuard'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'

type Entry = { text: string; createdAt: any }

export default function LearningPage() {
  const { user } = useAuthGuard()
  const [date, setDate] = useState(new Date())
  const dateKey = format(date, 'yyyy-MM-dd')
  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [weekly, setWeekly] = useState<{ day: Date; count: number }[]>([])

  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid, 'learning', dateKey)
    const unsub = onSnapshot(ref, snap => {
      const data = snap.data() as any
      setEntries(data?.entries || [])
    })
    return () => unsub()
  }, [user?.uid, dateKey])

  useEffect(() => {
    if (!user) return
    const start = startOfWeek(date, { weekStartsOn: 1 })
    Promise.all(Array.from({ length: 7 }).map(async (_, i) => {
      const d = addDays(start, i)
      const ref = doc(db, 'users', user.uid, 'learning', format(d, 'yyyy-MM-dd'))
      const snap = await getDoc(ref)
      const data = snap.data() as any
      return { day: d, count: (data?.entries || []).length as number }
    })).then(setWeekly).catch(console.error)
  }, [user?.uid, date])

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !text.trim()) return
    const ref = doc(db, 'users', user.uid, 'learning', dateKey)
    await setDoc(ref, {
      dateKey,
      entries: [...entries, { text, createdAt: serverTimestamp() }]
    }, { merge: true })
    setText('')
  }

  const weekSummary = useMemo(() => weekly.map(w => ({ day: `${format(w.day, 'EEE')} ${isSameDay(w.day, new Date()) ? '(today)' : ''}`, count: w.count })), [weekly])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm">Date</label>
        <input type="date" value={format(date, 'yyyy-MM-dd')} onChange={(e)=>setDate(new Date(e.target.value))} className="border rounded px-3 py-1" />
      </div>

      <form onSubmit={addEntry} className="flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="What did you learn?" className="flex-1 border rounded px-3 py-2" />
        <button className="bg-sky-600 text-white px-4 py-2 rounded">Add</button>
      </form>

      <ul className="space-y-2">
        {entries.map((e, idx) => (
          <li key={idx} className="bg-white p-3 rounded border">
            <div>{e.text}</div>
          </li>
        ))}
      </ul>

      <div>
        <h3 className="font-semibold mb-2">Weekly summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {weekSummary.map((w,i)=> (
            <div key={i} className="bg-white p-3 rounded border flex items-center justify-between">
              <div>{w.day}</div>
              <div className="text-sm text-gray-600">{w.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}