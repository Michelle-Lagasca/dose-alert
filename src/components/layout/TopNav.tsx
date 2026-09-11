'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, X, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/browser'

const supabase = createClient()

interface TopNavProps {
  title: string
  subtitle?: string
}

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

const notifIcons = {
  warning:  AlertTriangle,
  reminder: Clock,
  success:  CheckCircle,
  info:     Info,
}

const notifColors = {
  warning:  'text-amber-500',
  reminder: 'text-teal-500',
  success:  'text-emerald-500',
  info:     'text-slate-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export default function TopNav({ title, subtitle }: TopNavProps) {
  const [showNotifs, setShowNotifs] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications(data || [])
    }

    fetchNotifications()
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-3.5 flex items-center gap-4">
      {/* Title */}
      <div className="flex-1">
        <h1 className="topnav-title">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 font-normal">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search medications..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl w-56
                     focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400
                     focus:bg-white transition-all font-normal placeholder:font-normal"
        />
        {searchValue && (
          <button onClick={() => setSearchValue('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3 h-3 text-slate-400" />
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-teal-50 transition-colors border border-transparent hover:border-teal-100"
        >
          <Bell className="w-4 h-4 text-slate-500" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white"
              style={{ background: '#E8735A' }}
            />
          )}
        </button>

        {showNotifs && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-100 shadow-modal z-50 animate-fade-in overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 tracking-tight">Notifications</span>
                {unreadCount > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#fdf2ef', color: '#E8735A' }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const Icon = notifIcons[notif.type as keyof typeof notifIcons] ?? Info
                    const color = notifColors[notif.type as keyof typeof notifColors] ?? 'text-slate-400'
                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer',
                          !notif.read && 'bg-teal-50/40',
                        )}
                      >
                        <div className={cn('mt-0.5 flex-shrink-0', color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                            {timeAgo(notif.created_at)}
                          </p>
                        </div>
                        {!notif.read && (
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: '#E8735A' }}
                          />
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {unreadCount > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-100">
                  <button
                    onClick={markAllRead}
                    className="text-xs font-bold w-full text-center transition-colors"
                    style={{ color: '#E8735A' }}
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Today date pill */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-teal-100 bg-teal-50">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-teal-700 font-semibold">
          {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>
    </header>
  )
}