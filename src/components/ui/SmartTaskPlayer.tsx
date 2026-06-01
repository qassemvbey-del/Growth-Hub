import React, { useState, useEffect, useRef, useCallback } from 'react'
// Comment out legacy react-youtube imports
// import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube'
import dynamic from 'next/dynamic'
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useGrowth } from '@/context/GrowthContext'

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
  const [isPlaying, setIsPlaying] = useState(false)
  const { showToast } = useToast()
  const { isRTL } = useGrowth()
  const supabase = createClient()

  // --- V25.1 HOTFIX: Mutable refs to avoid stale closures ---
  const playerRef = useRef<any>(null)
  const isPlayingRef = useRef(false)

  // --- V25.1 HOTFIX: Guard flag to fix seek race condition ---
  const hasSeeked = useRef(false)

  // Keep refs in sync with state
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  const saveProgress = useCallback(async (currentTime: number) => {
    let duration = 0
    if (playerRef.current) {
      try {
        duration = playerRef.current.getDuration() || 0
      } catch (e) {}
    }
    if (isGuest) {
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
      if (duration > 0) {
        localStorage.setItem(`growth_hub_video_duration_${taskId}`, duration.toString())
      }
    } else {
      await supabase
        .from('tasks')
        .update({ video_progress: currentTime })
        .eq('id', taskId)
      if (duration > 0) {
        localStorage.setItem(`growth_hub_video_duration_${taskId}`, duration.toString())
      }
    }
    if (onProgressUpdate) {
      onProgressUpdate(currentTime, duration)
    }
  }, [isGuest, taskId, supabase, onProgressUpdate])

  // --- V25.1 HOTFIX: Instant save helper using refs (safe for beforeunload) ---
  const saveCurrentTime = useCallback(() => {
    const p = playerRef.current
    if (p && isPlayingRef.current) {
      try {
        const currentTime = p.getCurrentTime() || 0
        const duration = p.getDuration() || 0
        localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
        if (duration > 0) {
          localStorage.setItem(`growth_hub_video_duration_${taskId}`, duration.toString())
        }
        if (!isGuest) {
          supabase
            .from('tasks')
            .update({ video_progress: currentTime })
            .eq('id', taskId)
        }
        if (onProgressUpdate) {
          onProgressUpdate(currentTime, duration)
        }
      } catch (_e) {
        // Player may already be destroyed — silently ignore
      }
    }
  }, [taskId, isGuest, supabase, onProgressUpdate])

  // --- UPGRADED REACTPLAYER EVENT HANDLERS ---
  const handleReady = () => {
    if (!hasSeeked.current && initialProgress > 0 && playerRef.current) {
      try {
        playerRef.current.seekTo(initialProgress, 'seconds')
        hasSeeked.current = true
        showToast(
          isRTL ? 'تم استئناف التشغيل من حيث توقفت' : 'Playback resumed from where you left off', 
          'success'
        )
      } catch (e) {
        console.error('Failed to seek player:', e)
      }
    }
  }

  const handleProgress = (state: { playedSeconds: number }) => {
    // Save progress regularly
    saveProgress(state.playedSeconds)
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
    if (playerRef.current) {
      try {
        saveProgress(playerRef.current.getCurrentTime())
      } catch (e) {}
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    saveProgress(0) // Reset progress on completion
    onComplete()
  }

  // --- V25.1 HOTFIX: beforeunload listener — saves the instant the tab is killed ---
  useEffect(() => {
    window.addEventListener('beforeunload', saveCurrentTime)
    return () => {
      window.removeEventListener('beforeunload', saveCurrentTime)
      // Also save on component unmount (navigation within the SPA)
      saveCurrentTime()
    }
  }, [saveCurrentTime])

  // If url is missing or empty, do NOT render a dead black box.
  if (!url || url.trim() === "") return null

  // Feed the raw URL stream exactly as pasted by the user. Do NOT manipulate the URL string.
  const videoUrl = url

  // Comment out old parsing and normalization logic to adhere to safety requirements
  /*
  // Build the video URL: If it is already a full URL, use it directly; otherwise wrap it as a YouTube URL.
  // const videoUrl = videoId.includes('://') ? videoId : `https://www.youtube.com/watch?v=${videoId}`

  // --- UPGRADED ROBUST YOUTUBE PLAYLIST & URL NORMALIZATION ---
  let resolvedId = videoId.trim()
  if ((resolvedId.includes('youtube.com') || resolvedId.includes('youtu.be')) && !resolvedId.includes('://')) {
    resolvedId = `https://${resolvedId}`
  }

  let videoUrl = resolvedId.includes('://') ? resolvedId : `https://www.youtube.com/watch?v=${resolvedId}`

  if (videoUrl.includes('list=')) {
    try {
      const playlistMatch = videoUrl.match(/[?&]list=([^#\&\?]+)/)
      const playlistId = playlistMatch ? playlistMatch[1] : null
      if (playlistId) {
        const videoMatch = videoUrl.match(/[?&]v=([^#\&\?]+)/)
        const vId = videoMatch ? videoMatch[1] : null
        if (vId && vId.length === 11) {
          videoUrl = `https://www.youtube.com/watch?v=${vId}&list=${playlistId}`
        } else {
          videoUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}`
        }
      }
    } catch (_err) {}
  }
  */


  return (
    <div className="w-full h-full relative">
      {/* Decorative cyber border glow */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: `inset 0 0 20px ${themeColor}22` }} />
      
      <ReactPlayer
        ref={playerRef}
        url={videoUrl}
        controls={true}
        playing={isPlaying}
        onReady={handleReady}
        onProgress={handleProgress}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        progressInterval={5000}
        width="100%"
        height="100%"
        config={{
          youtube: {
            playerVars: {
              autoplay: 0,
              modestbranding: 1,
              rel: 0,
              fs: 1,
            }
          }
        }}
        className="absolute inset-0"
      />

      {/* Commented out legacy YouTube component to fulfill non-deletion requirements */}
      {/*
      <YouTube 
        videoId={videoId} 
        opts={opts} 
        onReady={onReady}
        onStateChange={onStateChange}
        className="w-full h-full absolute inset-0"
      />
      */}
    </div>
  )
}

