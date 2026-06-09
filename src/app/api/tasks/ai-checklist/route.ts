import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { YoutubeTranscript } from 'youtube-transcript'
import fs from 'fs'
import os from 'os'
import path from 'path'
import ytdl from '@distube/ytdl-core'

export const maxDuration = 60;

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
    const { taskId, youtubeUrl } = await req.json()
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

    // 2. Rate Limit Verification
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
    const { count, error: countError } = await supabaseAdmin
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

    let transcriptText = ''
    let uploadResult: any = null
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }
    const fileManager = new GoogleAIFileManager(apiKey)

    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)
      transcriptText = transcriptItems.map(item => item.text).join(' ')
    } catch (err) {
      console.warn('Transcript fetch failed, falling back to Audio Ingestion:', err)
      const tempDir = os.tmpdir()
      const audioPath = path.join(tempDir, `${videoId}.mp3`)
      const mimeType = 'audio/mp3'

      try {
        await new Promise<void>((resolve, reject) => {
          const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
            filter: 'audioonly',
            quality: 'highestaudio'
          })
          const writeStream = fs.createWriteStream(audioPath)
          stream.pipe(writeStream)

          writeStream.on('finish', () => resolve())
          writeStream.on('error', (err) => reject(err))
          stream.on('error', (err) => reject(err))
        })
      } catch (streamErr) {
        console.error('ytdl stream pipe failed:', streamErr)
        return NextResponse.json({ error: 'This video does not have readable subtitles or transcripts, and audio extraction failed.' }, { status: 400 })
      }

      /* Commented out legacy yt-dlp shell execution to respect safety rules and prevent serverless timeouts/crashes:
      const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe')
      
      let hasFfmpeg = false
      try {
        execSync('ffmpeg -version', { stdio: 'ignore' })
        hasFfmpeg = true
      } catch {}

      let audioPath = ''
      let mimeType = ''

      if (hasFfmpeg) {
        audioPath = path.join(tempDir, `${videoId}.mp3`)
        mimeType = 'audio/mp3'
        try {
          execSync(`"${ytdlpPath}" -x --audio-format mp3 --audio-quality 5 -o "${path.join(tempDir, videoId)}.%(ext)s" "https://www.youtube.com/watch?v=${videoId}"`, { stdio: 'ignore' })
        } catch (execErr) {
          console.error('yt-dlp mp3 download failed:', execErr)
          return NextResponse.json({ error: 'This video does not have readable subtitles or transcripts, and audio extraction failed.' }, { status: 400 })
        }
      } else {
        audioPath = path.join(tempDir, `${videoId}.m4a`)
        mimeType = 'audio/mp4'
        try {
          execSync(`"${ytdlpPath}" -f ba -o "${audioPath}" "https://www.youtube.com/watch?v=${videoId}"`, { stdio: 'ignore' })
        } catch (execErr) {
          console.error('yt-dlp m4a download failed:', execErr)
          return NextResponse.json({ error: 'This video does not have readable subtitles or transcripts, and audio extraction failed.' }, { status: 400 })
        }
      }
      */

      if (!fs.existsSync(audioPath)) {
        return NextResponse.json({ error: 'Audio file extraction failed' }, { status: 500 })
      }

      try {
        uploadResult = await fileManager.uploadFile(audioPath, {
          mimeType,
          displayName: `yt-audio-${videoId}`
        })
      } catch (uploadErr) {
        console.error('Gemini File upload failed:', uploadErr)
        try { fs.unlinkSync(audioPath) } catch {}
        return NextResponse.json({ error: 'Failed to upload audio to AI processor.' }, { status: 500 })
      }

      // CRITICAL SECURITY TOPOLOGY: Immediate local server cleanup
      try {
        fs.unlinkSync(audioPath)
      } catch (unlinkErr) {
        console.error('Failed to cleanup local audio file:', unlinkErr)
      }
    }

    // 4. Gemini AI Invocation
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    let response;
    if (uploadResult) {
      const systemPrompt = `You are an elite academic tutor. This video does not have readable textual transcripts. You are provided with the raw audio file of the lecture. Listen intently to the spoken explanations, technical keywords, and core lessons delivered by the instructor. 
Generate a pristine, highly logical study checklist for the student based entirely on the audio contents. 
Break down the milestones into 4 to 7 sequential checklist items. Each item must be highly practical, actionable, under 80 characters, and written in clean Title Case. 
Return the output STRICTLY as a valid JSON string array of strings, without any markdown formatting blocks, backticks, or wrapping markdown text. 
Example: ["Understand core architecture", "Analyze infrastructure mapping"]`

      response = await model.generateContent([
        {
          fileData: {
            mimeType: uploadResult.mimeType,
            fileUri: uploadResult.uri
          }
        },
        { text: systemPrompt }
      ])

      try {
        await fileManager.deleteFile(uploadResult.name)
      } catch (delErr) {
        console.error('Failed to delete uploaded file from Gemini File API:', delErr)
      }
    } else {
      const systemPrompt = `You are an elite academic tutor. Analyze the following transcript of a technical video tutorial. Generate a pristine, actionable study checklist for a student. Break down the core educational milestones into 4 to 7 sequential items. Each item must be clear, practical, concise, and under 80 characters. Return the output STRICTLY as a valid JSON string array of strings, without any markdown blocks, backticks, or extra explanation text. Example format: ["Understand core architecture", "Analyze infrastructure mapping"]`

      response = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nTranscript:\n${transcriptText}` }]
        }]
      })
    }

    const rawText = response.response.text().trim()
    let cleanedJson = rawText
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    let checklistItems: string[] = []
    try {
      checklistItems = JSON.parse(cleanedJson)
      if (!Array.isArray(checklistItems)) {
        throw new Error('Not an array')
      }
    } catch (jsonErr) {
      console.error('Failed to parse Gemini output:', rawText)
      return NextResponse.json({ error: 'Failed to generate a valid checklist structure.' }, { status: 500 })
    }

    // 5. Database Checklist Insertion
    // A. Robust update to tasks table metadata (which holds subtasks in our system)
    const { data: taskData } = await supabaseAdmin
      .from('tasks')
      .select('metadata')
      .eq('id', taskId)
      .single()

    const currentMetadata = (taskData?.metadata as any) || {}
    const existingSubtasks = currentMetadata.subtasks || []
    const newSubtasks = checklistItems.map((title, index) => ({
      id: `sub_ai_${Date.now()}_${index}`,
      title,
      is_completed: false
    }))

    const updatedMetadata = {
      ...currentMetadata,
      subtasks: [...existingSubtasks, ...newSubtasks]
    }

    await supabaseAdmin
      .from('tasks')
      .update({ metadata: updatedMetadata })
      .eq('id', taskId)

    // B. Attempt to write to checklists table as requested, fallback gracefully if relation missing
    try {
      const checklistPayloads = checklistItems.map((title: string, index: number) => ({
        task_id: taskId,
        title,
        is_completed: false,
        position: index
      }))
      await supabaseAdmin.from('checklists').insert(checklistPayloads)
    } catch (checkErr) {
      console.warn('Checklists table insert bypassed:', checkErr)
    }

    // 6. Log Creation
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

    return NextResponse.json({ success: true, checklist: checklistItems })
  } catch (error: any) {
    console.error('AI Checklist API Error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
