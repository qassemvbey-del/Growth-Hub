import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authentication Check
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, role, type } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Quota Check (Pure check without incrementing)
    const { data: profileData, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_tier, ai_request_count, last_ai_reset')
      .eq('id', user.id)
      .single()

    if (profileErr || !profileData) {
      return NextResponse.json({ error: 'Failed to retrieve profile quota status' }, { status: 500 })
    }

    const lastReset = new Date(profileData.last_ai_reset || Date.now()).getTime()
    const nowTime = Date.now()
    const cooldownPeriod = 12 * 60 * 60 * 1000 // 12 hours
    let currentCount = profileData.ai_request_count || 0
    if (nowTime - lastReset >= cooldownPeriod) {
      currentCount = 0
    }

    const tier = profileData.user_tier || 'free'
    let limit = 3
    if (tier === 'pro') limit = 50
    else if (tier === 'elite') limit = 150

    if (currentCount >= limit) {
      return NextResponse.json({
        error: 'Quota Exceeded',
        message_en: 'Your 12-hour AI request limit has been reached. Please wait for the automatic cooldown or unlock instantly with an AI Refill Pack for only 15 EGP.',
        message_ar: 'لقد نفدت كوتة استعلامات الذكاء الاصطناعي الخاصة بك لهذه الـ 12 ساعة. يرجى الانتظار حتى التجديد التلقائي أو الشحن الفوري لباقة التصفير بـ 15 ج.م فقط.'
      }, { status: 403 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    let systemPrompt = ''

    if (type === 'bottleneck_radar') {
      systemPrompt = `You are a high-density Admin Report Generator. Analyze the provided task metadata and comments. Output ONLY the following format. Under no circumstances should you add intros, outros, conversational wrappers, markdown decoration outside the template, or repeat the query. Use this exact one-line output template format per task:
[Task Title] 🔴 Stalled for [X] days. Root Cause: [Explicitly state the member's technical blocker extracted from comments]. Direct Action Required: [Specify exact guidance needed].`
    } else {
      // Both general_ask and tactical_tool
      systemPrompt = `أنت مساعد ذكي. أجب باللغة العربية فقط. PLAIN TEXT ONLY. NO markdown formatting. NO asterisks (*), NO bold (**). If explaining a topic, focus on the core concept. Do NOT explain programming languages unless explicitly requested.`
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
      }
    })

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt + '\n\nQuery: ' + query }]
        }
      ]
    })
    
    const aiResponse = result.response.text() || ''

    // ONLY increment/deduct quota on successful response
    const { error: incrementError } = await supabaseAdmin.rpc('check_and_increment_quota', {
      p_user_id: user.id
    })
    if (incrementError) {
      console.error('Failed to increment AI quota count:', incrementError)
    }

    // Log Creation (if log table exists/not missing)
    try {
      await supabaseAdmin.from('ai_usage_logs').insert({
        user_id: user.id,
        action_type: type || 'ask_ai'
      })
    } catch (logErr) {
      console.warn('Failed to write usage log (might be normal if table missing):', logErr)
    }

    return NextResponse.json({ text: aiResponse })
  } catch (err: any) {
    console.error('AI ask router error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
