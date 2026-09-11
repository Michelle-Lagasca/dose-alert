'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight, ChevronLeft,
  CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles,
  Shield, Clock, Activity, X,
} from 'lucide-react'

const supabase = createClient()

// ── Types ────────────────────────────────────────────────────────────
type View = 'login' | 'register' | 'register-success' | 'forgot-email' | 'forgot-success'
type LegalModal = 'terms' | 'privacy' | null

interface PasswordStrength {
  score: number        // 0-4
  label: string
  color: string
}

// ── OWASP password checks ────────────────────────────────────────────
const checks = [
  { id: 'length',  label: 'Minimum 12 characters',      test: (p: string) => p.length >= 12 },
  { id: 'upper',   label: 'Uppercase letter (A–Z)',      test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Lowercase letter (a–z)',      test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'At least one number (0–9)',   test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'Special character (!@#$…)',   test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function getStrength(password: string): PasswordStrength {
  const passed = checks.filter(c => c.test(password)).length
  const total = checks.length

  if (!password) return { score: 0, label: '', color: '' }

  const ratio = passed / total

  if (ratio <= 0.4) return { score: 1, label: 'Weak', color: '#ef4444' }
  if (ratio <= 0.6) return { score: 2, label: 'Fair', color: '#eab308' }
  if (ratio < 1)    return { score: 3, label: 'Good', color: '#22c55e' }

  return { score: 4, label: 'Strong', color: '#16a34a' }
}

// ── Sub-components ───────────────────────────────────────────────────

function InputField({
  icon: Icon, type = 'text', placeholder, value, onChange, error,
  rightElement, label,
}: {
  icon: React.ElementType
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  rightElement?: React.ReactNode
  label?: string
}) {
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
            : 'border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100'
        }`}
      >
        <Icon className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none font-['Montserrat']"
        />
        {rightElement && <div className="absolute right-3">{rightElement}</div>}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

function PasswordInput({
  value, onChange, placeholder = 'Password', label, error,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
  error?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <InputField
      icon={Lock}
      type={show ? 'text' : 'password'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      label={label}
      error={error}
      rightElement={
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  )
}

function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-150 text-sm font-semibold text-slate-700 shadow-sm hover:shadow disabled:opacity-60"
      style={{ fontFamily: 'Montserrat, sans-serif' }}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      )}
      Continue with Google
    </button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs text-slate-400 font-medium">or</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

function PrimaryButton({ children, loading, onClick, type = 'button', disabled }: {
  children: React.ReactNode
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
      style={{ background: 'linear-gradient(135deg, #E8735A, #d45a3f)', fontFamily: 'Montserrat, sans-serif' }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  )
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold max-w-sm animate-slide-in-right border ${
        type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-red-50 text-red-800 border-red-200'
      }`}
      style={{ fontFamily: 'Montserrat, sans-serif' }}
    >
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      }
      {message}
      <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}


// ── Legal Modal ──────────────────────────────────────────────────────
const LEGAL_CONTENT = {
  terms: {
    title: 'Terms and Conditions',
    lastUpdated: 'June 2025',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By accessing or using DoseAlert, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the application.',
      },
      {
        heading: '2. Use of the Service',
        body: 'DoseAlert is a medication tracking tool intended for personal, non-commercial use. You agree to use it only for lawful purposes and in accordance with these terms. You must not misuse the service or attempt to gain unauthorized access to any part of it.',
      },
      {
        heading: '3. Medical Disclaimer',
        body: 'DoseAlert is not a medical device and does not provide medical advice. All information provided by the application is for informational purposes only. Always consult a qualified healthcare professional before making any decisions about your medications or health.',
      },
      {
        heading: '4. Account Responsibility',
        body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately if you suspect unauthorized use of your account.',
      },
      {
        heading: '5. Data Accuracy',
        body: 'You are responsible for the accuracy of the medication information you enter. DoseAlert cannot be held liable for errors resulting from incorrect data input by the user.',
      },
      {
        heading: '6. Modifications',
        body: 'We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.',
      },
      {
        heading: '7. Termination',
        body: 'We may suspend or terminate your access to DoseAlert at our discretion if you violate these terms or engage in conduct harmful to other users or the service.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'June 2025',
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'We collect information you provide directly, including your name, email address, and medication data you enter into the application. We also collect usage data such as login timestamps and feature interactions to improve the service.',
      },
      {
        heading: '2. How We Use Your Information',
        body: 'Your information is used to operate and improve DoseAlert, send you dose reminders and notifications, provide customer support, and ensure the security of your account.',
      },
      {
        heading: '3. Data Storage',
        body: 'Your data is stored securely using Supabase infrastructure with encryption at rest and in transit. We retain your data for as long as your account is active or as needed to provide services.',
      },
      {
        heading: '4. Data Sharing',
        body: 'We do not sell, trade, or rent your personal information to third parties. We may share anonymized, aggregated data for research or analytics purposes. We may disclose information when required by law.',
      },
      {
        heading: '5. Cookies and Tracking',
        body: 'DoseAlert uses session cookies to keep you logged in and improve your experience. We do not use third-party advertising cookies. You can disable cookies in your browser settings, though this may affect functionality.',
      },
      {
        heading: '6. Your Rights',
        body: 'You have the right to access, correct, or delete your personal data at any time. To request data deletion or export, contact us through the application. We will respond within 30 days.',
      },
      {
        heading: '7. Security',
        body: 'We implement industry-standard security measures including OWASP-compliant authentication, encrypted data storage, and rate limiting to protect your information from unauthorized access.',
      },
      {
        heading: '8. Contact',
        body: 'If you have questions about this Privacy Policy, please contact us through the DoseAlert application or reach out to your system administrator.',
      },
    ],
  },
}

function LegalModal({ type, onClose }: { type: 'terms' | 'privacy'; onClose: () => void }) {
  const content = LEGAL_CONTENT[type]

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col border border-slate-100 animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3
              className="text-lg font-extrabold text-slate-900 tracking-tight"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {content.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Last updated: {content.lastUpdated}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {content.sections.map(section => (
            <div key={section.heading}>
              <h4
                className="text-sm font-bold text-slate-800 mb-1.5"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {section.heading}
              </h4>
              <p
                className="text-sm text-slate-500 leading-relaxed font-normal"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-md hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #E8735A, #d45a3f)', fontFamily: 'Montserrat, sans-serif' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Left Branding Panel ──────────────────────────────────────────────
function BrandPanel() {
  const features = [
    { icon: Shield,   text: 'OWASP-compliant security' },
    { icon: Clock,    text: 'Smart dose scheduling' },
    { icon: Activity, text: 'Adherence tracking & insights' },
    { icon: Sparkles, text: 'AI-powered medication assistant' },
  ]
  return (
    <div
      className="flex flex-col justify-between p-12 relative overflow-hidden w-full min-h-screen"
      style={{ background: 'linear-gradient(160deg, #4A9B8E 0%, #3a8a7b 45%, #2f7063 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ background: '#E8735A' }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10 translate-x-1/3 translate-y-1/3" style={{ background: '#F08070' }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-5 -translate-x-1/2 -translate-y-1/2" style={{ background: '#fff' }} />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">

          {/* ↓ Replace this whole div+svg with your image */}
          <Image
            src="/logo.png"
            alt="DoseAlert logo"
            width={44}
            height={44}
            className="rounded-2xl flex-shrink-0"
          />

          <div>
            <span className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              DoseAlert
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-white/50" />
              <span className="text-[10px] text-white/50 font-bold tracking-widest uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>AI-Powered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero text */}
      <div className="relative z-10 my-auto">
        <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Never miss<br />a dose again.
        </h1>
        <p className="text-white/70 text-base leading-relaxed font-normal mb-10 max-w-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Your smart medication companion — track doses, get reminders, and stay on top of your health with AI-driven insights.
        </p>

        {/* Feature list */}
        <ul className="space-y-3">
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-white/80 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <p className="text-xs text-white/30 font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          BSIT — ADET Project · Dose Alert v1.0
        </p>
      </div>
    </div>
  )
}

// ── Main Auth Page ────────────────────────────────────────────────────
export default function AuthPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  // Login state
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe]       = useState(false)
  const [loginErrors, setLoginErrors]     = useState<Record<string, string>>({})

  // Register state
  const [regName, setRegName]         = useState('')
  const [regEmail, setRegEmail]       = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm]   = useState('')
  const [regTerms, setRegTerms]       = useState(false)
  const [regErrors, setRegErrors]     = useState<Record<string, string>>({})

  // Forgot password state
  const [fpEmail, setFpEmail]   = useState('')
  const [fpErrors, setFpErrors] = useState<Record<string, string>>({})
  const [legalModal, setLegalModal] = useState<LegalModal>(null)

  const strength = getStrength(regPassword)

  const showToast = (message: string, type: 'success' | 'error') =>
    setToast({ message, type })

  // ── Handlers ──────────────────────────────────────────────────────

  const handleLogin = async () => {
    const errs: Record<string, string> = {}

    if (!loginEmail) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(loginEmail)) errs.email = 'Enter a valid email'
    if (!loginPassword) errs.password = 'Password is required'

    setLoginErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)

    try {
      // STEP 1: Check if account is locked
      const { data: lockData } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .eq('email', loginEmail)
        .maybeSingle()

      if (lockData?.locked_until && new Date(lockData.locked_until) > new Date()) {
        setLoading(false)
        showToast('Account is locked. Try again later.', 'error')
        return
      }

      // STEP 2: Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      // STEP 3: Handle failed login
      if (error) {
        // ── Friendly message for unverified email ──
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setLoading(false)
          showToast('Please verify your email before logging in. Check your inbox.', 'error')
          return
        }

        const currentAttempts = lockData?.attempts ?? 0
        const newAttempts = currentAttempts + 1
        const isLocked = newAttempts >= 5

        await supabase
          .from('failed_login_attempts')
          .upsert(
            {
              email: loginEmail,
              attempts: newAttempts,
              locked_until: isLocked
                ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          )

        showToast(
          isLocked
            ? 'Too many failed attempts. Account locked for 15 minutes.'
            : error.message,
          'error'
        )

        setLoading(false)
        return
      }

      // STEP 4: Success — reset failed attempts
      await supabase.from('failed_login_attempts').upsert({
        email: loginEmail,
        attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })

      setLoading(false)
      showToast('Welcome back!', 'success')
      router.push('/dashboard')
    } catch (err: any) {
      setLoading(false)
      showToast(err.message || 'Something went wrong', 'error')
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) {
      setLoading(false)
      showToast(error.message, 'error')
    }
    // No setLoading(false) on success — page will redirect
  }

  const handleRegister = async () => {
    const errs: Record<string, string> = {}
    if (!regName)  errs.name  = 'Full name is required'
    if (!regEmail) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(regEmail)) errs.email = 'Enter a valid email'
    if (strength.score < 3) errs.password = 'Password is not strong enough'
    if (regPassword !== regConfirm) errs.confirm = 'Passwords do not match'
    if (!regTerms) errs.terms = 'You must accept the Terms and Privacy Policy'

    setRegErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { full_name: regName },
      },
    })

    setLoading(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    // data.session is null when email confirmation is required
    if (!data.session) {
      setView('register-success')
    } else {
      // Email confirmation disabled in Supabase — log straight in
      showToast('Account created! Welcome to DoseAlert.', 'success')
      router.push('/dashboard')
    }
  }

  // ── Forgot password: sends a real Supabase reset link ──
  const handleForgotEmail = async () => {
    if (!fpEmail || !/\S+@\S+\.\S+/.test(fpEmail)) {
      setFpErrors({ email: 'Enter a valid email address' })
      return
    }
    setFpErrors({})
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(fpEmail, {
      // This must match a URL you've whitelisted in Supabase → Auth → URL Configuration
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setView('forgot-success')
  }

  // ── Views ──────────────────────────────────────────────────────────

  const renderLogin = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
        <p className="text-sm text-slate-500 mt-1 font-normal">Sign in to your DoseAlert account</p>
      </div>

      <InputField
        icon={Mail} placeholder="you@example.com" value={loginEmail}
        onChange={setLoginEmail} label="Email address" error={loginErrors.email}
      />
      <PasswordInput
        value={loginPassword} onChange={setLoginPassword}
        placeholder="Your password" label="Password" error={loginErrors.password}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox" checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 accent-brand-500 cursor-pointer"
          />
          <span className="text-sm text-slate-600 font-medium">Remember me</span>
        </label>
        <button
          type="button"
          onClick={() => { setView('forgot-email'); setFpErrors({}) }}
          className="text-sm font-bold transition-colors"
          style={{ color: '#E8735A' }}
        >
          Forgot password?
        </button>
      </div>

      <PrimaryButton loading={loading} onClick={handleLogin}>
        Log In <ArrowRight className="w-4 h-4" />
      </PrimaryButton>

      <Divider />

      <GoogleButton loading={loading} onClick={handleGoogle} />

      <p className="text-center text-sm text-slate-500 font-normal">
        Don't have an account?{' '}
        <button
          onClick={() => { setView('register'); setRegErrors({}) }}
          className="font-bold transition-colors"
          style={{ color: '#E8735A' }}
        >
          Create Account
        </button>
      </p>
    </div>
  )

  const renderRegister = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="mb-5">
        <button
          onClick={() => setView('login')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Login
        </button>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create account</h2>
        <p className="text-sm text-slate-500 mt-1 font-normal">Join DoseAlert to manage your medications</p>
      </div>

      <InputField
        icon={User} placeholder="Juan Dela Cruz" value={regName}
        onChange={setRegName} label="Full Name" error={regErrors.name}
      />
      <InputField
        icon={Mail} placeholder="you@example.com" value={regEmail}
        onChange={setRegEmail} label="Email Address" error={regErrors.email}
      />
      <PasswordInput
        value={regPassword} onChange={setRegPassword}
        placeholder="Create a strong password" label="Password" error={regErrors.password}
      />

      {/* Strength bar */}
      {regPassword.length > 0 && (
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
          <p className="text-xs font-bold" style={{ color: strength.color }}>
            {strength.label} password
          </p>
        </div>
      )}

      <PasswordInput
        value={regConfirm} onChange={setRegConfirm}
        placeholder="Confirm your password" label="Confirm Password" error={regErrors.confirm}
      />

      {/* OWASP Requirements */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
        <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Password Requirements</p>
        <ul className="space-y-1.5">
          {checks.map(check => {
            const passed = regPassword.length > 0 && check.test(regPassword)
            return (
              <li key={check.id} className="flex items-center gap-2">
                {passed
                  ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                  : <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-300" />
                }
                <span className={`text-xs font-medium ${passed ? 'text-slate-700' : 'text-slate-400'}`}>
                  {check.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Terms */}
      <div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox" checked={regTerms}
            onChange={e => setRegTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 flex-shrink-0 cursor-pointer"
            style={{ accentColor: '#E8735A' }}
          />
          <span className="text-sm text-slate-600 font-normal leading-snug">
            I agree to the{' '}
            <button type="button" onClick={() => setLegalModal('terms')} className="font-bold underline-offset-2 hover:underline" style={{ color: '#E8735A' }}>Terms and Conditions</button>
            {' '}and{' '}
            <button type="button" onClick={() => setLegalModal('privacy')} className="font-bold underline-offset-2 hover:underline" style={{ color: '#E8735A' }}>Privacy Policy</button>
          </span>
        </label>
        {regErrors.terms && (
          <p className="text-xs text-red-500 flex items-center gap-1 font-medium mt-1.5">
            <AlertCircle className="w-3 h-3" />{regErrors.terms}
          </p>
        )}
      </div>

      <PrimaryButton loading={loading} onClick={handleRegister}>
        Create Account <ArrowRight className="w-4 h-4" />
      </PrimaryButton>

      <p className="text-center text-sm text-slate-500 font-normal">
        Already have an account?{' '}
        <button onClick={() => setView('login')} className="font-bold" style={{ color: '#E8735A' }}>
          Log In
        </button>
      </p>
    </div>
  )

  // ── Shown after successful signUp when email confirmation is required ──
  const renderRegisterSuccess = () => (
    <div className="text-center space-y-5 py-8 animate-fade-in">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
        style={{ background: 'linear-gradient(135deg, #4A9B8E22, #4A9B8E11)', border: '2px solid #4A9B8E44' }}
      >
        <Mail className="w-10 h-10" style={{ color: '#4A9B8E' }} />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Check your email</h2>
        <p className="text-sm text-slate-500 mt-2 font-normal max-w-xs mx-auto leading-relaxed">
          We sent a confirmation link to{' '}
          <span className="font-bold text-slate-700">{regEmail}</span>.
          Click it to activate your account.
        </p>
      </div>

      {/* Tips box */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left">
        <p className="text-xs font-bold text-amber-800 mb-2 uppercase tracking-wider">Can't find it?</p>
        <ul className="space-y-1">
          {[
            'Check your spam or junk folder',
            'Make sure you entered the right email',
            'The link expires after 24 hours',
          ].map(tip => (
            <li key={tip} className="text-xs text-amber-700 flex items-start gap-1.5">
              <span className="mt-0.5 flex-shrink-0">•</span>{tip}
            </li>
          ))}
        </ul>
      </div>

      <PrimaryButton onClick={() => setView('login')}>
        Back to Login <ArrowRight className="w-4 h-4" />
      </PrimaryButton>
    </div>
  )

  const renderForgotEmail = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => setView('login')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Login
        </button>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Forgot password?</h2>
        <p className="text-sm text-slate-500 mt-1 font-normal">
          Enter your email and we'll send a password reset link.
        </p>
      </div>

      <InputField
        icon={Mail} placeholder="you@example.com" value={fpEmail}
        onChange={setFpEmail} label="Registered Email" error={fpErrors.email}
      />

      <PrimaryButton loading={loading} onClick={handleForgotEmail}>
        Send Reset Link <ArrowRight className="w-4 h-4" />
      </PrimaryButton>
    </div>
  )

  // ── Shown after reset link is sent ──
  const renderForgotSuccess = () => (
    <div className="text-center space-y-5 py-8 animate-fade-in">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
        style={{ background: 'linear-gradient(135deg, #E8735A22, #E8735A11)', border: '2px solid #E8735A44' }}
      >
        <CheckCircle2 className="w-10 h-10" style={{ color: '#E8735A' }} />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reset link sent!</h2>
        <p className="text-sm text-slate-500 mt-2 font-normal max-w-xs mx-auto leading-relaxed">
          We sent a password reset link to{' '}
          <span className="font-bold text-slate-700">{fpEmail}</span>.
          Click the link in your email to set a new password.
        </p>
      </div>

      {/* Tips box */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left">
        <p className="text-xs font-bold text-amber-800 mb-2 uppercase tracking-wider">Can't find it?</p>
        <ul className="space-y-1">
          {[
            'Check your spam or junk folder',
            'The link expires after 1 hour',
            'Make sure you entered the right email',
          ].map(tip => (
            <li key={tip} className="text-xs text-amber-700 flex items-start gap-1.5">
              <span className="mt-0.5 flex-shrink-0">•</span>{tip}
            </li>
          ))}
        </ul>
      </div>

      <PrimaryButton
        onClick={() => {
          setView('login')
          setFpEmail('')
        }}
      >
        Back to Login <ArrowRight className="w-4 h-4" />
      </PrimaryButton>
    </div>
  )

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="min-h-screen flex" style={{ background: '#f8fafb' }}>
        {/* Left branding */}
        <div className="hidden lg:flex lg:w-[52%] xl:w-[55%]">
          <BrandPanel />
        </div>

        {/* Right auth panel */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #E8735A, #F08070)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                  <path d="M8.5 8.5l7 7"/>
                </svg>
              </div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">DoseAlert</span>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
              {view === 'login'             && renderLogin()}
              {view === 'register'          && renderRegister()}
              {view === 'register-success'  && renderRegisterSuccess()}
              {view === 'forgot-email'      && renderForgotEmail()}
              {view === 'forgot-success'    && renderForgotSuccess()}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-400 mt-6 font-normal">
              By using DoseAlert, you agree to our{' '}
              <button type="button" onClick={() => setLegalModal('terms')} className="font-semibold text-slate-500 hover:text-slate-700">Terms</button> &amp;{' '}
              <button type="button" onClick={() => setLegalModal('privacy')} className="font-semibold text-slate-500 hover:text-slate-700">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>

      {/* Legal Modals */}
      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </>
  )
}