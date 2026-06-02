import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

interface SmartTaskPlayerProps {
  taskId: string
  url: string
  initialProgress: number
  isGuest: boolean
  themeColor: string
  onComplete: () => void
  onProgressUpdate?: (currentTime: number, duration: number) => void
}

export default function SmartTaskPlayer({ 
  taskId, 
  url, 
  initialProgress, 
  isGuest, 
  themeColor,
  onComplete,
  onProgressUpdate
}: SmartTaskPlayerProps) {
  const { showToast } = useToast()
  const supabase = createClient()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  const [isMounted, setIsMounted] = useState(false)
  const [loadingDb, setLoadingDb] = useState(true)
  const [dbSavedTime, setDbSavedTime] = useState<number | null>(null)
  
  const originRef = useRef(
    typeof window !== 'undefined' 
      ? window.location.origin 
      : ''
  )
  const progressRef = useRef(0)
  const durationRef = useRef(0)
  const hasSeeked = useRef(false)

  // 1. Fetch saved time from Supabase FIRST on mount, then fallback to local storage
  useEffect(() => {
    setIsMounted(true)
    async function loadProgress() {
      if (isGuest) {
        setLoadingDb(false)
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('task_progress')
            .select('current_time')
            .eq('task_id', taskId)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (data && typeof data.current_time === 'number') {
            setDbSavedTime(data.current_time)
          }
        }
      } catch (err) {
        console.error('Failed to load progress from Supabase:', err)
      } finally {
        setLoadingDb(false)
      }
    }
    loadProgress()
  }, [taskId, isGuest, supabase])

  // 2. Recover saved time using structured JSON object or legacy number strings
  const savedTime = useMemo(() => {
    if (loadingDb) return 0
    if (dbSavedTime !== null && dbSavedTime > 0) {
      return Math.floor(dbSavedTime)
    }

    const stored = localStorage.getItem(`yt_progress_${taskId}`)
    if (stored) {
      try {
        const parsedObj = JSON.parse(stored)
        if (parsedObj && typeof parsedObj.time === 'number') {
          return Math.floor(parsedObj.time)
        }
      } catch (e) {
        const parsedNum = parseFloat(stored)
        if (!isNaN(parsedNum) && parsedNum > 0) return Math.floor(parsedNum)
      }
    }
    const legacyStored = localStorage.getItem(`growth_hub_video_progress_${taskId}`)
    const parsedLegacy = parseFloat(legacyStored || '0')
    return Math.floor(parsedLegacy > 0 ? parsedLegacy : (initialProgress || 0))
  }, [taskId, initialProgress, dbSavedTime, loadingDb])

  // 3. Extract videoId or playlistId from multiple YouTube formats
  const parsedMedia = useMemo(() => {
    const videoUrl = url ? url.trim() : ''
    if (!videoUrl) return { type: 'video', id: '' }

    try {
      if (videoUrl.includes('list=')) {
        const playlistMatch = videoUrl.match(/[?&]list=([^#\&\?]+)/)
        if (playlistMatch && playlistMatch[1]) {
          return { type: 'playlist', id: playlistMatch[1] }
        }
      }

      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const urlObj = new URL(videoUrl.includes('://') ? videoUrl : `https://${videoUrl}`)
        const vParam = urlObj.searchParams.get('v')
        if (vParam) {
          return { type: 'video', id: vParam }
        }

        if (urlObj.hostname === 'youtu.be') {
          const pathId = urlObj.pathname.slice(1)
          if (pathId) return { type: 'video', id: pathId }
        }

        const pathMatch = urlObj.pathname.match(/\/(embed|v)\/([a-zA-Z0-9_-]{11})/)
        if (pathMatch && pathMatch[2]) {
          return { type: 'video', id: pathMatch[2] }
        }
      }
    } catch (e) {
      // Ignore URL parsing exceptions
    }

    if (videoUrl.length === 11) {
      return { type: 'video', id: videoUrl }
    }

    return { type: 'video', id: videoUrl }
  }, [url])

  // 4. Construct YouTube IFrame URL using youtube-nocookie.com to prevent CORS/lag
  const iframeUrl = useMemo(() => {
    if (!parsedMedia.id || loadingDb) return ''
    const base = parsedMedia.type === 'playlist'
      ? `https://www.youtube-nocookie.com/embed/videoseries?list=${parsedMedia.id}`
      : `https://www.youtube-nocookie.com/embed/${parsedMedia.id}`
    const originParam = originRef.current ? `&origin=${encodeURIComponent(originRef.current)}` : ''
    return `${base}?enablejsapi=1&start=${savedTime}&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3${originParam}`
  }, [parsedMedia, savedTime, loadingDb])

  // 5. Progress saving helper for localStorage and Supabase (persistent across devices)
  const saveProgress = useCallback(async (time: number, duration: number) => {
    try {
      localStorage.setItem(
        `yt_progress_${taskId}`,
        JSON.stringify({ time, duration })
      )
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, time.toString())

      if (!isGuest) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('task_progress').upsert({
            task_id: taskId,
            user_id: user.id,
            current_time: time,
            duration: duration,
            updated_at: new Date().toISOString()
          })
        }
      }
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }, [taskId, isGuest, supabase])

  // 6. Send {event: 'listening'} postMessage when iframe mounts and loads
  useEffect(() => {
    const el = iframeRef.current
    if (!el) return

    const handleLoad = () => {
      try {
        el.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*')
      } catch (err) {
        // Safe catch
      }
    }

    el.addEventListener('load', handleLoad)
    handleLoad()

    return () => {
      el.removeEventListener('load', handleLoad)
    }
  }, [iframeUrl])

  // 7. PostMessage API Event Listener with YouTube Origin Security Check
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com' && e.origin !== 'https://www.youtube-nocookie.com') {
        return
      }

      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (!data) return

        if (data.event === 'infoDelivery' && data.info) {
          const currentTime = data.info.currentTime
          const duration = data.info.duration

          if (currentTime !== undefined) {
            const time = Math.floor(currentTime)
            const dur = Math.floor(duration || durationRef.current || 0)
            
            progressRef.current = time
            
            // Instantly save to localStorage (fast)
            localStorage.setItem(
              `yt_progress_${taskId}`,
              JSON.stringify({ time, duration: dur })
            )
            localStorage.setItem(`growth_hub_video_progress_${taskId}`, time.toString())

            // Toast feedback for auto-seek on first seek match
            if (!hasSeeked.current && time > 0) {
              hasSeeked.current = true
              showToast('تم استئناف التشغيل من حيث توقفت', 'success')
            }

            if (onProgressUpdate) {
              onProgressUpdate(time, dur)
            }
          }

          if (duration !== undefined && duration > 0) {
            durationRef.current = Math.floor(duration)
          }
        }

        if (data.event === 'onStateChange' && data.info !== undefined) {
          const state = data.info
          if (state === 0) {
            // Video ended: reset progress
            localStorage.setItem(
              `yt_progress_${taskId}`,
              JSON.stringify({ time: 0, duration: durationRef.current })
            )
            localStorage.setItem(`growth_hub_video_progress_${taskId}`, '0')
            if (!isGuest) {
              const resetDbProgress = async () => {
                const { data } = await supabase.auth.getUser()
                if (data?.user) {
                  await supabase.from('task_progress').upsert({
                    task_id: taskId,
                    user_id: data.user.id,
                    current_time: 0,
                    duration: durationRef.current,
                    updated_at: new Date().toISOString()
                  })
                }
              }
              resetDbProgress()
            }
            onComplete()
          } else if (state === 2) {
            // Paused: sync to db instantly
            const time = Math.floor(progressRef.current)
            const duration = Math.floor(durationRef.current)
            saveProgress(time, duration)
          }
        }
      } catch (err) {
        // Safe catch
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [taskId, isGuest, supabase, onComplete, onProgressUpdate, showToast, saveProgress])

  // 8. DB Sync Interval (saves progress to DB every 5s while playing)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isGuest) return
      const time = Math.floor(progressRef.current)
      const duration = Math.floor(durationRef.current)
      if (time > 0) {
        saveProgress(time, duration)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [taskId, isGuest, saveProgress])

  // Ensure final save on unmount
  useEffect(() => {
    return () => {
      const time = Math.floor(progressRef.current)
      const duration = durationRef.current
      saveProgress(time, duration)
    }
  }, [taskId, isGuest, saveProgress])

  if (!isMounted || loadingDb || !iframeUrl) {
    return <div className="w-full aspect-video bg-zinc-900 animate-pulse rounded-md"></div>
  }

  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: `inset 0 0 20px ${themeColor}22` }} />
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        className="w-full aspect-video rounded-md bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
