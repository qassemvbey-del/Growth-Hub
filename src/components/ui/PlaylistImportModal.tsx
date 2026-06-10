'use client'

import { ListPlus, X, Loader2, Calendar, Clock } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cleanPlaylistTitles } from '@/app/actions/ai-magic'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

interface PreviewTask {
  title: string
  duration: string // ISO 8601
  seconds: number
  weight: number
  originalTitle: string
  videoId: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  // missionId: string
  goalId: string
  themeColor: string
  onTasksAdded: (tasks: any[]) => void
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || 'AIzaSyAcS6t0jQivhoXePWTajpocP0upKX313hk'

export default function PlaylistImportModal({ isOpen, onClose, goalId, themeColor, onTasksAdded }: Props) {
  const { isRTL, profile } = useGrowth()
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewTasks, setPreviewTasks] = useState<PreviewTask[]>([])
  const [confirming, setConfirming] = useState(false)

  // Smart Scheduling States
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]) // Monday to Friday default
  const [dailyCapacity, setDailyCapacity] = useState<number>(60) // 60 minutes default

  const [loadingTextIndex, setLoadingTextIndex] = useState(0)

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingTextIndex(prev => (prev + 1) % 4)
    }, 1500)
    return () => clearInterval(interval)
  }, [loading])

  const userName = (profile as any)?.coach_name || 'Coach'
  const loadingMessages = isRTL ? [
    'جاري تحليل البيانات...',
    'مزامنة التقدم...',
    `${userName} يعالج البيانات...`,
    'تنظيم المحتوى...',
  ] : [
    'Analyzing...',
    'Syncing...',
    `${userName} is processing...`,
    'Organizing your content...',
  ]

  const buttonMessages = isRTL ? [
    'تحليل...',
    'مزامنة...',
    'معالجة...',
    'تنظيم...',
  ] : [
    'Analyzing...',
    'Syncing...',
    'Processing...',
    'Organizing...',
  ]

  const supabase = createClient()

  const parseDuration = (isoDuration: string) => {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')
    return hours * 3600 + minutes * 60 + seconds
  }

  const formatSeconds = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return [
      h > 0 ? `${h}h` : '',
      m > 0 ? `${m}m` : '',
      s > 0 ? `${s}s` : ''
    ].filter(Boolean).join(' ') || '0s'
  }

  const extractPlaylistId = (url: string) => {
    const match = url.match(/[?&]list=([^#\&\?]+)/)
    return match ? match[1] : null
  }

  const handleFetch = async () => {
    setError(null)
    setPreviewTasks([])
    const playlistId = extractPlaylistId(playlistUrl)
    if (!playlistId) {
      setError(isRTL ? 'إشارة غير صالحة - ليس قائمة تشغيل' : 'Invalid Link - Not a YouTube Playlist')
      return
    }

    setLoading(true)
    try {
      // 1. Fetch playlist items
      const itemsRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`)
      const itemsData = await itemsRes.json()

      if (itemsData.error) {
        if (itemsData.error.errors?.[0]?.reason === 'playlistNotFound' || itemsData.error.code === 404) {
          setError(isRTL ? 'تم رفض الوصول - قائمة خاصة' : 'Access Denied - Private Playlist')
        } else {
          setError(`API Error - ${itemsData.error.message || 'Unknown Reason'}`)
        }
        setLoading(false)
        return
      }

      const items = itemsData.items || []
      if (items.length === 0) {
        setError(isRTL ? 'خلاصة فارغة - لم يتم العثور على فيديوهات' : 'Empty Playlist - No Videos Found')
        setLoading(false)
        return
      }

      const videoIds = items.map((it: any) => it.contentDetails.videoId).join(',')

      // 2. Fetch video details for durations
      const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`)
      const videosData = await videosRes.json()
      
      const durationMap: Record<string, string> = {}
      videosData.items.forEach((v: any) => {
        durationMap[v.id] = v.contentDetails.duration
      })

      const rawTitles = items.map((it: any) => it.snippet.title)
      const cleanTitles = await cleanPlaylistTitles(rawTitles)

      const mapped = items.map((it: any, idx: number) => {
        const duration = durationMap[it.contentDetails.videoId] || 'PT0S'
        const seconds = parseDuration(duration)
        return {
          title: cleanTitles[idx] || it.snippet.title,
          originalTitle: it.snippet.title,
          duration,
          seconds,
          weight: 1, // Will be computed relatively below
          videoId: it.contentDetails.videoId
        }
      })

      const maxDuration = Math.max(...mapped.map((t: any) => t.seconds), 0)
      const relativeMapped = mapped.map((t: any) => {
        let weight = 1
        if (maxDuration > 0 && t.seconds > 0) {
          weight = Math.ceil((t.seconds / maxDuration) * 5)
          weight = Math.max(1, Math.min(5, weight))
        }
        return {
          ...t,
          weight
        }
      })

      setPreviewTasks(relativeMapped)
    } catch (err: any) {
      setError(`Network Error - Please check connection and try again`)
    } finally {
      setLoading(false)
    }
  }

  // Smart Chunking Algorithm
  const calculateDeadlines = (
    tasksList: PreviewTask[],
    selectedDays: number[],
    capacityMinutes: number
  ) => {
    if (selectedDays.length === 0) return tasksList.map(() => null)
    
    const getNextAvailableStudyDate = (startDate: Date) => {
      const d = new Date(startDate.getTime())
      for (let i = 0; i < 30; i++) {
        if (selectedDays.includes(d.getDay())) {
          return d
        }
        d.setDate(d.getDate() + 1)
      }
      return d
    }

    const deadlines: (string | null)[] = []
    let currentDate = getNextAvailableStudyDate(new Date())
    let currentDayMinutes = 0
    
    tasksList.forEach((task) => {
      const durationMinutes = Math.ceil(task.seconds / 60)
      
      // If adding this duration exceeds capacity, and we have already added tasks today
      if (currentDayMinutes + durationMinutes > capacityMinutes && currentDayMinutes > 0) {
        const nextDay = new Date(currentDate.getTime())
        nextDay.setDate(nextDay.getDate() + 1)
        currentDate = getNextAvailableStudyDate(nextDay)
        currentDayMinutes = 0
      }
      
      deadlines.push(currentDate.toISOString().split('T')[0])
      currentDayMinutes += durationMinutes
    })
    
    return deadlines
  }

  const handleDeploy = async () => {
    if (validationError) return
    setConfirming(true)
    const { data: { user } } = await supabase.auth.getUser()
    const isLocal = typeof goalId === 'string' && goalId.startsWith('local_')

    if (!user && !isLocal) {
      setError('Authentication Required')
      setConfirming(false)
      return
    }

    const now = Date.now()
    const calculatedDates = calculateDeadlines(previewTasks, studyDays, dailyCapacity)

    const payload = previewTasks.map((t, index) => ({
      goal_id: goalId,
      title: t.title,
      original_title: t.originalTitle,
      weight: t.weight,
      is_completed: false,
      type: 'standard',
      video_id: t.videoId,
      video_progress: 0,
      video_duration: t.seconds > 0 ? t.seconds : null,
      created_at: new Date(now + index * 10).toISOString(),
      // deadline: calculatedDates[index] || null,
      metadata: {
        endDate: calculatedDates[index] || null,
        videoDuration: t.seconds > 0 ? t.seconds : null,
        videoProgress: 0
      }
    }))

    if (isLocal) {
      const generatedTasks = payload.map(p => ({
        ...p,
        id: 'task_' + Math.random().toString(36).substring(2, 9)
      }))

      // Save to localStorage under guest_goals
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.map((g: any) => {
        if (g.id === goalId) {
          return {
            ...g,
            tasks: [...(g.tasks || []), ...generatedTasks]
          }
        }
        return g
      })
      localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))

      onTasksAdded(generatedTasks)
      onClose()
      setConfirming(false)
      setPlaylistUrl('')
      setPreviewTasks([])
      return
    }

    const { data, error: insertError } = await supabase.from('tasks').insert(payload).select()

    if (insertError) {
      console.error('PLAYLIST_IMPORT_ERROR:', insertError)
      setError(`Database Error - ${insertError.message}`)
      setConfirming(false)
    } else {
      onTasksAdded(data || [])
      onClose()
      setConfirming(false)
      setPlaylistUrl('')
      setPreviewTasks([])
    }
  }

  if (!isOpen) return null

  const totalDuration = previewTasks.reduce((acc, t) => acc + t.seconds, 0)
  
  // Strict Validation: Capacity cannot be less than shortest video
  const shortestVideoSeconds = previewTasks.length > 0 ? Math.min(...previewTasks.map(t => t.seconds)) : 0
  const shortestVideoMinutes = Math.ceil(shortestVideoSeconds / 60)
  
  const validationError = (() => {
    if (previewTasks.length === 0) return null
    if (studyDays.length === 0) {
      return isRTL ? 'يرجى تحديد يوم دراسي واحد على الأقل' : 'Please select at least one study day'
    }
    if (dailyCapacity < shortestVideoMinutes) {
      return isRTL 
        ? `لا يمكن أن تكون السعة اليومية أقل من أقصر فيديو: ${shortestVideoMinutes} دقيقة` 
        : `Daily capacity cannot be less than the shortest video: ${shortestVideoMinutes} mins`
    }
    return null
  })()

  const daysLabels = isRTL 
    ? ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[95vw] md:max-w-2xl bg-zinc-950/95 border border-white/10 rounded-2xl overflow-y-auto flex flex-col shadow-2xl max-h-[90vh] my-auto p-4 md:p-6"
        style={{ borderColor: `${themeColor}33` }}
      >
        {/* Header */}
        <div className="pb-4 border-b flex justify-between items-center border-white/5 bg-zinc-900/40 px-4 -mx-4 -mt-4 md:px-6 md:-mx-6 md:-mt-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <ListPlus className="text-teal-400" style={{ color: themeColor }} />
            <h2 className="font-space font-black tracking-widest text-sm text-white uppercase">
              {isRTL ? 'استيراد قائمة التشغيل' : 'Playlist Import'}
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Input Area */}
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-space font-black text-zinc-500 tracking-widest">
              {isRTL ? 'رابط قائمة تشغيل يوتيوب' : 'YouTube Playlist URL'}
            </label>
            <div className="flex gap-2">
              <input 
                value={playlistUrl}
                onChange={e => setPlaylistUrl(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..."
                className="flex-1 bg-white/[0.02] border border-white/5 py-2.5 px-4 rounded-xl font-space text-xs text-white outline-none focus:border-teal-500/50"
                style={{ borderColor: error ? '#FF0055' : undefined }}
              />
              <button 
                onClick={handleFetch}
                disabled={loading || !playlistUrl.trim()}
                className="py-2.5 px-6 font-space font-black text-[10px] uppercase tracking-widest transition-all bg-teal-500 text-black disabled:opacity-30 rounded-xl shadow-lg hover:brightness-110 shrink-0 cursor-pointer min-w-[130px] text-center"
                style={{ backgroundColor: themeColor }}
              >
                {loading ? buttonMessages[loadingTextIndex] : (isRTL ? 'فحص' : 'Scan')}
              </button>
            </div>
            {loading && (
              <div className="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-xl space-y-4 mt-4">
                <Loader2 className="animate-spin w-10 h-10 mx-auto mb-4" style={{ color: themeColor }} />
                <span className="text-xs font-black tracking-widest animate-pulse uppercase" style={{ color: themeColor }}>
                  {loadingMessages[loadingTextIndex]}
                </span>
              </div>
            )}
            {error && <p className="text-[10px] font-space font-black text-[#FF0055] tracking-widest mt-2">{error}</p>}
          </div>

          {/* Preview Area */}
          <AnimatePresence>
            {previewTasks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <p className="text-[10px] font-space font-black text-zinc-500 tracking-widest">
                    {isRTL 
                      ? `تم العثور على: ${previewTasks.length} فيديو - المجموع: ${formatSeconds(totalDuration)}`
                      : `Found: ${previewTasks.length} Videos - Total: ${formatSeconds(totalDuration)}`
                    }
                  </p>
                </div>
                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {previewTasks.map((t, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5 px-4 border border-white/5 bg-white/[0.01] rounded-xl">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-space text-[11px] font-bold text-white uppercase truncate">{t.title}</p>
                        <p className="font-space text-[9px] text-zinc-500 uppercase tracking-tighter">
                          {isRTL ? `المدة: ${formatSeconds(t.seconds)}` : `Duration: ${formatSeconds(t.seconds)}`}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {[1,2,3,4,5].map(w => (
                          <div key={w} className={`w-1.5 h-4 rounded-[1px] ${w <= t.weight ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'bg-white/5'}`} style={w <= t.weight ? { backgroundColor: themeColor } : {}} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Smart Scheduling Section */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 mt-2">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Calendar className="w-4 h-4 text-teal-400" />
                    <h4 className="text-xs font-bold text-white font-space">
                      {isRTL ? 'الجدولة الذكية' : 'Smart Scheduling'}
                    </h4>
                  </div>

                  {/* Study Days Pills */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 font-mono block">
                      {isRTL ? 'أيام الدراسة المتاحة' : 'Study Days'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {daysLabels.map((label, index) => {
                        const isSelected = studyDays.includes(index)
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setStudyDays(studyDays.filter(d => d !== index))
                              } else {
                                setStudyDays([...studyDays, index])
                              }
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-space font-medium border transition-all cursor-pointer",
                              isSelected 
                                ? "bg-teal-500/10 border-teal-500 text-teal-400" 
                                : "bg-white/[0.01] border-white/5 text-zinc-500 hover:text-white"
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Daily Capacity Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isRTL ? 'سعة الدراسة اليومية (بالدقائق)' : 'Daily Capacity (Minutes)'}</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={dailyCapacity}
                      onChange={(e) => setDailyCapacity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full sm:w-32 text-center bg-white/[0.02] border border-white/5 py-2.5 px-4 rounded-xl font-space text-xs text-white outline-none focus:border-teal-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Validation Error Message */}
                {validationError && (
                  <p className="text-[10px] font-space font-black text-[#FF0055] tracking-widest mt-2">
                    {validationError}
                  </p>
                )}

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                  <button 
                    onClick={onClose}
                    className="py-2.5 px-4 font-space font-black text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white rounded-xl transition-all cursor-pointer"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    onClick={handleDeploy}
                    disabled={confirming || !!validationError}
                    className="py-2.5 px-6 font-space font-black text-[10px] uppercase tracking-widest bg-teal-500 text-black shadow-lg rounded-xl transition-all hover:brightness-110 cursor-pointer disabled:opacity-30"
                    style={{ backgroundColor: themeColor, boxShadow: `0 0 20px ${themeColor}44` }}
                  >
                    {confirming ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : (isRTL ? 'إنشاء' : 'Create')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
