'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  User, Bell, Shield, Palette, Database, Camera,
  Save, Eye, EyeOff, Check, LogOut, Loader2, X,
} from 'lucide-react'
import TopNav from '@/components/layout/TopNav'
import { createClient } from '@/lib/supabase/browser'
import { cn } from '@/lib/utils'

const supabase = createClient()

// ── Types ─────────────────────────────────────────────────────────────
interface Profile {
  full_name: string
  role: string
  condition: string
  doctor: string
  phone: string
  avatar: string
  avatar_url: string | null
}

const tabs = [
  { id: 'profile',       label: 'Profile',        icon: User     },
  { id: 'notifications', label: 'Notifications',   icon: Bell     },
  { id: 'security',      label: 'Security',        icon: Shield   },
  { id: 'appearance',    label: 'Appearance',      icon: Palette  },
  { id: 'data',          label: 'Data & Privacy',  icon: Database },
]

// ── Main Page ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [email, setEmail]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [saved, setSaved]         = useState(false)

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setEmail(user.email ?? '')

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div>
        <TopNav title="Settings" subtitle="Manage your account and preferences" />
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopNav title="Settings" subtitle="Manage your account and preferences" />

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-6">
            {/* Sidebar Tabs */}
            <div className="w-52 flex-shrink-0">
              <div className="card p-2 space-y-0.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-left transition-all duration-150 border',
                        isActive
                          ? 'bg-brand-50 text-brand-700 border-brand-200'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent',
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-brand-600' : 'text-slate-400')} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-5 animate-fade-in">
              {activeTab === 'profile' && (
                <ProfileTab
                  profile={profile}
                  email={email}
                  onSave={handleSave}
                  saved={saved}
                  onProfileUpdated={fetchProfile}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationsTab onSave={handleSave} saved={saved} />
              )}
              {activeTab === 'security' && (
                <SecurityTab onSave={handleSave} saved={saved} />
              )}
              {activeTab === 'appearance' && (
                <AppearanceTab onSave={handleSave} saved={saved} />
              )}
              {activeTab === 'data' && <DataTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Save Button ───────────────────────────────────────────────────────
function SaveButton({
  onSave, saved, loading,
}: {
  onSave: () => void
  saved: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onSave}
      disabled={loading}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60',
        saved ? 'bg-emerald-600 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white',
      )}
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : saved
        ? <><Check className="w-4 h-4" /> Saved!</>
        : <><Save className="w-4 h-4" /> Save Changes</>
      }
    </button>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────
function ProfileTab({
  profile, email, onSave, saved, onProfileUpdated,
}: {
  profile: Profile | null
  email: string
  onSave: () => void
  saved: boolean
  onProfileUpdated: () => void
}) {
  const [form, setForm] = useState({
    full_name:  profile?.full_name  ?? '',
    phone:      profile?.phone      ?? '',
    condition:  profile?.condition  ?? '',
    doctor:     profile?.doctor     ?? '',
  })
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null)
  const [error, setError]         = useState('')
  const fileInputRef              = useRef<HTMLInputElement>(null)

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // ── Upload photo ──────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type and size (max 2MB)
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return }

    setUploading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const fileExt  = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Add cache-busting to force re-render
    const urlWithCache = `${publicUrl}?t=${Date.now()}`

    // Save URL to profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlWithCache, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) { setError(updateError.message); setUploading(false); return }

    setAvatarUrl(urlWithCache)
    setUploading(false)
    onProfileUpdated()
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name:  form.full_name,
        phone:      form.phone,
        condition:  form.condition,
        doctor:     form.doctor,
        avatar:     form.full_name.slice(0, 2).toUpperCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onProfileUpdated()
    onSave()
  }

  const initials = form.full_name?.slice(0, 2).toUpperCase() || '??'

  return (
    <>
      <div className="card p-5">
        <h2 className="section-title mb-5">Personal Information</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                {initials}
              </div>
            )}
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-600 rounded-lg flex items-center justify-center border-2 border-white hover:bg-brand-700 transition-colors disabled:opacity-60"
              title="Upload photo"
            >
              {uploading
                ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                : <Camera className="w-3 h-3 text-white" />
              }
            </button>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{form.full_name}</p>
            <p className="text-xs text-slate-500">{email}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-brand-600 mt-1 hover:text-brand-700 font-medium disabled:opacity-60"
            >
              {uploading ? 'Uploading...' : 'Change photo'}
            </button>
            <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG or GIF · Max 2MB</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Full Name</label>
            <input
              className="input-field"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Email Address</label>
            <input
              className="input-field bg-slate-50 cursor-not-allowed"
              type="email"
              value={email}
              disabled
              title="Email cannot be changed here"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Phone Number</label>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+63 912 345 6789"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Primary Doctor</label>
            <input
              className="input-field"
              value={form.doctor}
              onChange={(e) => set('doctor', e.target.value)}
              placeholder="Dr. Name"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Medical Condition(s)</label>
            <input
              className="input-field"
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              placeholder="e.g. Hypertension, Type 2 Diabetes"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 mt-3 font-medium">{error}</p>
        )}
      </div>

      <div className="flex justify-end">
        <SaveButton onSave={handleSave} saved={saved} loading={saving} />
      </div>
    </>
  )
}

// ── Notifications Tab ─────────────────────────────────────────────────
function NotificationsTab({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [settings, setSettings] = useState({
    medicationReminders: true,
    missedDoseAlerts:    true,
    lowStockAlerts:      true,
    refillReminders:     true,
    dailySummary:        false,
    weeklyReport:        true,
    soundEnabled:        true,
    vibration:           true,
  })

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))

  const items = [
    { key: 'medicationReminders', label: 'Medication Reminders', desc: "Get notified when it's time to take your medication" },
    { key: 'missedDoseAlerts',    label: 'Missed Dose Alerts',   desc: 'Alerts when a scheduled dose has been missed' },
    { key: 'lowStockAlerts',      label: 'Low Stock Alerts',     desc: 'Notify when medication stock is running low' },
    { key: 'refillReminders',     label: 'Refill Reminders',     desc: 'Reminder to refill prescriptions before they run out' },
    { key: 'dailySummary',        label: 'Daily Summary',        desc: 'Receive a daily summary of your medication adherence' },
    { key: 'weeklyReport',        label: 'Weekly Report',        desc: 'Weekly adherence report every Sunday' },
    { key: 'soundEnabled',        label: 'Sound',                desc: 'Play a sound for medication reminders' },
    { key: 'vibration',           label: 'Vibration',            desc: 'Vibrate device for reminders (mobile only)' },
  ]

  return (
    <>
      <div className="card p-5 space-y-1 divide-y divide-slate-50">
        <h2 className="section-title mb-4">Notification Preferences</h2>
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key as keyof typeof settings)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors flex-shrink-0 relative',
                settings[item.key as keyof typeof settings] ? 'bg-brand-600' : 'bg-slate-200',
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm',
                  settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <SaveButton onSave={onSave} saved={saved} />
      </div>
    </>
  )
}

// ── Security Tab ──────────────────────────────────────────────────────
function SecurityTab({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [currentPass, setCurrentPass]         = useState('')
  const [newPass, setNewPass]                 = useState('')
  const [confirmPass, setConfirmPass]         = useState('')
  const [passError, setPassError]             = useState('')
  const [passLoading, setPassLoading]         = useState(false)
  const [passSaved, setPassSaved]             = useState(false)

  const handleChangePassword = async () => {
    setPassError('')
    if (newPass.length < 8) { setPassError('Password must be at least 8 characters'); return }
    if (newPass !== confirmPass) { setPassError('Passwords do not match'); return }

    setPassLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPass })

    setPassLoading(false)

    if (error) { setPassError(error.message); return }

    setPassSaved(true)
    setCurrentPass('')
    setNewPass('')
    setConfirmPass('')
    setTimeout(() => setPassSaved(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <>
      {/* Change Password */}
      <div className="card p-5">
        <h2 className="section-title mb-5">Change Password</h2>
        <div className="space-y-4 max-w-sm">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
              />
              <button
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showCurrent
                  ? <EyeOff className="w-4 h-4 text-slate-400" />
                  : <Eye className="w-4 h-4 text-slate-400" />
                }
              </button>
            </div>
          </div>
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showNew ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <button
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showNew
                  ? <EyeOff className="w-4 h-4 text-slate-400" />
                  : <Eye className="w-4 h-4 text-slate-400" />
                }
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="Confirm new password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </div>

          {passError && (
            <p className="text-xs text-red-500 font-medium">{passError}</p>
          )}

          <div className="p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700">
              Password must be at least 8 characters with uppercase, lowercase, and a number.
            </p>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={passLoading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60',
              passSaved ? 'bg-emerald-600 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white',
            )}
          >
            {passLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : passSaved
              ? <><Check className="w-4 h-4" /> Password Updated!</>
              : <><Save className="w-4 h-4" /> Update Password</>
            }
          </button>
        </div>
      </div>

      {/* Session & Account */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Session & Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-800">Log Out</p>
              <p className="text-xs text-slate-400 mt-0.5">Sign out of your current session</p>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-red-600">Delete Account</p>
              <p className="text-xs text-slate-400">Permanently delete your account and all data</p>
            </div>
            <button className="text-xs font-medium px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-7 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Log out of DoseAlert?</h3>
              <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
                You'll be signed out and redirected to the login page.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Appearance Tab ────────────────────────────────────────────────────
function AppearanceTab({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [theme, setTheme]   = useState('light')
  const [accent, setAccent] = useState('blue')

  const accents = [
    { id: 'blue',    color: '#2563eb', label: 'Blue'    },
    { id: 'teal',    color: '#0d9488', label: 'Teal'    },
    { id: 'purple',  color: '#7c3aed', label: 'Purple'  },
    { id: 'emerald', color: '#059669', label: 'Emerald' },
  ]

  return (
    <>
      <div className="card p-5 space-y-6">
        <div>
          <h2 className="section-title mb-4">Theme</h2>
          <div className="grid grid-cols-2 gap-3">
            {['light', 'dark'].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-sm font-medium',
                  theme === t
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300',
                )}
              >
                {t === 'light' ? '☀️' : '🌙'} {t.charAt(0).toUpperCase() + t.slice(1)} Mode
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title mb-4">Accent Color</h2>
          <div className="flex gap-3">
            {accents.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl transition-all',
                    accent === a.id ? 'ring-2 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100',
                  )}
                  style={{ backgroundColor: a.color }}
                />
                <span className="text-[10px] text-slate-500">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <SaveButton onSave={onSave} saved={saved} />
      </div>
    </>
  )
}

// ── Data Tab ──────────────────────────────────────────────────────────
function DataTab() {
  const [clearing, setClearing]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast]         = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const exportData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: meds }  = await supabase.from('medications').select('*').eq('user_id', user.id)
    const { data: logs }  = await supabase.from('dose_logs').select('*').eq('user_id', user.id)

    const payload = { medications: meds, dose_logs: logs, exported_at: new Date().toISOString() }
    const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href        = url
    a.download    = `doseAlert-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported successfully!')
  }

  const clearHistory = async () => {
    setClearing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setClearing(false); return }

    await supabase.from('dose_logs').delete().eq('user_id', user.id)

    setClearing(false)
    setShowConfirm(false)
    showToast('Medication history cleared.')
  }

  return (
    <div className="card p-5 space-y-4">
      <h2 className="section-title">Data & Privacy</h2>

      {toast && (
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          {toast}
        </div>
      )}

      <div className="divide-y divide-slate-100">
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Export My Data</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Download all your medications and dose logs as JSON
            </p>
          </div>
          <button
            onClick={exportData}
            className="text-xs font-medium px-3 py-1.5 border border-brand-200 text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
          >
            Export
          </button>
        </div>

        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Clear Medication History</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Delete all logged dose history (irreversible)
            </p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="text-xs font-medium px-3 py-1.5 border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Privacy Policy</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Read how we handle your personal and medical data
            </p>
          </div>
          <button className="text-xs font-medium px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            View
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-700">Data Storage:</span> Your data is securely
          stored in Supabase with encryption at rest and in transit. No health data is shared with
          third parties.
        </p>
      </div>

      {/* Clear History Confirm Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <X className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Clear All History?</h3>
              <p className="text-sm text-slate-500 mt-2 mb-6">
                This will permanently delete all your dose logs. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-secondary flex-1"
                  disabled={clearing}
                >
                  Cancel
                </button>
                <button
                  onClick={clearHistory}
                  disabled={clearing}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Clear History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}