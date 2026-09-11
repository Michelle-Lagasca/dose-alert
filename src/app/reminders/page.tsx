'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import TopNav from '@/components/layout/TopNav'
import { cn, formatTime, getStatusColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase/browser'
import { createNotification } from '@/lib/notifications'
import { deriveStatus, getAdherenceRate } from '@/lib/medications'

const supabase = createClient()

// Adjusts a medication's stock by `delta` (e.g. -1 on taken, +1 on undo-via-missed),
// clamps it between 0 and total_stock, re-derives status, persists both, and
// fires a low-stock/expired notification if the status just crossed into that.
async function adjustStock(medicationId: string, delta: number, userId: string, medName: string) {
  const { data: med, error } = await supabase
    .from('medications')
    .select('stock, total_stock, end_date, status')
    .eq('id', medicationId)
    .single()

  if (error || !med) return

  const newStock = Math.max(0, Math.min(med.total_stock, med.stock + delta))

  let adherence: number | null = null
  if (med.end_date && new Date(med.end_date) < new Date()) {
    adherence = await getAdherenceRate(medicationId)
  }
  const newStatus = deriveStatus(newStock, med.total_stock, med.end_date, adherence)

  await supabase
    .from('medications')
    .update({ stock: newStock, status: newStatus })
    .eq('id', medicationId)

  if (newStatus !== med.status) {
    if (newStatus === 'low-stock') {
      await createNotification(
        userId, 'warning',
        `${medName} is running low (${newStock} pill${newStock === 1 ? '' : 's'} left)`,
      )
    } else if (newStatus === 'completed') {
      await createNotification(userId, 'success', `${medName} course completed`)
    } else if (newStatus === 'expired') {
      await createNotification(userId, 'info', `${medName} has expired`)
    }
  }
}

// ── Types ─────────────────────────────────────────────────────────────
interface Reminder {
  id: string
  status: string
  scheduled_time: string
  scheduled_date: string
  taken_at: string | null
  medications: {
    name: string
    dosage: string
    pill_color: string
  } | null
}

// ── Time slot groupings ───────────────────────────────────────────────
const timeSlots = [
  { label: 'Night',     range: '12:00 AM – 5:59 AM',  start: 0,  end: 5  },
  { label: 'Morning',   range: '6:00 AM – 11:59 AM',  start: 6,  end: 11 },
  { label: 'Afternoon', range: '12:00 PM – 5:59 PM',  start: 12, end: 17 },
  { label: 'Evening',   range: '6:00 PM – 11:59 PM',  start: 18, end: 23 },
]

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateStr(date: Date) {
  return date.toISOString().split('T')[0]
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function RemindersPage() {
  const [view, setView]           = useState<'list' | 'timeline'>('list')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading]     = useState(true)
  const [updating, setUpdating]   = useState<string | null>(null)
  const [toast, setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Week strip — always anchored to the week of selectedDate
  const weekStart = new Date(selectedDate)
  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const today = new Date()

  const fetchReminders = useCallback(async (date: Date) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
    .from('reminders')
    .select('id, status, scheduled_time, scheduled_date, taken_at, medication_id, medications(name, dosage, pill_color)')
    .eq('user_id', user.id)
    .eq('scheduled_date', toDateStr(date))
    .order('scheduled_time', { ascending: true })

    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setReminders((data as any) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchReminders(selectedDate) }, [selectedDate, fetchReminders])

  // ── Mark taken ──────────────────────────────────────────────────────
const markTaken = async (id: string) => {
  setUpdating(id)
  const takenAt = new Date().toISOString()

  const { error } = await supabase
    .from('reminders')
    .update({ status: 'taken', taken_at: takenAt })
    .eq('id', id)

  if (error) { showToast(error.message, 'error'); setUpdating(null); return }

  const reminder = reminders.find((r) => r.id === id)
  console.log('reminder found:', reminder)
  console.log('medication_id:', (reminder as any)?.medication_id)
  const prevStatus = reminder?.status

  if (reminder) {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('user:', user?.id)

    if (user) {
      const { error: logError, data: logData } = await supabase
        .from('dose_logs')
        .insert({
          user_id: user.id,
          medication_id: (reminder as any).medication_id,
          medication_name: reminder.medications
            ? `${reminder.medications.name} ${reminder.medications.dosage}`
            : '',
          pill_color: reminder.medications?.pill_color ?? '#94a3b8',
          scheduled_date: reminder.scheduled_date,
          scheduled_time: reminder.scheduled_time,
          taken_at: takenAt,
          status: 'taken',
        })
        .select()

      console.log('dose_log insert data:', logData)
      console.log('dose_log insert error:', logError)

      const medName = reminder.medications
        ? `${reminder.medications.name} ${reminder.medications.dosage}`
        : 'Medication'
      await createNotification(user.id, 'success', `${medName} marked as taken`)

      // Deduct one pill from stock — but only if this dose wasn't already
      // counted as taken (avoids double-deducting on a re-click/retry).
      if (prevStatus !== 'taken') {
        await adjustStock((reminder as any).medication_id, -1, user.id, medName)
      }
    }
  }

  setReminders((prev) =>
    prev.map((r) => r.id === id ? { ...r, status: 'taken', taken_at: takenAt } : r)
  )
  setUpdating(null)
  showToast('Marked as taken!', 'success')
}

  // ── Mark missed ─────────────────────────────────────────────────────
  const markMissed = async (id: string) => {
    setUpdating(id)

    const { error } = await supabase
      .from('reminders')
      .update({ status: 'missed', taken_at: null })
      .eq('id', id)

    if (error) { showToast(error.message, 'error'); setUpdating(null); return }

    // Also insert into dose_logs for history
    const reminder = reminders.find((r) => r.id === id)
    const prevStatus = reminder?.status
    if (reminder) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('dose_logs').insert({
          user_id: user.id,
          medication_id: (reminder as any).medication_id,
          medication_name: reminder.medications
            ? `${reminder.medications.name} ${reminder.medications.dosage}`
            : '',
          pill_color: reminder.medications?.pill_color ?? '#94a3b8',
          scheduled_date: reminder.scheduled_date,
          scheduled_time: reminder.scheduled_time,
          taken_at: null,
          status: 'missed',
        })

        const medName = reminder.medications
          ? `${reminder.medications.name} ${reminder.medications.dosage}`
          : 'Medication'
        await createNotification(
          user.id, 'warning',
          `${medName} dose at ${formatTime(reminder.scheduled_time)} was missed`,
        )

        // If this dose had previously been marked "taken", we're undoing that —
        // give the pill back to stock.
        if (prevStatus === 'taken') {
          await adjustStock((reminder as any).medication_id, 1, user.id, medName)
        }
      }
    }

    setReminders((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: 'missed', taken_at: null } : r)
    )
    setUpdating(null)
    showToast('Marked as missed.', 'success')
  }

  // ── Group by time slot ──────────────────────────────────────────────
  const groupBySlot = (start: number, end: number) =>
    reminders.filter((r) => {
      const h = parseInt(r.scheduled_time.split(':')[0])
      return h >= start && h <= end
    })

  // ── Derived stats ───────────────────────────────────────────────────
  const taken    = reminders.filter((r) => r.status === 'taken').length
  const missed   = reminders.filter((r) => r.status === 'missed').length
  const upcoming = reminders.filter((r) => r.status === 'upcoming').length
  const isToday  = toDateStr(selectedDate) === toDateStr(today)

  return (
    <div>
      <TopNav title="Reminders" subtitle="Track your daily medication schedule" />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* View Toggle + Date Nav */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {(['list', 'timeline'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                  view === v ? 'bg-white text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <button
              onClick={() => {
                const prev = new Date(selectedDate)
                prev.setDate(prev.getDate() - 1)
                setSelectedDate(prev)
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium min-w-[180px] text-center">
              {isToday
                ? 'Today'
                : selectedDate.toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const next = new Date(selectedDate)
                next.setDate(next.getDate() + 1)
                setSelectedDate(next)
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Week Calendar Strip */}
        <div className="card p-4">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => {
              const isSelected = toDateStr(d) === toDateStr(selectedDate)
              const isTodayDay = toDateStr(d) === toDateStr(today)
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(new Date(d))}
                  className={cn(
                    'flex flex-col items-center py-2 rounded-xl cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : isTodayDay
                      ? 'bg-teal-50 text-teal-700'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <span className={cn('text-[10px] font-medium mb-1', isSelected ? 'text-brand-200' : 'text-slate-400')}>
                    {days[d.getDay()]}
                  </span>
                  <span className={cn('text-sm font-bold', isSelected ? 'text-white' : 'text-slate-700')}>
                    {d.getDate()}
                  </span>
                  {isTodayDay && !isSelected && (
                    <div className="w-1 h-1 bg-teal-400 rounded-full mt-1" />
                  )}
                  {isSelected && (
                    <div className="w-1 h-1 bg-brand-200 rounded-full mt-1" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Summary Badges */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All',      count: reminders.length, color: 'bg-slate-100 text-slate-700' },
            { label: 'Taken',    count: taken,             color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Missed',   count: missed,            color: 'bg-red-100 text-red-700' },
            { label: 'Upcoming', count: upcoming,          color: 'bg-blue-100 text-blue-700' },
          ].map((s) => (
            <div key={s.label} className={cn('badge px-3 py-1', s.color)}>
              {s.label}: <span className="font-bold ml-1">{s.count}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="card p-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No reminders for this day</p>
            <p className="text-slate-400 text-sm mt-1">
              Add medications to automatically generate reminders
            </p>
          </div>
        ) : (
          <>
            {/* List View */}
            {view === 'list' && (
              <div className="space-y-4">
                {timeSlots.map((slot) => {
                  const slotReminders = groupBySlot(slot.start, slot.end)
                  if (slotReminders.length === 0) return null
                  return (
                    <div key={slot.label} className="card p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-brand-600" />
                        <h3 className="text-sm font-semibold text-slate-900">{slot.label}</h3>
                        <span className="text-xs text-slate-400">{slot.range}</span>
                      </div>
                      <div className="space-y-3">
                        {slotReminders.map((r) => (
                          <ReminderRow
                            key={r.id}
                            reminder={r}
                            isUpdating={updating === r.id}
                            onTaken={markTaken}
                            onMissed={markMissed}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Timeline View */}
            {view === 'timeline' && (
              <div className="card p-5">
                <div className="relative">
                  <div className="absolute left-16 top-0 bottom-0 w-px bg-slate-100" />
                  <div className="space-y-6">
                    {[...reminders]
                      .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
                      .map((r, i) => {
                        const pillColor = r.medications?.pill_color ?? '#94a3b8'
                        const medName = r.medications
                          ? `${r.medications.name} ${r.medications.dosage}`
                          : 'Unknown'
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-4 animate-fade-in"
                            style={{ animationDelay: `${i * 40}ms` }}
                          >
                            <span className="w-14 text-right text-xs font-mono text-slate-400 flex-shrink-0">
                              {formatTime(r.scheduled_time)}
                            </span>
                            <div className="relative z-10 flex-shrink-0">
                              <div
                                className={cn(
                                  'w-3 h-3 rounded-full border-2 border-white shadow-sm',
                                  r.status === 'taken'
                                    ? 'bg-emerald-500'
                                    : r.status === 'missed'
                                    ? 'bg-red-500'
                                    : 'bg-blue-400',
                                )}
                              />
                            </div>
                            <div className="flex-1 flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: pillColor }}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{medName}</p>
                                {r.taken_at && (
                                  <p className="text-xs text-slate-400">
                                    Taken at {formatTime(new Date(r.taken_at).toTimeString().slice(0, 5))}
                                  </p>
                                )}
                              </div>
                              <span className={cn('badge text-[10px]', getStatusColor(r.status))}>
                                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Reminder Row ──────────────────────────────────────────────────────
function ReminderRow({
  reminder, isUpdating, onTaken, onMissed,
}: {
  reminder: Reminder
  isUpdating: boolean
  onTaken: (id: string) => void
  onMissed: (id: string) => void
}) {
  const isUpcoming = reminder.status === 'upcoming'
  const pillColor  = reminder.medications?.pill_color ?? '#94a3b8'
  const medName    = reminder.medications
    ? `${reminder.medications.name} ${reminder.medications.dosage}`
    : 'Unknown medication'

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-colors',
        reminder.status === 'taken'
          ? 'bg-emerald-50'
          : reminder.status === 'missed'
          ? 'bg-red-50'
          : 'bg-slate-50 hover:bg-slate-100',
      )}
    >
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pillColor }} />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-semibold',
            reminder.status === 'taken' ? 'line-through text-slate-400' : 'text-slate-800',
          )}
        >
          {medName}
        </p>
        <p className="text-xs text-slate-400">
          Scheduled: {formatTime(reminder.scheduled_time)}
          {reminder.taken_at &&
            ` · Taken: ${formatTime(new Date(reminder.taken_at).toTimeString().slice(0, 5))}`}
        </p>
      </div>

      <span className={cn('badge text-[10px] hidden sm:inline-flex', getStatusColor(reminder.status))}>
        {reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1)}
      </span>

      {isUpcoming && (
        <div className="flex gap-1.5">
          {isUpdating ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <>
              <button
                onClick={() => onTaken(reminder.id)}
                className="w-8 h-8 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg flex items-center justify-center transition-colors"
                title="Mark as taken"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onMissed(reminder.id)}
                className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center justify-center transition-colors"
                title="Mark as missed"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}