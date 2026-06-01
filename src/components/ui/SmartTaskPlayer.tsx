import React, { useState, useEffect, useRef, useCallback } from 'react'
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

  // ReactPlayer natively supports standard YouTube URLs and playlists.
  // If we receive a raw 11-character ID from old database entries, reconstruct the standard watch URL.
  // let videoUrl = url
  // if (videoUrl && videoUrl.length === 11 && !videoUrl.includes('/')) {
  //   videoUrl = `https://www.youtube.com/watch?v=${videoUrl}`
  // }

  // let validUrl = url;
  // if (url && !url.includes('http')) {
  //   if (url.startsWith('PL')) {
  //     validUrl = 'https://www.youtube.com/playlist?list=' + url;
  //   } else {
  //     validUrl = 'https://www.youtube.com/watch?v=' + url;
  //   }
  // }

  const handleProgress = useCallback((state: { playedSeconds: number, played: number }) => {
    // Silently update the ref, NO useState
    progressRef.current = state.playedSeconds
  }, [])

  const handlePlay = useCallback(() => {
    isPlayingRef.current = true
  }, [])

  const handlePause = useCallback(() => {
    isPlayingRef.current = false
  }, [])

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
    if (isGuest) {
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, "0")
    } else {
      supabase.from('tasks').update({ video_progress: 0 }).eq('id', taskId).then()
    }
    onComplete()
  }, [isGuest, taskId, supabase, onComplete])

  // Silent save loop (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlayingRef.current) return
      
      const currentTime = progressRef.current
      const duration = durationRef.current

      // Save to localStorage
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
      if (duration > 0) {
        localStorage.setItem(`growth_hub_video_duration_${taskId}`, duration.toString())
      }

      // Save to DB
      if (!isGuest) {
        supabase
          .from('tasks')
          .update({ video_progress: currentTime })
          .eq('id', taskId)
          .then()
      }

      // Update parent UI safely (only once every 5 seconds instead of 60fps)
      if (onProgressUpdate) {
        onProgressUpdate(currentTime, duration)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [taskId, isGuest, supabase, onProgressUpdate])

  // Ensure instant save on unmount
  useEffect(() => {
    return () => {
      const currentTime = progressRef.current
      const duration = durationRef.current
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
      if (!isGuest) {
        supabase.from('tasks').update({ video_progress: currentTime }).eq('id', taskId).then()
      }
    }
  }, [taskId, isGuest, supabase])

  if (!isMounted) {
    return <div className="w-full aspect-video bg-zinc-900 animate-pulse rounded-md"></div>
  }

  return (
    <div className="w-full aspect-video relative">
      <ReactPlayer
        ref={playerRef}
        url={url}
        controls={true}
        width="100%"
        height="100%"
        className="absolute top-0 left-0"
        onReady={handleReady}
        onPlay={handlePlay}
        onPause={handlePause}
        onProgress={handleProgress}
        onEnded={handleEnded}
        progressInterval={1000} // ReactPlayer fires onProgress every 1s, but we only update refs
        config={{
          youtube: {
            playerVars: { modestbranding: 1, rel: 0 }
          }
        }}
      />
    </div>
  )
}



