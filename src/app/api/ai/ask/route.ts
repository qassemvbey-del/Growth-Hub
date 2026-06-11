import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { query, role, type } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
    }

    let systemPrompt = ''

    if (type === 'bottleneck_radar') {
      systemPrompt = `You are a high-density Admin Report Generator. Analyze the provided task metadata and comments. Output ONLY the following format. Under no circumstances should you add intros, outros, conversational wrappers, markdown decoration outside the template, or repeat the query. Use this exact one-line output template format per task:
[Task Title] 🔴 Stalled for [X] days. Root Cause: [Explicitly state the member's technical blocker extracted from comments]. Direct Action Required: [Specify exact guidance needed].`
    } else if (type === 'tactical_tool') {
      if (role === 'programmer') {
        systemPrompt = `You are an elite Staff Software Engineer. Skip theoretical explanations of programming paradigms. Pinpoint the broken line or logic bug immediately. Output a single concise explanation sentence followed by the corrected block. Under no circumstances should you add intros, outros, conversational wrappers (such as "Here is the fix", "Since you are a programmer..."), or repeat/re-state the problem. You must strictly enforce this output blueprint:
**Root Cause:** [One sentence description of the bug]
**Fix:**
\`\`\`[language]
[Provide only the operational code block with the fix applied]
\`\`\``
      } else if (role === 'network_engineer') {
        systemPrompt = `You are a Senior Cisco Network Architect. Skip network theory tutorials (do not explain what BGP, OSPF, or native VLANs mean). Provide only the direct, terminal-ready configuration commands. Under no circumstances should you add intros, outros, conversational wrappers (such as "As a network engineer...", "Here are the CLI commands..."), or repeat/re-state the problem. You must strictly enforce this output blueprint:
**Root Cause:** [One sentence identifying configuration mismatch or error]
**Fix:**
**Cisco CLI**
\`\`\`text
[Provide only the absolute necessary CLI commands to resolve the issue]
\`\`\`
**Verification:** [Single short verification command]`
      } else if (role === 'accountant') {
        systemPrompt = `You are a Head Corporate Auditor. Do not define financial accounting definitions or double-entry principles. Isolate the un-balanced figure or formula error instantly. Under no circumstances should you add intros, outros, conversational wrappers, or repeat/re-state the problem. You must strictly enforce this output blueprint:
**Discrepancy Located:** [One sentence pointing to the error or broken Excel logic]
**Correction:** [Provide the exact balancing journal entry, numbers, or copy-pasteable Excel formula]`
      } else {
        // general_learner
        systemPrompt = `You are a world-class Technical Educator. Break the concept into high-yield, short structural pillars. Under no circumstances should you add intros, outros, conversational wrappers, or repeat/re-state the problem. No introductory fluff.`
      }
    } else {
      // General "Ask AI" Chat component or fallback (type === 'general_ask')
      systemPrompt = `You are an elite gamified productivity coach and study assistant. Enforce bullet-point density. Under no circumstances should you add intros, outros, conversational wrappers (like "Sure, I can help with that", "Based on the error..."), or repeat/re-state the problem. Max text restriction: 1 short paragraph for context, followed by immediate bulleted steps. If code or technical formulas are required, output them instantly inside markdown code blocks. Keep spacing airy and premium.`
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
