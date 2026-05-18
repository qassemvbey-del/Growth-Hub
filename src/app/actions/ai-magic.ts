'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase-server'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

interface AITask {
  title: string
  type: 'BIG' | 'MEDIUM' | 'SMALL'
  subtasks?: AITask[]
}

interface CoachMission {
  title: string
  progress: number
  end_date: string
  tasks_completed: number
  tasks_total: number
  next_task: string
}

interface CoachUserData {
  username: string
  rank: string
  xp: number
  capacity_used: number
  missions: CoachMission[]
  critical_missions: CoachMission[]
}

export async function chatWithCoach(prompt: string, userData: CoachUserData, language: string) {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.error('COACH_UPLINK_ERROR: NEXT_PUBLIC_GEMINI_API_KEY is missing from environment')
    return "UPLINK_FAILED // NO_API_KEY_FOUND"
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const missionsList = userData.missions
    .map(m => `- ${m.title}: ${m.progress}% complete, ${m.tasks_completed}/${m.tasks_total} tasks, Next: ${m.next_task}, deadline: ${m.end_date}`)
    .join('\n')

  const criticalList = userData.critical_missions
    .map(m => `- ${m.title} (${m.end_date}) - Next: ${m.next_task}`)
    .join('\n')

  const rank = (userData.rank || 'RECRUIT').toUpperCase()
  
  let personalityPrompt = ''
  if (rank === 'RECRUIT' || rank === 'SILVER') {
    personalityPrompt = `
      You are a SUPPORTIVE and ENCOURAGING AI coach.
      Your tone is helpful, patient, and focuses on positive reinforcement.
      You guide the user gently through their first steps.
    `
  } else if (rank === 'PLATINUM' || rank === 'CROWN') {
    personalityPrompt = `
      You are a DIRECT, CLINICAL, and HIGH-EFFICIENCY Tactical Analyst.
      Your tone is highly professional, strict, and focused on absolute efficiency.
      You do not offer cheap encouragement or sugarcoated praise.
      Instruct the user to 'ELIMINATE DISTRACTIONS' and execute active protocols.
      Challenge them to tighten their task structures and optimize focus capacity metrics.
    `
  } else {
    // ACE or CONQUEROR
    personalityPrompt = `
      You are SAVAGE, a cold, brutal, and high-pressure AI Tactical Commander.
      Your tone is intense, commanding, and zero-tolerance for excuses.
      Use strict operational phrases like 'PROTOCOL INITIATED', 'NO EXCUSES', and 'ELIMINATE INEFFICIENCIES'.
      Brutally critique any loose ends, laggy tasks, or low completion rates. Challenge the user to push to their absolute limits.
    `
  }

    const languageInstruction = language === 'ar' 
      ? 'IMPORTANT: Always respond in Arabic only.'
      : 'IMPORTANT: Always respond in English only.'

    const systemPrompt = `
      ${personalityPrompt}
      You are inside the Growth Hub interface.
      Your job is to act as a tactical coach who knows the user's data perfectly.

      OPERATOR_DATA:
      - Name: ${userData.username}
      - Rank: ${userData.rank}
      - Total XP: ${userData.xp}
      - Focus Capacity: ${userData.capacity_used}/9

      ACTIVE_MISSIONS:
      ${missionsList || 'NO ACTIVE MISSIONS DETECTED.'}

      CRITICAL_ALERTS (under 3 days):
      ${criticalList || 'NONE'}

      RESPONSE RULES:
      1. Context: Use real mission/task names from the data provided.
      2. Actionable: Always give specific advice based on the data. Mention specific missions and their next_task names.
      3. Max 6 lines per response.
      4. End every response with ONE specific action to take now.
      5. Tone: Match the personality defined above based on the user's rank.

      FORMATS (Use these exact formats based on the user request):

      If user input implies SCAN_STATUS (تحليل الوضع):
      "وضعك دلوقتي:
      ✓ [mission اللي كويسة]
      ⚠ [mission اللي محتاج تركز فيها]
      ❌ [mission اللي في خطر]
      الأولوية: [اسم المهمة الأهم دلوقتي]"

      If user input implies DAILY_PLAN (خطة النهارده):
      "خطة النهارده:
      ١. [أول حاجة تعملها - اسم next_task من أهم مهمة]
      ٢. [تاني حاجة - next_task من مهمة تانية]
      ٣. [تالت حاجة - task تالتة]
      مش محتاج أكتر من كده النهارده."

      If user input implies CRITICAL_ALERT (تنبيهات خطيرة):
      "⚠ تحذير:
      [اسم المهمة] - باقي [X] أيام وإنت عند [X]%
      [اسم المهمة] - باقي [X] أيام وإنت عند [X]%
      لازم تخلص [عدد tasks] في اليوم عشان توصل."

      If user input implies BRIEF_MISSION (بريف عن المهام):
      "[اسم أهم Mission]:
      - التقدم: [X]%
      - باقي: [X] tasks
      - الوقت: [X] أيام
      - الخطوة الجاية: [اسم next_task]
      - معدل المطلوب: [X tasks في اليوم]"

      ${languageInstruction}

      USER_INPUT: "${prompt}"
    `

  try {
    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('COACH_UPLINK_ERROR:', error)
    return "UPLINK_FAILED // RETRY_SEQUENCE"
  }
}

export async function generateTasks(goal: string, cupId: string) {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.error('AI_MAGIC_ERROR: NEXT_PUBLIC_GEMINI_API_KEY is missing from environment')
    return { success: false, error: 'PROTOCOL_FAILURE: NO_API_KEY' }
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const prompt = `
    You are an AI Growth Coach. Generate a structured roadmap for the goal: "${goal}".
    Return a JSON object with a "tasks" array. 
    Each task should have:
    - title: A concise action-oriented title.
    - type: one of "BIG", "MEDIUM", "SMALL".
    - subtasks: An optional array of tasks in the same format.
    
    Structure it logically: BIG tasks are milestones, MEDIUM are major steps, SMALL are daily actions.
    Keep it high-performance and growth-oriented.
    Output ONLY valid JSON.
  `

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonStr = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(jsonStr)

    const supabase = await createClient()
    
    // Recursive function to save tasks
    async function saveTask(task: AITask, parentId: string | null = null) {
      const { data: insertedTask, error } = await supabase
        .from('tasks')
        .insert({
          cup_id: cupId,
          parent_id: parentId,
          title: task.title,
          type: task.type,
          is_completed: false
        })
        .select()
        .single()

      if (error) throw error

      if (task.subtasks && task.subtasks.length > 0) {
        for (const sub of task.subtasks) {
          await saveTask(sub, insertedTask.id)
        }
      }
    }

    for (const task of data.tasks) {
      await saveTask(task)
    }
    
    return { success: true }
  } catch (error) {
    console.error('AI_MAGIC_ERROR:', error)
    return { success: false, error: 'PROTOCOL_FAILURE: AI_ENGINE_OFFLINE' }
  }
}

export async function cleanPlaylistTitles(titles: string[]) {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.error('AI_MAGIC_ERROR: NEXT_PUBLIC_GEMINI_API_KEY is missing from environment')
    return titles
  }
  
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const prompt = `
    You are an intelligent title cleaner for YouTube course playlists.
    Your job is to extract clean, meaningful, unique lesson names from raw YouTube titles.

    UNIVERSAL RULES (apply to any course/topic):

    1. REMOVE these patterns:
       - Course name or series name that repeats
       - Instructor/channel name
       - Episode numbers used only for ordering
       - Dots, dashes, pipes used as separators
       - Redundant prefixes that repeat in every title

    2. KEEP these patterns:
       - The actual lesson or topic name
       - Technical terms and concepts
       - Part numbers ONLY if they distinguish between videos with the same topic
       - Language of original title (Arabic stays Arabic)

    3. HANDLE DUPLICATES:
       - If cleaned titles would be identical, add "Part 1", "Part 2" etc.
       - Never return two identical titles
       - Order must match input exactly

    4. BE SMART:
       - Understand context from the titles
       - If titles are about networking: keep networking terms
       - If titles are about cooking: keep cooking terms
       - If titles are about language learning: keep grammar/vocabulary terms
       - Never oversimplify to the point of losing meaning

    5. OUTPUT:
       - Return ONLY a valid JSON array
       - Same length as input
       - Same order as input
       - No explanation, no markdown, just JSON

    EXAMPLES:

    Networking course:
    Input: ["CCNA 200-301..SWITCHING..AHMED NAZMY 5", "CCNA 200-301..SWITCHING..AHMED NAZMY 6", "CCNA 200-301..IP ADDRESSING..AHMED NAZMY 3"]
    Output: ["Switching Part 1", "Switching Part 2", "IP Addressing"]

    Cooking course:
    Input: ["Gordon Ramsay Cooking..PASTA BASICS..EP1", "Gordon Ramsay Cooking..PASTA BASICS..EP2", "Gordon Ramsay Cooking..KNIFE SKILLS..EP3"]
    Output: ["Pasta Basics Part 1", "Pasta Basics Part 2", "Knife Skills"]

    Arabic course:
    Input: ["تعلم العربية..النحو الأساسي..الدرس 1", "تعلم العربية..النحو الأساسي..الدرس 2", "تعلم العربية..الإملاء..الدرس 3"]
    Output: ["النحو الأساسي - الجزء الأول", "النحو الأساسي - الجزء الثاني", "الإملاء"]

    Titles to clean:
    ${JSON.stringify(titles)}
  `

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonStr = text.replace(/```json|```/g, '').trim()
    const cleanTitles = JSON.parse(jsonStr)
    
    if (Array.isArray(cleanTitles) && cleanTitles.length === titles.length) {
      return cleanTitles
    }
    return titles
  } catch (error) {
    console.error('AI_TITLE_CLEAN_ERROR:', error)
    return titles
  }
}
