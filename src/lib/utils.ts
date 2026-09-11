import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'taken': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'missed': return 'bg-red-100 text-red-700 border-red-200'
    case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'late': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'low-stock': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'expired': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'taken': return 'Taken'
    case 'missed': return 'Missed'
    case 'upcoming': return 'Upcoming'
    case 'late': return 'Late'
    case 'active': return 'Active'
    case 'low-stock': return 'Low Stock'
    case 'completed': return 'Completed'
    case 'expired': return 'Expired'
    default: return status
  }
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function getAdherenceColor(rate: number) {
  if (rate >= 90) return 'text-emerald-600'
  if (rate >= 75) return 'text-amber-600'
  return 'text-red-600'
}