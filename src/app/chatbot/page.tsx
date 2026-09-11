'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, User, Shield, Info, Loader2, Trash2 } from 'lucide-react'
import TopNav from '@/components/layout/TopNav'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/browser'

const supabase = createClient()

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const quickSuggestions = [
  "What medications should I take today?",
  "Did I take my morning pills?",
  "Which medications am I running low on?",
  "What's my adherence rate this month?",
  "When is my next dose?",
  "Show me my medication list",
]

function renderContent(content: string) {
  return content.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    return (
      <span key={i}>
        {rendered}
        {i < arr.length - 1 && <br />}
      </span>
    )
  })
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [userId, setUserId]     = useState<string | null>(null)
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data: history } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50)

      if (history && history.length > 0) {
        setMessages(history.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString('en', {
            hour: '2-digit', minute: '2-digit',
          }),
        })))
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! 👋 I'm your DoseAlert AI Assistant powered by Groq. I have access to your real medication schedule and history.\n\nYou can ask me things like:\n• **"What medications do I take today?"**\n• **"Did I take my morning pills?"**\n• **"Which meds are running low?"**\n\n⚕️ *Note: I provide medication management support only — not medical advice. Always consult your doctor for medical decisions.*`,
          timestamp: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        }])
      }

      setLoading(false)
    }

    init()
  }, [])

  const fetchUserContext = useCallback(async (uid: string) => {
    const today = new Date().toISOString().split('T')[0]

    const [profileRes, medsRes, remindersRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('full_name, condition, doctor').eq('id', uid).single(),
      supabase.from('medications').select('name, dosage, frequency, times, category, stock, total_stock, status, instructions, prescribed_by').eq('user_id', uid),
      supabase.from('reminders').select('status, scheduled_time, taken_at, medications(name, dosage)').eq('user_id', uid).eq('scheduled_date', today),
      supabase.from('dose_logs').select('medication_name, status, scheduled_date').eq('user_id', uid).order('scheduled_date', { ascending: false }).limit(14),
    ])

    const profile   = profileRes.data
    const meds      = medsRes.data || []
    const reminders = remindersRes.data || []
    const logs      = logsRes.data || []

    const taken     = logs.filter((l) => l.status === 'taken').length
    const adherence = logs.length > 0 ? Math.round((taken / logs.length) * 100) : 0

    const takenToday    = reminders.filter((r) => r.status === 'taken').length
    const missedToday   = reminders.filter((r) => r.status === 'missed').length
    const upcomingToday = reminders.filter((r) => r.status === 'upcoming').length

    return `
PATIENT CONTEXT:
Patient: ${profile?.full_name ?? 'Unknown'}
Medical Conditions: ${profile?.condition ?? 'Not specified'}
Primary Doctor: ${profile?.doctor ?? 'Not specified'}
Today: ${new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

MEDICATIONS (${meds.length} total):
${meds.map((m) => `- ${m.name} ${m.dosage} | ${m.frequency} | Times: ${(m.times || []).join(', ')} | Status: ${m.status} | Stock: ${m.stock}/${m.total_stock} | Instructions: ${m.instructions || 'none'}`).join('\n')}

TODAY'S REMINDERS:
- Taken: ${takenToday} | Missed: ${missedToday} | Upcoming: ${upcomingToday}
${(reminders as any[]).map((r) => `- ${(r.medications as any)?.name} ${(r.medications as any)?.dosage} at ${r.scheduled_time} → ${r.status}${r.taken_at ? ` (taken at ${new Date(r.taken_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })})` : ''}`).join('\n')}

RECENT ADHERENCE: ${adherence}% (last ${logs.length} logs)
`
  }, [])

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || isTyping || !userId) return

    const now = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: now,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      content: text.trim(),
    })

    try {
      const context = await fetchUserContext(userId)

      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, context }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'API error')

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, botMsg])

      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: data.text,
      })
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      }])
    }

    setIsTyping(false)
  }

  const clearChat = async () => {
    if (!userId) return
    await supabase.from('chat_messages').delete().eq('user_id', userId)
    setMessages([{
      id: 'welcome-new',
      role: 'assistant',
      content: "Chat history cleared! 👋 How can I help you with your medications today?",
      timestamp: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
    }])
  }

  if (loading) {
    return (
      <div>
        <TopNav title="AI Assistant" subtitle="Powered by Groq AI" />
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopNav title="AI Assistant" subtitle="Powered by Groq AI" />

      <div className="p-6 h-[calc(100vh-80px)] flex flex-col gap-4">
        {/* Disclaimer */}
        <div className="flex items-start gap-3 p-3.5 bg-brand-50 border border-brand-100 rounded-xl flex-shrink-0">
          <Shield className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-brand-700">
            <span className="font-semibold">Medical Disclaimer:</span> This AI assistant provides
            medication management support only. It does not offer medical diagnoses or professional
            medical advice. Always consult your healthcare provider for medical decisions.
          </p>
        </div>

        {/* Chat + Sidebar */}
        <div className="flex-1 flex gap-5 min-h-0">

          {/* Chat Window */}
          <div className="flex-1 flex flex-col card overflow-hidden min-h-0">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4A9B8E, #2f7063)' }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">DoseAlert Assistant</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[10px] text-slate-400">Online · Powered by Groq AI</p>
                  </div>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors group"
                title="Clear chat history"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2.5 animate-fade-in',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #4A9B8E, #2f7063)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={cn('max-w-[75%] flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
                    <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                      <div className="leading-relaxed text-sm">
                        {renderContent(msg.content)}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2.5 animate-fade-in">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4A9B8E, #2f7063)' }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="chat-bubble-assistant">
                    <div className="flex gap-1 items-center py-0.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3.5 border-t border-slate-100 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Ask about your medications..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={isTyping}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #4A9B8E, #2f7063)' }}
                >
                  {isTyping
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Suggestions Sidebar */}
          <div className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">
            <div className="card p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Quick Questions
              </p>
              <div className="space-y-1.5">
                {quickSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    disabled={isTyping}
                    className="w-full text-left text-xs text-slate-600 hover:text-teal-700 hover:bg-teal-50 p-2.5 rounded-xl transition-colors disabled:opacity-50 border border-transparent hover:border-teal-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4 bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500">About this assistant</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Powered by <span className="font-semibold text-slate-500">Groq AI</span> with
                access to your real medication data — schedules, stock levels, adherence history,
                and today's reminders — for accurate, personalized answers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}