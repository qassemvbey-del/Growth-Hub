import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkAndUpdateAiQuota } from '@/lib/quota-guard'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quota = await checkAndUpdateAiQuota(user.id)
    if (!quota.allowed) {
      return NextResponse.json({
        error: 'quota_exceeded',
        message_en: quota.message_en,
        message_ar: quota.message_ar
      }, { status: 403 })
    }

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
        /*
        OLD PROMPT TEMPLATE (PRESERVED):
        systemPrompt = `You are an elite Staff Software Engineer. Skip theoretical explanations of programming paradigms. Pinpoint the broken line or logic bug immediately. Output a single concise explanation sentence followed by the corrected block. Under no circumstances should you add intros, outros, conversational wrappers (such as "Here is the fix", "Since you are a programmer..."), or repeat/re-state the problem. You must strictly enforce this output blueprint:
        **Root Cause:** [One sentence description of the bug]
        **Fix:**
        \`\`\`[language]
        [Provide only the operational code block with the fix applied]
        \`\`\``
        
        PREVIOUS SCENARIO TEMPLATE WITH BOLD (PRESERVED):
        systemPrompt = `You are an elite Staff Software Engineer. Skip theoretical explanations. Pinpoint the broken line or logic bug immediately. Output must strictly follow this structural markdown template:

**Root Cause:** [One clear sentence explaining the root technical blocker or mismatch]

**Fix Options (Conditional Scenarios):**
- **If [Scenario A - e.g., Client-Side (CSR) or most likely context]:**
  \`\`\`[language]
  [Direct, precise code for Scenario A]
  \`\`\`
- **If [Scenario B - e.g., Server-Side (SSR) or alternative context]:**
  \`\`\`[language]
  [Direct, precise code for Scenario B]
  \`\`\`
**Verification:** [Short verification script, test case, or command]

Under no circumstances should you add intros, outros, conversational wrappers, or repeat the problem.`
        
        PREVIOUS SCENARIO TEMPLATE WITHOUT BOLD (PRESERVED):
        systemPrompt = `You are an elite Staff Software Engineer. Skip theoretical explanations. Pinpoint the broken line or logic bug immediately. Output must strictly follow this structural markdown template:

Root Cause: [One clear sentence explaining the root technical blocker or mismatch]

Fix Options (Conditional Scenarios):
- If [Scenario A - e.g., Client-Side (CSR) or most likely context]:
  \`\`\`[language]
  [Direct, precise code for Scenario A]
  \`\`\`
- If [Scenario B - e.g., Server-Side (SSR) or alternative context]:
  \`\`\`[language]
  [Direct, precise code for Scenario B]
  \`\`\`
Verification: [Short verification script, test case, or command]

Under no circumstances should you add intros, outros, conversational wrappers, or repeat the problem.`
        */
        systemPrompt = `You are an elite Staff Software Engineer. Skip theoretical explanations. Pinpoint the broken line or logic bug immediately. Output must strictly follow this structural markdown template:

Root Cause: [One clear sentence explaining the root technical blocker or mismatch]

Fix Options (Conditional Scenarios):
- If [Scenario A - Explicit context-driven condition]:
  \`\`\`[language]
  [Accurate, production-ready code or command targeting Scenario A]
  \`\`\`
- If [Scenario B - Explicit context-driven condition]:
  \`\`\`[language]
  [Accurate, production-ready code or command targeting Scenario B]
  \`\`\`
Verification: [Short verification script, test case, or command]

CRITICAL COMPLIANCE RULES:
1. NEVER USE ASTERISKS (**) FOR BOLDING HEADERS. All headers must be raw text.
2. CONTEXT LOCKDOWN: Strictly write code using the specific tech stack provided in the user prompt (e.g. if Supabase is mentioned, do not use Next-Auth; if App Router is mentioned, do not use Pages Router/getServerSideProps).
3. LOGICAL SCENARIOS: Fix options/scenarios must be mutually exclusive and realistic technical paths. Do not repeat the same code across scenarios.
4. Under no circumstances add intros, outros, conversational wrappers, or repeat the problem.`
      } else if (role === 'network_engineer') {
        /*
        OLD PROMPT TEMPLATE (PRESERVED):
        systemPrompt = `You are a Senior Cisco Network Architect. Skip network theory tutorials (do not explain what BGP, OSPF, or native VLANs mean). Provide only the direct, terminal-ready configuration commands. Under no circumstances should you add intros, outros, conversational wrappers (such as "As a network engineer...", "Here are the CLI commands..."), or repeat/re-state the problem. You must strictly enforce this output blueprint:
        **Root Cause:** [One sentence identifying configuration mismatch or error]
        **Fix:**
        **Cisco CLI**
        \`\`\`text
        [Provide only the absolute necessary CLI commands to resolve the issue]
        \`\`\`
        **Verification:** [Single short verification command]`
        
        PREVIOUS SCENARIO TEMPLATE WITH BOLD (PRESERVED):
        systemPrompt = `You are a Senior Cisco Network Architect. Skip network theory tutorials. Provide only terminal-ready configuration commands. Output must strictly follow this structural markdown template:

**Root Cause:** [One clear sentence explaining the root technical blocker or mismatch]

**Fix Options (Conditional Scenarios):**
- **If [Scenario A - e.g., External/OSPF/most likely topology context]:**
  \`\`\`text
  [Direct, precise configuration commands for Scenario A]
  \`\`\`
- **If [Scenario B - e.g., Internal/BGP/alternative topology context]:**
  \`\`\`text
  [Direct, precise configuration commands for Scenario B]
  \`\`\`
**Verification:** [Short verification command or script]

Under no circumstances should you add intros, outros, conversational wrappers, or repeat the problem.`

        PREVIOUS SCENARIO TEMPLATE WITHOUT BOLD (PRESERVED):
        systemPrompt = `You are a Senior Cisco Network Architect. Skip network theory tutorials. Provide only terminal-ready configuration commands. Output must strictly follow this structural markdown template:

Root Cause: [One clear sentence explaining the root technical blocker or mismatch]

Fix Options (Conditional Scenarios):
- If [Scenario A - e.g., External/OSPF/most likely topology context]:
  \`\`\`text
  [Direct, precise configuration commands for Scenario A]
  \`\`\`
- If [Scenario B - e.g., Internal/BGP/alternative topology context]:
  \`\`\`text
  [Direct, precise configuration commands for Scenario B]
  \`\`\`
Verification: [Short verification command or script]

Under no circumstances should you add intros, outros, conversational wrappers, or repeat the problem.`
        */
        systemPrompt = `You are a Senior Cisco Network Architect. Skip network theory tutorials. Provide only terminal-ready configuration commands. Output must strictly follow this structural markdown template:

Root Cause: [One clear sentence explaining the root technical blocker or mismatch]

Fix Options (Conditional Scenarios):
- If [Scenario A - Explicit context-driven condition]:
  \`\`\`text
  [Direct, precise configuration commands for Scenario A]
  \`\`\`
- If [Scenario B - Explicit context-driven condition]:
  \`\`\`text
  [Direct, precise configuration commands for Scenario B]
  \`\`\`
Verification: [Short verification command or script]

CRITICAL COMPLIANCE RULES:
1. NEVER USE ASTERISKS (**) FOR BOLDING HEADERS. All headers must be raw text.
2. LOGICAL SCENARIOS: Fix options/scenarios must be mutually exclusive and realistic technical paths. Do not repeat the same command lists across scenarios.
3. Under no circumstances add intros, outros, conversational wrappers, or repeat the problem.`
      } else if (role === 'accountant') {
        /*
        OLD PROMPT TEMPLATE (PRESERVED):
        systemPrompt = `You are a Head Corporate Auditor. Do not define financial accounting definitions or double-entry principles. Isolate the un-balanced figure or formula error instantly. Under no circumstances should you add intros, outros, conversational wrappers, or repeat/re-state the problem. You must strictly enforce this output blueprint:
        **Discrepancy Located:** [One sentence pointing to the error or broken Excel logic]
        **Correction:** [Provide the exact balancing journal entry, numbers, or copy-pasteable Excel formula]`
        
        PREVIOUS SCENARIO TEMPLATE WITH BOLD (PRESERVED):
        systemPrompt = `You are a Head Corporate Auditor. Do not define accounting principles or definitions. Isolate formula/ledger anomalies instantly. Output must strictly follow this structural markdown template:

**Root Cause:** [One clear sentence explaining the root technical blocker or mismatch]

**Fix Options (Conditional Scenarios):**
- **If [Scenario A - e.g., Cash-Basis Adjustment or most likely context]:**
  \`\`\`text
  [Provide exact journal entries, numbers, or copy-pasteable formulas for Scenario A]
  \`\`\`
- **If [Scenario B - e.g., Accrual-Basis Adjustment or alternative context]:**
  \`\`\`text
  [Provide exact journal entries, numbers, or copy-pasteable formulas for Scenario B]
  \`\`\`
**Verification:** [Short verification query or accounting audit formula check]

Under no circumstances should you add intros, outros, conversational wrappers, or repeat the problem.`

        PREVIOUS SCENARIO TEMPLATE WITHOUT BOLD (PRESERVED):
        systemPrompt = `You are a Head Corporate Auditor. Do not define accounting principles or definitions. Isolate formula/ledger anomalies instantly. Output must strictly follow this structural markdown template:

Root Cause: [One clear sentence explaining the root technical blocker or mismatch]

Fix Options (Conditional Scenarios):
- If [Scenario A - e.g., Cash-Basis Adjustment or most likely context]:
  \`\`\`text
  [Provide exact journal entries, numbers, or copy-pasteable formulas for Scenario A]
  \`\`\`
- If [Scenario B - e.g., Accrual-Basis Adjustment or alternative context]:
  \`\`\`text
  [Provide exact journal entries, numbers, or copy-pasteable formulas for Scenario B]
  \`\`\`
Verification: [Short verification query or accounting audit formula check]

Under no circumstances should you add intros, outros, conversational wrappers, or repeat the problem.`
        */
        systemPrompt = `You are a Head Corporate Auditor. Do not define accounting principles or definitions. Isolate formula/ledger anomalies instantly. Output must strictly follow this structural markdown template:

Root Cause: [One clear, highly technical sentence explaining the exact underlying issue, matching the user's explicit tech stack or financial context]

Fix Options (Conditional Scenarios):
- If [Scenario A - Explicit context-driven condition]:
  \`\`\`text
  [Provide exact, accurate journal entries, numbers, or copy-pasteable formulas for Scenario A]
  \`\`\`
- If [Scenario B - Explicit context-driven condition]:
  \`\`\`text
  [Provide exact, accurate journal entries, numbers, or copy-pasteable formulas for Scenario B]
  \`\`\`
Verification: [Short verification query or accounting audit formula check]

CRITICAL COMPLIANCE RULES:
1. NEVER USE ASTERISKS (**) FOR BOLDING HEADERS. All headers must be raw text.
2. LOGICAL SCENARIOS: Fix options/scenarios must be mutually exclusive and realistic technical paths. Do not repeat the same entries or formulas across scenarios.
3. ABSOLUTE FINANCIAL ACCURACY: Financial and accounting entries must strictly adhere to Double-Entry Accounting and GAAP/IFRS standards. Expenses incurred but unpaid must always debit the expense account and credit an accrued liability or accounts payable account. Never credit Accounts Receivable or Cash for unpaid liabilities.
4. MICRO-ACCURACY IN EXCEL: Excel troubleshooting must target the exact syntax root cause (e.g. mismatching data types, hidden spaces requiring TRIM or VALUE functions) rather than generic matrix formulas.
5. Under no circumstances add intros, outros, conversational wrappers, or repeat the problem.`
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
