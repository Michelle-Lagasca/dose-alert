import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: string; positive: boolean }
  accent?: string
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-brand-500',
  iconBg = 'bg-brand-50',
  trend,
  accent,
}: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in group">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shadow-sm', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-bold px-2 py-1 rounded-lg tracking-wide',
              trend.positive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-500'
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        <p className="text-sm font-bold text-slate-500 mt-0.5 tracking-tight">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-normal">{subtitle}</p>}
      </div>
      {accent && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">{accent}</p>
        </div>
      )}
    </div>
  )
}