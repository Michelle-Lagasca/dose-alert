'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, Loader2,
} from 'lucide-react'
import TopNav from '@/components/layout/TopNav'
import { cn, getStatusColor, formatTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/browser'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const supabase = createClient()

// ── Types ─────────────────────────────────────────────────────────────
interface DoseLog {
  id: string
  medication_name: string
  pill_color: string
  scheduled_date: string
  scheduled_time: string
  taken_at: string | null
  status: string
  note: string | null
}

interface AdherencePoint {
  month: string
  adherence: number
}

const ITEMS_PER_PAGE = 6

const statusIcons = {
  taken:    CheckCircle,
  missed:   XCircle,
  late:     AlertCircle,
  upcoming: Clock,
}

const statusIconColors = {
  taken:    'text-emerald-500',
  missed:   'text-red-500',
  late:     'text-amber-500',
  upcoming: 'text-blue-500',
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [logs, setLogs]               = useState<DoseLog[]>([])
  const [adherence, setAdherence]     = useState<AdherencePoint[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage]               = useState(1)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch all dose logs for this user
    const { data, error } = await supabase
      .from('dose_logs')
      .select('id, medication_name, pill_color, scheduled_date, scheduled_time, taken_at, status, note')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false })

    if (error) { setLoading(false); return }

    setLogs(data || [])
    setAdherence(buildAdherenceData(data || []))
    setLoading(false)
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // ── Build monthly adherence from logs ────────────────────────────
  function buildAdherenceData(data: DoseLog[]): AdherencePoint[] {
    const monthMap: Record<string, { taken: number; total: number }> = {}

    data.forEach((log) => {
      const date  = new Date(log.scheduled_date)
      const key   = date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
      if (!monthMap[key]) monthMap[key] = { taken: 0, total: 0 }
      monthMap[key].total++
      if (log.status === 'taken' || log.status === 'late') monthMap[key].taken++
    })

    return Object.entries(monthMap)
      .slice(-7)
      .map(([month, { taken, total }]) => ({
        month,
        adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
      }))
  }

  // ── Filter ───────────────────────────────────────────────────────
  const filtered = logs.filter((h) => {
    const matchSearch = h.medication_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || h.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Group paginated by date
  const groupedByDate: Record<string, DoseLog[]> = {}
  paginated.forEach((h) => {
    if (!groupedByDate[h.scheduled_date]) groupedByDate[h.scheduled_date] = []
    groupedByDate[h.scheduled_date].push(h)
  })

  // Summary stats
  const takenCount    = logs.filter((h) => h.status === 'taken').length
  const missedCount   = logs.filter((h) => h.status === 'missed').length
  const lateCount     = logs.filter((h) => h.status === 'late').length
  const adherenceRate = logs.length > 0
    ? Math.round(((takenCount + lateCount) / logs.length) * 100)
    : 0

  // ── Export CSV ───────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Date', 'Medication', 'Scheduled Time', 'Taken At', 'Status', 'Note']
    const rows = filtered.map((h) => [
      h.scheduled_date,
      h.medication_name,
      h.scheduled_time,
      h.taken_at ? new Date(h.taken_at).toLocaleTimeString() : '—',
      h.status,
      h.note || '',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `dose-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <TopNav title="History & Logs" subtitle="Review your medication intake history" />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Logged',   value: logs.length,    icon: Clock,        color: 'text-slate-600',  bg: 'bg-slate-50'  },
            { label: 'Taken',          value: takenCount,     icon: CheckCircle,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Missed',         value: missedCount,    icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50'    },
            { label: 'Adherence Rate', value: `${adherenceRate}%`, icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50' },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className="stat-card">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                  <Icon className={cn('w-4 h-4', s.color)} />
                </div>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* Adherence Trend Chart */}
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="section-title">Adherence Trend</h2>
            <p className="text-xs text-slate-400 mt-0.5">Monthly adherence percentage</p>
          </div>
          {adherence.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-slate-400 text-sm">
              Not enough data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={adherence} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '12px' }}
                  formatter={(val: number) => [`${val}%`, 'Adherence']}
                />
                <Area
                  type="monotone"
                  dataKey="adherence"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#trendGrad)"
                  dot={{ r: 3, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="pl-9 input-field"
              placeholder="Search medication..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="input-field w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          >
            {['All', 'taken', 'missed', 'late'].map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* History Table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Medication Logs</span>
            <span className="text-xs text-slate-400">{filtered.length} records</span>
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : Object.entries(groupedByDate).length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No records found</p>
              <p className="text-slate-400 text-sm mt-1">
                Mark doses as taken or missed in the Reminders page to build your history
              </p>
            </div>
          ) : (
            Object.entries(groupedByDate).map(([date, entries]) => (
              <div key={date}>
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-PH', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {entries.map((entry) => {
                    const StatusIcon = statusIcons[entry.status as keyof typeof statusIcons] || Clock
                    const iconColor  = statusIconColors[entry.status as keyof typeof statusIconColors] || 'text-slate-400'
                    const takenTime  = entry.taken_at
                      ? formatTime(new Date(entry.taken_at).toTimeString().slice(0, 5))
                      : null

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                      >
                        {/* Pill color dot */}
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.pill_color ?? '#94a3b8' }}
                        />

                        {/* Medication name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {entry.medication_name}
                          </p>
                          {entry.note && (
                            <p className="text-xs text-slate-400 mt-0.5">{entry.note}</p>
                          )}
                        </div>

                        {/* Scheduled vs Actual */}
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-slate-500">
                            Scheduled: {formatTime(entry.scheduled_time)}
                          </p>
                          {takenTime && (
                            <p className="text-xs text-slate-400">Actual: {takenTime}</p>
                          )}
                        </div>

                        {/* Status icon + badge */}
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={cn('w-4 h-4', iconColor)} />
                          <span className={cn('badge text-[10px] hidden md:inline-flex', getStatusColor(entry.status))}>
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages} · {filtered.length} records
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
                      p === page ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 text-slate-600',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}