'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'


export interface Report {
  id: string
  user_id: string
  type: 'daily_brief' | 'deadline_alert' | 'mission_complete' | 'weekly_review'
  title: string
  content: any
  is_read: boolean
  created_at: string
}

const isGeneratingDaily = new Set<string>()
const isGeneratingWeekly = new Set<string>()
const isCheckingDeadlines = new Set<string>()

export function useInbox() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { showToast } = useToast()


  const fetchReports = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('inbox_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setReports(data)
    setLoading(false)
  }, [supabase])

  const markAsRead = async (reportId: string) => {
    await supabase
      .from('inbox_reports')
      .update({ is_read: true })
      .eq('id', reportId)

    setReports(prev => prev.map(r => r.id === reportId ? { ...r, is_read: true } : r))
  }

  const generateDailyBrief = async (userId: string, lang: string) => {
    if (isGeneratingDaily.has(userId)) return
    isGeneratingDaily.add(userId)

    try {
      const today = new Date().toISOString().split('T')[0]

      // FIX 3: Duplicate notifications
      const { data: recent } = await supabase
        .from('inbox_reports')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'daily_brief')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (recent) return

      // 1. Get today's stats
      const { data: taskLogs } = await supabase
        .from('task_completion_log')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', today + 'T00:00:00')

      const completedToday = taskLogs?.length || 0

      // 2. Get active missions & nearest deadline
      const { data: missions } = await supabase
        .from('cups')
        .select('*, tasks(*)')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .neq('status', 'complete')
        .order('end_date', { ascending: true })

      const activeMissionsCount = missions?.length || 0
      const nearestMission = missions?.[0]
      let nearestDeadlineStr = lang === 'ar' ? "لا يوجد" : "None"
      let nearestMissionTitle = lang === 'ar' ? "لا يوجد" : "None"
      let nearestDays = 0

      if (nearestMission?.end_date) {
        const days = Math.ceil((new Date(nearestMission.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        nearestDays = days
        nearestMissionTitle = nearestMission.title
        nearestDeadlineStr = lang === 'ar' ? `${nearestMission.title} متبقي ${days} أيام` : `${nearestMission.title} in ${days} days`
      }

      // 3. Calculate Overall Progress
      let totalProgress = 0
      if (missions && missions.length > 0) {
        let sumPct = 0
        missions.forEach((m: any) => {
          const total = m.tasks?.length || 0
          const done = m.tasks?.filter((t: any) => t.is_completed).length || 0
          sumPct += total > 0 ? (done / total) * 100 : 0
        })
        totalProgress = Math.round(sumPct / missions.length)
      }

      // 4. Get Total XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .maybeSingle()

      const totalXp = profile?.xp || 0

      // 5. Create report
      const title = lang === 'ar' ? `📋 تقرير الأداء اليومي - ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : `📋 Brief ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
      const content = lang === 'ar' ? `ملخص حالة الإنتاجية اليومية:
- الأهداف النشطة: [${activeMissionsCount}]
- أقرب موعد نهائي: [${nearestMissionTitle}] متبقي [${nearestDays}] أيام
- نسبة التقدم العام: [${totalProgress}]%
- إجمالي نقاط الإنجاز (XP): [${totalXp}]` : `Today's Status:
- Active Goals: [${activeMissionsCount}]
- Nearest deadline: [${nearestMissionTitle}] in [${nearestDays}] days
- Overall Progress: [${totalProgress}]%
- Total XP: [${totalXp}]`

      const { data } = await supabase.from('inbox_reports').insert({
        user_id: userId,
        type: 'daily_brief',
        title,
        content: {
          text: content,
          completed_count: completedToday,
          active_count: activeMissionsCount,
          nearest_deadline_title: nearestMissionTitle,
          nearest_days: nearestDays,
          overall_progress: totalProgress,
          total_xp: totalXp
        }
      }).select().single()

      if (data) {
        setReports(prev => [data, ...prev])
      }
    } finally {
      isGeneratingDaily.delete(userId)
    }
  }

  const checkDeadlinesAndCompletions = async (userId: string, lang: string) => {
    if (isCheckingDeadlines.has(userId)) return
    isCheckingDeadlines.add(userId)

    try {
      const { data: missions } = await supabase
        .from('cups')
        .select('*, tasks(*)')
        .eq('user_id', userId)

      if (!missions) return

      for (const mission of missions) {
        // FIX 5: Deadline warnings
        const totalTasksCount = mission.tasks?.length || 0
        const doneTasksCount = mission.tasks?.filter((t: any) => t.is_completed).length || 0
        const currentProgress = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0

        const belongsToUser = mission.user_id === userId

        // 1. Check Deadline Alert
        if (mission.end_date && !mission.is_archived && mission.status !== 'complete' && belongsToUser && currentProgress < 80) {
          const days = Math.ceil((new Date(mission.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
          if (days > 0 && days <= 3) {
            // FIX 3: Duplicate notifications
            const { data: recentAlert } = await supabase
              .from('inbox_reports')
              .select('id')
              .eq('user_id', userId)
              .eq('type', 'deadline_alert')
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .contains('content', { mission_id: mission.id })
              .maybeSingle()

            if (!recentAlert) {
              const remainingTasks = totalTasksCount - doneTasksCount
              const tasksPerDay = days > 0 ? (remainingTasks / days).toFixed(1) : remainingTasks

              const title = lang === 'ar' ? `⚠️ تنبيه الموعد النهائي: ${mission.title}` : `⚠️ Warning: ${mission.title}`
              const content = lang === 'ar' ? `[${mission.title}] متبقي [${days}] أيام فقط!
نسبة الإنجاز الحالية: [${currentProgress}]%
معدل العمل المطلوب: إكمال [${tasksPerDay}] مهام يومياً للوفاء بالموعد المحدد.` : `[${mission.title}] only [${days}] days left!
You are at [${currentProgress}]%
You need to complete [${tasksPerDay}] tasks per day to make it.`

              await supabase.from('inbox_reports').insert({
                user_id: userId,
                type: 'deadline_alert',
                title,
                content: {
                  text: content,
                  mission_id: mission.id,
                  mission_title: mission.title,
                  days_remaining: days,
                  progress: currentProgress,
                  end_date: mission.end_date,
                  tasks_per_day: tasksPerDay
                }
              })
            }
          }
        }

        // 2. Check Mission Complete
        const totalTasks = totalTasksCount
        const doneTasks = doneTasksCount

        const isCompleted = totalTasks > 0 && totalTasks === doneTasks && mission.status === 'complete'
        const isArchived = mission.is_archived === true

        if (isCompleted && belongsToUser && isArchived) {
          // Only notify if archived recently (last 24 hours)
          const lastModified = (mission as any).updated_at || mission.end_date || mission.created_at
          const archivedRecently = new Date(lastModified) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          if (!archivedRecently) continue

          // FIX 3: Duplicate notifications
          const { data: existing } = await supabase
            .from('inbox_reports')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'mission_complete')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .eq('content->>cup_id', mission.id)
            .maybeSingle()

          if (existing) continue // Skip if already notified

          const xpAmount = totalTasks * 10 + 50
          const startDate = new Date(mission.start_date || mission.created_at).toLocaleDateString('en-US')
          const endDate = new Date().toLocaleDateString('en-US')
          const timeTaken = `${startDate} to ${endDate}`

          const title = lang === 'ar' ? "✅ تم تحقيق الهدف بنجاح!" : "✅ Goal Achieved!"
          const content = lang === 'ar' ? `تهانينا! لقد أكملت العمل على هدف: [${mission.title}]
نقاط الإنجاز المكتسبة: +[${xpAmount}] نقطة
المدة المستغرقة: [${timeTaken}]
الخطوة التالية: يمكنك زيارة معرض الإنجازات لاستعراض الكأس الذهبي الموثق باسمك.` : `Congrats! You finished [${mission.title}]
XP Earned: +[${xpAmount}]
Time Taken: [${timeTaken}]
Next step: Visit the Wins page to view your golden cup.`

          await supabase.from('inbox_reports').insert({
            user_id: userId,
            type: 'mission_complete',
            title,
            content: {
              text: content,
              cup_id: mission.id,
              mission_id: mission.id,
              mission_name: mission.title,
              mission_title: mission.title,
              xp_earned: xpAmount,
              time_taken: timeTaken
            }
          })
        }
      }
      fetchReports()
    } finally {
      isCheckingDeadlines.delete(userId)
    }
  }

  const generateWeeklyReview = async (userId: string, lang: string, userCreatedAt: string) => {
    if (isGeneratingWeekly.has(userId)) return
    isGeneratingWeekly.add(userId)

    try {
      // FIX 2: Weekly report timing
      const createdAtDate = new Date(userCreatedAt)
      const daysSinceJoin = Math.floor((Date.now() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceJoin < 7) return

      // FIX 3: Duplicate notifications
      const { data: recent } = await supabase
        .from('inbox_reports')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'weekly_review')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (recent) return

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: taskLogs } = await supabase
        .from('task_completion_log')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', sevenDaysAgo)

      const completedCount = taskLogs?.length || 0
      const gainedXp = completedCount * 25

      const { data: completedMissions } = await supabase
        .from('cups')
        .select('*, tasks(*)')
        .eq('user_id', userId)
        .eq('is_archived', true)
        .gte('created_at', sevenDaysAgo)

      let missionXp = 0
      if (completedMissions) {
        completedMissions.forEach((m: any) => {
          const total = m.tasks?.length || 0
          missionXp += total * 10 + 50
        })
      }
      const totalWeeklyXp = gainedXp + missionXp

      const { data: activeMissions } = await supabase
        .from('cups')
        .select('*, tasks(*)')
        .eq('user_id', userId)
        .eq('is_archived', false)

      let activeMissionsList: string[] = []
      let activeMissionsTextAr = ""
      let activeMissionsTextEn = ""
      let criticalGoalTitle = ""
      let criticalGoalDays = 999

      const SIZE_SLOTS: Record<string, number> = { sm: 1, md: 1.5, lg: 3, s: 1, m: 1.5, l: 3 }
      let usedSlots = 0

      if (activeMissions) {
        activeMissions.forEach((m: any) => {
          const total = m.tasks?.length || 0
          const done = m.tasks?.filter((t: any) => t.is_completed).length || 0
          const progress = total > 0 ? Math.round((done / total) * 100) : 0
          activeMissionsList.push(`${m.title} (${progress}%)`)
          activeMissionsTextAr += `- [${m.title}]: بنسبة إنجاز [${progress}%]\n`
          activeMissionsTextEn += `- [${m.title}]: at [${progress}%] progress\n`

          usedSlots += SIZE_SLOTS[m.size?.toLowerCase()] ?? 1

          if (m.end_date) {
            const days = Math.ceil((new Date(m.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
            if (days > 0 && days <= 5 && progress < 50) {
              if (days < criticalGoalDays) {
                criticalGoalDays = days
                criticalGoalTitle = m.title
              }
            }
          }
        })
      }

      let recommendationsAr = ""
      let recommendationsEn = ""
      let recommendationsList: string[] = []

      if (completedCount === 0) {
        recommendationsAr = `1. 💤 ركز هذا الأسبوع على مهمة واحدة صغيرة لكسر الجمود واسترجاع طاقتك.`
        recommendationsEn = `1. 💤 Focus on a single small task this week to break the ice and build up momentum.`
        recommendationsList.push("Focus on small tasks to build momentum")
      } else if (criticalGoalTitle) {
        recommendationsAr = `1. 🚨 الهدف "${criticalGoalTitle}" يقترب من موعده النهائي وباقي ${criticalGoalDays} أيام فقط. ركز جهودك عليه أولاً.`
        recommendationsEn = `1. 🚨 Goal "${criticalGoalTitle}" is nearing its deadline in ${criticalGoalDays} days. Prioritize it to avoid overrun.`
        recommendationsList.push(`Prioritize urgent goal: ${criticalGoalTitle}`)
      } else if (usedSlots >= 7) {
        recommendationsAr = `1. 🚧 سعة التركيز لديك مرتفعة جداً (${usedSlots}/9). تجنب بدء أهداف جديدة قبل إنهاء الأهداف الحالية.`
        recommendationsEn = `1. 🚧 Your focus slot capacity is high (${usedSlots}/9). Avoid starting new goals until current ones are resolved.`
        recommendationsList.push("Clear existing focus slots before starting new goals")
      } else {
        recommendationsAr = `1. ⚡ أداء رائع! حافظ على هذا الإيقاع واستمر في كسب نقاط الخبرة والنمو الذاتي.`
        recommendationsEn = `1. ⚡ Excellent execution! Maintain this tempo, keep farming XP and expanding your capabilities.`
        recommendationsList.push("Maintain current productive tempo")
      }

      const title = lang === 'ar' ? `📊 تقرير الأداء الأسبوعي` : `📊 Weekly Review`
      /*
      const contentText = lang === 'ar' ? `📊 تقرير الأداء الأسبوعي // WEEKLY REVIEW

📅 مراجعة الأسبوع المنصرم:
- المهام المكتملة: [${completedCount}] مهمة
- إجمالي نقاط الخبرة المكتسبة: +[${totalWeeklyXp}] نقطة
- حالة الأهداف النشطة:
${activeMissionsTextAr || '- لا توجد أهداف نشطة حالياً.'}

🚀 تطلعات الأسبوع المقبل:
- سعة التركيز الحالية: ${usedSlots}/9 وحدات تركيز.
- التوجيه المقترح لزيادة الإنتاجية: ${criticalGoalTitle ? `التركيز الفوري على إتمام "${criticalGoalTitle}"` : `الحفاظ على معدل الإنتاجية الحالي وتعزيز تقدمك`}

💡 التوصية المخصصة:
${recommendationsAr}` : `📊 WEEKLY INTELLIGENCE REPORT

📅 LAST WEEK:
- Tasks Completed: [${completedCount}] tasks
- XP Gained: +[${totalWeeklyXp}] XP
- Active Goals Status:
${activeMissionsTextEn || '- No active goals currently.'}

🚀 NEXT WEEK:
- Current Station Capacity: ${usedSlots}/9 focus slots.
- Suggested Directive: ${criticalGoalTitle ? `Prioritize completing urgent target: "${criticalGoalTitle}"` : `Maintain current momentum and optimize slot utilization.`}

💡 RECOMMENDATION:
${recommendationsEn}`
      */
      const contentText = lang === 'ar' ? `📊 تقرير الأداء الأسبوعي

📅 مراجعة الأسبوع المنصرم:
- المهام المكتملة: [${completedCount}] مهمة
- إجمالي نقاط الخبرة المكتسبة: +[${totalWeeklyXp}] نقطة
- حالة الأهداف النشطة:
${activeMissionsTextAr || '- لا توجد أهداف نشطة حالياً.'}

🚀 تطلعات الأسبوع المقبل:
- سعة التركيز الحالية: ${usedSlots}/9 وحدات تركيز.
- التوجيه المقترح لزيادة الإنتاجية: ${criticalGoalTitle ? `التركيز الفوري على إتمام "${criticalGoalTitle}"` : `الحفاظ على معدل الإنتاجية الحالي وتعزيز تقدمك`}

💡 التوصية المخصصة:
${recommendationsAr}` : `📊 Weekly Intelligence Report

📅 Last Week:
- Tasks Completed: [${completedCount}] tasks
- XP Gained: +[${totalWeeklyXp}] XP
- Active Goals Status:
${activeMissionsTextEn || '- No active goals currently.'}

🚀 Next Week:
- Current Station Capacity: ${usedSlots}/9 focus slots.
- Suggested Directive: ${criticalGoalTitle ? `Prioritize completing urgent target: "${criticalGoalTitle}"` : `Maintain current momentum and optimize slot utilization.`}

💡 Recommendation:
${recommendationsEn}`

      const { data: newReport } = await supabase.from('inbox_reports').insert({
        user_id: userId,
        type: 'weekly_review',
        title,
        content: {
          text: contentText,
          completed_tasks: completedCount,
          gained_xp: totalWeeklyXp,
          active_missions: activeMissionsList,
          recommendations: recommendationsList
        }
      }).select().single()

      if (newReport) {
        setReports(prev => [newReport, ...prev])
      }
    } finally {
      isGeneratingWeekly.delete(userId)
    }
  }

  useEffect(() => {
    let activeChannel: any = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Set up robust real-time broadcast channel subscription as absolute fallback
      activeChannel = supabase
        .channel(`inbox-channel:${user.id}`)
        .on(
          'broadcast',
          { event: 'new-notification' },
          (payload: any) => {
            console.log('Real-time broadcast notification received, fetching reports...', payload)
            fetchReports()
            if (payload && payload.title) {
              showToast(payload.title, 'info')
            }
          }
        )
        .subscribe()

      // FIX 1: No notifications for brand new users
      const { data: cups } = await supabase
        .from('cups')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!cups || cups.length === 0) {
        await fetchReports()
        return
      }

      // FIX 4: Get language first
      const { data: profile } = await supabase
        .from('profiles')
        .select('language, created_at')
        .eq('id', user.id)
        .maybeSingle()

      const lang = profile?.language || 'en'
      const userCreatedAt = profile?.created_at || new Date().toISOString()

      await fetchReports()
      // Commented out to prevent notification spam loop
      // await generateDailyBrief(user.id, lang)
      await generateWeeklyReview(user.id, lang, userCreatedAt)
      await checkDeadlinesAndCompletions(user.id, lang)
    }
    init()

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [fetchReports, supabase, showToast])

  return { reports, loading, markAsRead, fetchReports }
}
