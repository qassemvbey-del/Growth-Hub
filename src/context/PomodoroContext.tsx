'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'
import { createClient } from '@/lib/supabase'

type SessionType = 'FOCUS' | 'BREAK'

interface PomodoroContextType {
  timeRemaining: number
  isActive: boolean
  isPaused: boolean
  sessionType: SessionType
  taskName: string
  isMinimized: boolean
  isInitialized: boolean
  focusDuration: number
  breakDuration: number
  startFocus: (taskName: string, taskId?: string, cupId?: string) => void
  startTimer: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  toggleMinimize: () => void
  updateConfig: (focus: number, breakTime: number) => void
  taskId?: string
  cupId?: string
  showSwitchWarning: boolean
  setShowSwitchWarning: (show: boolean) => void
  pendingSwitchTask: { name: string; taskId?: string; cupId?: string } | null
  confirmSwitch: () => void
  cancelSwitch: () => void
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined)

const FOCUS_TIME = 25 * 60
const BREAK_TIME = 5 * 60

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [focusDuration, setFocusDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [timeRemaining, setTimeRemaining] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>('FOCUS')
  const [taskName, setTaskName] = useState('')
  const [taskId, setTaskId] = useState<string | undefined>(undefined)
  const [cupId, setCupId] = useState<string | undefined>(undefined)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showSwitchWarning, setShowSwitchWarning] = useState(false)
  const [pendingSwitchTask, setPendingSwitchTask] = useState<{ name: string; taskId?: string; cupId?: string } | null>(null)

  const { showToast } = useToast()
  const { playSuccess, playBlip } = useSound()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const triggerWarningNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const origin = window.location.origin
      const title = "⚡ SYSTEM ALERT: 1 Min Remaining!"
      const options: any = {
        body: `Focus session for task: "${taskName || 'Active Task'}" has 1 minute remaining.`,
        icon: `${origin}/icons/icon-512.png`,
        badge: `${origin}/icons/icon-192.png`,
        vibrate: [200, 100, 200]
      }
      try {
        new Notification(title, options)
      } catch (err) {
        console.error('Failed to trigger warning notification:', err)
      }
    }
  }

  const triggerCompletionNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const origin = window.location.origin
      const isFocus = sessionType === 'FOCUS'
      const title = isFocus ? "🏆 GOAL ACCOMPLISHED" : "☕ BREAK OVER // RESUME FOCUS"
      const options: any = {
        body: isFocus 
          ? `Completed focus session for task: "${taskName || 'Active Task'}".`
          : "Your break has ended. Ready to deploy back to work?",
        icon: `${origin}/icons/icon-512.png`,
        badge: `${origin}/icons/icon-192.png`,
        vibrate: [200, 100, 200],
        requireInteraction: true
      }
      try {
        new Notification(title, options)
      } catch (err) {
        console.error('Failed to trigger completion notification:', err)
      }
    }
  }

  // Load from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('pomodoro_config')
    if (savedConfig) {
      const { focus, break: breakTime } = JSON.parse(savedConfig)
      setFocusDuration(focus)
      setBreakDuration(breakTime)
      if (!isActive) setTimeRemaining(focus * 60)
    }

    const saved = localStorage.getItem('pomodoro_session')
    if (saved) {
      const data = JSON.parse(saved)
      const now = Date.now()
      const elapsed = Math.floor((now - data.startTime) / 1000)
      
      if (!data.isPaused && data.isActive) {
        const remaining = data.initialTime - elapsed
        if (remaining > 0) {
          setTimeRemaining(remaining)
          setIsActive(true)
          setIsInitialized(true)
          setSessionType(data.sessionType)
          setTaskName(data.taskName)
          setTaskId(data.taskId)
          setCupId(data.cupId)
        }
      } else {
        setTimeRemaining(data.timeRemaining)
        setIsActive(data.isActive)
        setIsPaused(data.isPaused)
        setIsInitialized(data.isInitialized || data.isActive)
        setSessionType(data.sessionType)
        setTaskName(data.taskName)
        setTaskId(data.taskId)
        setCupId(data.cupId)
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (isInitialized) {
      const data = {
        timeRemaining,
        isActive,
        isPaused,
        isInitialized,
        sessionType,
        taskName,
        taskId,
        cupId,
        startTime: Date.now(),
        initialTime: timeRemaining
      }
      localStorage.setItem('pomodoro_session', JSON.stringify(data))
    } else {
      localStorage.removeItem('pomodoro_session')
    }
  }, [timeRemaining, isActive, isPaused, isInitialized, sessionType, taskName, taskId, cupId])

  useEffect(() => {
    if (isActive && !isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
    } else if (timeRemaining === 0) {
      handleSessionComplete()
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, isPaused, timeRemaining])

  // Trigger warning notification 1 minute before FOCUS timer finishes
  useEffect(() => {
    if (timeRemaining === 60 && isActive && !isPaused && sessionType === 'FOCUS') {
      triggerWarningNotification()
    }
  }, [timeRemaining, isActive, isPaused, sessionType])

  const saveTimeLog = async (durationSecs: number, endedAt: string) => {
    if (!taskId || !cupId || durationSecs <= 0) return

    const activeSessionStr = localStorage.getItem('active_session')
    if (!activeSessionStr) return
    const activeSession = JSON.parse(activeSessionStr)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const durationMin = Math.max(1, Math.round(durationSecs / 60))

    try {
      await supabase.from('time_logs').insert({
        user_id: user.id,
        task_id: taskId,
        cup_id: cupId,
        started_at: activeSession.started_at || new Date().toISOString(),
        ended_at: endedAt,
        duration_minutes: durationMin,
        session_type: 'pomodoro'
      })
      localStorage.removeItem('active_session')

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('time-log-saved', { detail: { taskId, cupId } }))
      }
    } catch (e) {
      console.error('FAILED TO SAVE TIME LOG:', e)
    }
  }

  const handleSessionComplete = () => {
    triggerCompletionNotification()
    playSuccess()
    if (sessionType === 'FOCUS') {
      showToast('FOCUS_SESSION_COMPLETE // TAKE A BREAK', 'success')
      saveTimeLog(focusDuration * 60, new Date().toISOString())
      setSessionType('BREAK')
      setTimeRemaining(breakDuration * 60)
    } else {
      showToast('BREAK_COMPLETE // RESUME?', 'info')
      setSessionType('FOCUS')
      setTimeRemaining(focusDuration * 60)
      setIsActive(false) // Wait for user to resume
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActive && sessionType === 'FOCUS') {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isActive, sessionType])

  const executeStartFocus = (name: string, tId?: string, cId?: string) => {
    setTaskName(name)
    setTaskId(tId)
    setCupId(cId)
    setSessionType('FOCUS')
    setTimeRemaining(focusDuration * 60)
    setIsInitialized(true)
    setIsActive(false)
    setIsPaused(false)
    setIsMinimized(false)
    playBlip()
  }

  const startFocus = (name: string, tId?: string, cId?: string) => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    if (isActive && sessionType === 'FOCUS' && taskId && taskId !== tId) {
      setPendingSwitchTask({ name, taskId: tId, cupId: cId })
      setShowSwitchWarning(true)
      playBlip()
      return
    }
    executeStartFocus(name, tId, cId)
  }

  const confirmSwitch = () => {
    if (pendingSwitchTask) {
      if (sessionType === 'FOCUS' && isActive) {
        const elapsed = (focusDuration * 60) - timeRemaining
        if (elapsed > 0) {
          saveTimeLog(elapsed, new Date().toISOString())
        }
      }
      executeStartFocus(pendingSwitchTask.name, pendingSwitchTask.taskId, pendingSwitchTask.cupId)
      setShowSwitchWarning(false)
      setPendingSwitchTask(null)
    }
  }

  const cancelSwitch = () => {
    setShowSwitchWarning(false)
    setPendingSwitchTask(null)
    playBlip()
  }

  const startTimer = () => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    setIsActive(true)
    setIsPaused(false)
    playBlip()

    if (taskId && cupId) {
      localStorage.setItem('active_session', JSON.stringify({
        task_id: taskId,
        cup_id: cupId,
        started_at: new Date().toISOString()
      }))
    }
  }

  const pause = () => {
    setIsPaused(true)
    playBlip()
  }

  const resume = () => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    setIsPaused(false)
    playBlip()
  }

  const stop = () => {
    if (sessionType === 'FOCUS' && isActive) {
      const elapsed = (focusDuration * 60) - timeRemaining
      if (elapsed > 0) {
        saveTimeLog(elapsed, new Date().toISOString())
      }
    }

    setIsActive(false)
    setIsPaused(false)
    setIsInitialized(false)
    setTimeRemaining(focusDuration * 60)
    setTaskName('')
    setTaskId(undefined)
    setCupId(undefined)
    playBlip()
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
    playBlip()
  }

  const updateConfig = (focus: number, breakTime: number) => {
    setFocusDuration(focus)
    setBreakDuration(breakTime)
    localStorage.setItem('pomodoro_config', JSON.stringify({ focus, break: breakTime }))
    if (!isActive) {
      setTimeRemaining(focus * 60)
    }
    playBlip()
  }

  return (
    <PomodoroContext.Provider value={{
      timeRemaining, isActive, isPaused, sessionType, taskName, isMinimized, isInitialized,
      focusDuration, breakDuration,
      startFocus, startTimer, pause, resume, stop, toggleMinimize, updateConfig,
      taskId, cupId,
      showSwitchWarning, setShowSwitchWarning, pendingSwitchTask, confirmSwitch, cancelSwitch
    }}>
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoro() {
  const context = useContext(PomodoroContext)
  if (!context) throw new Error('usePomodoro must be used within PomodoroProvider')
  return context
}
