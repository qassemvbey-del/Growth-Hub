'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function aiProfanityCheck(text: string): Promise<boolean> {
  if (!text || text.trim() === '') return true
  
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) return true

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
    return true
  }
}
