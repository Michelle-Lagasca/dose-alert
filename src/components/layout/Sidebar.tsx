'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Pill, Bell, ClipboardList,
  MessageCircle, Settings, Sparkles, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/browser'
import Image from 'next/image'

const supabase = createClient()

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/medications', label: 'Medications',    icon: Pill             },
  { href: '/reminders',   label: 'Reminders',      icon: Bell             },
  { href: '/history',     label: 'History & Logs', icon: ClipboardList    },
  { href: '/chatbot',     label: 'AI Assistant',   icon: MessageCircle, badge: 'AI' },
]

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface Profile {
  full_name: string
  role: string
  avatar: string
  avatar_url: string | null
}

export default function Sidebar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, avatar, avatar_url')
        .eq('id', user.id)
        .single()

      setProfile(data)
    }

    fetchProfile()

    // Listen for profile updates (e.g. after saving in Settings)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  const initials = profile?.avatar
    || profile?.full_name?.slice(0, 2).toUpperCase()
    || '??'

  const displayName = profile?.full_name || 'Loading...'
  const displayRole = profile?.role || 'Patient'

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40"
      style={{
        width: 'var(--sidebar-width, 268px)',
        background: 'linear-gradient(180deg, #4A9B8E 0%, #3a8a7b 55%, #2f7063 100%)',
      }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <Image
          src="/logo.png"
          alt="DoseAlert Logo"
          width={40}
          height={40}
          className="rounded-xl flex-shrink-0"
        />
        <div>
          <span className="text-base font-extrabold text-white tracking-tight">
            Dose Alert
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <Sparkles className="w-2.5 h-2.5 text-brand-300" />
            <span className="text-[10px] text-white/60 font-semibold tracking-widest uppercase">
              AI-Powered
            </span>
          </div>
        </div>
      </div>

      {/* ── User Profile ── */}
      <Link href="/settings">
        <div className="mx-3 mt-4 mb-2 p-3 rounded-xl glass flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-coral"
              style={{ background: 'linear-gradient(135deg, #E8735A, #F08070)' }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
            <p className="text-xs text-white/60 truncate font-medium">{displayRole}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
        </div>
      </Link>

      {/* ── Nav Label ── */}
      <div className="px-5 py-2 mt-1">
        <span className="text-[9px] font-extrabold text-white/70 uppercase tracking-[0.2em]">
          Navigation
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn('nav-item', isActive ? 'nav-item-active' : 'nav-item-inactive')}>
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150',
                    isActive ? 'bg-brand-500 shadow-coral' : 'bg-white/10',
                  )}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="flex-1 text-[13px]">{item.label}</span>
                {item.badge && !isActive && (
                  <span
                    className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider"
                    style={{ background: '#E8735A', color: '#fff' }}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80 flex-shrink-0" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom ── */}
      <div className="px-3 pb-4 pt-3 border-t border-white/10 mt-2 space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn('nav-item', isActive ? 'nav-item-active' : 'nav-item-inactive')}>
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                    isActive ? 'bg-brand-500 shadow-coral' : 'bg-white/10',
                  )}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="flex-1 text-[13px]">{item.label}</span>
              </div>
            </Link>
          )
        })}

        {/* Footer info */}
        <div className="px-2 pt-3">
          <p className="text-[10px] text-white/30 font-medium">Dose Alert v1.0</p>
          <p className="text-[10px] text-white/30 font-medium">BSIT — ADET Project</p>
        </div>
      </div>
    </aside>
  )
}