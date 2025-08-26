import { format } from 'date-fns'

export interface TaskItem { id: string; title: string; description?: string; dueAt?: any; status: 'todo'|'in_progress'|'done' }

export default function TaskList({ tasks, onNext, onDelete }: { tasks: TaskItem[]; onNext: (t: TaskItem)=>void; onDelete: (id: string)=>void }) {
  return (
    <ul className="space-y-2">
      {tasks.map(t => (
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
            <button onClick={()=>onNext(t)} className="px-2 py-1 text-sm bg-gray-200 rounded">Next</button>
            <button onClick={()=>onDelete(t.id)} className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded">Delete</button>
          </div>
        </li>
      ))}
    </ul>
  )
}