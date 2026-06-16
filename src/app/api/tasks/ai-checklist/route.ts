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
    const { taskId, youtubeUrl, taskTitle, goalTitle } = await req.json()
    if (!taskId || !youtubeUrl) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const videoId = getYouTubeId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // 1. Authentication Check
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Quota Check (Pure check without incrementing)
    const { data: profileData, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_tier, ai_request_count, last_ai_reset')
      .eq('id', user.id)
      .single()

    if (profileErr || !profileData) {
      return NextResponse.json({ error: 'Failed to retrieve profile quota status' }, { status: 500 })
    }

    const lastReset = new Date(profileData.last_ai_reset || Date.now()).getTime()
    const nowTime = Date.now()
    const cooldownPeriod = 12 * 60 * 60 * 1000 // 12 hours
    let currentCount = profileData.ai_request_count || 0
    if (nowTime - lastReset >= cooldownPeriod) {
      currentCount = 0
    }

    const tier = profileData.user_tier || 'free'
    let limit = 3
    if (tier === 'pro') limit = 50
    else if (tier === 'elite') limit = 150

    if (currentCount >= limit) {
      return NextResponse.json({
        error: 'Quota Exceeded',
        message_en: 'Your 12-hour AI request limit has been reached. Please wait for the automatic cooldown or unlock instantly with an AI Refill Pack for only 15 EGP.',
        message_ar: 'لقد نفدت كوتة استعلامات الذكاء الاصطناعي الخاصة بك لهذه الـ 12 ساعة. يرجى الانتظار حتى التجديد التلقائي أو الشحن الفوري لباقة التصفير بـ 15 ج.م فقط.'
      }, { status: 403 })
    }

    // 3. Rate Limit Verification
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: cooldownLogs, error: cooldownError } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('action_type', 'youtube_checklist')
      .gte('created_at', fifteenMinsAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    // Bypass logs check if relation does not exist yet (migration not applied on this instance)
    const isLogsTableMissing = cooldownError?.code === '42P01'

    if (!isLogsTableMissing && cooldownLogs && cooldownLogs.length > 0) {
      const lastLogTime = new Date(cooldownLogs[0].created_at).getTime()
      const remainingSeconds = Math.max(0, Math.ceil((lastLogTime + 15 * 60 * 1000 - Date.now()) / 1000))
      if (remainingSeconds > 0) {
        return NextResponse.json({
          error: 'cooldown',
          message: `Please wait ${remainingSeconds} seconds before generating another checklist.`,
          remainingSeconds
        }, { status: 429 })
      }
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'youtube_checklist')
      .gte('created_at', twentyFourHoursAgo)

    if (!isLogsTableMissing && count !== null && count >= 3) {
      return NextResponse.json({
        error: 'daily_limit',
        message: 'Daily threshold met. You can only generate 3 AI checklists per day.'
      }, { status: 429 })
    }

    // Fetch video metadata
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

    // Fetch video transcript
    let transcriptText = ''
    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)
      transcriptText = transcriptItems.map(item => item.text).join(' ')
    } catch (err) {
      console.warn('Transcript fetch failed:', err)
    }

    // 4. Transcript Guardrail (Crucial Check)
    if (!transcriptText || transcriptText.trim().length < 50) {
      const fallbackAnalysis = {
        isIntroOnly: true,
        summary: "عذراً، هذا الفيديو لا يحتوي على نص مفرغ (Transcript) أو ترجمة متاحة لتحليله واستخراج المهام منه.",
        keyTakeaways: [],
        checklist: [],
        additionalNotes: ""
      }

      // Save fallback to database metadata so frontend can load it
      const { data: taskData } = await supabaseAdmin
        .from('tasks')
        .select('metadata')
        .eq('id', taskId)
        .single()

      const currentMetadata = (taskData?.metadata as any) || {}
      const updatedMetadata = {
        ...currentMetadata,
        videoAnalysis: fallbackAnalysis
      }

      await supabaseAdmin
        .from('tasks')
        .update({ metadata: updatedMetadata })
        .eq('id', taskId)

      // Log creation
      if (!isLogsTableMissing) {
        try {
          await supabaseAdmin.from('ai_usage_logs').insert({
            user_id: user.id,
            action_type: 'youtube_checklist'
          })
        } catch (logErr) {
          console.error('Failed to write usage log:', logErr)
        }
      }

      return NextResponse.json({ success: true, analysis: fallbackAnalysis })
    }

    // Initialize Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    })

    const prompt = `You are a highly precise Content Analyst and Task Extractor for a life-management system. Analyze the provided Video Title, Description, and Audio Transcript.
Respond strictly in Arabic, and output ONLY a raw JSON object matching this exact schema:
{
  "isIntroOnly": boolean, // True ONLY if the video lacks actionable steps (e.g., just an intro/promo)
  "summary": "string", // A concise 1-2 sentence summary
  "keyTakeaways": ["string"], // 2-3 main points
  "checklist": ["string"], // Actionable tasks. EMPTY [] if isIntroOnly is true.
  "additionalNotes": "string" // Any warnings or advice, or empty string.
}

### STRICT RULES:
1. Zero Hallucination: ONLY use the provided transcript. Do not invent steps.
2. If the video is an intro or lacks practical steps, set "isIntroOnly" to true and "checklist" to [].
3. PLAIN TEXT ONLY: Do NOT use markdown formatting inside the strings. NO asterisks (*), NO bold (**), NO hashtags (#). The strings must be completely clean, plain Arabic text without any formatting symbols.
4. CRITICAL: If the video transcript is vague, lacks explicit actionable steps, or if you are unsure, DO NOT GUESS AND DO NOT REPEAT YOURSELF. Immediately set isIntroOnly to true, leave checklist empty, and output this exact summary: 'عذراً، محتوى هذا الفيديو غير كافٍ أو لا يحتوي على خطوات واضحة يمكن استخراجها.' NO MARKDOWN ALLOWED. NO asterisks (*), NO pluses (+), NO dashes (-).

VIDEO DATA:
Title: ${videoTitle}
Description: ${videoDescription}
Transcript: ${transcriptText}
`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    let analysis: VideoAnalysisResponse
    try {
      analysis = JSON.parse(responseText.trim())
      if (typeof analysis.isIntroOnly !== 'boolean') {
        analysis.isIntroOnly = false
      }
      if (typeof analysis.summary !== 'string') {
        analysis.summary = ''
      }
      if (!Array.isArray(analysis.keyTakeaways)) {
        analysis.keyTakeaways = []
      }
      if (!Array.isArray(analysis.checklist)) {
        analysis.checklist = []
      }
      if (typeof analysis.additionalNotes !== 'string') {
        analysis.additionalNotes = ''
      }
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

    // 5. Database Checklist Insertion / Update
    const { data: taskData } = await supabaseAdmin
      .from('tasks')
      .select('metadata')
      .eq('id', taskId)
      .single()

    const currentMetadata = (taskData?.metadata as any) || {}
    const updatedMetadata = {
      ...currentMetadata,
      videoAnalysis: analysis // Store the new VideoAnalysisResponse
    }

    await supabaseAdmin
      .from('tasks')
      .update({ metadata: updatedMetadata })
      .eq('id', taskId)

    // ONLY increment/deduct quota on successful response
    const { error: incrementError } = await supabaseAdmin.rpc('check_and_increment_quota', {
      p_user_id: user.id
    })
    if (incrementError) {
      console.error('Failed to increment AI quota count:', incrementError)
    }

    // Log Creation
    if (!isLogsTableMissing) {
      try {
        await supabaseAdmin.from('ai_usage_logs').insert({
          user_id: user.id,
          action_type: 'youtube_checklist'
        })
      } catch (logErr) {
        console.error('Failed to write usage log:', logErr)
      }
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error: any) {
    console.error('AI Checklist API Error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
