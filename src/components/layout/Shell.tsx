'use client'

import Sidebar from './Sidebar'
import AnimatedLogo from '@/components/ui/AnimatedLogo'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import { useSound } from '@/context/SoundContext'
import { 
  LayoutGrid, Trophy, Target, FileText, User, Users, Settings, Zap, Bell, Flame, Bot, X, Home,
  Laptop, GraduationCap, Briefcase, Rocket, Video, TrendingUp, CloudLightning,
  Crosshair, Shield, CheckCircle, Menu
} from 'lucide-react'


import { useInbox } from '@/hooks/useInbox'
import InboxDropdown from '@/components/ui/InboxDropdown'
import PomodoroHUD from '@/components/ui/PomodoroHUD'
import CoachPanel from '@/components/ui/CoachPanel'
import OperatorGuide from '@/components/ui/OperatorGuide'
import GlobalActionMenu from '@/components/ui/GlobalActionMenu'
// import AuthModal from '@/components/auth/AuthModal'
// import EntryGateModal from '@/components/auth/EntryGateModal'
import LevelUpModal from '@/components/ui/LevelUpModal'
import GlitchOverlay from '@/components/ui/GlitchOverlay'
import CommandPalette from '@/components/ui/CommandPalette'
import Tutorial from '@/components/ui/Tutorial'
import AmbientAurora from '@/components/ui/AmbientAurora'
import GlobalCreateGoalModal from '@/components/ui/GlobalCreateGoalModal'


function WorkspaceLoader({ isRTL }: { isRTL: boolean }) {
  const icons = [Target, Zap, Shield, Trophy, CheckCircle]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % icons.length)
    }, 400)
    return () => clearInterval(interval)
  }, [icons.length])

  const ActiveIcon = icons[index]

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050505] z-[9999] overflow-hidden select-none font-space p-6">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 pointer-events-none cyber-grid opacity-[0.03] z-0" />
      <div className="absolute inset-0 pointer-events-none scanlines opacity-[0.01] z-0" />
      
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Dynamic cycling icon */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Subtle Ambient Glow behind the icon using the orange color */}
          <div 
            className="absolute w-20 h-20 rounded-full opacity-40 blur-xl transition-all duration-300 animate-pulse"
            style={{
              background: 'radial-gradient(circle, #FF5F00 33%, transparent 70%)',
            }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <ActiveIcon 
                className="w-16 h-16 transition-all duration-300" 
                style={{ 
                  color: '#FF5F00', 
                  filter: 'drop-shadow(0 0 15px rgba(255, 95, 0, 0.65))' 
                }} 
              />
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Simple elegant text */}
        <p className="text-zinc-400 text-sm tracking-widest animate-pulse font-medium">
          {/* {isRTL ? 'جاري تحميل مساحة العمل...' : 'Loading workspace...'} */}
          {isRTL ? 'مساحة العمل بتتحمل...' : 'Loading workspace...'}
        </p>
      </div>
    </div>
  )
}

interface ShellProps {
  children: React.ReactNode
  syncedMissions?: any[]
  onMissionsRefresh?: () => void
}

export default function Shell({ children, syncedMissions = [], onMissionsRefresh }: ShellProps) {
  // 1. ALL HOOKS AT THE TOP
  const { isRTL, profile, calculateAccountability, lastAiMessage, t, currentTheme, isRankUpModalOpen, setIsRankUpModalOpen, isLoading, showAuthModal, setShowAuthModal, openCreateGoalModal } = useGrowth()
  const pathname = usePathname()
  const router = useRouter()
  const { playNeuralLink, playBlip } = useSound()
  const [aiOpen, setAiOpen] = useState(false)
  const [coachPanelOpen, setCoachPanelOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [bootProgress, setBootProgress] = useState(0)
  const [activeLogIndex, setActiveLogIndex] = useState(0)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileNavOpen])

  useEffect(() => {
    if (showAuthModal) {
      setShowAuthModal(false)
      router.push('/auth/login')
    }
  }, [showAuthModal, router, setShowAuthModal])

  // System Bootloader Simulation Effect
  useEffect(() => {
    if (!isLoading) return
    const timer = setInterval(() => {
      setBootProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        const next = prev + Math.floor(Math.random() * 8) + 4
        const clamped = Math.min(next, 100)
        
        // Progress steps for logs
        if (clamped < 25) setActiveLogIndex(0)
        else if (clamped < 50) setActiveLogIndex(1)
        else if (clamped < 75) setActiveLogIndex(2)
        else if (clamped < 95) setActiveLogIndex(3)
        else setActiveLogIndex(4)

        return clamped
      })
    }, 150)

    return () => clearInterval(timer)
  }, [isLoading])

  const desktopInboxRef = useRef<HTMLDivElement>(null)
  const mobileInboxRef = useRef<HTMLDivElement>(null)
  const mainWrapperRef = useRef<HTMLDivElement>(null)

  // ── NATIVE DRAG SIDEBAR SYSTEM (Framer Motion useMotionValue) ──
  const SIDEBAR_WIDTH = 280
  // sidebarX: 0 = fully open, -SIDEBAR_WIDTH (LTR) or +SIDEBAR_WIDTH (RTL) = fully closed
  const sidebarX = useMotionValue(0)
  // Whether the drawer is visually showing (for pointer-events on backdrop)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)

  // Keep isDrawerVisible in sync with sidebarX
  useEffect(() => {
    const unsubscribe = sidebarX.on('change', (latest) => {
      // Drawer is visible if not fully closed
      const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
      setIsDrawerVisible(Math.abs(latest - closedPos) > 2)
    })
    return unsubscribe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL])

  // Snap sidebar to open/closed when isMobileNavOpen changes (hamburger, nav click, backdrop)
  useEffect(() => {
    const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
    // Use spring-like animation via Framer's animate
    if (isMobileNavOpen) {
      // Animate to 0 (open)
      const startVal = sidebarX.get()
      const duration = 250
      const startTime = performance.now()
      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        sidebarX.set(startVal + (0 - startVal) * eased)
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    } else {
      const startVal = sidebarX.get()
      const duration = 200
      const startTime = performance.now()
      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        sidebarX.set(startVal + (closedPos - startVal) * eased)
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileNavOpen, isRTL])

  // Initialize sidebarX to closed position on mount
  useEffect(() => {
    const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
    sidebarX.set(closedPos)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update backdropOpacity transform range based on RTL
  const computedBackdropOpacity = useTransform(sidebarX, (v) => {
    const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
    // 0 when at closedPos, 1 when at 0
    return 1 - Math.abs(v) / Math.abs(closedPos)
  })

  const handleSidebarDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.x
    const currentX = sidebarX.get()
    const threshold = SIDEBAR_WIDTH * 0.3

    let shouldOpen: boolean
    if (isRTL) {
      // RTL: 0=open, SIDEBAR_WIDTH=closed
      // Fast flick detection
      if (velocity < -300) shouldOpen = true
      else if (velocity > 300) shouldOpen = false
      else shouldOpen = currentX < threshold
    } else {
      // LTR: 0=open, -SIDEBAR_WIDTH=closed
      if (velocity > 300) shouldOpen = true
      else if (velocity < -300) shouldOpen = false
      else shouldOpen = currentX > -threshold
    }

    if (shouldOpen !== isMobileNavOpen) playBlip()
    setIsMobileNavOpen(shouldOpen)
  }

  // Real-time Network Radar States
  const [networkStatus, setNetworkStatus] = useState<'ONLINE' | 'OFFLINE' | 'LAG'>('ONLINE')
  const [showSyncSuccess, setShowSyncSuccess] = useState(false)
  const [prevStatus, setPrevStatus] = useState<'ONLINE' | 'OFFLINE' | 'LAG'>('ONLINE')

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!navigator.onLine) {
      setNetworkStatus('OFFLINE')
    }

    const handleOnline = () => {
      setNetworkStatus('ONLINE')
    }

    const handleOffline = () => {
      setNetworkStatus('OFFLINE')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const checkLatency = async () => {
      if (!navigator.onLine) {
        setNetworkStatus('OFFLINE')
        return
      }

      const conn = (navigator as any).connection
      if (conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g')) {
        setNetworkStatus('LAG')
        return
      }

      const start = performance.now()
      try {
        await fetch('/favicon.ico?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
        const latency = performance.now() - start
        if (latency > 800) {
          setNetworkStatus('LAG')
        } else {
          setNetworkStatus('ONLINE')
        }
      } catch (err) {
        // network issue or timeout
      }
    }

    const interval = setInterval(checkLatency, 15000)
    checkLatency()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (networkStatus === 'ONLINE' && (prevStatus === 'OFFLINE' || prevStatus === 'LAG')) {
      setShowSyncSuccess(true)
      const timer = setTimeout(() => setShowSyncSuccess(false), 4000)
      setPrevStatus('ONLINE')
      return () => clearTimeout(timer)
    }
    if (networkStatus !== prevStatus) {
      setPrevStatus(networkStatus)
    }
  }, [networkStatus, prevStatus])

  const renderNetworkPill = (isMobile: boolean) => {
    /*
    if (networkStatus === 'OFFLINE') {
      return (
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1 bg-black/85 border border-red-500/30 rounded-md backdrop-blur-md shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.15)]", 
          isMobile ? "max-w-[160px] md:max-w-none truncate" : ""
        )}>
          <span className="text-[9px] md:text-xs font-space font-black tracking-wider text-red-500 uppercase animate-pulse">
            [ ⚠️ CONNECTION ERROR // OFFLINE MODE ]
          </span>
        </div>
      )
    }
    if (networkStatus === 'LAG') {
      return (
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1 bg-black/85 border border-amber-500/30 rounded-md backdrop-blur-md shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]", 
          isMobile ? "max-w-[170px] md:max-w-none truncate" : ""
        )}>
          <span className="text-[9px] md:text-xs font-space font-black tracking-wider text-amber-500 uppercase">
            [ ⏳ NETWORK LAG // OPTIMISTIC SYNC ACTIVE ]
          </span>
        </div>
      )
    }
    if (showSyncSuccess) {
      return (
        <div 
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 bg-black/85 border rounded-md backdrop-blur-md transition-opacity duration-500 shrink-0", 
            isMobile ? "max-w-[155px] md:max-w-none truncate" : ""
          )}
          style={{ 
            borderColor: `${currentTheme.color}30`,
            boxShadow: `0 0 15px ${currentTheme.color}15`
          }}
        >
          <span className="text-[9px] md:text-xs font-space font-black tracking-wider uppercase animate-[pulse_2s_infinite]" style={{ color: currentTheme.color }}>
            [ ⚡ WORKSPACE SYNCED ]
          </span>
        </div>
      )
    }
    */
    return null
  }

  const [mounted, setMounted] = useState(false)

  const [shellIsRTL, setShellIsRTL] = useState(false)

  useEffect(() => {
    setMounted(true)
    const lang = localStorage.getItem('language') || 'en'
    const rtl = lang === 'ar'
    setShellIsRTL(rtl)

    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr'
      document.documentElement.lang = rtl ? 'ar' : 'en'
    }
  }, [])

  useEffect(() => {
    setShellIsRTL(isRTL)
  }, [isRTL])



  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = shellIsRTL ? 'rtl' : 'ltr'
    }
  }, [shellIsRTL])

  const getRoleIcon = (url?: string | null) => {
    if (!url) return 'account_circle'
    if (url.includes('omar')) return 'laptop_mac'
    if (url.includes('maya')) return 'school'
    if (url.includes('ismail')) return 'work'
    if (url.includes('zain')) return 'rocket_launch'
    if (url.includes('menna')) return 'videocam'
    if (url.includes('nour')) return 'trending_up'
    return 'cloud_sync'
  }
  
  const getRoleIconComponent = (url?: string | null) => {
    if (!url) return User
    if (url.includes('omar')) return Laptop
    if (url.includes('maya')) return GraduationCap
    if (url.includes('ismail')) return Briefcase
    if (url.includes('zain')) return Rocket
    if (url.includes('menna')) return Video
    if (url.includes('nour')) return TrendingUp
    return CloudLightning
  }

  const { reports, markAsRead, fetchReports } = useInbox()
  const unreadCount = useMemo(() => reports.filter(r => !r.is_read).length, [reports])

  useEffect(() => {
    async function calculateStreak() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('task_completion_log')
        .select('completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (!data || data.length === 0) return

      const days = [...new Set(data.map((r: any) =>
        new Date(r.completed_at).toISOString().split('T')[0]
      ))].sort((a: any, b: any) => b.localeCompare(a))

      let count = 0
      const today = new Date().toISOString().split('T')[0]
      let cursor = new Date(today)

      for (const day of days) {
        const cursorStr = cursor.toISOString().split('T')[0]
        if (day === cursorStr) {
          count++
          cursor.setDate(cursor.getDate() - 1)
        } else {
          break
        }
      }
      setStreak(count)
    }
    calculateStreak()
  }, [])

  useEffect(() => {
    if (!aiOpen) return
    const timer = setTimeout(() => setAiOpen(false), 8000)
    return () => clearTimeout(timer)
  }, [aiOpen])

  // Ctrl+K / Cmd+K Global Quick-Add Interception
  useEffect(() => {
    const handleCtrlK = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault()
        e.stopPropagation()
        setCommandPaletteOpen(prev => {
          const next = !prev
          if (next) {
            window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'ctrl-k' }))
          }
          return next
        })
      }
    }
    window.addEventListener('keydown', handleCtrlK, { capture: true })
    return () => window.removeEventListener('keydown', handleCtrlK, { capture: true })
  }, [])

  // Global Escape & Enter keys listener to manage popups, modals, and actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Arrow scroll shortcuts
      if (e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault()
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        return
      }

      if (e.key !== 'Escape' && e.key !== 'Enter') return

      const activeEl = document.activeElement

      // Input/Textarea/Contenteditable Protection:
      // Let standard browser behaviors and local keydown listeners handle text area typing and editing.
      if (
        activeEl && (
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true' ||
          (activeEl as HTMLElement).isContentEditable
        )
      ) {
        if (e.key === 'Escape') {
          (activeEl as HTMLElement).blur()
          e.stopPropagation()
          e.preventDefault()
        }
        return
      }

      // --- ESCAPE KEY ACTIONS ---
      if (e.key === 'Escape') {
        // Blur inputs if focused
        if (activeEl && activeEl.tagName === 'INPUT') {
          (activeEl as HTMLElement).blur()
          e.stopPropagation()
          e.preventDefault()
          return
        }

        // CONDITION 1 (Active Modals):
        // Check if any popup modal is open in the DOM.
        const isModalOpenInDOM = typeof document !== 'undefined' && (
          !!document.querySelector('.fixed.inset-0.backdrop-blur-md') ||
          !!document.querySelector('.fixed.inset-0.backdrop-blur-sm') ||
          !!document.querySelector('.fixed.inset-0.bg-black\\/80') ||
          !!document.querySelector('.fixed.inset-0.bg-white\\/90') ||
          !!document.querySelector('.fixed.inset-0.bg-white\\/60')
        )
        
        const isModalOpen = isRankUpModalOpen || !!selectedReport || isModalOpenInDOM

        if (isModalOpen) {
          // Close global modals managed by Shell/Context:
          if (isRankUpModalOpen) {
            setIsRankUpModalOpen(false)
          }
          if (selectedReport) {
            setSelectedReport(null)
          }
          // Dispatch custom window event to notify child pages to close their local modals
          window.dispatchEvent(new CustomEvent('close-all-modals'))
          e.stopPropagation()
          e.preventDefault()
          return
        }

        // CONDITION 2 (Active Dropdowns/Inbox/Panels):
        if (inboxOpen || coachPanelOpen || aiOpen || commandPaletteOpen) {
          setInboxOpen(false)
          setCoachPanelOpen(false)
          setAiOpen(false)
          setCommandPaletteOpen(false)
          e.stopPropagation()
          e.preventDefault()
          return
        }

        // CONDITION 3 (Page Navigation):
        // DO NOT navigate back when Escape is pressed. Just stop propagation.
        e.stopPropagation()
        e.preventDefault()
      }

      // --- ENTER KEY ACTIONS ---
      if (e.key === 'Enter') {
        // Find if there is an active modal open in the DOM
        const modalEl = typeof document !== 'undefined' ? document.querySelector(
          '.fixed.inset-0.backdrop-blur-md, .fixed.inset-0.backdrop-blur-sm, .fixed.inset-0.bg-black\\/80, .fixed.inset-0.bg-white\\/90, .fixed.inset-0.bg-white\\/60'
        ) : null

        if (modalEl) {
          // Find buttons in the active modal
          const buttons = Array.from(modalEl.querySelectorAll('button, [role="button"], input[type="submit"]')) as HTMLElement[]
          
          // Filter out disabled or invisible buttons
          const activeButtons = buttons.filter(btn => {
            if ((btn as any).disabled) return false
            if (btn.offsetParent === null) return false
            return true
          })

          // Find confirm/submit/primary button by positive keywords
          const positiveKeywords = [
            'create', 'deploy', 'add', 'submit', 'confirm', 'save', 'scan', 'find', 'enter', 'yes', 'ok', 
            'تأكيد', 'إنشاء', 'حفظ', 'نعم', 'موافق', 'دخول', 'تفعيل', 'استخراج', 'إضافة'
          ]
          
          let targetButton = activeButtons.find(btn => {
            const text = btn.innerText?.toLowerCase() || ''
            return positiveKeywords.some(keyword => text.includes(keyword))
          })

          // Fallback: If no keyword matched, grab the last button that isn't a cancel/close action
          if (!targetButton && activeButtons.length > 0) {
            const nonCancelButtons = activeButtons.filter(btn => {
              const text = btn.innerText?.toLowerCase() || ''
              return !(
                text.includes('cancel') || 
                text.includes('close') || 
                text.includes('back') || 
                text.includes('إلغاء') || 
                text.includes('رجوع') || 
                text.includes('إغلاق') || 
                btn.innerText?.trim() === '×' ||
                btn.innerText?.trim() === 'close'
              )
            })
            if (nonCancelButtons.length > 0) {
              targetButton = nonCancelButtons[nonCancelButtons.length - 1]
            }
          }

          if (targetButton) {
            targetButton.click()
            e.stopPropagation()
            e.preventDefault()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRankUpModalOpen, selectedReport, inboxOpen, coachPanelOpen, aiOpen, commandPaletteOpen, router, setIsRankUpModalOpen])

  // Click outside to dismiss notifications
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (inboxOpen) {
        const clickedInsideDesktop = desktopInboxRef.current?.contains(target)
        const clickedInsideMobile = mobileInboxRef.current?.contains(target)
        if (!clickedInsideDesktop && !clickedInsideMobile) {
          setInboxOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inboxOpen])

  const hasRedZoneMission = useMemo(() => {
    return (syncedMissions || []).some((m: any) => calculateAccountability(m).isInRedZone)
  }, [syncedMissions, calculateAccountability])

  useEffect(() => {
    const hasShown = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('redZoneShown') : null;
    if (hasRedZoneMission && !hasShown && !aiOpen) {
      setAiOpen(true)
      playNeuralLink()
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('redZoneShown', 'true')
    }
  }, [hasRedZoneMission, aiOpen])

  const systemProgress = useMemo(() => {
    if (!syncedMissions || syncedMissions.length === 0) return 0
    let totalPct = 0
    syncedMissions.forEach((m: any) => {
      totalPct += calculateAccountability(m).progress
    })
    return Math.round(totalPct / syncedMissions.length)
  }, [syncedMissions, calculateAccountability])

  // AI message bubble auto-open removed per user request

  const personality = useMemo(() => {
    const rank = profile?.rank || 'SILVER'
    if (rank === 'CONQUEROR') return 'SAVAGE'
    if (rank === 'ACE' || rank === 'CROWN') return 'DIRECT'
    return 'SUPPORTIVE'
  }, [profile?.rank])

  if (isLoading || !mounted) {
    return <WorkspaceLoader isRTL={shellIsRTL} />
  }

  return (
    <>
    <div
      ref={mainWrapperRef}
      className={cn(
        'min-h-[100dvh] bg-zinc-50 dark:bg-transparent text-foreground flex relative transition-colors duration-500',
        networkStatus === 'OFFLINE' && 'connection-offline'
      )}
      style={{ 
        ['--selection-bg' as any]: `${currentTheme.color}33`, 
        ['--selection-text' as any]: currentTheme.color,
      }}
      dir={shellIsRTL ? 'rtl' : 'ltr'}
    >
      {networkStatus === 'OFFLINE' && (
        <style>{`
          .connection-offline button:not(.nav-btn):not(.close-btn):not(.tab-btn):not(.inbox-btn):not(.sidebar-toggle):not(.sound-toggle):not(.pomodoro-btn) {
            filter: blur(1.5px) !important;
            pointer-events: none !important;
            opacity: 0.4 !important;
            cursor: not-allowed !important;
          }
        `}</style>
      )}
      {/* Background FX */}
      <AmbientAurora themeColor={currentTheme?.color || '#14b8a6'} />
      <div className="fixed inset-0 pointer-events-none z-[100] scanlines opacity-[0.02]" />
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-[0.05]" />

      <Sidebar isRTL={isRTL} onOpenCoach={() => { setCoachPanelOpen(true); playNeuralLink(); window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'ai-coach' })); }} />

      <main
        className={cn(
        'flex-1 min-h-[100dvh] transition-all duration-500 relative z-10 w-full max-w-full overflow-x-hidden',
        'pb-24 lg:pb-8',
        'lg:ps-72 lg:max-w-none'
      )}>
        {/* ── DESKTOP TOP BAR (TRANSIENT TELEMETRY ONLY) ── */}
        {/* bg-[var(--sidebar-bg)]/95 backdrop-blur-2xl border-b border-[var(--card-border)] */}
        {/* <header className="hidden lg:flex w-full px-8 h-16 justify-end items-center border-b border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/40 backdrop-blur-3xl z-[150] sticky top-0 transition-colors duration-500 relative header-target"> */}
        {/* bg-white/60 dark:bg-black/40 backdrop-blur-3xl border-b-0 */}
        {/* bg-transparent dark:bg-black/10 backdrop-blur-[40px] border-none */}
        <header className="hidden lg:flex w-full px-8 h-16 justify-end items-center bg-transparent dark:bg-gradient-to-b dark:from-black/10 dark:to-transparent backdrop-blur-[40px] border-b border-black/5 dark:border-white/[0.03] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] z-[150] sticky top-0 transition-colors duration-500 relative header-target">
          <div className="absolute -bottom-[1px] inset-inline-start-12 w-48 h-[1px] shadow-[0_0_15px_currentcolor]" style={{ backgroundColor: currentTheme.color, color: currentTheme.color }} />

          {/* CENTER: Core Brand Text */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center" dir="ltr">
            <AnimatedLogo className="text-xl md:text-2xl tracking-[0.25em]" />
          </div>

          <div className="flex items-center gap-6">
            {/* Real-time Network Radar */}
            {renderNetworkPill(false)}

            {/* ⚡ XP: {xp_value} */}
            <div className="flex items-center gap-2 border-e border-[var(--card-border)] pe-6 shrink-0" title={isRTL ? 'نقاط الخبرة' : 'XP Readout'}>
              <motion.span
                className="shrink-0"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Zap className="w-5 h-5" style={{ color: currentTheme.color, filter: `drop-shadow(0 0 6px ${currentTheme.color})` }} />
              </motion.span>
              <span className="text-sm md:text-base font-space font-black tracking-widest uppercase text-zinc-900 dark:text-zinc-100">
                XP: <span style={{ color: currentTheme.color }}>{profile?.xp || 0}</span>
              </span>
            </div>

            {/* 🔥 {streak_days}d */}
            <div className="flex items-center gap-2 border-e border-[var(--card-border)] pe-6 shrink-0" title={isRTL ? 'سلسلة الأيام' : 'Streak'}>
              <Flame
                className={cn('w-5 h-5 transition-all duration-500', streak > 0 ? 'scale-110 animate-pulse' : 'opacity-20')}
                style={{
                  color: streak > 0 ? (personality === 'SAVAGE' ? '#FF0055' : '#FF5F00') : undefined,
                  filter: streak > 0 ? `drop-shadow(0 0 6px ${personality === 'SAVAGE' ? '#FF0055' : '#FF5F00'})` : 'none'
                }}
              />
              <span
                className="text-sm md:text-base font-space tracking-wider font-black uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-1"
                style={{ opacity: streak > 0 ? 1 : 0.4 }}
              >
                <span>{streak}</span>
                <span className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-bold">d</span>
              </span>
            </div>

            {/* 🔔 Inbox Dropdown */}
            <div className="relative shrink-0" ref={desktopInboxRef}>
              <button
                onClick={() => {
                  setInboxOpen(!inboxOpen)
                  setAiOpen(false)
                  playBlip()
                }}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-all border relative cursor-pointer inbox-btn",
                  inboxOpen 
                    ? "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-primary)] shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    : "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)] hover:text-[var(--text-primary)]"
                )}
                title={isRTL ? 'الإشعارات' : 'Notifications'}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF0055] text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-[0_0_10px_#FF0055]"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              <InboxDropdown 
                isOpen={inboxOpen}
                reports={reports}
                onClose={() => setInboxOpen(false)}
                onRead={(report) => {
                  markAsRead(report.id)
                  setInboxOpen(false)
                }}
                onMarkAllRead={async () => {
                  const unread = reports.filter(r => !r.is_read)
                  for (const r of unread) { await markAsRead(r.id) }
                  fetchReports()
                }}
                themeColor={currentTheme.color}
              />
            </div>
          </div>
        </header>

        {/* ── MOBILE TOP BAR ── */}
        <header className="flex lg:hidden w-full h-14 px-4 items-center justify-between bg-transparent dark:bg-gradient-to-b dark:from-black/10 dark:to-transparent backdrop-blur-[40px] border-b border-black/5 dark:border-white/[0.03] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] z-[150] sticky top-0 transition-colors duration-500 relative">
          {/* LEFT: Hamburger Menu Icon */}
          <div className="flex items-center">
            <button
              onClick={() => { setIsMobileNavOpen(true); playBlip(); }}
              className="w-11 h-11 flex items-center justify-center bg-[var(--input-bg)] border border-[var(--card-border)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all cursor-pointer active:scale-95 shrink-0"
              title={isRTL ? 'القائمة' : 'Menu'}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* CENTER: Core Brand Text */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center" dir="ltr">
            <AnimatedLogo className="text-lg md:text-xl tracking-[0.2em]" />
          </div>

          {/* RIGHT: Exactly one action icon: 🔔 (Notifications) */}
          <div className="flex items-center gap-3">
            {/* Real-time Network Radar */}
            {renderNetworkPill(true)}

            {/* 🔔 Notifications */}
            <div className="relative" ref={mobileInboxRef}>
              <button
                onClick={() => {
                  setInboxOpen(!inboxOpen)
                  setAiOpen(false)
                  playBlip()
                }}
                className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-full transition-all border relative cursor-pointer inbox-btn",
                  inboxOpen 
                    ? "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-primary)] shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    : "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)] hover:text-[var(--text-primary)]"
                )}
                title={isRTL ? 'الإشعارات' : 'Notifications'}
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF0055] text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-[0_0_10px_#FF0055]"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ── AI COACH FLOATING MESSAGE DROPDOWN ── */}
        {/* <AnimatePresence>
          {aiOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn(
                "absolute top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-[320px] md:max-w-[400px] glass-panel p-5 md:p-6 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-4 z-[200]",
                profile?.ai_personality === 'SAVAGE'
                  ? "border-[#FF0055]/40 bg-white/95 dark:bg-[#050505]/95"
                  : "border-cyan-400/40 bg-white/95 dark:bg-[#050505]/95"
              )}
            >
              <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-3">
                <span className={cn(
                  "text-[10px] md:text-[11px] font-space tracking-[0.3em] font-black uppercase",
                  profile?.ai_personality === 'SAVAGE' ? "text-[#FF0055]" : "text-cyan-600 dark:text-cyan-400"
                )}>
                // {profile?.ai_name || (isRTL ? 'الـ Coach' : 'COACH')} // {profile?.ai_personality === 'SAVAGE' ? (isRTL ? 'النمط الشرس' : 'SAVAGE_MODE') : (isRTL ? 'متصل' : 'ONLINE')}
                {profile?.ai_name || (isRTL ? 'الـ Coach' : 'Coach')} - {profile?.ai_personality === 'SAVAGE' ? (isRTL ? 'النمط الشرس' : 'Savage Mode') : (isRTL ? 'متصل' : 'Online')}
                </span>
                <button onClick={() => setAiOpen(false)} className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-all close-btn">
                  <X className="w-4.5 h-4.5 md:w-5 md:h-5" />
                </button>
              </div>
              <p className="text-[13px] md:text-[15px] font-space font-bold text-black/90 dark:text-white/90 leading-relaxed" dir="auto">
                "{lastAiMessage}"
              </p>
              // <p className="text-[9px] font-space text-black/30 dark:text-white/30 tracking-widest uppercase">AUTO_CLOSE // 8S</p>
              <p className="text-[9px] font-space text-black/30 dark:text-white/30 tracking-widest uppercase">Auto close in 8s</p>
            </motion.div>
          )}
        </AnimatePresence> */}

        <div className="relative pb-0">
          {children}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION (COMMENTED OUT PER PRIORITY 1: BOTTOM BAR FAB) ── */}
      {/* <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 backdrop-blur-2xl border-t"
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderColor: 'var(--card-border)',
          height: '64px',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {[
          { label: isRTL ? 'الرئيسية' : 'Home', icon: Home, href: '/' },
          { label: isRTL ? 'شخصي' : 'Goals', icon: Crosshair, href: '/goals/solo' },
          { label: isRTL ? 'فريق' : 'Squad', icon: Shield, href: '/goals/squad' },
          { label: isRTL ? 'الملاحظات' : 'Notes', icon: FileText, href: '/notes' },
          { label: isRTL ? 'الإنجازات' : 'Wins', icon: Trophy, href: '/achievements' },
        ].map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <motion.button
              key={item.href}
              onClick={() => { playBlip(); router.push(item.href) }}
              whileTap={{ scale: 0.88 }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200 relative cursor-pointer min-w-0",
                isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className="absolute top-0 inset-x-3 h-[2px] rounded-full"
                  style={{ backgroundColor: currentTheme.color, boxShadow: `0 0 8px ${currentTheme.color}` }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {(() => {
                const IconComponent = item.icon
                return (
                  <IconComponent
                    className="w-5 h-5 transition-all duration-200"
                    style={{ color: isActive ? currentTheme.color : undefined }}
                  />
                )
              })()}
              <span className={cn(
                "text-[9px] font-space font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label}
              </span>
            </motion.button>
          )
        })}
      </nav> */}

      {/* FAB moved outside this wrapper to avoid containing-block issues */}

      {/* ── MOBILE SIDEBAR DRAWER (Always rendered, native drag) ── */}
      {/* Backdrop: always in DOM, pointer-events controlled by isDrawerVisible */}
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] lg:hidden"
        style={{ opacity: computedBackdropOpacity, pointerEvents: isDrawerVisible ? 'auto' : 'none' }}
        onClick={() => setIsMobileNavOpen(false)}
      />

      {/* Drawer: always in DOM, translated off-screen when closed */}
      <motion.div
        drag="x"
        dragConstraints={isRTL
          ? { left: 0, right: SIDEBAR_WIDTH }
          : { left: -SIDEBAR_WIDTH, right: 0 }
        }
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleSidebarDragEnd}
        style={{ 
          x: sidebarX, 
          borderColor: `${currentTheme.color}50`, 
          boxShadow: isRTL ? `-10px 0 40px ${currentTheme.color}40` : `10px 0 40px ${currentTheme.color}40` 
        }}
        className={cn(
          "fixed top-0 bottom-0 w-[280px] z-[201] lg:hidden flex flex-col bg-zinc-950/95 backdrop-blur-2xl shadow-2xl p-6 transform-gpu will-change-transform touch-pan-y",
          isRTL ? "right-0 border-l border-r-0" : "left-0 border-r"
        )}
      >
        {/* Header of Drawer */}
        <div className="flex justify-between items-center mb-8">
          <AnimatedLogo className="text-lg tracking-[0.2em]" />
          <button 
            onClick={() => { setIsMobileNavOpen(false); playBlip(); }}
            className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white/50 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Panel */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-white/5 mb-6">
          <div 
            onClick={() => { router.push('/settings'); setIsMobileNavOpen(false); }}
            className="relative p-1 rounded-full bg-gradient-to-tr shadow-lg cursor-pointer"
            style={{ backgroundImage: `linear-gradient(to top right, ${currentTheme.color}, ${currentTheme.color}88, transparent, ${currentTheme.color})`, boxShadow: `0 0 20px ${currentTheme.color}33` }}
          >
            <div className="w-16 h-16 rounded-full bg-[#050505] p-0.5 overflow-hidden flex items-center justify-center">
              {mounted && profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="User" className="w-[90%] h-[90%] mx-auto object-contain rounded-full" />
              ) : (
                <User className="w-8 h-8 text-[var(--text-secondary)]" />
              )}
            </div>
          </div>
          <span className="text-sm font-space font-black mt-3 text-zinc-100 truncate max-w-[200px]">
            {profile?.full_name || 'USER'}
          </span>
          <span className="text-[10px] font-space font-black uppercase tracking-[0.2em] opacity-80 mt-1" style={{ color: currentTheme.color }}>
            XP: {profile?.xp || 0}
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {[
            { label: isRTL ? 'الرئيسية' : 'Home', icon: Home, href: '/' },
            { label: isRTL ? 'الـ Goals' : 'Goals', icon: Target, href: '/goals' },
            { label: isRTL ? 'شخصي' : 'Solo Goals', icon: User, href: '/goals/solo', indent: true },
            { label: isRTL ? 'Squad' : 'Squad Goals', icon: Users, href: '/goals/squad', indent: true },
            { label: isRTL ? 'ملاحظاتي' : 'Notes', icon: FileText, href: '/notes' },
            { label: isRTL ? 'إنجازاتي' : 'Wins', icon: Trophy, href: '/achievements' },
          ].map(item => {
            const isActive = pathname === item.href
            const IconComponent = item.icon
            return (
              <button
                key={item.href}
                onClick={() => { playBlip(); router.push(item.href); setIsMobileNavOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-4 py-3 rounded-lg font-space text-sm font-bold uppercase tracking-wider transition-all relative cursor-pointer",
                  item.indent ? (isRTL ? "pr-8 text-xs h-10" : "pl-8 text-xs h-10") : "",
                  isActive 
                    ? "text-[var(--text-primary)]" 
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                )}
                style={isActive ? { 
                  color: currentTheme.color, 
                  backgroundColor: `${currentTheme.color}15`,
                  borderLeft: isRTL ? 'none' : `3px solid ${currentTheme.color}`,
                  borderRight: isRTL ? `3px solid ${currentTheme.color}` : 'none',
                  paddingLeft: isRTL ? undefined : (item.indent ? '28px' : '12px'),
                  paddingRight: isRTL ? (item.indent ? '28px' : '12px') : undefined,
                  boxShadow: `0 0 15px ${currentTheme.color}15`
                } : {}}
              >
                <IconComponent className={item.indent ? "w-4 h-4" : "w-5 h-5"} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Footer Settings Toggle */}
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={() => { router.push('/settings'); setIsMobileNavOpen(false); playBlip(); }}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-lg font-space text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all cursor-pointer",
              pathname === '/settings' ? "text-[var(--text-primary)] border border-white/10 bg-white/5" : ""
            )}
          >
            <Settings className="w-5 h-5 animate-[spin_8s_linear_infinite]" />
            <span>{isRTL ? 'الإعدادات' : 'Settings'}</span>
          </button>
        </div>
      </motion.div>


      <PomodoroHUD />

      <CoachPanel 
        isOpen={coachPanelOpen}
        onClose={() => setCoachPanelOpen(false)}
        missions={syncedMissions}
      />

      <div className={cn(
        "fixed top-0 bottom-0 w-[1px] bg-black/5 dark:bg-white/5 z-20 hidden md:block",
        "inset-inline-start-72"
      )} />

      {/* Central Command Hub commented out to comply with safety rules */}
      {/* <div className="fixed bottom-8 ltr:left-8 rtl:right-8 flex items-center gap-4 z-[40]">
        <OperatorGuide />
        <GlobalActionMenu />
      </div> */}

      <LevelUpModal />
      <GlitchOverlay active={isRankUpModalOpen} />

      {/* Overlays */}

      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
        onOpenCoach={() => { setCoachPanelOpen(true); window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'ai-coach' })); }}
        missions={syncedMissions}
      />
      {/* <AuthModal /> */}
      {/* <EntryGateModal /> */}
      <Tutorial />
      <GlobalCreateGoalModal />

      {/* Mobile fullscreen overlay for notification list to prevent containing block issue */}
      <div className="lg:hidden">
        <InboxDropdown 
          isOpen={inboxOpen}
          reports={reports}
          onClose={() => setInboxOpen(false)}
          onRead={(report) => {
            markAsRead(report.id)
            setInboxOpen(false)
          }}
          onMarkAllRead={async () => {
            const unread = reports.filter(r => !r.is_read)
            for (const r of unread) { await markAsRead(r.id) }
            fetchReports()
          }}
          themeColor={currentTheme.color}
        />
      </div>
    </div>

    {/* ── MOBILE FLOATING ACTION BUTTON (FAB) CONTAINER ── */}
    {/* Rendered outside the main wrapper to avoid transform/filter containing-block breaking position:fixed */}
    <div 
      className={cn(
        "lg:hidden fixed bottom-6 z-[100] flex items-center gap-3",
        shellIsRTL ? "left-6" : "right-6"
      )}
      dir={shellIsRTL ? 'rtl' : 'ltr'}
    >
      {/* Expanding Search Button */}
      <div 
        className={cn(
          "flex items-center h-14 bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800 rounded-full transition-all duration-300 shadow-lg px-3.5",
          searchExpanded ? "w-64" : "w-14 justify-center"
        )}
        style={{ 
          borderColor: searchExpanded ? `${currentTheme.color}50` : undefined,
          boxShadow: searchExpanded ? `0 0 20px ${currentTheme.color}25` : undefined
        }}
      >
        <button
          onClick={() => {
            playBlip()
            setSearchExpanded(!searchExpanded)
            if (!searchExpanded) {
              setTimeout(() => searchInputRef.current?.focus(), 150)
            }
          }}
          className="flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 w-7 h-7"
        >
          {searchExpanded ? <X className="w-5 h-5" /> : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
        
        {searchExpanded && (
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              window.dispatchEvent(new CustomEvent('global-search', { detail: e.target.value }))
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setCommandPaletteOpen(true)
                window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'ctrl-k' }))
              }
            }}
            placeholder={shellIsRTL ? "ابحث هنا..." : "Search..."}
            className="flex-1 bg-transparent border-none text-white outline-none ps-2 text-sm font-space font-bold w-full"
          />
        )}
      </div>

      {/* Primary Plus FAB Button */}
      <motion.button
        onClick={() => {
          playNeuralLink()
          openCreateGoalModal({ goalType: 'solo' })
        }}
        whileTap={{ scale: 0.92 }}
        className="w-14 h-14 rounded-full flex items-center justify-center text-black font-bold tracking-widest text-3xl shadow-lg cursor-pointer"
        style={{ 
          backgroundColor: currentTheme.color,
          boxShadow: `0 0 20px ${currentTheme.color}50`
        }}
      >
        +
      </motion.button>
    </div>
    </>
  )
}
