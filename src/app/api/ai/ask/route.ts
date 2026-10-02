import { NextResponse } from 'next/server'
import { requireUserAndQuota } from '@/lib/quota-guard'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { query, type } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Atomic server-side auth & quota check before Gemini
    const quota = await requireUserAndQuota()
    if (!quota.ok) {
      return NextResponse.json(
        {
          error: quota.status === 429 ? quota.message_ar : quota.error,
          message_en: quota.message_en,
          message_ar: quota.message_ar
        },
        { status: quota.status }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 500 })
    }

    let systemPrompt = ''

    if (type === 'bottleneck_radar') {
      systemPrompt = `You are a high-density Admin Report Generator. Analyze the provided task metadata and comments. Output ONLY the following format. Under no circumstances should you add intros, outros, conversational wrappers, markdown decoration outside the template, or repeat the query. Use this exact one-line output template format per task:
[Task Title] 🔴 Stalled for [X] days. Root Cause: [Explicitly state the member's technical blocker extracted from comments]. Direct Action Required: [Specify exact guidance needed].`
    } else {
      systemPrompt = `أنت مساعد ذكي. أجب باللغة العربية فقط. PLAIN TEXT ONLY. NO markdown formatting. NO asterisks (*), NO bold (**). If explaining a topic, focus on the core concept. Do NOT explain programming languages unless explicitly requested.`
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const fallbackModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash']
    let result: any = null
    let lastError: any = null

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3
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
        break
      } catch (error: any) {
        lastError = error
        const errMsg = error.message?.toLowerCase() || ''
        if (
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('404') ||
          errMsg.includes('not found') ||
          errMsg.includes('overloaded') ||
          errMsg.includes('rate limit')
        ) {
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
      console.warn('Gemini response.text() failed, trying fallback:', textErr)
      const candidate = result.response?.candidates?.[0]
      const part = candidate?.content?.parts?.[0]
      aiResponse = part?.text || ''
    }

    return NextResponse.json({ text: aiResponse, remaining: quota.remaining })
  } catch (err: any) {
    console.error('ASK_ROUTE_CRASH:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
