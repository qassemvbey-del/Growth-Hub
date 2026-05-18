'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

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
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolumeState] = useState(0.5)
  const [isMuted, setIsMutedState] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Load from local storage
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

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  // Helper to play synthesized sounds
  const playTone = (
    type: OscillatorType,
    freq1: number,
    freq2: number,
    duration: number,
    volMultiplier = 1
  ) => {
    if (isMuted || volume === 0) return
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    
    // Frequency ramp for sci-fi effect
    osc.frequency.setValueAtTime(freq1, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration)

    // Volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume * volMultiplier, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  // 1. Tactical Blip (Nav/Tabs)
  const playBlip = () => playTone('square', 800, 1200, 0.1, 0.15)

  // 2. Success Chime (XP/Completion)
  const playSuccess = () => {
    if (isMuted || volume === 0) return
    playTone('sine', 440, 880, 0.3, 0.3)
    setTimeout(() => playTone('sine', 880, 1760, 0.5, 0.3), 150)
  }

  // 3. System Alert (Error/Full)
  const playError = () => {
    if (isMuted || volume === 0) return
    playTone('sawtooth', 150, 100, 0.4, 0.4)
    setTimeout(() => playTone('sawtooth', 150, 100, 0.4, 0.4), 150)
  }

  // 4. Mission Initialize (Power-up)
  const playDeploy = () => playTone('sawtooth', 200, 1200, 0.8, 0.3)

  // 5. Neural Link (AI Modal)
  const playNeuralLink = () => {
    if (isMuted || volume === 0) return
    const ctx = getAudioContext()
    if (!ctx) return
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.5)
    
    // Pulsing volume
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + 0.5)
    gain.gain.linearRampToValueAtTime(volume * 0.05, ctx.currentTime + 1.0)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start()
    osc.stop(ctx.currentTime + 2.0)
  }

  // 6. Immersive Rank-Up Chime Synthesis (Web Audio API)
  const playRankUpChime = () => {
    if (isMuted || volume === 0) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // A. Sub-Bass Propulsion Drop
    const bassOsc = ctx.createOscillator()
    const bassGain = ctx.createGain()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(120, now)
    bassOsc.frequency.exponentialRampToValueAtTime(45, now + 1.2)
    
    bassGain.gain.setValueAtTime(0, now)
    bassGain.gain.linearRampToValueAtTime(volume * 0.85, now + 0.05)
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
    
    bassOsc.connect(bassGain)
    bassGain.connect(ctx.destination)
    bassOsc.start(now)
    bassOsc.stop(now + 1.2)

    // B. Dual Plasma Reveal Chords (Arpeggiated)
    const playPulse = (freqStart: number, freqEnd: number, delay: number, duration: number) => {
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const synthGain = ctx.createGain()

      osc1.type = 'sawtooth'
      osc2.type = 'triangle'

      osc1.frequency.setValueAtTime(freqStart, now + delay)
      osc1.frequency.exponentialRampToValueAtTime(freqEnd, now + delay + duration)
      
      osc2.frequency.setValueAtTime(freqStart * 1.5, now + delay)
      osc2.frequency.exponentialRampToValueAtTime(freqEnd * 1.5, now + delay + duration)

      synthGain.gain.setValueAtTime(0, now + delay)
      synthGain.gain.linearRampToValueAtTime(volume * 0.35, now + delay + 0.03)
      synthGain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration)

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(800, now)
      filter.frequency.exponentialRampToValueAtTime(1800, now + delay + duration)

      osc1.connect(filter)
      osc2.connect(filter)
      filter.connect(synthGain)
      synthGain.connect(ctx.destination)

      osc1.start(now + delay)
      osc2.start(now + delay)
      osc1.stop(now + delay + duration)
      osc2.stop(now + delay + duration)
    }

    // Trigger rising Neon chords
    playPulse(220, 440, 0.1, 0.8)   // Root
    playPulse(261, 523, 0.2, 0.85)  // Minor Third
    playPulse(330, 660, 0.3, 0.9)   // Fifth
    playPulse(440, 880, 0.4, 1.1)   // Platinum Octave Lock

    // C. Dust White Noise Transition
    const bufferSize = ctx.sampleRate * 0.3
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.setValueAtTime(3000, now + 0.5)
    noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 0.8)

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0, now + 0.5)
    noiseGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.55)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    noise.start(now + 0.5)
    noise.stop(now + 0.8)
  }

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
      playRankUpChime
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
