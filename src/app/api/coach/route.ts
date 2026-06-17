import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Auth & Inputs
    const { action, userData, language } = await req.json()

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("COACH_ROUTE_CRASH: Supabase env variables are missing.")
      return NextResponse.json({ error: "Supabase environment configuration is missing" }, { status: 500 })
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Step 1 (Validation): Read current quota
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_tier, ai_request_count, last_ai_reset')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      console.error('Failed to fetch user profile for quota check:', profileErr)
      return NextResponse.json({ error: 'Quota validation failed' }, { status: 500 })
    }

    let limit = 3
    if (profile.user_tier === 'pro') limit = 50
    else if (profile.user_tier === 'elite') limit = 150

    let currentCount = profile.ai_request_count || 0
    const lastReset = profile.last_ai_reset ? new Date(profile.last_ai_reset) : new Date()
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)

    if (lastReset < twelveHoursAgo) {
      currentCount = 0
    }

    if (currentCount >= limit) {
      return NextResponse.json({ error: 'quota_exhausted' }, { status: 429 })
    }

    // 3. Call Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })

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

    let text = ''
    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + promptText }] }]
      })

      try {
        text = response.response.text()
      } catch (textErr) {
        console.warn("Gemini response.text() failed, trying fallback:", textErr)
        const candidate = response.response?.candidates?.[0]
        const part = candidate?.content?.parts?.[0]
        text = part?.text || ''
      }
    } catch (geminiError: any) {
      console.error("Gemini API execution failed:", geminiError)
      return NextResponse.json({ error: 'ai_server_overloaded' }, { status: 503 })
    }

    // 4. Step 4 (Deduction on Success): Increment user's quota count
    const { error: incrementError } = await supabaseAdmin.rpc('check_and_increment_quota', {
      p_user_id: user.id
    })

    if (incrementError) {
      console.error('Failed to deduct quota on success:', incrementError)
    }

    return NextResponse.json({ response: text })
  } catch (error: any) {
    console.error('COACH_ROUTE_CRASH:', error)
    return NextResponse.json({ error: 'Server error', message: error?.message || String(error) }, { status: 500 })
  }
}
