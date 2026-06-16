import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { YoutubeTranscript } from 'youtube-transcript'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface VideoAnalysisResponse {
  isIntroOnly: boolean;
  summary: string;
  keyTakeaways: string[];
  checklist: string[];
  additionalNotes: string;
}

function getYouTubeId(urlOrId: string) {
  if (!urlOrId) return ''
  if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('?')) return urlOrId
  try {
    const urlObj = new URL(urlOrId)
    const vParam = urlObj.searchParams.get('v')
    if (vParam && vParam.length === 11) return vParam
    if (urlObj.hostname === 'youtu.be') {
      const pathId = urlObj.pathname.slice(1)
      if (pathId.length === 11) return pathId
    }
    const pathMatch = urlObj.pathname.match(/\/(embed|v)\/([a-zA-Z0-9_-]{11})/)
    if (pathMatch && pathMatch[2]) return pathMatch[2]
  } catch (_e) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = urlOrId.match(regExp)
    return (match && match[2].length === 11) ? match[2] : urlOrId
  }
  return urlOrId
}

export async function POST(req: Request) {
  try {
    // 1. Auth & Setup
    const { taskId, youtubeUrl, taskTitle, goalTitle } = await req.json()
    if (!taskId || !youtubeUrl) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const videoId = getYouTubeId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("CHECKLIST_ROUTE_CRASH: Supabase env variables are missing.")
      return NextResponse.json({ error: "Supabase environment configuration is missing" }, { status: 500 })
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Extract Video Info & Transcript
    let videoTitle = taskTitle || 'YouTube Video'
    let videoDescription = ''
    const youtubeKey = process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY
    if (youtubeKey) {
      try {
        const metadataUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeKey}`
        const metaRes = await fetch(metadataUrl)
        if (metaRes.ok) {
          const metaData = await metaRes.json()
          const snippet = metaData.items?.[0]?.snippet
          if (snippet) {
            videoTitle = snippet.title || videoTitle
            videoDescription = snippet.description || ''
          }
        }
      } catch (err) {
        console.warn('Failed to fetch YouTube Metadata:', err)
      }
    } else {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        const res = await fetch(oembedUrl)
        if (res.ok) {
          const data = await res.json()
          videoTitle = data.title || videoTitle
        }
      } catch (err) {
        console.warn('Failed to fetch YouTube oEmbed:', err)
      }
    }

    let transcriptText = ''
    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)
      transcriptText = transcriptItems.map(item => item.text).join(' ')
    } catch (_err) {
      // Silently catch — transcriptText stays empty
    }

    // 3. Evaluate 3-Stage Validation
    const transcriptLen = transcriptText.trim().length
    const metadataCombined = (videoTitle + ' ' + videoDescription).trim()
    const metadataLen = metadataCombined.length

    let runStage: 1 | 2 | 3 = 3
    if (transcriptLen > 50) {
      runStage = 1
    } else if (metadataLen > 50) {
      runStage = 2
    }

    // Stage 3 (Hard Reject) — NO quota check, NO Gemini call
    if (runStage === 3) {
      const fallbackAnalysis = {
        isIntroOnly: true,
        summary: "عذراً، هذا الفيديو لا يحتوي على نص مفرغ (Transcript) أو وصف كافٍ. هذا الفيديو غير متوافق مع ميزة التحليل الذكي.",
        keyTakeaways: [],
        checklist: [],
        additionalNotes: ""
      }

      const { data: taskData } = await supabaseAdmin
        .from('tasks')
        .select('metadata')
        .eq('id', taskId)
        .single()

      const currentMetadata = (taskData?.metadata as any) || {}
      await supabaseAdmin
        .from('tasks')
        .update({ metadata: { ...currentMetadata, videoAnalysis: fallbackAnalysis } })
        .eq('id', taskId)

      return NextResponse.json({ success: true, analysis: fallbackAnalysis })
    }

    // 4. Centralized Quota Check (Atomic RPC — BEFORE Gemini)
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

    // 5. Call Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    })

    let prompt = ''
    if (runStage === 1) {
      prompt = `You are a highly precise Content Analyst and Task Extractor for a life-management system. Analyze the provided Video Title, Description, and Audio Transcript.
Respond strictly in Arabic, and output ONLY a raw JSON object matching this exact schema:
{
  "isIntroOnly": boolean,
  "summary": "string",
  "keyTakeaways": ["string"],
  "checklist": ["string"],
  "additionalNotes": "string"
}

### STRICT RULES:
1. Zero Hallucination: ONLY use the provided transcript. Do not invent steps.
2. If the video is an intro or lacks practical steps, set "isIntroOnly" to true and "checklist" to [].
3. PLAIN TEXT ONLY: Do NOT use markdown formatting inside the strings. NO asterisks (*), NO bold (**), NO hashtags (#). The strings must be completely clean, plain Arabic text without any formatting symbols.
4. CRITICAL: If the video transcript is vague, lacks explicit actionable steps, or if you are unsure, DO NOT GUESS AND DO NOT REPEAT YOURSELF. Immediately set isIntroOnly to true, leave checklist empty, and output this exact summary: 'عذراً، محتوى هذا الفيديو غير كافٍ أو لا يحتوي على خطوات واضحة يمكن استخراجها.'

VIDEO DATA:
Title: ${videoTitle}
Description: ${videoDescription}
Transcript: ${transcriptText}
`
    } else {
      prompt = `Analyze this video based ONLY on the Title and Description because the audio transcript is missing. You MUST start your summary string exactly with: '(تنويه: التحليل مبني على وصف الفيديو فقط لعدم توفر نص مفرغ)'. Respond strictly in Arabic, and output ONLY a raw JSON object matching this exact schema:
{
  "isIntroOnly": boolean,
  "summary": "string",
  "keyTakeaways": ["string"],
  "checklist": ["string"],
  "additionalNotes": "string"
}

### STRICT RULES:
1. Zero Hallucination: ONLY use the provided Title and Description. Do not invent steps.
2. If the video is an intro or lacks practical steps, set "isIntroOnly" to true and "checklist" to [].
3. PLAIN TEXT ONLY: Do NOT use markdown formatting inside the strings. NO asterisks (*), NO bold (**), NO hashtags (#).

TITLE: ${videoTitle}
DESCRIPTION: ${videoDescription}
`
    }

    const result = await model.generateContent(prompt)

    let responseText = ''
    try {
      responseText = result.response.text()
    } catch (textErr) {
      console.warn("Gemini response.text() failed, trying fallback:", textErr)
      const candidate = result.response?.candidates?.[0]
      const part = candidate?.content?.parts?.[0]
      responseText = part?.text || ''
    }

    let analysis: VideoAnalysisResponse
    try {
      analysis = JSON.parse(responseText.trim())
      if (typeof analysis.isIntroOnly !== 'boolean') analysis.isIntroOnly = false
      if (typeof analysis.summary !== 'string') analysis.summary = ''
      if (!Array.isArray(analysis.keyTakeaways)) analysis.keyTakeaways = []
      if (!Array.isArray(analysis.checklist)) analysis.checklist = []
      if (typeof analysis.additionalNotes !== 'string') analysis.additionalNotes = ''
    } catch (parseErr) {
      console.error('Failed to parse Gemini response JSON:', responseText)
      analysis = {
        isIntroOnly: true,
        summary: 'فشلت معالجة استجابة الذكاء الاصطناعي بنجاح.',
        keyTakeaways: [],
        checklist: [],
        additionalNotes: ''
      }
    }

    // 6. Database Save & Return
    const { data: taskData } = await supabaseAdmin
      .from('tasks')
      .select('metadata')
      .eq('id', taskId)
      .single()

    const currentMetadata = (taskData?.metadata as any) || {}
    await supabaseAdmin
      .from('tasks')
      .update({ metadata: { ...currentMetadata, videoAnalysis: analysis } })
      .eq('id', taskId)

    return NextResponse.json({ success: true, analysis })
  } catch (error: any) {
    console.error('CHECKLIST_ROUTE_CRASH:', error)
    return NextResponse.json({ error: 'Server error', message: error?.message || String(error) }, { status: 500 })
  }
}
