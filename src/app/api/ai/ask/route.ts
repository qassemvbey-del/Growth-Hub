import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are an elite gamified productivity coach and context-aware study assistant inside Growth Hub. Provide precise, highly structural explanations, blueprints, or direct definitions. Use clean, professional Arabic or English based on the input query. Formatting must strictly enforce beautiful Markdown layout configurations (bold subheaders, descriptive bullet strings, custom code syntax blocks, or tables where appropriate). Keep spacing airy and premium.'
          },
          {
            role: 'user',
            content: query
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API Error:', errorText)
      return NextResponse.json({ error: 'Failed to communicate with Groq API' }, { status: 502 })
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ text: aiResponse })
  } catch (err: any) {
    console.error('AI ask router error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
