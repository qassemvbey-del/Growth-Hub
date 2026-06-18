import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Auth & Input
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, role, type } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("ASK_ROUTE_CRASH: Supabase env variables are missing.")
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

    // 3. Call Gemini (with error catch block for Step 3)
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing" }, { status: 500 })
    }

    let systemPrompt = ''

    if (type === 'bottleneck_radar') {
      systemPrompt = `You are a high-density Admin Report Generator. Analyze the provided task metadata and comments. Output ONLY the following format. Under no circumstances should you add intros, outros, conversational wrappers, markdown decoration outside the template, or repeat the query. Use this exact one-line output template format per task:
[Task Title] 🔴 Stalled for [X] days. Root Cause: [Explicitly state the member's technical blocker extracted from comments]. Direct Action Required: [Specify exact guidance needed].`
    } else {
      systemPrompt = `أنت مساعد ذكي. أجب باللغة العربية فقط. PLAIN TEXT ONLY. NO markdown formatting. NO asterisks (*), NO bold (**). If explaining a topic, focus on the core concept. Do NOT explain programming languages unless explicitly requested.`
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const fallbackModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"]
    let result: any = null
    let lastError: any = null

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3,
          }
        })
        result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\nQuery: ' + query }]
            }
          ]
        })
        break; // Success
      } catch (error: any) {
        lastError = error
        const errMsg = error.message?.toLowerCase() || ""
        if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("overloaded") || errMsg.includes("rate limit")) {
          console.warn(`[AI Fallback] Model ${modelName} failed. Trying next candidate...`, error)
          continue
        } else {
          throw error
        }
      }
    }

    if (!result) {
      throw new Error(`All fallback models failed. Last API Error: ${lastError?.message || String(lastError)}`)
    }

    let aiResponse = ''
    try {
      aiResponse = result.response.text()
    } catch (textErr) {
      console.warn("Gemini response.text() failed, trying fallback:", textErr)
      const candidate = result.response?.candidates?.[0]
      const part = candidate?.content?.parts?.[0]
      aiResponse = part?.text || ''
    }

    // 4. Step 4 (Deduction on Success): Increment user's quota count
    const { error: incrementError } = await supabaseAdmin.rpc('check_and_increment_quota', {
      p_user_id: user.id
    })

    if (incrementError) {
      console.error('Failed to deduct quota on success:', incrementError)
    }

    return NextResponse.json({ text: aiResponse })
  } catch (err: any) {
    console.error('ASK_ROUTE_CRASH:', err)
    return NextResponse.json({ error: 'Internal Server Error', message: err.message || String(err) }, { status: 500 })
  }
}
