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
  // Outer scoped stream references for strict timeout cleanup
  let activeYtdlStream: any = null
  let activeWriteStream: any = null
  let audioPath = ""
  let uploadResult: any = null
  let fileManagerToDelete: string | null = null

  try {
    const { taskId, youtubeUrl, taskTitle, goalTitle, language } = await req.json()
    if (!taskId || !youtubeUrl) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const videoId = getYouTubeId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    const tempDir = os.tmpdir()
    audioPath = path.join(tempDir, `${videoId}.mp3`)

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

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const fileManager = new GoogleAIFileManager(apiKey)
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    // Language Detection / Assignment
    let detectedLang = language || ""
    if (!detectedLang) {
      const isArabic = /[\u0600-\u06FF]/.test((taskTitle || '') + (goalTitle || ''))
      detectedLang = isArabic ? 'ar' : 'en'
    }
    const languageName = detectedLang === 'ar' ? 'Arabic' : 'English'
    const criticalLanguageRule = `CRITICAL LANGUAGE RULE: The user's interface language setting is currently ${languageName} (passed in request payload body). You MUST respond ENTIRELY in ${languageName}. Keep core technical acronyms (MCSA, CCNA, DHCP, etc.) in English text within the translated rows. Return STRICTLY as a valid JSON string array of strings, without backticks or markdown wrapping blocks.`

    let checklistItems: string[] = []
    let mediaPipelineSuccess = false

    // 4. Timeout Circuit Breaker Setup (6 Seconds max for Tiers 1, 2, and 3)
    const timeout = (ms: number) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error("CEILING_TIMEOUT")), ms)
    );

    const theMediaPipeline = async () => {
      // TIER 1: Try Text Transcript Mode
      try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)
        const transcriptText = transcriptItems.map(item => item.text).join(' ')
        if (transcriptText.trim()) {
          const systemPrompt = `You are an elite academic tutor. Analyze the following transcript of a technical video tutorial. Generate a pristine, actionable study checklist for a student. Break down the core educational milestones into 4 to 7 sequential items. Each item must be clear, practical, concise, and under 80 characters. ${criticalLanguageRule} Return STRICTLY as a valid JSON string array of strings, without any markdown blocks, backticks, or extra explanation text. Example format: ["Understand core architecture", "Analyze infrastructure mapping"]`

          const response = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nTranscript:\n${transcriptText}` }]
            }]
          })

          const rawText = response.response.text().trim()
          let cleanedJson = rawText
          if (cleanedJson.startsWith('```json')) {
            cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
          } else if (cleanedJson.startsWith('```')) {
            cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
          }

          const parsed = JSON.parse(cleanedJson)
          if (Array.isArray(parsed) && parsed.length > 0) {
            checklistItems = parsed
            mediaPipelineSuccess = true
            return
          }
        }
      } catch (err) {
        console.warn('Tier 1 Transcript fetch failed, falling back to Tier 2:', err)
      }

      // TIER 2: YouTube Metadata & Chapters Mode via Data API v3
      const youtubeKey = process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY
      if (youtubeKey) {
        try {
          const metadataUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeKey}`
          const metaRes = await fetch(metadataUrl)
          if (metaRes.ok) {
            const metaData = await metaRes.json()
            const snippet = metaData.items?.[0]?.snippet
            if (snippet) {
              const title = snippet.title || ""
              const description = snippet.description || ""
              
              const systemPrompt = `You are an elite academic tutor. Analyze the provided YouTube metadata, description, and chapters of this lecture video. Synthesize a highly actionable, structured study checklist for the student matching these milestone timelines. Output 4 to 7 sequential items, under 80 characters each, written in clean Title Case formatting. ${criticalLanguageRule} Return STRICTLY as a valid JSON string array of strings, without any backticks or markdown wrapping blocks.`
              
              const contentPrompt = `Metadata:\nTitle: ${title}\nDescription: ${description}`
              
              const response = await model.generateContent({
                contents: [{
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\n${contentPrompt}` }]
                }]
              })
              
              const rawText = response.response.text().trim()
              let cleanedJson = rawText
              if (cleanedJson.startsWith('```json')) {
                cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
              } else if (cleanedJson.startsWith('```')) {
                cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
              }
              
              const parsed = JSON.parse(cleanedJson)
              if (Array.isArray(parsed) && parsed.length > 0) {
                checklistItems = parsed
                mediaPipelineSuccess = true
                return
              }
            }
          }
        } catch (tier2Err) {
          console.warn('Tier 2 YouTube Metadata fallback failed, falling back to Tier 3:', tier2Err)
        }
      }

      // TIER 3: Capped Multimodal Audio Streaming Mode
      try {
        await new Promise<void>((resolve, reject) => {
          activeYtdlStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
            filter: 'audioonly',
            quality: 'lowestaudio'
          })
          activeWriteStream = fs.createWriteStream(audioPath)
          activeYtdlStream.pipe(activeWriteStream)

          activeWriteStream.on('finish', () => resolve())
          activeWriteStream.on('error', (e: any) => reject(e))
          activeYtdlStream.on('error', (e: any) => reject(e))
        })

        if (fs.existsSync(audioPath)) {
          uploadResult = await fileManager.uploadFile(audioPath, {
            mimeType: 'audio/mp3',
            displayName: `yt-audio-${videoId}`
          })
          
          if (uploadResult) {
            fileManagerToDelete = uploadResult.name
          }
          
          // Immediate local cleanup
          try {
            fs.unlinkSync(audioPath)
          } catch (unlinkErr) {
            console.error('Failed to cleanup local audio file:', unlinkErr)
          }

          if (uploadResult) {
            const systemPrompt = `You are an elite academic tutor. This video does not have readable textual transcripts. You are provided with the raw audio file of the lecture. Listen intently to the spoken explanations, technical keywords, and core lessons delivered by the instructor. 
Generate a pristine, highly logical study checklist for the student based entirely on the audio contents. 
Break down the milestones into 4 to 7 sequential checklist items. Each item must be highly practical, actionable, under 80 characters, and written in clean Title Case. 
${criticalLanguageRule}
Return STRICTLY as a valid JSON string array of strings, without any markdown formatting blocks, backticks, or wrapping markdown text. 
Example: ["Understand core architecture", "Analyze infrastructure mapping"]`

            const response = await model.generateContent([
              {
                fileData: {
                  mimeType: uploadResult.mimeType,
                  fileUri: uploadResult.uri
                }
              },
              { text: systemPrompt }
            ])

            if (fileManagerToDelete) {
              try {
                await fileManager.deleteFile(fileManagerToDelete)
                fileManagerToDelete = null
              } catch (delErr) {
                console.error('Failed to delete uploaded file from Gemini File API:', delErr)
              }
            }

            const rawText = response.response.text().trim()
            let cleanedJson = rawText
            if (cleanedJson.startsWith('```json')) {
              cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
            } else if (cleanedJson.startsWith('```')) {
              cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
            }

            const parsed = JSON.parse(cleanedJson)
            if (Array.isArray(parsed) && parsed.length > 0) {
              checklistItems = parsed
              mediaPipelineSuccess = true
              return
            }
          }
        } else {
          throw new Error('Audio file does not exist after download')
        }
      } catch (err) {
        console.warn('Tier 3 Audio Ingestion failed:', err)
      }
    }

    try {
      await Promise.race([theMediaPipeline(), timeout(6000)])
    } catch (error: any) {
      if (error.message === "CEILING_TIMEOUT") {
        console.warn("Media pipeline timed out at 6s. Force-dropping to Tier 4.")
      } else {
        console.error("Media pipeline failed, falling back to Tier 4:", error)
      }

      // CRITICAL STREAM ABORTION & CLEANUP
      if (activeYtdlStream) {
        try { activeYtdlStream.destroy() } catch (e) { console.error('Failed to destroy ytdl stream:', e) }
      }
      if (activeWriteStream) {
        try { activeWriteStream.destroy() } catch (e) { console.error('Failed to destroy write stream:', e) }
      }
      try {
        if (audioPath && fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath)
        }
      } catch (e) { console.error('Failed to unlink partial file:', e) }

      mediaPipelineSuccess = false
    }

    // TIER 4: Zero-Crash Knowledge Base Inference Mode (Fallback)
    if (!mediaPipelineSuccess || checklistItems.length === 0) {
      const safeTaskTitle = taskTitle || "Technical Lesson"
      const safeGoalTitle = goalTitle || "Specialized Curriculum"
      
      const systemPrompt = `You are an elite technical instructor. We cannot access the direct media stream of this video due to network restrictions. However, we know this lesson is titled "${safeTaskTitle}" and belongs to the comprehensive course/coursework "${safeGoalTitle}". Based on your deep underlying knowledge base of this standard technical curriculum, infer and generate a pristine, highly accurate study checklist for this exact topic. Output 4 to 7 sequential, highly actionable items under 80 characters each in Title Case.
${criticalLanguageRule}
Return STRICTLY as a valid JSON string array of strings, without any backticks or markdown wrapping blocks.
Example: ["Understand core architecture", "Analyze infrastructure mapping"]`

      const response = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: systemPrompt }]
        }]
      })

      const rawText = response.response.text().trim()
      let cleanedJson = rawText
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      checklistItems = JSON.parse(cleanedJson)
    }

    // 5. Database Checklist Insertion
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
    
    // Cleanup any lingering uploads if we crashed after uploading
    if (fileManagerToDelete) {
      try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
        if (apiKey) {
          const fileManager = new GoogleAIFileManager(apiKey)
          await fileManager.deleteFile(fileManagerToDelete)
        }
      } catch (delErr) {
        console.error('Failed to delete uploaded file in catch block:', delErr)
      }
    }

    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

// PREVIOUS IMPLEMENTATION (COMMENTED OUT TO RESPECT SAFETY RULES):
// import { NextResponse } from 'next/server'
// import { createClient as createServerClient } from '@/lib/supabase-server'
// import { createClient } from '@supabase/supabase-js'
// import { GoogleGenerativeAI } from '@google/generative-ai'
// import { GoogleAIFileManager } from '@google/generative-ai/server'
// import { YoutubeTranscript } from 'youtube-transcript'
// import fs from 'fs'
// import os from 'os'
// import path from 'path'
// import ytdl from '@distube/ytdl-core'
// 
// export const maxDuration = 60;
// 
// function getYouTubeId(urlOrId: string) {
//   if (!urlOrId) return ''
//   if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('?')) return urlOrId
//   try {
//     const urlObj = new URL(urlOrId)
//     const vParam = urlObj.searchParams.get('v')
//     if (vParam && vParam.length === 11) return vParam
//     if (urlObj.hostname === 'youtu.be') {
//       const pathId = urlObj.pathname.slice(1)
//       if (pathId.length === 11) return pathId
//     }
//     const pathMatch = urlObj.pathname.match(/\/(embed|v)\/([a-zA-Z0-9_-]{11})/)
//     if (pathMatch && pathMatch[2]) return pathMatch[2]
//   } catch (_e) {
//     const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
//     const match = urlOrId.match(regExp)
//     return (match && match[2].length === 11) ? match[2] : urlOrId
//   }
//   return urlOrId
// }
// 
// export async function POST(req: Request) {
//   // Outer scoped stream references for strict timeout cleanup
//   let activeYtdlStream: any = null
//   let activeWriteStream: any = null
//   let audioPath = ""
//   let uploadResult: any = null
//   let fileManagerToDelete: string | null = null
// 
//   try {
//     const { taskId, youtubeUrl, taskTitle, goalTitle } = await req.json()
//     if (!taskId || !youtubeUrl) {
//       return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
//     }
// 
//     const videoId = getYouTubeId(youtubeUrl)
//     if (!videoId) {
//       return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
//     }
// 
//     const tempDir = os.tmpdir()
//     audioPath = path.join(tempDir, `${videoId}.mp3`)
// 
//     // 1. Authentication Check
//     const supabase = await createServerClient()
//     const { data: { user } } = await supabase.auth.getUser()
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }
// 
//     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
//     const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
//     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
// 
//     // 2. Rate Limit Verification
//     const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
//     const { data: cooldownLogs, error: cooldownError } = await supabaseAdmin
//       .from('ai_usage_logs')
//       .select('created_at')
//       .eq('user_id', user.id)
//       .eq('action_type', 'youtube_checklist')
//       .gte('created_at', fifteenMinsAgo)
//       .order('created_at', { ascending: false })
//       .limit(1)
// 
//     // Bypass logs check if relation does not exist yet (migration not applied on this instance)
//     const isLogsTableMissing = cooldownError?.code === '42P01'
// 
//     if (!isLogsTableMissing && cooldownLogs && cooldownLogs.length > 0) {
//       const lastLogTime = new Date(cooldownLogs[0].created_at).getTime()
//       const remainingSeconds = Math.max(0, Math.ceil((lastLogTime + 15 * 60 * 1000 - Date.now()) / 1000))
//       if (remainingSeconds > 0) {
//         return NextResponse.json({
//           error: 'cooldown',
//           message: `Please wait ${remainingSeconds} seconds before generating another checklist.`,
//           remainingSeconds
//         }, { status: 429 })
//       }
//     }
// 
//     const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 1000).toISOString()
//     const { count, error: countError } = await supabaseAdmin
//       .from('ai_usage_logs')
//       .select('*', { count: 'exact', head: true })
//       .eq('user_id', user.id)
//       .eq('action_type', 'youtube_checklist')
//       .gte('created_at', twentyFourHoursAgo)
// 
//     if (!isLogsTableMissing && count !== null && count >= 3) {
//       return NextResponse.json({
//         error: 'daily_limit',
//         message: 'Daily threshold met. You can only generate 3 AI checklists per day.'
//       }, { status: 429 })
//     }
// 
//     const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
//     if (!apiKey) {
//       return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
//     }
// 
//     const fileManager = new GoogleAIFileManager(apiKey)
//     const genAI = new GoogleGenerativeAI(apiKey)
//     const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
// 
//     let transcriptText = ''
//     let tier3Fallback = false
// 
//     const timeout = (ms: number) => new Promise((_, reject) => 
//       setTimeout(() => reject(new Error("CEILING_TIMEOUT")), ms)
//     );
// 
//     const theMediaPipeline = async () => {
//       // TIER 1: Try Transcript Mode
//       try {
//         const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)
//         transcriptText = transcriptItems.map(item => item.text).join(' ')
//       } catch (err) {
//         console.warn('Transcript fetch failed, falling back to Audio Ingestion (Tier 2):', err)
//         
//         // TIER 2: Try Audio Ingestion Mode
//         await new Promise<void>((resolve, reject) => {
//           activeYtdlStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
//             filter: 'audioonly',
//             quality: 'lowestaudio'
//           })
//           activeWriteStream = fs.createWriteStream(audioPath)
//           activeYtdlStream.pipe(activeWriteStream)
// 
//           activeWriteStream.on('finish', () => resolve())
//           activeWriteStream.on('error', (e: any) => reject(e))
//           activeYtdlStream.on('error', (e: any) => reject(e))
//         })
// 
//         if (fs.existsSync(audioPath)) {
//           uploadResult = await fileManager.uploadFile(audioPath, {
//             mimeType: 'audio/mp3',
//             displayName: `yt-audio-${videoId}`
//           })
//           
//           if (uploadResult) {
//             fileManagerToDelete = uploadResult.name
//           }
//           
//           // Immediate local cleanup
//           try {
//             fs.unlinkSync(audioPath)
//           } catch (unlinkErr) {
//             console.error('Failed to cleanup local audio file:', unlinkErr)
//           }
//         } else {
//           throw new Error('Audio file does not exist after download')
//         }
//       }
//     }
// 
//     try {
//       await Promise.race([theMediaPipeline(), timeout(6000)])
//     } catch (error: any) {
//       if (error.message === "CEILING_TIMEOUT") {
//         console.warn("Media pipeline timed out at 6s. Force-dropping to Tier 3 Knowledge Base Inference.")
//       } else {
//         console.error("Media pipeline failed, falling back to Tier 3:", error)
//       }
// 
//       // CRITICAL STREAM ABORTION & CLEANUP
//       if (activeYtdlStream) {
//         try { activeYtdlStream.destroy() } catch (e) { console.error('Failed to destroy ytdl stream:', e) }
//       }
//       if (activeWriteStream) {
//         try { activeWriteStream.destroy() } catch (e) { console.error('Failed to destroy write stream:', e) }
//       }
//       try {
//         if (audioPath && fs.existsSync(audioPath)) {
//           fs.unlinkSync(audioPath)
//         }
//       } catch (e) { console.error('Failed to unlink partial file:', e) }
// 
//       tier3Fallback = true
//     }
// 
//     // 4. Gemini AI Invocation
//     let response;
//     if (tier3Fallback) {
//       const safeTaskTitle = taskTitle || "Technical Lesson"
//       const safeGoalTitle = goalTitle || "Specialized Curriculum"
//       const systemPrompt = `You are an elite technical instructor. We cannot access the direct media stream of this video due to network restrictions. However, we know this lesson is titled "${safeTaskTitle}" and belongs to the comprehensive course/coursework "${safeGoalTitle}". Based on your deep underlying knowledge base of this standard technical curriculum, infer and generate a pristine, highly accurate study checklist for this exact topic. Output 4 to 7 sequential, highly actionable items under 80 characters each in Title Case. Return STRICTLY as a valid JSON string array of strings, without any backticks or markdown wrap. Example: ["Understand core architecture", "Analyze infrastructure mapping"]`
// 
//       response = await model.generateContent({
//         contents: [{
//           role: 'user',
//           parts: [{ text: systemPrompt }]
//         }]
//       })
//     } else if (uploadResult) {
//       const systemPrompt = `You are an elite academic tutor. This video does not have readable textual transcripts. You are provided with the raw audio file of the lecture. Listen intently to the spoken explanations, technical keywords, and core lessons delivered by the instructor. 
// Generate a pristine, highly logical study checklist for the student based entirely on the audio contents. 
// Break down the milestones into 4 to 7 sequential checklist items. Each item must be highly practical, actionable, under 80 characters, and written in clean Title Case. 
// Return STRICTLY as a valid JSON string array of strings, without any markdown formatting blocks, backticks, or wrapping markdown text. 
// Example: ["Understand core architecture", "Analyze infrastructure mapping"]`
// 
//       response = await model.generateContent([
//         {
//           fileData: {
//             mimeType: uploadResult.mimeType,
//             fileUri: uploadResult.uri
//           }
//         },
//         { text: systemPrompt }
//       ])
// 
//       if (fileManagerToDelete) {
//         try {
//           await fileManager.deleteFile(fileManagerToDelete)
//           fileManagerToDelete = null
//         } catch (delErr) {
//           console.error('Failed to delete uploaded file from Gemini File API:', delErr)
//         }
//       }
//     } else {
//       const systemPrompt = `You are an elite academic tutor. Analyze the following transcript of a technical video tutorial. Generate a pristine, actionable study checklist for a student. Break down the core educational milestones into 4 to 7 sequential items. Each item must be clear, practical, concise, and under 80 characters. Return STRICTLY as a valid JSON string array of strings, without any markdown blocks, backticks, or extra explanation text. Example format: ["Understand core architecture", "Analyze infrastructure mapping"]`
// 
//       response = await model.generateContent({
//         contents: [{
//           role: 'user',
//           parts: [{ text: `${systemPrompt}\n\nTranscript:\n${transcriptText}` }]
//         }]
//       })
//     }
// 
//     const rawText = response.response.text().trim()
//     let cleanedJson = rawText
//     if (cleanedJson.startsWith('```json')) {
//       cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
//     } else if (cleanedJson.startsWith('```')) {
//       cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
//     }
// 
//     let checklistItems: string[] = []
//     try {
//       checklistItems = JSON.parse(cleanedJson)
//       if (!Array.isArray(checklistItems)) {
//         throw new Error('Not an array')
//       }
//     } catch (jsonErr) {
//       console.error('Failed to parse Gemini output:', rawText)
//       return NextResponse.json({ error: 'Failed to generate a valid checklist structure.' }, { status: 500 })
//     }
// 
//     // 5. Database Checklist Insertion
//     const { data: taskData } = await supabaseAdmin
//       .from('tasks')
//       .select('metadata')
//       .eq('id', taskId)
//       .single()
// 
//     const currentMetadata = (taskData?.metadata as any) || {}
//     const existingSubtasks = currentMetadata.subtasks || []
//     const newSubtasks = checklistItems.map((title, index) => ({
//       id: `sub_ai_${Date.now()}_${index}`,
//       title,
//       is_completed: false
//     }))
// 
//     const updatedMetadata = {
//       ...currentMetadata,
//       subtasks: [...existingSubtasks, ...newSubtasks]
//     }
// 
//     await supabaseAdmin
//       .from('tasks')
//       .update({ metadata: updatedMetadata })
//       .eq('id', taskId)
// 
//     // B. Attempt to write to checklists table as requested, fallback gracefully if relation missing
//     try {
//       const checklistPayloads = checklistItems.map((title: string, index: number) => ({
//         task_id: taskId,
//         title,
//         is_completed: false,
//         position: index
//       }))
//       await supabaseAdmin.from('checklists').insert(checklistPayloads)
//     } catch (checkErr) {
//       console.warn('Checklists table insert bypassed:', checkErr)
//     }
// 
//     // 6. Log Creation
//     if (!isLogsTableMissing) {
//       try {
//         await supabaseAdmin.from('ai_usage_logs').insert({
//           user_id: user.id,
//           action_type: 'youtube_checklist'
//         })
//       } catch (logErr) {
//         console.error('Failed to write usage log:', logErr)
//       }
//     }
// 
//     return NextResponse.json({ success: true, checklist: checklistItems })
//   } catch (error: any) {
//     console.error('AI Checklist API Error:', error)
//     
//     // Cleanup any lingering uploads if we crashed after uploading
//     if (fileManagerToDelete) {
//       try {
//         const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
//         if (apiKey) {
//           const fileManager = new GoogleAIFileManager(apiKey)
//           await fileManager.deleteFile(fileManagerToDelete)
//         }
//       } catch (delErr) {
//         console.error('Failed to delete uploaded file in catch block:', delErr)
//       }
//     }
// 
//     return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
//   }
// }
