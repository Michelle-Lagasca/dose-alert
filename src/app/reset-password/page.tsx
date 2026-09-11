'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import {
  Lock, ArrowRight, CheckCircle2, XCircle,
  AlertCircle, Loader2, Eye, EyeOff, Sparkles,
} from 'lucide-react'

const supabase = createClient()

// ── OWASP password checks (same as auth page) ────────────────────────
const checks = [
  { id: 'length',  label: 'Minimum 12 characters',    test: (p: string) => p.length >= 12 },
  { id: 'upper',   label: 'Uppercase letter (A–Z)',    test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Lowercase letter (a–z)',    test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'At least one number (0–9)', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'Special character (!@#$…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function getStrength(password: string) {
  const passed = checks.filter(c => c.test(password)).length
  if (password.length === 0) return { score: 0, label: '', color: '' }
  if (passed <= 2) return { score: 1, label: 'Weak',   color: '#ef4444' }
  if (passed <= 4) return { score: 2, label: 'Fair',   color: '#f97316' }
  if (passed <= 5) return { score: 3, label: 'Good',   color: '#eab308' }
  return               { score: 4, label: 'Strong', color: '#22c55e' }
}

// ── Sub-components ───────────────────────────────────────────────────

function PasswordInput({
  value, onChange, placeholder, label, error,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
  error?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div
        className={`relative flex items-center rounded-xl border transition-all duration-150 bg-white ${
          error
            ? 'border-red-400 ring-2 ring-red-100'
            : 'border-slate-200 focus-within:border-[#E8735A] focus-within:ring-2 focus-within:ring-orange-100'
        }`}
      >
        <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

function PrimaryButton({ children, loading, onClick, disabled }: {
  children: React.ReactNode
  loading?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
      style={{ background: 'linear-gradient(135deg, #E8735A, #d45a3f)', fontFamily: 'Montserrat, sans-serif' }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  )
}

// ── Page states ──────────────────────────────────────────────────────
type PageState = 'loading' | 'invalid' | 'form' | 'success'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('loading')

  const [newPass, setNewPass]         = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(false)

  const strength = getStrength(newPass)

  // ── On mount: Supabase puts the recovery token in the URL hash.
  //    The browser client picks it up automatically via onAuthStateChange.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token is valid — show the form
        setPageState('form')
      }
    })

    // Safety timeout: if no PASSWORD_RECOVERY event fires within 4s,
    // the link is likely expired or invalid
    const timeout = setTimeout(() => {
      setPageState(prev => prev === 'loading' ? 'invalid' : prev)
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleReset = async () => {
    const errs: Record<string, string> = {}
    if (strength.score < 3) errs.newPass = 'Password is not strong enough'
    if (newPass !== confirmPass) errs.confirmPass = 'Passwords do not match'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPass })

    setLoading(false)

    if (error) {
      setErrors({ newPass: error.message })
      return
    }

    setPageState('success')
  }

  // ── Render: Loading ──────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <Shell>
        <div className="text-center py-8 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#E8735A' }} />
          <p className="text-sm text-slate-500 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Verifying your reset link…
          </p>
        </div>
      </Shell>
    )
  }

  // ── Render: Invalid / expired link ──────────────────────────────
  if (pageState === 'invalid') {
    return (
      <Shell>
        <div className="text-center space-y-5 py-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ background: '#fee2e2', border: '2px solid #fecaca' }}
          >
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h2
              className="text-2xl font-extrabold text-slate-900 tracking-tight"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Link expired
            </h2>
            <p
              className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              This password reset link is invalid or has expired. Reset links are only valid for 1 hour.
            </p>
          </div>
          <PrimaryButton onClick={() => router.push('/auth')}>
            Request a new link <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </Shell>
    )
  }

  // ── Render: Success ──────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <Shell>
        <div className="text-center space-y-5 py-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'linear-gradient(135deg, #E8735A22, #E8735A11)', border: '2px solid #E8735A44' }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: '#E8735A' }} />
          </div>
          <div>
            <h2
              className="text-2xl font-extrabold text-slate-900 tracking-tight"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Password updated!
            </h2>
            <p
              className="text-sm text-slate-500 mt-2 font-normal"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Your password has been changed successfully.
            </p>
          </div>
          <PrimaryButton onClick={() => router.push('/auth')}>
            Go to Login <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </Shell>
    )
  }

  // ── Render: Form ────────────────────────────────────────────────
  return (
    <Shell>
      <div className="space-y-5">
        <div className="mb-6">
          <h2
            className="text-2xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Set new password
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Make it strong and unique — don't reuse an old password.
          </p>
        </div>

        <PasswordInput
          value={newPass} onChange={setNewPass}
          placeholder="New password" label="New Password" error={errors.newPass}
        />

        {/* Strength bar */}
        {newPass.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-all duration-300"
                  style={{ background: i <= strength.score ? strength.color : '#e2e8f0' }}
                />
              ))}
            </div>
            <p className="text-xs font-bold" style={{ color: strength.color, fontFamily: 'Montserrat, sans-serif' }}>
              {strength.label} password
            </p>
          </div>
        )}

        <PasswordInput
          value={confirmPass} onChange={setConfirmPass}
          placeholder="Confirm new password" label="Confirm Password" error={errors.confirmPass}
        />

        {/* OWASP Requirements */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p
            className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Password Requirements
          </p>
          <ul className="space-y-1.5">
            {checks.map(check => {
              const passed = newPass.length > 0 && check.test(newPass)
              return (
                <li key={check.id} className="flex items-center gap-2">
                  {passed
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                    : <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-300" />
                  }
                  <span
                    className={`text-xs font-medium ${passed ? 'text-slate-700' : 'text-slate-400'}`}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {check.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <PrimaryButton loading={loading} onClick={handleReset}>
          Update Password <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>
    </Shell>
  )
}

// ── Shared layout shell ──────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f8fafb' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #E8735A, #F08070)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
              <path d="M8.5 8.5l7 7"/>
            </svg>
          </div>
          <div>
            <span
              className="text-xl font-extrabold text-slate-900 tracking-tight"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              DoseAlert
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-slate-300" />
              <span
                className="text-[10px] text-slate-400 font-bold tracking-widest uppercase"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                AI-Powered
              </span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
          {children}
        </div>

        <p
          className="text-center text-xs text-slate-400 mt-6 font-normal"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          By using DoseAlert, you agree to our{' '}
          <a href="#" className="font-semibold text-slate-500 hover:text-slate-700">Terms</a> &amp;{' '}
          <a href="#" className="font-semibold text-slate-500 hover:text-slate-700">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}