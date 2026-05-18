'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Report {
  id: string
  user_id: string
  type: 'daily_brief' | 'deadline_alert' | 'mission_complete' | 'weekly_review'
  title: string
  content: any
  is_read: boolean
  created_at: string
}

export function useInbox() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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

  const generateDailyBrief = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]
    
    // 0. Duplicate check (Server-side check)
    const { data: existingBrief } = await supabase
      .from('inbox_reports')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'daily_brief')
      .gte('created_at', today + 'T00:00:00')
      .limit(1)
    
    if (existingBrief && existingBrief.length > 0) return

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
    let nearestDeadlineStr = "لا يوجد"
    let nearestMissionTitle = "لا يوجد"
    let nearestDays = 0

    if (nearestMission?.end_date) {
      const days = Math.ceil((new Date(nearestMission.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
      nearestDays = days
      nearestMissionTitle = nearestMission.title
      nearestDeadlineStr = `${nearestMission.title} باقي ${days} أيام`
    }

    // 3. Calculate Overall Progress
    let totalProgress = 0
    if (missions && missions.length > 0) {
      let sumPct = 0
      missions.forEach(m => {
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
      .single()
    
    const totalXp = profile?.xp || 0

    // 5. Create report
    const title = `📋 تقرير ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
    const content = `وضعك النهارده:
- المهام الشغالة: [${activeMissionsCount}]
- أقرب deadline: [${nearestMissionTitle}] باقي [${nearestDays}] أيام
- التقدم العام: [${totalProgress}]%
- XP الكلي: [${totalXp}]`

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
  }

  const checkDeadlinesAndCompletions = async (userId: string) => {
    const { data: missions } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('user_id', userId)

    if (!missions) return

    for (const mission of missions) {
      // 1. Check Deadline Alert
      if (mission.end_date && !mission.is_archived && mission.status !== 'complete') {
        const days = Math.ceil((new Date(mission.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        if (days > 0 && days <= 3) {
          // Check database for existing alert for this mission and deadline
          const { data: existingAlert } = await supabase
            .from('inbox_reports')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'deadline_alert')
            .contains('content', { mission_id: mission.id, end_date: mission.end_date })
            .limit(1)

          if (!existingAlert || existingAlert.length === 0) {
             const total = mission.tasks?.length || 0
             const done = mission.tasks?.filter((t: any) => t.is_completed).length || 0
             const progress = total > 0 ? Math.round((done / total) * 100) : 0
             const remainingTasks = total - done
             const tasksPerDay = days > 0 ? (remainingTasks / days).toFixed(1) : remainingTasks

             const title = `⚠️ تحذير: ${mission.title}`
             const content = `[${mission.title}] باقي [${days}] أيام بس!
إنت عند [${progress}]% 
محتاج تخلص [${tasksPerDay}] tasks في اليوم عشان توصل`

             await supabase.from('inbox_reports').insert({
               user_id: userId,
               type: 'deadline_alert',
               title,
               content: {
                 text: content,
                 mission_id: mission.id,
                 mission_title: mission.title,
                 days_remaining: days,
                 progress,
                 end_date: mission.end_date,
                 tasks_per_day: tasksPerDay
               }
             })
          }
        }
      }

      // 2. Check Mission Complete
      const totalTasks = mission.tasks?.length || 0
      const doneTasks = mission.tasks?.filter((t: any) => t.is_completed).length || 0
      
      const isCompleted = totalTasks > 0 && totalTasks === doneTasks && mission.status === 'completed'
      const belongsToUser = mission.user_id === userId
      const isArchived = mission.is_archived === true

      if (isCompleted && belongsToUser && isArchived) {
        // Only notify if archived recently (last 24 hours)
        const lastModified = (mission as any).updated_at || mission.end_date || mission.created_at
        const archivedRecently = new Date(lastModified) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        if (!archivedRecently) continue

        // Check if notification already exists using JSON content query for cup_id
        const { data: existing } = await supabase
          .from('inbox_reports')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'mission_complete')
          .eq('content->>cup_id', mission.id)
          .maybeSingle()

        if (existing) continue // Skip if already notified

        const xpAmount = totalTasks * 10 + 50
        const startDate = new Date(mission.start_date || mission.created_at).toLocaleDateString('en-US')
        const endDate = new Date().toLocaleDateString('en-US')
        const timeTaken = `${startDate} to ${endDate}`
        
        const title = "✅ مهمة اتخلصت!"
        const content = `مبروك! خلصت [${mission.title}]
XP المكسوب: +[${xpAmount}]
الوقت اللي اخدته: [${timeTaken}]
الخطوة الجاية: روح لصفحة الإنجازات (Wins) عشان تشوف الكأس المذهب`

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
  }

  const generateWeeklyReview = async (userId: string) => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - (day === 0 ? 6 : day - 1)
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    const mondayStr = monday.toISOString()
    
    const { data: existingReview } = await supabase
      .from('inbox_reports')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'weekly_review')
      .gte('created_at', mondayStr)
      .limit(1)

    if (existingReview && existingReview.length > 0) return

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
      recommendationsAr = `1. ⚡ أداء رائع! حافظ على هذا الإيقاع واستمر في حصد الـ XP والنمو.`
      recommendationsEn = `1. ⚡ Excellent execution! Maintain this tempo, keep farming XP and expanding your capabilities.`
      recommendationsList.push("Maintain current productive tempo")
    }

    const title = `📊 الحصاد الأسبوعي // WEEKLY_REVIEW`
    const contentText = `📊 الحصاد الأسبوعي // WEEKLY REVIEW

📅 الأسبوع اللي فات (Last Week):
- المهام المنجزة: [${completedCount}] مهمة
- نقاط XP المكتسبة: +[${totalWeeklyXp}] نقطة
- حالة المهمات النشطة:
${activeMissionsTextAr || '- لا يوجد مهمات نشطة حالياً.'}

🚀 الأسبوع الجاي (Next Week):
- حالة سعة المحطة الحالية: ${usedSlots}/9 وحدات تركيز.
- خطط التركيز المقترحة: ${criticalGoalTitle ? `التركيز فوراً على إنهاء "${criticalGoalTitle}"` : `الحفاظ على معدل الإنجاز واستثمار طاقة الرانك`}

💡 التوصية (Recommendation):
${recommendationsAr}

========================================

📊 WEEKLY INTELLIGENCE REPORT

📅 LAST WEEK:
- Tasks Completed: [${completedCount}] tasks
- XP Gained: +[${totalWeeklyXp}] XP
- Active Missions Status:
${activeMissionsTextEn || '- No active missions currently.'}

🚀 NEXT WEEK:
- Current Station Capacity: ${usedSlots}/9 focus slots.
- Suggested Directive: ${criticalGoalTitle ? `Prioritize completing urgent target: "${criticalGoalTitle}"` : `Maintain current momentum and optimize slot utilization.`}

💡 RECOMMENDATION:
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
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await fetchReports()
        await generateDailyBrief(user.id)
        await generateWeeklyReview(user.id)
        await checkDeadlinesAndCompletions(user.id)
      }
    }
    init()
  }, [fetchReports, supabase])

  return { reports, loading, markAsRead, fetchReports }
}
