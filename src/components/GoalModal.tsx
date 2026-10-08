import { useState, type FormEvent } from 'react'
import { GOAL_TERMS, catById, type Goal, type GoalTerm, type Task } from '../lib/core'
import Modal from './Modal'

const field = 'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm placeholder:text-muted/60 focus:border-teal/50'

export type GoalFields = Pick<Goal, 'title' | 'target' | 'unit' | 'habitId' | 'term'> & { current: number }

/** One-tap starting points, so a new goal is never a blank page. */
const IDEAS: Record<GoalTerm, { t: string; n: number; u: string }[]> = {
  short: [{ t: 'Work out 12 times', n: 12, u: 'workouts' }, { t: 'Read 5 chapters', n: 5, u: 'chapters' }, { t: 'Meditate 10 times', n: 10, u: 'sessions' }],
  mid: [{ t: 'Read 6 books', n: 6, u: 'books' }, { t: 'Complete 60 workouts', n: 60, u: 'workouts' }, { t: 'Study 100 hours', n: 100, u: 'hours' }],
  long: [{ t: 'Run a marathon', n: 42, u: 'km' }, { t: 'Read 52 books', n: 52, u: 'books' }, { t: 'Show up 365 days', n: 365, u: 'days' }],
}

interface Props {
  initial?: Goal
  /** Horizon preselected for a new goal. */
  initialTerm?: GoalTerm
  /** An ultimate goal already exists, so a new one cannot be added. */
  hasUltimate?: boolean
  /** Habits a goal can follow. */
  habits: Task[]
  onSubmit: (fields: GoalFields) => void
  onDelete?: () => void
  onClose: () => void
}

export default function GoalModal({ initial, initialTerm, hasUltimate, habits, onSubmit, onDelete, onClose }: Props) {
  const [term, setTerm] = useState<GoalTerm>(initial?.term ?? initialTerm ?? 'short')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [habitId, setHabitId] = useState(initial?.habitId ?? '')
  const [target, setTarget] = useState(initial ? String(initial.target) : '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [current, setCurrent] = useState(initial && !initial.habitId ? String(initial.current) : '0')
  const linked = !!habitId

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = title.trim()
    const goal = Math.round(Number(target))
    if (!name || !Number.isFinite(goal) || goal < 1) return
    onSubmit({
      term,
      title: name.slice(0, 60),
      target: Math.min(goal, 1_000_000),
      habitId: habitId || undefined,
      unit: linked ? 'check-ins' : unit.trim().slice(0, 16) || undefined,
      current: linked ? 0 : Math.max(0, Number(current) || 0),
    })
    onClose()
  }

  return (
    <Modal label={initial ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <h2 className="mb-5 text-lg font-semibold">{initial ? 'Edit goal' : 'New goal'}</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="mb-1.5 block text-xs text-muted">Time horizon</span>
          <div role="radiogroup" aria-label="Time horizon" className="grid grid-cols-3 gap-2">
            {GOAL_TERMS.map(o => {
              const taken = o.id === 'long' && !!hasUltimate && initial?.term !== 'long'
              return (
              <button key={o.id} type="button" role="radio" aria-checked={term === o.id} disabled={taken} onClick={() => setTerm(o.id)}
                className={`rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${term === o.id ? 'border-teal/60 bg-teal/10' : 'border-line text-ink/70 hover:border-white/25'}`}>
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-[11px] text-muted">{taken ? 'Already set' : o.hint}</span>
              </button>
            )})}
          </div>
          {term === 'long' && <p className="mt-1.5 text-xs text-muted/80">Your ultimate goal gets its own spotlight card on the Evolution page.</p>}
        </div>

        <div>
          <label htmlFor="goal-title" className="mb-1.5 block text-xs text-muted">Goal</label>
          <input id="goal-title" autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={60} placeholder="e.g. Read 12 books" className={field} />
          {!initial && !title && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDEAS[term].map(i => (
                <button key={i.t} type="button" onClick={() => { setTitle(i.t); setTarget(String(i.n)); setUnit(i.u); setHabitId('') }}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-ink/65 transition-colors hover:border-teal/40 hover:text-teal">{i.t}</button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="goal-habit" className="mb-1.5 block text-xs text-muted">Progress comes from</label>
          <select id="goal-habit" value={habitId} onChange={e => setHabitId(e.target.value)} className={field}>
            <option value="">Numbers I enter myself</option>
            {habits.map(h => <option key={h.id} value={h.id}>Check-ins of {h.text} ({catById(h.catId).label})</option>)}
            {initial?.habitId && !habits.some(h => h.id === initial.habitId) && <option value={initial.habitId}>A habit that was deleted</option>}
          </select>
          <p className="mt-1.5 text-xs text-muted/80">
            {linked ? 'Counts every check-in of this habit from the day the goal is created. Nothing to update by hand.' : 'You update the number yourself, for things EVOLVE cannot see, like books read or kilometres run.'}
          </p>
        </div>

        <div className={`grid gap-3 ${linked ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <div>
            <label htmlFor="goal-target" className="mb-1.5 block text-xs text-muted">{linked ? 'Target check-ins' : 'Target'}</label>
            <input id="goal-target" type="number" min="1" max="1000000" value={target} onChange={e => setTarget(e.target.value)} placeholder={linked ? '60' : '12'} className={field} />
          </div>
          {!linked && (
            <>
              <div>
                <label htmlFor="goal-current" className="mb-1.5 block text-xs text-muted">So far</label>
                <input id="goal-current" type="number" min="0" value={current} onChange={e => setCurrent(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="goal-unit" className="mb-1.5 block text-xs text-muted">Unit</label>
                <input id="goal-unit" value={unit} onChange={e => setUnit(e.target.value)} maxLength={16} placeholder="books" className={field} />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          {onDelete ? (
            <button type="button" onClick={() => { if (confirm('Delete this goal? Your check-ins are not affected.')) { onDelete(); onClose() } }}
              className="rounded-lg px-1 py-2 text-sm text-ink/60 transition-colors hover:text-red-400">Delete</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-3.5 py-2 text-sm transition-colors hover:border-white/25">Cancel</button>
            <button type="submit" className="rounded-lg bg-teal px-3.5 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90">{initial ? 'Save' : 'Add goal'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
