import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { query, role } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
    }

    let classPromptAddition = ''
    if (role === 'programmer') {
      classPromptAddition = 'Specifically, act as a Staff Next.js Lead & Principal Software Engineer. Provide instant, raw, expert-level debugging diagnostics, optimized syntax highlights, clean copy-pasteable code blocks, and absolute technical diagnostics. Do NOT include corporate fluff (like "Since you are a programmer...", "Here is the fix for your code..."). Immediately launch into the diagnosis/code.'
    } else if (role === 'network_engineer') {
      classPromptAddition = 'Specifically, act as a Senior Cisco Network Architect & Infrastructure Expert. Provide raw Cisco/Juniper CLI syntax repairs, subnetworking maps, routing table audit logs, and expert infrastructure troubleshooting. Do NOT include corporate fluff (like "As a network engineer...", "Here are the commands you need..."). Immediately launch into the diagnostics/CLI commands.'
    } else if (role === 'accountant') {
      classPromptAddition = 'Specifically, act as a Head Corporate Auditor & CPA Expert. Audit broken journal entries, fix Excel/Google Sheets calculations, map financial ledgers, and explain GAAP/IFRS rules with deep corporate finance jargon. Do NOT include corporate fluff (like "As an accountant...", "Here is the accounting correction..."). Immediately launch into the calculations/auditing.'
    } else if (role === 'general_learner') {
      classPromptAddition = 'Specifically, act as a world-class Technical Educator. Break down complex science/tech/business theories, create step-by-step logic maps, use intuitive analogies, and structure definitions cleanly. Do NOT include conversational filler. Immediately start explaining.'
    }

    const systemPrompt = `You are an elite gamified productivity coach and context-aware study assistant inside Growth Hub. Provide precise, highly structural explanations, blueprints, or direct definitions. Use clean, professional Arabic or English based on the input query. Formatting must strictly enforce beautiful Markdown layout configurations (bold subheaders, descriptive bullet strings, custom code syntax blocks, or tables where appropriate). Keep spacing airy and premium. ${classPromptAddition}`

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
            content: systemPrompt
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
