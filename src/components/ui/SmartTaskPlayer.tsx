import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

// Dynamic import for ReactPlayer to avoid SSR hydration mismatch
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any

interface SmartTaskPlayerProps {
  taskId: string
  videoId: string
  initialProgress: number
  isGuest: boolean
  themeColor: string
  onComplete: () => void
  onProgressUpdate?: (currentTime: number, duration: number) => void
}

export default function SmartTaskPlayer({ 
  taskId, 
  videoId, 
  initialProgress, 
  isGuest, 
  themeColor,
  onComplete,
  onProgressUpdate
}: SmartTaskPlayerProps) {
  const { showToast } = useToast()
  const supabase = createClient()
  
  const playerRef = useRef<any>(null)
  const hasSeeked = useRef(false)
  const isReady = useRef(false)
  const durationRef = useRef(0)

  // Construct standard youtube URL to feed to ReactPlayer
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

  const handleProgress = useCallback(async (state: { playedSeconds: number, played: number }) => {
    const currentTime = state.playedSeconds
    const duration = durationRef.current

    if (isGuest) {
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
      if (duration > 0) {
        localStorage.setItem(`growth_hub_video_duration_${taskId}`, duration.toString())
      }
    } else {
      // Background async update
      supabase
        .from('tasks')
        .update({ video_progress: currentTime })
        .eq('id', taskId)
        .then()
      
      if (duration > 0) {
        localStorage.setItem(`growth_hub_video_duration_${taskId}`, duration.toString())
      }
    }

    if (onProgressUpdate) {
      onProgressUpdate(currentTime, duration)
    }
  }, [isGuest, taskId, supabase, onProgressUpdate])

  const handleReady = useCallback((player: any) => {
    isReady.current = true
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

  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: `inset 0 0 20px ${themeColor}22` }} />
      
      <div className="relative z-50 bg-black w-full aspect-video rounded-md overflow-hidden">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          controls={true}
          width="100%"
          height="100%"
          onReady={handleReady}
          onProgress={handleProgress}
          onEnded={handleEnded}
          progressInterval={5000}
          config={{
            youtube: {
              playerVars: { modestbranding: 1, rel: 0 }
            }
          }}
        />
      </div>
    </div>
  )
}

