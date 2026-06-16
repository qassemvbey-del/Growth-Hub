import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is missing' },
        { status: 500 }
      )
    }

    const keySnippet = apiKey.substring(0, 5)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent("Reply with the word 'SUCCESS' in English.")
    const responseText = result.response.text()

    return NextResponse.json({
      status: 'success',
      keySnippet,
      response: responseText.trim(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
