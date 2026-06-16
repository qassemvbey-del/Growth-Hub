import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { checkAndUpdateAiQuota } from '@/lib/quota-guard'
import { createClient } from '@supabase/supabase-js'
import { YoutubeTranscript } from 'youtube-transcript'

export const maxDuration = 60;

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

    // 2. Quota Check
    const quotaStatus = await checkAndUpdateAiQuota(user.id)
    if (!quotaStatus.allowed) {
      return NextResponse.json({
        error: 'Quota Exceeded',
        message_en: quotaStatus.message_en,
        message_ar: quotaStatus.message_ar
      }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

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

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
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

    const systemPrompt = `You are a highly precise Content Analyst and Task Extractor for a life-management system. Your task is to analyze the provided Video Title, Description, and Audio Transcript, and output a strict JSON object.

### STRICT RULES (DO NOT IGNORE):
1. **Zero Hallucination:** You must ONLY use the information provided in the inputs. Do NOT add external knowledge, facts, or assumed steps.
2. **Determine Content Type:** Evaluate if the video actually contains actionable steps. If it is merely an introduction, promo, or teaser, set "isIntroOnly" to true, and leave the "checklist" array completely EMPTY. Do not invent steps.
3. **Actionable Checklist:** If and ONLY if the transcript contains clear steps, extract them into the "checklist" array as short, actionable strings.
4. **JSON Only:** You must respond ONLY with a valid JSON object matching this exact schema:
{
  "isIntroOnly": boolean,
  "summary": "string",
  "keyTakeaways": ["string", "string"],
  "checklist": ["string", "string"],
  "additionalNotes": "string"
}
Do not include markdown code blocks (like \`\`\`json), just output the raw JSON object. All text content must be in Arabic.`

    const userMessage = `Analyze the following video data and return the JSON object:
TITLE: ${videoTitle}
DESCRIPTION: ${videoDescription}
TRANSCRIPT: ${transcriptText}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API Error:', errorText)
      return NextResponse.json({ error: 'Failed to communicate with Groq API' }, { status: 502 })
    }

    const groqData = await response.json()
    const content = groqData.choices?.[0]?.message?.content || '{}'
    
    let analysis: VideoAnalysisResponse
    try {
      analysis = JSON.parse(content.trim())
    } catch (parseErr) {
      console.error('Failed to parse Groq response JSON:', content)
      return NextResponse.json({ error: 'Failed to generate a valid checklist structure.' }, { status: 500 })
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
