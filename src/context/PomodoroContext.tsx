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
  startFocus: (taskName: string, taskId?: string, goalId?: string) => void
  startTimer: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  toggleMinimize: () => void
  updateConfig: (focus: number, breakTime: number) => void
  taskId?: string
  goalId?: string
  showSwitchWarning: boolean
  setShowSwitchWarning: (show: boolean) => void
  pendingSwitchTask: { name: string; taskId?: string; goalId?: string } | null
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
  const [goalId, setGoalId] = useState<string | undefined>(undefined)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showSwitchWarning, setShowSwitchWarning] = useState(false)
  const [pendingSwitchTask, setPendingSwitchTask] = useState<{ name: string; taskId?: string; goalId?: string } | null>(null)

  const { showToast } = useToast()
  const { playSuccess, playBlip } = useSound()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const sendNotificationViaSW = (title: string, body: string, tag?: string) => {
    if (typeof window === 'undefined') return
    if ('Notification' in window && Notification.permission !== 'granted') return

    const origin = window.location.origin
    const payload = {
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      icon: `${origin}/icons/icon-512.png`,
      badge: `${origin}/icons/icon-192.png`,
      tag: tag || 'pomodoro-timer',
    }

    // Primary: use Service Worker directly from registration (highly reliable on mobile PWAs)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: payload.icon,
          badge: payload.badge,
          vibrate: [200, 100, 200],
          requireInteraction: true,
          tag: payload.tag,
          renotify: true,
        } as unknown as NotificationOptions).catch(err => {
          console.error('registration.showNotification failed:', err)
        })
      })
      return
    }

    // Fallback: try standard Notification API (foreground only)
    try {
      new Notification(title, {
        body,
        icon: payload.icon,
        badge: payload.badge,
        requireInteraction: true,
      } as NotificationOptions)
    } catch (err) {
      console.error('Notification fallback failed:', err)
    }
  }

  const requestNotificationPermission = () => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    const isRTL = typeof document !== 'undefined' && (document.dir === 'rtl' || document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl');
    if (Notification.permission === 'denied') {
      showToast(isRTL ? '⚠️ الإشعارات محظورة. يرجى تفعيلها من إعدادات المتصفح.' : '⚠️ Notifications are blocked. Please enable them in browser settings.', 'warning')
      return
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          showToast(isRTL ? '🔔 تم تفعيل الإشعارات بنجاح!' : '🔔 Notifications enabled successfully!', 'success')
        }
      })
    }
  }

  const triggerWarningNotification = () => {
    sendNotificationViaSW(
      '⚡ 1 minute remaining',
      `Your focus session for "${taskName || 'Active Task'}" is almost done.`,
      'pomodoro-warning'
    )
  }

  const triggerCompletionNotification = () => {
    const isFocus = sessionType === 'FOCUS'
    sendNotificationViaSW(
      isFocus ? '🏆 Focus session complete!' : '☕ Break over — ready to resume?',
      isFocus
        ? `Great work! You completed your focus session for "${taskName || 'Active Task'}".`
        : 'Your break has ended. Time to get back to it.',
      'pomodoro-complete'
    )
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
          setGoalId(data.goalId || data.cupId)
        }
      } else {
        setTimeRemaining(data.timeRemaining)
        setIsActive(data.isActive)
        setIsPaused(data.isPaused)
        setIsInitialized(data.isInitialized || data.isActive)
        setSessionType(data.sessionType)
        setTaskName(data.taskName)
        setTaskId(data.taskId)
        setGoalId(data.goalId || data.cupId)
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
        goalId,
        startTime: Date.now(),
        initialTime: timeRemaining
      }
      localStorage.setItem('pomodoro_session', JSON.stringify(data))
    } else {
      localStorage.removeItem('pomodoro_session')
    }
  }, [timeRemaining, isActive, isPaused, isInitialized, sessionType, taskName, taskId, goalId])

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
    if (!taskId || !goalId || durationSecs <= 0) return

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
        // cup_id: cupId,
        goal_id: goalId,
        started_at: activeSession.started_at || new Date().toISOString(),
        ended_at: endedAt,
        duration_minutes: durationMin,
        session_type: 'pomodoro'
      })
      localStorage.removeItem('active_session')

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('time-log-saved', { detail: { taskId, goalId } }))
      }
    } catch (e) {
      console.error('FAILED TO SAVE TIME LOG:', e)
    }
  }

  const handleSessionComplete = () => {
    triggerCompletionNotification()
    playSuccess()
    if (sessionType === 'FOCUS') {
      // showToast('FOCUS_SESSION_COMPLETE // TAKE A BREAK', 'success')
      showToast('Focus session complete. Take a break!', 'success')
      saveTimeLog(focusDuration * 60, new Date().toISOString())
      setSessionType('BREAK')
      setTimeRemaining(breakDuration * 60)
    } else {
      // showToast('BREAK_COMPLETE // RESUME?', 'info')
      showToast('Break complete. Ready to resume?', 'info')
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
    setGoalId(cId)
    setSessionType('FOCUS')
    setTimeRemaining(focusDuration * 60)
    setIsInitialized(true)
    setIsActive(false)
    setIsPaused(false)
    setIsMinimized(false)
    playBlip()
  }

  const startFocus = (name: string, tId?: string, cId?: string) => {
    requestNotificationPermission()
    if (isActive && sessionType === 'FOCUS' && taskId && taskId !== tId) {
      setPendingSwitchTask({ name, taskId: tId, goalId: cId })
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
      executeStartFocus(pendingSwitchTask.name, pendingSwitchTask.taskId, pendingSwitchTask.goalId)
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
    requestNotificationPermission()
    setIsActive(true)
    setIsPaused(false)
    playBlip()

    if (taskId && goalId) {
      localStorage.setItem('active_session', JSON.stringify({
        task_id: taskId,
        // cup_id: cupId,
        goal_id: goalId,
        started_at: new Date().toISOString()
      }))
    }
  }

  const pause = () => {
    setIsPaused(true)
    playBlip()
  }

  const resume = () => {
    requestNotificationPermission()
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
    setGoalId(undefined)
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
      taskId, goalId,
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
