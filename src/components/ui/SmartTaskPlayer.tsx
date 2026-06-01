import React, { useState, useEffect, useRef, useMemo } from 'react'
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
  const [windowOrigin, setWindowOrigin] = useState('')
  const progressRef = useRef(0)
  const durationRef = useRef(0)
  const hasSeeked = useRef(false)

  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      setWindowOrigin(window.location.origin)
    }
  }, [])

  // 1. Recover saved time using structured JSON object or legacy number strings
  const savedTime = useMemo(() => {
    const stored = localStorage.getItem(`yt_progress_${taskId}`)
    if (stored) {
      try {
        const parsedObj = JSON.parse(stored)
        if (parsedObj && typeof parsedObj.time === 'number') {
          return Math.floor(parsedObj.time)
        }
      } catch (e) {
        // Fallback to legacy parsing if not JSON formatted
        const parsedNum = parseFloat(stored)
        if (!isNaN(parsedNum) && parsedNum > 0) return Math.floor(parsedNum)
      }
    }
    const legacyStored = localStorage.getItem(`growth_hub_video_progress_${taskId}`)
    const parsedLegacy = parseFloat(legacyStored || '0')
    return Math.floor(parsedLegacy > 0 ? parsedLegacy : (initialProgress || 0))
  }, [taskId, initialProgress])

  // 2. Extract videoId or playlistId from multiple YouTube formats
  const parsedMedia = useMemo(() => {
    const videoUrl = url ? url.trim() : ''
    if (!videoUrl) return { type: 'video', id: '' }

    try {
      // Handle playlist URLs
      if (videoUrl.includes('list=')) {
        const playlistMatch = videoUrl.match(/[?&]list=([^#\&\?]+)/)
        if (playlistMatch && playlistMatch[1]) {
          return { type: 'playlist', id: playlistMatch[1] }
        }
      }

      // Handle standard youtube.com URLs
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const urlObj = new URL(videoUrl.includes('://') ? videoUrl : `https://${videoUrl}`)
        const vParam = urlObj.searchParams.get('v')
        if (vParam) {
          return { type: 'video', id: vParam }
        }

        // Handle youtu.be short URLs
        if (urlObj.hostname === 'youtu.be') {
          const pathId = urlObj.pathname.slice(1)
          if (pathId) return { type: 'video', id: pathId }
        }

        // Handle embed or v paths
        const pathMatch = urlObj.pathname.match(/\/(embed|v)\/([a-zA-Z0-9_-]{11})/)
        if (pathMatch && pathMatch[2]) {
          return { type: 'video', id: pathMatch[2] }
        }
      }
    } catch (e) {
      // Ignore URL parsing exceptions
    }

    // Handle raw 11-character video IDs directly
    if (videoUrl.length === 11) {
      return { type: 'video', id: videoUrl }
    }

    return { type: 'video', id: videoUrl }
  }, [url])

  // 3. Construct YouTube IFrame URL with buffering optimizations & playsinline
  const iframeUrl = useMemo(() => {
    if (!parsedMedia.id) return ''
    const base = parsedMedia.type === 'playlist'
      ? `https://www.youtube.com/embed/videoseries?list=${parsedMedia.id}`
      : `https://www.youtube.com/embed/${parsedMedia.id}`
    const originParam = windowOrigin ? `&origin=${encodeURIComponent(windowOrigin)}` : ''
    return `${base}?enablejsapi=1&start=${savedTime}&rel=0&playsinline=1&modestbranding=1${originParam}`
  }, [parsedMedia, savedTime, windowOrigin])

  // 4. Send {event: 'listening'} postMessage when iframe mounts and loads
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

  // 5. PostMessage API Event Listener with YouTube Origin Security Check
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com' && e.origin !== 'https://www.youtube-nocookie.com') {
        return
      }

      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (!data) return

        // Capture periodic timeline updates from YouTube Player API
        if (data.event === 'infoDelivery' && data.info) {
          const currentTime = data.info.currentTime
          const duration = data.info.duration

          if (currentTime !== undefined) {
            const time = Math.floor(currentTime)
            const dur = Math.floor(duration || durationRef.current || 0)
            
            progressRef.current = time
            
            // Instantly save to localStorage key as JSON object: yt_progress_${taskId}
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

        // Capture playback state transitions (0 = ended, 1 = playing, 2 = paused)
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
              supabase.from('tasks').update({ video_progress: 0 }).eq('id', taskId).then()
            }
            onComplete()
          } else if (state === 2) {
            // Paused: sync to db instantly
            const time = Math.floor(progressRef.current)
            if (!isGuest) {
              supabase.from('tasks').update({ video_progress: time }).eq('id', taskId).then()
            }
          }
        }
      } catch (err) {
        // Safe catch for postMessage parse error
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [taskId, isGuest, supabase, onComplete, onProgressUpdate, showToast])

  // 6. DB Sync Interval (saves progress to DB every 5s while page is open)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isGuest) return
      const currentTime = Math.floor(progressRef.current)
      if (currentTime > 0) {
        supabase.from('tasks').update({ video_progress: currentTime }).eq('id', taskId).then()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [taskId, isGuest, supabase])

  // Ensure final save on unmount
  useEffect(() => {
    return () => {
      const time = Math.floor(progressRef.current)
      const duration = durationRef.current
      localStorage.setItem(
        `yt_progress_${taskId}`,
        JSON.stringify({ time, duration })
      )
      if (!isGuest && time > 0) {
        supabase.from('tasks').update({ video_progress: time }).eq('id', taskId).then()
      }
    }
  }, [taskId, isGuest, supabase])

  if (!isMounted || !iframeUrl) {
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
