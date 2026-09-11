'use client'

import { useEffect, useState } from 'react'
import { Pill, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import TopNav from '@/components/layout/TopNav'
import StatCard from '@/components/dashboard/StatCard'
import TodayReminders from '@/components/dashboard/TodayReminders'
import { AdherenceChart, WeeklyChart } from '@/components/dashboard/Charts'
import LowStockAlert from '@/components/dashboard/LowStackAlert'
import QuickChat from '@/components/dashboard/QuickChat'
import { createClient } from '@/lib/supabase/browser'

const supabase = createClient()

interface Profile {
  full_name: string
}

interface Medication {
  id: string
  status: string
  stock: number
  total_stock: number
}

interface Reminder {
  id: string
  status: string
  medication_id: string
  scheduled_time: string
  taken_at: string | null
  medications: { name: string; dosage: string; pill_color: string } | null
}

interface DoseLog {
  scheduled_date: string
  status: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [medications, setMedications] = useState<Medication[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([])
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      // Fetch medications
      const { data: medsData } = await supabase
        .from('medications')
        .select('id, status, stock, total_stock')
        .eq('user_id', user.id)

      // Fetch today's reminders joined with medication info
      const { data: remindersData } = await supabase
        .from('reminders')
        .select('id, status, medication_id, scheduled_time, taken_at, medications(name, dosage, pill_color)')
        .eq('user_id', user.id)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true })

      // Fetch dose logs for the adherence charts (monthly trend + this week)
      const { data: doseLogsData } = await supabase
        .from('dose_logs')
        .select('scheduled_date, status')
        .eq('user_id', user.id)

      setProfile(profileData)
      setMedications(medsData || [])
      setReminders((remindersData as any) || [])
      setDoseLogs(doseLogsData || [])
      setLoading(false)
    }

    fetchData()
  }, [today])

  // Derived stats
  const activeMeds = medications.filter((m) => m.status === 'active' || m.status === 'low-stock')
  const expiredMeds = medications.filter((m) => m.status === 'expired')
  const takenToday = reminders.filter((r) => r.status === 'taken').length
  const totalToday = reminders.length
  const adherencePct = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 0
  const upcomingToday = reminders.filter((r) => r.status === 'upcoming').length

  // Monthly adherence trend (last 7 months) — same logic as the History page
  const monthlyTrend = buildMonthlyTrend(doseLogs)

  // This week's taken/missed, Monday through Sunday
  const weeklyData = buildWeeklyData(doseLogs)

  // Actual current-month adherence (distinct from today's adherence above)
  const now = new Date()
  const thisMonthLogs = doseLogs.filter((l) => {
    const d = new Date(l.scheduled_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthlyAdherencePct = thisMonthLogs.length > 0
    ? Math.round((thisMonthLogs.filter((l) => l.status === 'taken').length / thisMonthLogs.length) * 100)
    : 0

  const firstName = profile?.full_name?.split(' ')[0] ?? '...'

  if (loading) {
    return (
      <div>
        <TopNav title="Dashboard" subtitle="Loading your medication overview..." />
        <div className="p-6 space-y-6 animate-pulse">
          <div className="h-32 rounded-2xl bg-slate-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopNav
        title="Dashboard"
        subtitle={`${greeting}, ${firstName}! Here's your medication overview.`}
      />

      <div className="p-6 space-y-6">
        {/* Welcome Banner */}
        <div
          className="rounded-2xl p-6 flex items-center justify-between overflow-hidden relative text-white"
          style={{ background: 'linear-gradient(135deg, #4A9B8E 0%, #3a8a7b 60%, #2f7063 100%)' }}
        >
          <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute right-24 bottom-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2" />

          <div className="relative z-10">
            <p className="text-xs text-white/60 mb-1 font-medium uppercase tracking-wider">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h2 className="text-xl font-extrabold tracking-tight">
              {greeting}, {firstName}! 👋
            </h2>
            <p className="text-sm text-white/75 mt-1.5 font-normal">
              You have{' '}
              <span className="text-white font-bold">
                {upcomingToday} upcoming dose{upcomingToday !== 1 ? 's' : ''}
              </span>{' '}
              today.
              {takenToday > 0 && ` ${takenToday} already taken — keep it up!`}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-4 relative z-10">
            <div className="text-right">
              <p className="text-4xl font-extrabold tracking-tight">{adherencePct}%</p>
              <p className="text-xs text-white/60 font-medium mt-0.5">Today's adherence</p>
            </div>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ border: '3px solid rgba(232,115,90,0.6)', background: 'rgba(232,115,90,0.15)' }}
            >
              <TrendingUp className="w-7 h-7" style={{ color: '#F08070' }} />
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Active Medications"
            value={activeMeds.length}
            icon={Pill}
            iconColor="text-brand-500"
            iconBg="bg-brand-50"
            subtitle={`${expiredMeds.length} expired`}
          />
          <StatCard
            title="Doses Taken Today"
            value={totalToday > 0 ? `${takenToday}/${totalToday}` : '—'}
            icon={CheckCircle}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            subtitle={`${adherencePct}% adherence`}
            accent={takenToday > 0 && takenToday === totalToday ? '🎉 Perfect day!' : undefined}
          />
          <StatCard
            title="Upcoming Doses"
            value={upcomingToday}
            icon={AlertTriangle}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            subtitle="Scheduled for later today"
          />
          <StatCard
            title="Monthly Adherence"
            value={thisMonthLogs.length > 0 ? `${monthlyAdherencePct}%` : '—'}
            icon={TrendingUp}
            iconColor="text-teal-400"
            iconBg="bg-teal-50"
            subtitle={new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TodayReminders reminders={reminders} />
          </div>
          <div className="space-y-4">
            <LowStockAlert medications={medications as any} />
            <QuickChat />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdherenceChart data={monthlyTrend} />
          <WeeklyChart data={weeklyData} />
        </div>
      </div>
    </div>
  )
}

// Builds the last-7-months adherence trend from raw dose logs.
// Mirrors the equivalent logic on the History page.
function buildMonthlyTrend(logs: DoseLog[]): { month: string; adherence: number }[] {
  const monthMap: Record<string, { taken: number; total: number }> = {}

  logs.forEach((log) => {
    const date = new Date(log.scheduled_date)
    const key = date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
    if (!monthMap[key]) monthMap[key] = { taken: 0, total: 0 }
    monthMap[key].total++
    if (log.status === 'taken') monthMap[key].taken++
  })

  return Object.entries(monthMap)
    .slice(-7)
    .map(([month, { taken, total }]) => ({
      month,
      adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
    }))
}

// Builds Mon–Sun taken/missed counts for the current calendar week.
function buildWeeklyData(logs: DoseLog[]): { day: string; taken: number; missed: number }[] {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  return dayLabels.map((day, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLogs = logs.filter((l) => l.scheduled_date === dateStr)
    return {
      day,
      taken: dayLogs.filter((l) => l.status === 'taken').length,
      missed: dayLogs.filter((l) => l.status === 'missed').length,
    }
  })
}