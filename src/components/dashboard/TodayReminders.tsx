'use client'

import { Check, Clock, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn, formatTime, getStatusColor } from '@/lib/utils'

interface Reminder {
  id: string
  status: string
  scheduled_time: string
  taken_at: string | null
  medications: {
    name: string
    dosage: string
    pill_color: string
  } | null
}

interface TodayRemindersProps {
  reminders: Reminder[]
}

const statusIcons = {
  taken: Check,
  missed: X,
  upcoming: Clock,
}

export default function TodayReminders({ reminders }: TodayRemindersProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Today's Schedule</h2>
        <Link
          href="/reminders"
          className="text-xs text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No doses scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder, index) => {
            const Icon = statusIcons[reminder.status as keyof typeof statusIcons] || Clock
            const isTaken = reminder.status === 'taken'
            const isMissed = reminder.status === 'missed'
            const pillColor = reminder.medications?.pill_color ?? '#94a3b8'
            const medName = reminder.medications
              ? `${reminder.medications.name} ${reminder.medications.dosage}`
              : 'Unknown medication'

            return (
              <div
                key={reminder.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-colors animate-fade-in',
                  isTaken
                    ? 'bg-emerald-50/60'
                    : isMissed
                    ? 'bg-red-50/60'
                    : 'bg-slate-50 hover:bg-slate-100',
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Pill color dot */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: pillColor }}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      isTaken ? 'text-slate-500 line-through' : 'text-slate-800',
                    )}
                  >
                    {medName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatTime(reminder.scheduled_time)}
                    {reminder.taken_at &&
                      ` · Taken at ${formatTime(new Date(reminder.taken_at).toTimeString().slice(0, 5))}`}
                  </p>
                </div>

                <span className={cn('badge text-[10px]', getStatusColor(reminder.status))}>
                  <Icon className="w-3 h-3 mr-1" />
                  {reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {reminders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-emerald-600">
              {reminders.filter((r) => r.status === 'taken').length}
            </p>
            <p className="text-[10px] text-slate-500">Taken</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-500">
              {reminders.filter((r) => r.status === 'missed').length}
            </p>
            <p className="text-[10px] text-slate-500">Missed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-500">
              {reminders.filter((r) => r.status === 'upcoming').length}
            </p>
            <p className="text-[10px] text-slate-500">Upcoming</p>
          </div>
        </div>
      )}
    </div>
  )
}