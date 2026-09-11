import Link from 'next/link'
import { MessageCircle, ChevronRight, Sparkles } from 'lucide-react'
import { quickChatSuggestions } from '@/lib/mockData'

export default function QuickChat() {
  const suggestions = quickChatSuggestions.slice(0, 4)

  return (
    <div
      className="card p-5 border-none text-white overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #E8735A 0%, #d45a3f 100%)' }}
    >
      {/* BG decoration */}
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 bottom-4 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold tracking-tight">AI Assistant</h2>
          </div>
          <Link href="/chatbot" className="text-xs text-white/70 font-semibold flex items-center gap-0.5 hover:text-white transition-colors">
            Open <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <p className="text-xs text-white/70 mb-3 font-normal">Ask anything about your medications:</p>

        <div className="space-y-1.5">
          {suggestions.map((suggestion, i) => (
            <Link key={i} href={`/chatbot?q=${encodeURIComponent(suggestion)}`}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors cursor-pointer group">
                <MessageCircle className="w-3 h-3 text-white/60 flex-shrink-0" />
                <p className="text-xs text-white/90 group-hover:text-white truncate font-normal">{suggestion}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}