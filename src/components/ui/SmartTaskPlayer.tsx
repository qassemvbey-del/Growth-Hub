import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

// Dynamic import for ReactPlayer to avoid SSR hydration mismatch
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any

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
  
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const playerRef = useRef<any>(null)
  const hasSeeked = useRef(false)
  
  // Track progress SILENTLY using refs (avoids re-render crash loops)
  const progressRef = useRef(0)
  const durationRef = useRef(0)
  const isPlayingRef = useRef(false)

  // --- UPGRADED ROBUST YOUTUBE PLAYLIST & URL NORMALIZATION ---
  const resolvedUrl = useMemo(() => {
    let videoUrl = url ? url.trim() : ''
    if (!videoUrl) return ''
    if (!videoUrl.includes('://')) {
      if (videoUrl.startsWith('PL')) {
        videoUrl = `https://www.youtube.com/playlist?list=${videoUrl}`
      } else if (videoUrl.length === 11) {
        videoUrl = `https://www.youtube.com/watch?v=${videoUrl}`
      } else {
        videoUrl = `https://www.youtube.com/watch?v=${videoUrl}`
      }
    } else if ((videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) && !videoUrl.includes('watch?v=') && !videoUrl.includes('playlist?list=') && !videoUrl.includes('embed/')) {
      try {
        const urlObj = new URL(videoUrl)
        if (urlObj.hostname === 'youtu.be') {
          const pathId = urlObj.pathname.slice(1)
          if (pathId) videoUrl = `https://www.youtube.com/watch?v=${pathId}`
        }
      } catch (e) {}
    }
    return videoUrl
  }, [url])

  const handleProgress = useCallback((state: { playedSeconds: number, played: number }) => {
    const currentTime = state.playedSeconds
    progressRef.current = currentTime

    // Write to localStorage instantly on progress ticks
    localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())

    // Update parent UI safely
    if (onProgressUpdate) {
      onProgressUpdate(currentTime, durationRef.current)
    }
  }, [taskId, onProgressUpdate])

  const handlePlay = useCallback(() => {
    isPlayingRef.current = true
  }, [])

  const handlePause = useCallback(() => {
    isPlayingRef.current = false
    const currentTime = progressRef.current
    localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
    if (!isGuest) {
      supabase.from('tasks').update({ video_progress: currentTime }).eq('id', taskId).then()
    }
  }, [taskId, isGuest, supabase])

  const handleReady = useCallback((player: any) => {
    try {
      durationRef.current = player.getDuration() || 0
      
      // Auto-seek if we have progress saved
      if (!hasSeeked.current && initialProgress > 0) {
        player.seekTo(initialProgress, 'seconds')
        hasSeeked.current = true
        showToast('تم استئناف التشغيل من حيث توقفت', 'success')
      }
      
      if (onProgressUpdate) {
        onProgressUpdate(initialProgress || 0, durationRef.current)
      }
    } catch (err) {
      console.error('Error during player ready', err)
    }
  }, [initialProgress, onProgressUpdate, showToast])

  const handleEnded = useCallback(() => {
    isPlayingRef.current = false
    if (isGuest) {
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, "0")
    } else {
      supabase.from('tasks').update({ video_progress: 0 }).eq('id', taskId).then()
    }
    onComplete()
  }, [isGuest, taskId, supabase, onComplete])

  // Database save loop (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlayingRef.current || isGuest) return
      
      const currentTime = progressRef.current
      supabase
        .from('tasks')
        .update({ video_progress: currentTime })
        .eq('id', taskId)
        .then()
    }, 5000)

    return () => clearInterval(interval)
  }, [taskId, isGuest, supabase])

  // Ensure instant save on unmount
  useEffect(() => {
    return () => {
      const currentTime = progressRef.current
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
      if (!isGuest) {
        supabase.from('tasks').update({ video_progress: currentTime }).eq('id', taskId).then()
      }
    }
  }, [taskId, isGuest, supabase])

  if (!isMounted || !resolvedUrl) {
    return <div className="w-full aspect-video bg-zinc-900 animate-pulse rounded-md"></div>
  }

  return (
    <div className="w-full aspect-video relative">
      <ReactPlayer
        ref={playerRef}
        url={resolvedUrl}
        controls={true}
        width="100%"
        height="100%"
        className="absolute top-0 left-0"
        onReady={handleReady}
        onPlay={handlePlay}
        onPause={handlePause}
        onProgress={handleProgress}
        onEnded={handleEnded}
        progressInterval={1000}
        config={{
          youtube: {
            playerVars: { modestbranding: 1, rel: 0 }
          }
        }}
      />
    </div>
  )
}



