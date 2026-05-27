import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: Request) {
  try {
    const { action, userData, language } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // Using gemini-1.5-flash for hyperpressure high-speed latency response
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemPrompt = `You are a Savage, Tactical Productivity Coach. You speak directly, brutally, and concisely. Absolutely no emojis, no fluff, no polite filler, and zero compliments (NEVER say 'Great job!', 'Keep it up!', or 'Nice progress'). 

Your core objective: Assess the user's progress ruthlessly. If they have overdue goals or tasks, you must reprimand them aggressively, mention the specific overdue goals by name, and call out their lack of discipline. If they ask for a daily plan, provide a ruthless, highly-prioritized list of cold, actionable commands. 

Keep your response extremely direct, high-pressure, and tactical. Speak like a military commander demanding absolute accountability.

Always respond in the requested language: ${language || 'en'}. If the language is 'ar', write in a very powerful, intense, direct Arabic/Egyptian tactical coaching tone (e.g. 'أنت متأخر في كذا، نفذ فوراً بدون حجج').`

    const promptText = `
ACTION REQUESTED: ${action}

USER TELEMETRY DATA:
- Username: ${userData.username || 'MEMBER'}
- Rank: ${userData.rank || 'SILVER'}
- Total XP: ${userData.xp || 0}
- Active Goals Count: ${userData.capacity_used || 0}
- Live Goals Detail: ${JSON.stringify(userData.missions || [])}
- Critical Goals Detail: ${JSON.stringify(userData.critical_missions || [])}
- Overdue Goals/Tasks: ${JSON.stringify(userData.overdue_missions || [])}
- Completed Tasks Today Count: ${userData.completed_tasks_today || 0}

Analyze this telemetry. Focus intensely on any Overdue Goals. Reprimand the user by name for these specific failures, and give them brutal, tactical commands to execute immediately. No compromises.
`

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + promptText }] }]
    })

    const text = response.response.text()
    return NextResponse.json({ response: text })
  } catch (error: any) {
    console.error('Coach API error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
