'use client'

import { ListPlus } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cleanPlaylistTitles } from '@/app/actions/ai-magic'

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
  missionId: string
  themeColor: string
  onTasksAdded: (tasks: any[]) => void
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || 'AIzaSyAcS6t0jQivhoXePWTajpocP0upKX313hk'

export default function PlaylistImportModal({ isOpen, onClose, missionId, themeColor, onTasksAdded }: Props) {
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewTasks, setPreviewTasks] = useState<PreviewTask[]>([])
  const [confirming, setConfirming] = useState(false)

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

  const calculateWeight = (seconds: number) => {
    if (seconds < 600) return 1 // Under 10 min
    if (seconds <= 1800) return 2 // 10-30 min
    return 3 // Over 30 min
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
      setError('INVALID_SIGNAL // NOT A PLAYLIST')
      return
    }

    setLoading(true)
    try {
      // 1. Fetch playlist items
      const itemsRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`)
      const itemsData = await itemsRes.json()

      if (itemsData.error) {
        if (itemsData.error.errors?.[0]?.reason === 'playlistNotFound' || itemsData.error.code === 404) {
          setError('ACCESS_DENIED // PRIVATE_FEED')
        } else {
          setError(`API_ERROR // ${itemsData.error.message?.toUpperCase() || 'UNKNOWN_REASON'}`)
        }
        setLoading(false)
        return
      }

      const items = itemsData.items || []
      if (items.length === 0) {
        setError('EMPTY_FEED // NO_VIDEOS_FOUND')
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
      setError(`NETWORK_ERROR // ${err.message?.toUpperCase() || 'RETRY_SEQUENCE'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async () => {
    setConfirming(true)
    const { data: { user } } = await supabase.auth.getUser()
    const isLocal = typeof missionId === 'string' && missionId.startsWith('local_')

    if (!user && !isLocal) {
      setError('AUTH_REQUIRED // SESSION_TERMINATED')
      setConfirming(false)
      return
    }

    const now = Date.now()
    const payload = previewTasks.map((t, index) => ({
      cup_id: missionId,
      title: t.title,
      original_title: t.originalTitle,
      weight: t.weight,
      is_completed: false,
      type: 'standard',
      video_id: t.videoId,
      video_progress: 0,
      created_at: new Date(now + index * 10).toISOString()
    }))

    if (isLocal) {
      const generatedTasks = payload.map(p => ({
        ...p,
        id: 'task_' + Math.random().toString(36).substring(2, 9)
      }))

      // Save to localStorage under guest_goals
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.map((g: any) => {
        if (g.id === missionId) {
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
      setError(`DATABASE_ERROR // ${insertError.message.toUpperCase()}`)
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

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-white/60 dark:bg-black/90 backdrop-blur-md" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[calc(100%-2rem)] mx-auto md:max-w-2xl bg-white/95 dark:bg-[#080808]/90 backdrop-blur-xl border rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh] my-auto"
        style={{ borderColor: `${themeColor}33` }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center border-zinc-200 dark:border-white/10" style={{ borderColor: `${themeColor}22` }}>
          <div className="flex items-center gap-3">
            <ListPlus className="text-neon-green" style={{ color: themeColor }} />
            <h2 className="font-space font-black uppercase tracking-widest text-sm" style={{ color: themeColor }}>PLAYLIST_IMPORT</h2>
          </div>
          <button onClick={onClose} className="material-symbols-outlined text-zinc-400 dark:text-white/30 hover:text-zinc-900 dark:hover:text-white">close</button>
        </div>

        {/* URL Input Area */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-space font-black text-zinc-600 dark:text-white/40 uppercase tracking-widest">YOUTUBE_PLAYLIST_URL</label>
            <div className="flex gap-2">
              <input 
                value={playlistUrl}
                onChange={e => setPlaylistUrl(e.target.value)}
                placeholder="HTTPS://WWW.YOUTUBE.COM/PLAYLIST?LIST=..."
                className="flex-1 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 py-2.5 px-4 rounded-xl font-space text-xs text-zinc-900 dark:text-white outline-none focus:border-neon-green/50"
                style={{ borderColor: error ? '#FF0055' : undefined }}
              />
              <button 
                onClick={handleFetch}
                disabled={loading || !playlistUrl.trim()}
                className="py-2.5 px-4 font-space font-black text-[10px] uppercase tracking-widest transition-all bg-neon-green text-black disabled:opacity-30 rounded-xl shadow-lg hover:brightness-110 shrink-0"
                style={{ backgroundColor: themeColor }}
              >
                {loading ? 'PROCESSING...' : 'SCAN'}
              </button>
            </div>
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
                <div className="flex justify-between items-end border-b border-zinc-200 dark:border-white/5 pb-2">
                  <p className="text-[10px] font-space font-black text-zinc-600 dark:text-white/40 uppercase tracking-widest">
                    FOUND: {previewTasks.length} VIDEOS // TOTAL: {formatSeconds(totalDuration)}
                  </p>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {previewTasks.map((t, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5 px-4 border border-zinc-200 dark:border-white/5 bg-black/5 dark:bg-white/5 rounded-xl">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-space text-[11px] font-bold text-zinc-900 dark:text-white uppercase truncate">{t.title}</p>
                        <p className="font-space text-[9px] text-zinc-500 dark:text-white/40 uppercase tracking-tighter">DURATION: {formatSeconds(t.seconds)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {[1,2,3,4,5].map(w => (
                          <div key={w} className={`w-1.5 h-4 rounded-[1px] ${w <= t.weight ? 'bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.5)]' : 'bg-black/10 dark:bg-white/5'}`} style={w <= t.weight ? { backgroundColor: themeColor } : {}} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 pt-4 border-t border-zinc-200 dark:border-white/5">
                  <button 
                    onClick={onClose}
                    className="py-2.5 px-4 font-space font-black text-[10px] uppercase tracking-widest text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-all"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleDeploy}
                    disabled={confirming}
                    className="py-2.5 px-6 font-space font-black text-[10px] uppercase tracking-widest bg-neon-green text-black shadow-lg rounded-xl transition-all hover:brightness-110"
                    style={{ backgroundColor: themeColor, boxShadow: `0 0 20px ${themeColor}44` }}
                  >
                    {confirming ? 'CREATING...' : 'CREATE'}
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
