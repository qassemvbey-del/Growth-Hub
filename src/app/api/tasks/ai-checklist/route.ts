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
    const { taskId, youtubeUrl, taskTitle } = await req.json()
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

    // 2. Query task description / explanation first to optimize (Requirement 2)
    const { data: taskData } = await supabaseAdmin
      .from('tasks')
      .select('description, metadata')
      .eq('id', taskId)
      .single()

    const aiExplanation = taskData?.description || taskData?.metadata?.ai_explanation || taskData?.metadata?.description || '';

    let runStage: 1 | 2 | 3 = 3
    let transcriptText = ''
    let videoTitle = taskTitle || 'YouTube Video'
    let videoDescription = ''

    if (aiExplanation && aiExplanation.trim().length > 10) {
      runStage = 1
    } else {
      // Fallback: Fetch metadata and transcript from YouTube
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

      try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)
        transcriptText = transcriptItems.map(item => item.text).join(' ')
      } catch (_err) {
        // Silently catch transcript error
      }

      const transcriptLen = transcriptText.trim().length
      const metadataCombined = (videoTitle + ' ' + videoDescription).trim()
      const metadataLen = metadataCombined.length

      if (transcriptLen > 50) {
        runStage = 1
      } else if (metadataLen > 50) {
        runStage = 2
      }
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

      const currentMetadata = (taskData?.metadata as any) || {}
      await supabaseAdmin
        .from('tasks')
        .update({ metadata: { ...currentMetadata, videoAnalysis: fallbackAnalysis } })
        .eq('id', taskId)

      return NextResponse.json({ success: true, analysis: fallbackAnalysis })
    }

    // Step 1 (Validation): Read current quota
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_tier, ai_request_count, last_ai_reset')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      console.error('Failed to fetch user profile for quota check:', profileErr)
      return NextResponse.json({ error: 'Quota validation failed' }, { status: 500 })
    }

    let limit = 3
    if (profile.user_tier === 'pro') limit = 50
    else if (profile.user_tier === 'elite') limit = 150

    let currentCount = profile.ai_request_count || 0
    const lastReset = profile.last_ai_reset ? new Date(profile.last_ai_reset) : new Date()
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)

    if (lastReset < twelveHoursAgo) {
      currentCount = 0
    }

    if (currentCount >= limit) {
      return NextResponse.json({ error: 'quota_exhausted' }, { status: 429 })
    }

    // call Gemini (with error catch block for Step 3)
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing" }, { status: 500 })
    }

    let prompt = ''
    if (aiExplanation && aiExplanation.trim().length > 10) {
      prompt = `You are a strict task breakdown machine. Analyze the provided AI Explanation / Description of the task topic.
Respond strictly in Arabic, and output ONLY a valid JSON array of strings, where each string is a single, actionable, short step. DO NOT output markdown formatting, and do NOT wrap the JSON in codeblocks.
Example output format:
["الخطوة الأولى", "الخطوة الثانية"]

AI EXPLANATION / DESCRIPTION:
${aiExplanation}
`
    } else if (runStage === 1) {
      prompt = `You are a strict task breakdown machine. Analyze the provided Video Title, Description, and Audio Transcript.
Respond strictly in Arabic, and output ONLY a valid JSON array of strings, where each string is a single, actionable, short step. DO NOT output markdown formatting, and do NOT wrap the JSON in codeblocks.
Example output format:
["الخطوة الأولى", "الخطوة الثانية"]

VIDEO DATA:
Title: ${videoTitle}
Description: ${videoDescription}
Transcript: ${transcriptText}
`
    } else {
      prompt = `You are a strict task breakdown machine. Analyze this video based ONLY on the Title and Description because the audio transcript is missing.
Respond strictly in Arabic, and output ONLY a valid JSON array of strings, where each string is a single, actionable, short step. DO NOT output markdown formatting, and do NOT wrap the JSON in codeblocks.
Example output format:
["الخطوة الأولى", "الخطوة الثانية"]

TITLE: ${videoTitle}
DESCRIPTION: ${videoDescription}
`
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const fallbackModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"]
    let result: any = null
    let lastError: any = null

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          }
        })
        result = await model.generateContent(prompt)
        break; // Success, exit loop
      } catch (error: any) {
        lastError = error
        const errMsg = error.message?.toLowerCase() || ""
        if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("overloaded") || errMsg.includes("rate limit")) {
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

    let responseText = ''
    try {
      responseText = result.response.text()
    } catch (textErr) {
      console.warn("Gemini response.text() failed, trying fallback:", textErr)
      const candidate = result.response?.candidates?.[0]
      const part = candidate?.content?.parts?.[0]
      responseText = part?.text || ''
    }

    let steps: string[] = []
    try {
      const parsed = JSON.parse(responseText.trim())
      if (Array.isArray(parsed)) {
        steps = parsed.filter(item => typeof item === 'string' && item.trim().length > 0)
      } else if (parsed && Array.isArray(parsed.checklist)) {
        steps = parsed.checklist.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
      } else if (parsed && typeof parsed === 'object') {
        // Fallback to extraction from object keys/values if it generated an object
        const values = Object.values(parsed)
        if (values.length > 0 && Array.isArray(values[0])) {
          steps = (values[0] as any[]).filter(item => typeof item === 'string' && item.trim().length > 0)
        }
      }
    } catch (parseErr: any) {
      console.error('Failed to parse Gemini response JSON array:', responseText, parseErr)
      return NextResponse.json({ error: `JSON Parse Error: ${parseErr.message || String(parseErr)}` }, { status: 500 })
    }

    // Step 4 (Deduction on Success): Increment user's quota count
    const { error: incrementError } = await supabaseAdmin.rpc('check_and_increment_quota', {
      p_user_id: user.id
    })

    if (incrementError) {
      console.error('Failed to deduct quota on success:', incrementError)
    }

    // Convert steps into subtasks structure and merge with existing non-AI subtasks
    const currentMetadata = (taskData?.metadata as any) || {}
    const existingSubtasks = currentMetadata.subtasks || []
    
    // Filter out previous AI subtasks to avoid duplicates/mess
    const userSubtasks = existingSubtasks.filter((s: any) => !s.id?.startsWith('sub_ai_') && !s.id?.startsWith('ai-'))

    const newAiSubtasks = steps.map((stepText, idx) => ({
      id: `sub_ai_${Date.now()}_${idx}`,
      title: stepText.trim(),
      is_completed: false
    }))

    const mergedSubtasks = [...userSubtasks, ...newAiSubtasks]

    // Save metadata
    await supabaseAdmin
      .from('tasks')
      .update({ metadata: { ...currentMetadata, subtasks: mergedSubtasks } })
      .eq('id', taskId)

    return NextResponse.json({ success: true, steps })
  } catch (error: any) {
    console.error('AI Route Error (CHECKLIST_ROUTE_CRASH):', error)
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}
