import type { IconName } from '../components/Icons'
import { weekStartIndex } from './preferences'

export type CatId = 'health' | 'mindset' | 'productivity' | 'learning' | 'lifestyle'
export type Priority = 'low' | 'medium' | 'high'
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

export interface Task {
  id: string
  catId: CatId
  text: string
  createdAt: number
  deletedAt: number | null
  priority: Priority
  duration?: number
  days?: WeekDay[]
  time?: string
}

export type GoalTerm = 'short' | 'mid' | 'long'
export const GOAL_TERMS: { id: GoalTerm; label: string; hint: string; empty: string }[] = [
  { id: 'short', label: 'Short term', hint: 'Days to weeks', empty: 'Add a quick win you can finish in the next few weeks' },
  { id: 'mid', label: 'Mid term', hint: 'A few months', empty: 'Add something to build towards over the next few months' },
  { id: 'long', label: 'Ultimate goal', hint: 'The big one', empty: 'Set the big goal everything else is working towards' },
]

export interface Goal {
  id: string
  title: string
  current: number
  target: number
  unit?: string
  color?: string
  createdAt: number
  /** The horizon: quick wins, a few months out, or the one big goal. */
  term: GoalTerm
  /** When set, progress is not typed in: it is the number of check-ins of this habit since the goal was created. */
  habitId?: string
}

export interface AppState {
  tasks: Task[]
  completions: Record<string, Record<string, boolean>>
  xp: number
  badges: string[]
  moodLog: Record<string, string>
  name: string
  goals: Goal[]
}

export interface HabitFields {
  catId: CatId
  text: string
  priority: Priority
  duration?: number
  days?: WeekDay[]
  time?: string
  oneOff?: boolean
}

export const ALL_DAYS: WeekDay[] = [0, 1, 2, 3, 4, 5, 6]

export const CATS: { id: CatId; label: string; color: string; icon: IconName }[] = [
  { id: 'health', label: 'Health', color: '#3DDC97', icon: 'dumbbell' },
  { id: 'mindset', label: 'Mindset', color: '#A78BFA', icon: 'brain' },
  { id: 'productivity', label: 'Productivity', color: '#64E8D3', icon: 'briefcase' },
  { id: 'learning', label: 'Learning', color: '#57B9F5', icon: 'book' },
  { id: 'lifestyle', label: 'Lifestyle', color: '#F0B45A', icon: 'leaf' },
]

export const catById = (id: CatId) => CATS.find(c => c.id === id) ?? CATS[0]

export const XP_PER_TASK = 10
const KEY = 'evolveAppData'

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

const CAT_MIGRATION: Record<string, CatId> = {
  fitness: 'health',
  mental: 'mindset',
  social: 'productivity',
  skills: 'learning',
}

const empty = (): AppState => ({ tasks: [], completions: {}, xp: 0, badges: [], moodLog: {}, name: '', goals: [] })

function parseTask(t: any): Task {
  const rawDays = Array.isArray(t.days) ? t.days.filter((x: any) => Number.isInteger(x) && x >= 0 && x <= 6) : []
  const duration = Number(t.duration)
  return {
    id: String(t.id),
    catId: CATS.some(c => c.id === t.catId) ? t.catId : CAT_MIGRATION[t.catId] ?? 'mindset',
    text: String(t.text ?? ''),
    createdAt: Number(t.createdAt) || startOfDay(new Date()),
    deletedAt: t.deletedAt ? Number(t.deletedAt) : null,
    priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : undefined,
    days: rawDays.length > 0 && rawDays.length < 7 ? (rawDays as WeekDay[]) : undefined,
    time: typeof t.time === 'string' && /^\d{2}:\d{2}$/.test(t.time) ? t.time : undefined,
  }
}

function parseGoal(g: any): Goal {
  return {
    id: String(g.id),
    title: String(g.title ?? 'Goal'),
    current: Math.max(0, Number(g.current) || 0),
    target: Math.max(1, Number(g.target) || 100),
    unit: typeof g.unit === 'string' ? g.unit : undefined,
    color: typeof g.color === 'string' ? g.color : undefined,
    createdAt: Number(g.createdAt) || startOfDay(new Date()),
    term: g.term === 'mid' || g.term === 'long' ? g.term : 'short',
    habitId: typeof g.habitId === 'string' && g.habitId ? g.habitId : undefined,
  }
}

export function loadState(): AppState {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!p) return empty()
    return {
      tasks: (Array.isArray(p.tasks) ? p.tasks : []).map(parseTask),
      completions: p.completions && typeof p.completions === 'object' ? p.completions : {},
      xp: Number(p.xp) || 0,
      badges: Array.isArray(p.badges) ? p.badges : [],
      moodLog: p.moodLog && typeof p.moodLog === 'object' ? p.moodLog : {},
      name: typeof p.name === 'string' ? p.name.slice(0, 40) : '',
      goals: Array.isArray(p.goals) ? p.goals.map(parseGoal) : [],
    }
  } catch {
    return empty()
  }
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}

export function isScheduledOn(task: Task, d: Date) {
  return !task.days || task.days.includes(d.getDay() as WeekDay)
}

export function tasksOn(s: AppState, d: Date) {
  const t = startOfDay(d)
  return s.tasks.filter(x => x.createdAt <= t && (!x.deletedAt || x.deletedAt > t) && isScheduledOn(x, d))
}

export const habitDone = (s: AppState, task: Task, d: Date) => !!s.completions[dayKey(d)]?.[task.id]

export function dayPct(s: AppState, d: Date) {
  const ts = tasksOn(s, d)
  const c = s.completions[dayKey(d)] ?? {}
  return ts.length ? Math.round((ts.filter(t => c[t.id]).length / ts.length) * 100) : 0
}

export function habitStreak(s: AppState, task: Task, now = new Date()) {
  const d = new Date(now)
  if (!isScheduledOn(task, d) || !habitDone(s, task, d)) d.setDate(d.getDate() - 1)
  let n = 0, guard = 0
  while (guard++ < 400) {
    if (!isScheduledOn(task, d)) {
      d.setDate(d.getDate() - 1)
      continue
    }
    if (!habitDone(s, task, d)) break
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function habitRate(s: AppState, task: Task, days = 30, now = new Date()) {
  let done = 0, sched = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(now, -i)
    if (d.getTime() < startOfDay(new Date(task.createdAt))) break
    if (!isScheduledOn(task, d)) continue
    sched++
    if (habitDone(s, task, d)) done++
  }
  return sched ? Math.round((done / sched) * 100) : 0
}

export function streak(s: AppState, now = new Date()) {
  const full = (x: Date) => {
    const ts = tasksOn(s, x)
    const c = s.completions[dayKey(x)] ?? {}
    return ts.length > 0 && ts.every(t => c[t.id])
  }
  const d = new Date(now)
  let n = 0
  if (!full(d)) d.setDate(d.getDate() - 1)
  while (n < 366 && full(d)) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export function weekDots(s: AppState, now = new Date()) {
  const today = startOfDay(now)
  const start = weekStartIndex()
  const weekStart = addDays(now, -((now.getDay() - start + 7) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    const future = d.getTime() > today
    return {
      label: 'MTWTFSS'[i],
      pct: future ? 0 : dayPct(s, d),
      hasTasks: tasksOn(s, d).length > 0,
      isToday: d.getTime() === today,
      future,
    }
  })
}

export function weekdayBars(s: AppState, now = new Date()) {
  const todayIdx = (now.getDay() - weekStartIndex() + 7) % 7
  return Array.from({ length: 7 }, (_, i) => {
    let sum = 0, n = 0
    const back = (todayIdx - i + 7) % 7
    const first = back === 0 ? 7 : back
    for (let w = 0; w < 6; w++) {
      const d = addDays(now, -(first + 7 * w))
      if (tasksOn(s, d).length) {
        sum += dayPct(s, d)
        n++
      }
    }
    return n ? Math.round(sum / n) : 0
  })
}

export function catBreakdown(s: AppState, now = new Date(), days = 30) {
  const stats = CATS.map(cat => ({ cat, done: 0, sched: 0 }))
  const byId = new Map(stats.map(x => [x.cat.id, x]))
  for (let i = 0; i < days; i++) {
    const d = addDays(now, -i)
    for (const t of tasksOn(s, d)) {
      const st = byId.get(t.catId)
      if (!st) continue
      st.sched++
      if (habitDone(s, t, d)) st.done++
    }
  }
  const totalDone = stats.reduce((a, x) => a + x.done, 0)
  return stats.map(({ cat, done, sched }) => ({
    cat,
    done,
    sched,
    share: totalDone ? Math.round((done / totalDone) * 100) : 0,
    rate: sched ? Math.round((done / sched) * 100) : 0,
  }))
}

function avgPct(s: AppState, end: Date, days: number) {
  let sum = 0, n = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(end, -i)
    if (tasksOn(s, d).length) {
      sum += dayPct(s, d)
      n++
    }
  }
  return n ? sum / n : null
}

export function insight(s: AppState, now = new Date()) {
  const yesterday = addDays(now, -1)
  const cur = avgPct(s, yesterday, 7)
  const prev = avgPct(s, addDays(yesterday, -7), 7)
  if (cur === null) return 'Finish a full day of habits and your first insight shows up here.'
  if (prev === null) return `You averaged ${Math.round(cur)}% completion over the last 7 days. Keep going.`
  const diff = Math.round(cur - prev)
  if (diff > 0) return `You're ${diff} points more consistent than the week before. Keep it up!`
  if (diff < 0) return `Completion is ${-diff} points below the week before. One good day turns it around.`
  return `You're holding steady at ${Math.round(cur)}% completion, same as the week before.`
}