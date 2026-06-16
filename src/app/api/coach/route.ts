import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: Request) {
  try {
    const { action, userData, language } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API Key not configured',
        message: 'Neither GEMINI_API_KEY nor NEXT_PUBLIC_GEMINI_API_KEY is set in environment variables.'
      }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // Using gemini-1.5-flash for hyperpressure high-speed latency response
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemPrompt = `You are a Savage, Tactical Productivity Coach. You speak directly, brutally, and concisely. Absolutely no emojis, no fluff, no polite filler, and zero compliments (NEVER say 'Great job!', 'Keep it up!', or 'Nice progress'). 

Your core objective: Assess the user's progress ruthlessly based on the ACTION REQUESTED:
1. If ACTION is 'REALITY_CHECK': Analyze the overdue goals and tasks. Reprimand the user by name for these specific failures, list the overdue items, shame their lack of discipline, and command immediate action.
2. If ACTION is 'TOP_3_FOCUS': Review all active tasks and goals. Filter them down and return ONLY a numbered list of the top 3 absolute priorities for today. No explanations, no fluff.
3. If ACTION is 'QUICK_WIN': Scan outstanding tasks. Pinpoint the single absolute easiest, smallest 5-minute task. Order the user to complete it immediately to break procrastination and build momentum.

Keep your response extremely direct, high-pressure, and tactical. Speak like a military commander demanding absolute accountability.

Always respond in the requested language: ${language || 'en'}. If the language is 'ar'، اتكلم بالمصري العامي — كاجوال واحترافي في نفس الوقت. زي صاحب بيساعد صاحبه يتقدم. مش رسمي أوي ومش عامية زيادة. استخدم كلمات زي: يلا، خلص، عمل، ماشي، تمام، مش هينفع، ركز، إنت تقدر.`

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

Analyze this telemetry. Execute the requested action according to your savage, brutal coaching persona.
`

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + promptText }] }]
    })

    let text = ''
    try {
      text = response.response.text()
    } catch (textErr) {
      console.warn("Gemini response.text() failed, trying fallback:", textErr)
      const candidate = response.response?.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      text = part?.text || '';
    }

    return NextResponse.json({ response: text })
  } catch (error: any) {
    console.error('COACH_ROUTE_CRASH:', error)
    return NextResponse.json({ 
      error: 'Server error',
      message: error?.message || String(error),
      stack: error?.stack || ''
    }, { status: 500 })
  }
}
