'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-card-hover text-xs">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name === 'adherence' ? `Adherence: ${entry.value}%` :
             entry.name === 'taken' ? `Taken: ${entry.value}` :
             `Missed: ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

interface MonthlyPoint { month: string; adherence: number }
interface WeeklyPoint { day: string; taken: number; missed: number }

export function AdherenceChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="section-title">Adherence Rate</h2>
        <p className="text-xs text-slate-500 mt-0.5">Last 7 months</p>
      </div>
      {data.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
          Not enough data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="adherenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="adherence"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#adherenceGrad)"
              dot={{ r: 3, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
  const hasData = data.some((d) => d.taken > 0 || d.missed > 0)
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="section-title">This Week</h2>
        <p className="text-xs text-slate-500 mt-0.5">Doses taken vs missed</p>
      </div>
      {!hasData ? (
        <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
          No doses logged this week yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="taken" name="taken" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="missed" name="missed" fill="#fca5a5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-brand-600" />
          <span className="text-xs text-slate-500">Taken</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-red-300" />
          <span className="text-xs text-slate-500">Missed</span>
        </div>
      </div>
    </div>
  )
}