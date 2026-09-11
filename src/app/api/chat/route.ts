import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

// ✅ Simple safe type (no SDK type dependency)
type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json()

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages' },
        { status: 400 }
      )
    }

    const systemMessage: Message = {
      role: 'system',
      content: `
You are DoseAlert Assistant, a helpful AI for medication management.

You have access to the patient's medication data below:

${context}

IMPORTANT RULES:
- Always use the patient's actual medication data
- Be warm, concise, and clear
- Format medication names with **bold**
- Give health disclaimers when giving medical advice
- Never diagnose conditions
- Never replace a doctor
- If asked unrelated questions, politely redirect
      `,
    }

    const formattedMessages: Message[] = messages.map((m: any) => ({
      role:
        m.role === 'assistant'
          ? 'assistant'
          : m.role === 'system'
          ? 'system'
          : 'user',
      content: String(m.content ?? ''),
    }))

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [systemMessage, ...formattedMessages],
      temperature: 0.7,
      max_tokens: 1024,
    })

    return NextResponse.json({
      text:
        completion.choices[0]?.message?.content ||
        'Sorry, I could not generate a response.',
    })
  } catch (error: any) {
    console.error('Groq API error:', error)

    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}