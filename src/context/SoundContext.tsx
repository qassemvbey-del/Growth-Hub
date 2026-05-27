'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface SoundContextType {
  volume: number
  isMuted: boolean
  setVolume: (v: number) => void
  setIsMuted: (m: boolean) => void
  playBlip: () => void
  playSuccess: () => void
  playError: () => void
  playDeploy: () => void
  playNeuralLink: () => void
  playRankUpChime: () => void
  playClick: () => void
  playGoalComplete: () => void
  playRankUp: () => void
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolumeState] = useState(0.5)
  const [isMuted, setIsMutedState] = useState(false)

  useEffect(() => {
    const savedVol = localStorage.getItem('tactical_volume')
    const savedMuted = localStorage.getItem('tactical_muted')
    if (savedVol !== null) setVolumeState(parseFloat(savedVol))
    if (savedMuted !== null) setIsMutedState(savedMuted === 'true')
  }, [])

  const setVolume = (v: number) => {
    setVolumeState(v)
    localStorage.setItem('tactical_volume', v.toString())
  }

  const setIsMuted = (m: boolean) => {
    setIsMutedState(m)
    localStorage.setItem('tactical_muted', m.toString())
  }

  // Safe Audio Player Helper
  const playSoundFile = (filename: string, defaultVol = 0.5) => {
    if (isMuted || volume === 0 || typeof window === 'undefined') return
    try {
      const audio = new Audio(filename)
      audio.volume = volume * defaultVol
      audio.play().catch(err => {
        console.warn(`Audio play failed for ${filename}:`, err.message)
      })
    } catch (err: any) {
      console.error(`Audio context initialization failed for ${filename}:`, err.message)
    }
  }

  // 1. Soft UI Click (Major actions/Submissions/Tasks)
  const playClick = () => playSoundFile('/sounds/click.mp3', 0.6)

  // 2. Goal Completed Successful Chime
  const playGoalComplete = () => playSoundFile('/sounds/success.mp3', 0.8)

  // 3. Premium Rank Up celebration sound
  const playRankUp = () => playSoundFile('/sounds/rankup.mp3', 0.9)

  // Legacy mappings to prevent compilation failures on components calling old sounds
  const playBlip = () => {} // Disabled completely to stop annoying hover noises
  const playDeploy = () => {} // Disabled completely
  const playNeuralLink = () => {} // Disabled completely
  const playError = () => {} // Disabled completely
  const playSuccess = () => playGoalComplete()
  const playRankUpChime = () => playRankUp()

  return (
    <SoundContext.Provider value={{
      volume,
      isMuted,
      setVolume,
      setIsMuted,
      playBlip,
      playSuccess,
      playError,
      playDeploy,
      playNeuralLink,
      playRankUpChime,
      playClick,
      playGoalComplete,
      playRankUp
    }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const context = useContext(SoundContext)
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider')
  }
  return context
}
