'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { validateContent } from '@/lib/profanityFilter'

export async function aiProfanityCheck(text: string): Promise<boolean> {
  if (!text || text.trim() === '') return true

  // Local check
  const { isValid } = validateContent(text)
  if (!isValid) return false

  try {
    const supabase = await createServerClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    // For guests, return the local-only result without calling Gemini
    if (!user) {
      return isValid
    }

    // Call Gemini only if there is a logged-in user (do not count it against the 20)
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) return isValid

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    })

    const prompt = `Analyze this text for toxic language, explicit insults, or profanity in English or Arabic. Return ONLY a JSON block: { "toxic": true/false }. Text: "${text}"`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const json = JSON.parse(responseText)

    return !json.toxic
  } catch (error) {
    console.error('AI Profanity check failed:', error)
    return isValid
  }
}
