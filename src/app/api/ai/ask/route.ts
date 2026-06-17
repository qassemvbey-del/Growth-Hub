import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

    // 2. Centralized Quota Check (Atomic RPC — BEFORE Gemini)
    const { data: quotaData, error: quotaError } = await supabaseAdmin.rpc('check_and_increment_quota', {
      p_user_id: user.id
    })

    if (quotaError) {
      console.error('Quota RPC error:', quotaError)
      return NextResponse.json({ error: 'Quota validation failed', message: quotaError.message }, { status: 500 })
    }

    const quotaResult = typeof quotaData === 'string' ? JSON.parse(quotaData) : quotaData
    if (!quotaResult || !quotaResult.allowed) {
      return NextResponse.json({
        error: 'Quota Exceeded',
        message_en: 'Your AI request limit has been reached. Please wait for the automatic cooldown or upgrade your plan.',
        message_ar: 'لقد نفدت كوتة استعلامات الذكاء الاصطناعي الخاصة بك. يرجى الانتظار حتى التجديد التلقائي أو ترقية خطتك.'
      }, { status: 403 })
    }

    // 3. Call Gemini
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
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
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

    // 4. Parse & Return
    let aiResponse = ''
    try {
      aiResponse = result.response.text()
    } catch (textErr) {
      console.warn("Gemini response.text() failed, trying fallback:", textErr)
      const candidate = result.response?.candidates?.[0]
      const part = candidate?.content?.parts?.[0]
      aiResponse = part?.text || ''
    }

    return NextResponse.json({ text: aiResponse })
  } catch (err: any) {
    console.error('ASK_ROUTE_CRASH:', err)
    return NextResponse.json({ error: 'Internal Server Error', message: err.message || String(err) }, { status: 500 })
  }
}
