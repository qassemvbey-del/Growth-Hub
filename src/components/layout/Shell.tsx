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
  Crosshair, Shield, CheckCircle, Menu, Search, Plus, StickyNote, Loader2, UserPlus
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

import { useInbox } from '@/hooks/useInbox'
import InboxDropdown from '@/components/ui/InboxDropdown'
import PomodoroHUD from '@/components/ui/PomodoroHUD'
import CoachPanel from '@/components/ui/CoachPanel'
import OperatorGuide from '@/components/ui/OperatorGuide'
import GlobalActionMenu from '@/components/ui/GlobalActionMenu'
import LevelUpModal from '@/components/ui/LevelUpModal'
import GlitchOverlay from '@/components/ui/GlitchOverlay'
import CommandPalette from '@/components/ui/CommandPalette'
import Tutorial from '@/components/ui/Tutorial'
import AmbientAurora from '@/components/ui/AmbientAurora'
import GlobalCreateGoalModal from '@/components/ui/GlobalCreateGoalModal'

interface SearchGoal {
  id: string
  title: string
  metadata?: {
    type?: 'solo' | 'squad' | 'public'
  }
}

interface SearchTask {
  id: string
  title: string
  goal_id: string
  goals: SearchGoal | SearchGoal[] | null
}

interface SearchNote {
  id: string
  title: string | null
  content: string | null
}

const getRankColor = (rank?: string) => {
  const r = rank?.toUpperCase() || 'ROOKIE';
  switch (r) {
    case 'ROOKIE': return '#9ca3af'; // Gray-400
    case 'BRONZE': return '#b45309'; // Amber-700
    case 'SILVER': return '#94a3b8'; // Slate-400
    case 'GOLD': return '#fbbf24'; // Yellow-400
    case 'PLATINUM': return '#38bdf8'; // Sky-400
    case 'DIAMOND': return '#818cf8'; // Indigo-400
    case 'CROWN': return '#a855f7'; // Purple-500
    case 'ACE': return '#f97316'; // Orange-500
    case 'CONQUEROR': return '#fbbf24'; // Gold
    default: return '#14b8a6'; // Default Theme Teal
  }
}

function WorkspaceLoader({ isRTL, rank: propRank }: { isRTL: boolean; rank?: string }) {
  // const [cachedRank, setCachedRank] = useState<string | undefined>(undefined)
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     const cached = localStorage.getItem('cached_profile')
  //     if (cached) {
  //       try {
  //         const prof = JSON.parse(cached)
  //         if (prof?.rank) {
  //           setCachedRank(prof.rank)
  //         }
  //       } catch (e) {}
  //     }
  //   }
  // }, [])
  const [cachedRank] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const directRank = localStorage.getItem('cached_profile_rank')
      if (directRank) return directRank

      const cached = localStorage.getItem('cached_profile')
      if (cached) {
        try {
          const prof = JSON.parse(cached)
          if (prof?.rank) return prof.rank
        } catch (e) {}
      }
    }
    return 'SILVER'
  })

  const rank = propRank || cachedRank || 'SILVER'
  const rankColor = getRankColor(rank)
  const [iconIndex, setIconIndex] = useState(0)

  // Cycle rapidly (every 150ms) through Lucide icons: Target, Zap, Swords, Flame, Hexagon
  const icons = [Target, Zap, Briefcase, Flame, Rocket]

  useEffect(() => {
    const iconTimer = setInterval(() => {
      setIconIndex(prev => (prev + 1) % icons.length)
    }, 150)

    return () => {
      clearInterval(iconTimer)
    }
  }, [icons.length])

  const ActiveIcon = icons[iconIndex]

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050505] z-[9999] overflow-hidden select-none font-space p-6">
      <div className="absolute inset-0 pointer-events-none cyber-grid opacity-[0.03] z-0" />
      <div className="absolute inset-0 pointer-events-none scanlines opacity-[0.01] z-0" />
      
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-20"
        style={{
          background: `radial-gradient(circle, ${rankColor}33 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div 
            className="absolute w-20 h-20 rounded-full opacity-40 blur-xl transition-all duration-300"
            style={{
              background: `radial-gradient(circle, ${rankColor} 33%, transparent 70%)`,
            }}
          />
          <div className="relative">
            <ActiveIcon 
              className="w-16 h-16 transition-all duration-150 fill-none" 
              style={{ 
                color: rankColor, 
                filter: `drop-shadow(0 0 15px ${rankColor}a8)` 
              }} 
            />
          </div>
        </div>
        
        <p className="text-sm tracking-widest font-medium animate-pulse" style={{ color: rankColor }}>
          {isRTL ? 'مساحة العمل بتتحمل...' : 'Loading workspace...'}
        </p>
      </div>
    </div>
  )
}

/*
interface ShellProps {
  children: React.ReactNode
  syncedMissions?: any[]
  onMissionsRefresh?: () => void
}
*/
const bellVariants = {
  shake: {
    rotate: [0, 15, -12, 10, -8, 5, 0],
    transition: { duration: 0.6, delay: 0.2 }
  }
}

const arrowVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: [0, 1, 1, 0],
    transition: { duration: 1.2, ease: "easeInOut" as const }
  }
}

const popupVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.95 },
  visible: { 
    opacity: 1, y: 0, scale: 1,
    transition: { 
      type: "spring" as const, 
      stiffness: 400, 
      damping: 25,
      delay: 0.8
    }
  },
  exit: { 
    opacity: 0, y: -8, scale: 0.95,
    transition: { duration: 0.2 }
  }
}

interface ShellProps {
  children: React.ReactNode
}

// export default function Shell({ children, syncedMissions = [], onMissionsRefresh }: ShellProps) {
export default function Shell({ children }: ShellProps) {
  const { isRTL, profile, calculateAccountability, lastAiMessage, t, currentTheme, isRankUpModalOpen, setIsRankUpModalOpen, isLoading, showAuthModal, setShowAuthModal, openCreateGoalModal, isTaskDrawerOpen } = useGrowth()
  const pathname = usePathname()
  const router = useRouter()
  const { playNeuralLink, playBlip } = useSound()
  const { showToast } = useToast()

  const [aiOpen, setAiOpen] = useState(false)
  const [coachPanelOpen, setCoachPanelOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [bootProgress, setBootProgress] = useState(0)
  const [activeLogIndex, setActiveLogIndex] = useState(0)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false)
  
  const [syncedMissions, setSyncedMissions] = useState<any[]>([])

  useEffect(() => {
    const fetchMissions = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
      if (data) setSyncedMissions(data)
    }
    fetchMissions()
  }, [])
  
  // Real-time Mobile Search Overlay and Live Search States
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    goals: SearchGoal[]
    tasks: SearchTask[]
    notes: SearchNote[]
  }>({ goals: [], tasks: [], notes: [] })

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Live Search with 300ms Debounce
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults({ goals: [], tasks: [], notes: [] })
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const delayDebounceTimer = setTimeout(async () => {
      try {
        const supabase = createClient()
        
        const [goalsRes, tasksRes, notesRes] = await Promise.all([
          supabase
            .from('goals')
            .select('id, title, metadata')
            .eq('is_archived', false)
            .ilike('title', `%${trimmed}%`)
            .limit(5),
          supabase
            .from('tasks')
            .select('id, title, goal_id, goals(id, title, metadata)')
            .ilike('title', `%${trimmed}%`)
            .limit(5),
          supabase
            .from('notes')
            .select('id, title, content')
            .or(`title.ilike.%${trimmed}%,content.ilike.%${trimmed}%`)
            .limit(5)
        ])

        setSearchResults({
          goals: (goalsRes.data || []) as SearchGoal[],
          tasks: (tasksRes.data || []) as unknown as SearchTask[],
          notes: (notesRes.data || []) as SearchNote[]
        })
      } catch (err) {
        console.error('Error executing live search queries:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceTimer)
  }, [searchQuery])

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
  const sidebarX = useMotionValue(0)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)

  // Keep isDrawerVisible in sync with sidebarX
  useEffect(() => {
    const unsubscribe = sidebarX.on('change', (latest) => {
      const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
      setIsDrawerVisible(Math.abs(latest - closedPos) > 2)
    })
    return unsubscribe
  }, [isRTL])

  // Snap sidebar to open/closed when isMobileNavOpen changes
  useEffect(() => {
    const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
    if (isMobileNavOpen) {
      const startVal = sidebarX.get()
      const duration = 250
      const startTime = performance.now()
      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
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
  }, [isMobileNavOpen, isRTL])

  // Initialize sidebarX to closed position on mount
  useEffect(() => {
    const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
    sidebarX.set(closedPos)
  }, [])

  const computedBackdropOpacity = useTransform(sidebarX, (v) => {
    const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
    return 1 - Math.abs(v) / Math.abs(closedPos)
  })

  /*
  useEffect(() => {
    let startX = 0
    let startY = 0
    let isDragging = false

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      const edgeSize = 40
      const screenWidth = window.innerWidth
      if (isRTL) {
        isDragging = startX > screenWidth - edgeSize
      } else {
        // isDragging = startX < edgeSize || isMobileNavOpen
        if (isMobileNavOpen) {
          isDragging = true
        } else {
          isDragging = startX < edgeSize
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const diffX = Math.abs(currentX - startX)
      const diffY = Math.abs(currentY - startY)
      if (diffY > diffX) { isDragging = false; return }
      const delta = currentX - startX
      startX = currentX
      const newX = Math.max(
        isRTL ? 0 : -SIDEBAR_WIDTH,
        Math.min(isRTL ? SIDEBAR_WIDTH : 0, sidebarX.get() + delta)
      )
      sidebarX.set(newX)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return
      isDragging = false
      const velocity = 0
      const currentX = sidebarX.get()
      const threshold = SIDEBAR_WIDTH * 0.3
      let shouldOpen: boolean
      if (isRTL) {
        shouldOpen = currentX < threshold
      } else {
        shouldOpen = currentX > -threshold
      }
      if (shouldOpen !== isMobileNavOpen) playBlip()
      setIsMobileNavOpen(shouldOpen)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isRTL, isMobileNavOpen, sidebarX, playBlip])
  */

  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      // const edgeSize = 80
      const edgeSize = 120
      const screenWidth = window.innerWidth
      if (!isMobileNavOpen) {
        tracking = isRTL 
          ? startX > screenWidth - edgeSize 
          : startX < edgeSize
      } else {
        tracking = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking) return
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const diffX = Math.abs(currentX - startX)
      const diffY = Math.abs(currentY - startY)
      if (diffY > diffX + 10) { tracking = false; return }
      const delta = currentX - startX
      startX = currentX
      const newX = Math.max(
        isRTL ? 0 : -SIDEBAR_WIDTH,
        Math.min(isRTL ? SIDEBAR_WIDTH : 0, sidebarX.get() + delta)
      )
      sidebarX.set(newX)
    }

    const handleTouchEnd = () => {
      if (!tracking) return
      tracking = false
      const currentX = sidebarX.get()
      const threshold = SIDEBAR_WIDTH * 0.4
      let shouldOpen: boolean
      if (isRTL) {
        shouldOpen = currentX < threshold
      } else {
        shouldOpen = currentX > -threshold
      }
      if (shouldOpen !== isMobileNavOpen) playBlip()
      setIsMobileNavOpen(shouldOpen)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isRTL, isMobileNavOpen, sidebarX, playBlip])

  const handleSidebarDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.x
    const currentX = sidebarX.get()
    const threshold = SIDEBAR_WIDTH * 0.3

    let shouldOpen: boolean
    if (isRTL) {
      if (velocity < -300) shouldOpen = true
      else if (velocity > 300) shouldOpen = false
      else shouldOpen = currentX < threshold
    } else {
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

  const { reports, markAsRead, fetchReports } = useInbox()
  const unreadCount = useMemo(() => reports.filter(r => !r.is_read).length, [reports])

  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()
    console.log('Realtime subscription set up for:', profile?.id)
    const channel = supabase
      .channel('inbox_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'inbox_reports',
        filter: `user_id=eq.${profile.id}`
      }, (payload: any) => {
        fetchReports()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, fetchReports])

  // Smart Notification Toast States
  const [activeToast, setActiveToast] = useState<{
    id: string
    type: string
    title: string
    requesterName: string
    goalName: string
    goalId?: string
    requestId?: string
  } | null>(null)
  
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)
  const [arrowVisible, setArrowVisible] = useState(false)
  const [bellShaking, setBellShaking] = useState(false)
  
  const lastActivityRef = useRef<number>(Date.now())
  const lastShownTimeRef = useRef<number>(0)
  const prevReportsRef = useRef<any[]>(reports)
  
  // Track user activity for idle state
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }
    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('click', updateActivity)
    window.addEventListener('scroll', updateActivity)
    return () => {
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('click', updateActivity)
      window.removeEventListener('scroll', updateActivity)
    }
  }, [])

  // Auto-dismiss popup after 6 seconds
  useEffect(() => {
    if (showNotificationPopup) {
      const timer = setTimeout(() => {
        setShowNotificationPopup(false)
        setActiveToast(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [showNotificationPopup])

  // Smart Bell notification trigger checking
  useEffect(() => {
    if (!reports || reports.length === 0) return
    
    const prevReports = prevReportsRef.current
    prevReportsRef.current = reports
    
    if (prevReports.length === 0) return

    const newReports = reports.filter(r => !prevReports.some(pr => pr.id === r.id))
    if (newReports.length === 0) return

    const newUnreadReports = newReports.filter(r => !r.is_read)
    if (newUnreadReports.length === 0) return
    
    const onNotificationsPage = pathname === '/notifications' || inboxOpen
    if (onNotificationsPage) return
    
    const now = Date.now()
    if (now - lastShownTimeRef.current < 180000) return

    const isIdle = now - lastActivityRef.current > 300000

    let shouldTrigger = false
    let targetReport = null

    // Filter system/automated notifications
    const isSystemNotification = (type: string) => {
      return ['daily_brief', 'weekly_review', 'deadline_alert', 'overdue_task'].includes(type)
    }

    const joinReq = newUnreadReports.find(r => r.type === 'squad_join_request' || (r.type as string) === 'join_request')
    if (joinReq) {
      shouldTrigger = true
      targetReport = joinReq
    } else {
      const interestingNotif = newUnreadReports.find(r => !isSystemNotification(r.type))
      if (interestingNotif) {
        if (isIdle || newUnreadReports.length > 0) {
          shouldTrigger = true
          targetReport = interestingNotif
        }
      }
    }

    if (shouldTrigger && targetReport) {
      lastShownTimeRef.current = now
      
      const reqName = targetReport.content?.requester_name || targetReport.content?.sender_name || (isRTL ? "مستخدم" : "Someone")
      const gName = targetReport.content?.goal_title || targetReport.content?.goal_name || (isRTL ? "الهدف" : "the goal")
      
      setActiveToast({
        id: targetReport.id,
        type: targetReport.type,
        title: targetReport.title,
        requesterName: reqName,
        goalName: gName,
        goalId: targetReport.content?.goal_id,
        requestId: targetReport.content?.request_id
      })
      
      // Step 1: Bell shakes (0.6s)
      setBellShaking(true)
      setTimeout(() => setBellShaking(false), 600)
      
      // Step 2: Animated arrow draws pointing UP (1.2s total visible, pathLength draws over 0.7s)
      setArrowVisible(true)
      
      // Step 3: Popup slides in (delay 0.8s)
      setTimeout(() => {
        setShowNotificationPopup(true)
      }, 800)
      
      // Step 4: Arrow fades out after 1.2s
      setTimeout(() => {
        setArrowVisible(false)
      }, 1200)
    }
  }, [reports, pathname, inboxOpen, isRTL])

  const handleAcceptNotification = async () => {
    if (!activeToast || !activeToast.requestId) return
    const supabase = createClient()
    try {
      // Commented out per rule "Never delete code, only comment it out":
      /*
      // Get request details
      const { data: requestData, error: reqError } = await supabase
        .from('squad_join_requests')
        .select('*')
        .eq('id', activeToast.requestId)
        .maybeSingle()

      if (reqError || !requestData) {
        showToast(isRTL ? "الطلب غير صالح أو معالج بالفعل" : "Request invalid or already processed", "warning")
        return
      }

      // Move user to goal_members
      const { error: insertError } = await supabase
        .from('goal_members')
        .insert({
          goal_id: requestData.goal_id,
          user_id: requestData.user_id,
          role: 'member'
        })

      if (insertError) throw insertError

      // Update request status to approved
      const { error: updateError } = await supabase
        .from('squad_join_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', activeToast.requestId)

      if (updateError) throw updateError

      // Notify the user who requested to join
      const { data: goalData } = await supabase
        .from('goals')
        .select('title')
        .eq('id', requestData.goal_id)
        .maybeSingle()

      await supabase
        .from('inbox_reports')
        .insert({
          user_id: requestData.user_id,
          title: isRTL
            ? `تمت الموافقة على طلبك للانضمام لـ ${goalData?.title || 'الهدف'}`
            : `Your request to join ${goalData?.title || 'the goal'} was approved`,
          type: 'join_approved',
          content: {
            goal_id: requestData.goal_id,
            goal_title: goalData?.title
          },
          is_read: false
        })
      */

      const { data, error } = await supabase.rpc('review_squad_join_request', {
        p_request_id: activeToast.requestId,
        p_action: 'approve'
      })

      if (error) throw error

      showToast(isRTL ? "تم قبول الطلب" : "Join request approved", "success")
      
      if (activeToast.id) {
        markAsRead(activeToast.id)
      }
    } catch (err) {
      console.error('Error accepting notification:', err)
      showToast(isRTL ? "حدث خطأ أثناء معالجة الطلب" : "Error processing request", "warning")
    }
    setShowNotificationPopup(false)
    setActiveToast(null)
  }

  const handleRejectNotification = async () => {
    if (!activeToast || !activeToast.requestId) return
    const supabase = createClient()
    try {
      // Commented out per rule "Never delete code, only comment it out":
      /*
      // Get request details
      const { data: requestData, error: reqError } = await supabase
        .from('squad_join_requests')
        .select('*')
        .eq('id', activeToast.requestId)
        .maybeSingle()

      if (reqError || !requestData) {
        showToast(isRTL ? "الطلب غير صالح أو معالج بالفعل" : "Request invalid or already processed", "warning")
        return
      }

      // Update request status to rejected
      const { error: updateError } = await supabase
        .from('squad_join_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', activeToast.requestId)

      if (updateError) throw updateError

      // Notify the user who requested to join
      const { data: goalData } = await supabase
        .from('goals')
        .select('title')
        .eq('id', requestData.goal_id)
        .maybeSingle()

      await supabase
        .from('inbox_reports')
        .insert({
          user_id: requestData.user_id,
          title: isRTL
            ? `تم رفض طلبك للانضمام لـ ${goalData?.title || 'الهدف'}`
            : `Your request to join ${goalData?.title || 'the goal'} was declined`,
          type: 'join_declined',
          content: {
            goal_id: requestData.goal_id,
            goal_title: goalData?.title
          },
          is_read: false
        })
      */

      const { data, error } = await supabase.rpc('review_squad_join_request', {
        p_request_id: activeToast.requestId,
        p_action: 'reject'
      })

      if (error) throw error

      showToast(isRTL ? "تم رفض الطلب" : "Join request declined", "success")
      
      if (activeToast.id) {
        markAsRead(activeToast.id)
      }
    } catch (err) {
      console.error('Error rejecting notification:', err)
      showToast(isRTL ? "حدث خطأ أثناء معالجة الطلب" : "Error processing request", "warning")
    }
    setShowNotificationPopup(false)
    setActiveToast(null)
  }

  const handleDismissNotification = () => {
    if (activeToast && activeToast.id) {
      markAsRead(activeToast.id)
    }
    setShowNotificationPopup(false)
    setActiveToast(null)
  }

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

  // Global Escape & Enter keys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      if (e.key === 'Escape') {
        if (activeEl && activeEl.tagName === 'INPUT') {
          (activeEl as HTMLElement).blur()
          e.stopPropagation()
          e.preventDefault()
          return
        }

        const isModalOpenInDOM = typeof document !== 'undefined' && (
          !!document.querySelector('.fixed.inset-0.backdrop-blur-md') ||
          !!document.querySelector('.fixed.inset-0.backdrop-blur-sm') ||
          !!document.querySelector('.fixed.inset-0.bg-black\\/80') ||
          !!document.querySelector('.fixed.inset-0.bg-white\\/90') ||
          !!document.querySelector('.fixed.inset-0.bg-white\\/60')
        )
        
        const isModalOpen = isRankUpModalOpen || !!selectedReport || isModalOpenInDOM

        if (isModalOpen) {
          if (isRankUpModalOpen) {
            setIsRankUpModalOpen(false)
          }
          if (selectedReport) {
            setSelectedReport(null)
          }
          window.dispatchEvent(new CustomEvent('close-all-modals'))
          e.stopPropagation()
          e.preventDefault()
          return
        }

        if (inboxOpen || coachPanelOpen || aiOpen || commandPaletteOpen) {
          setInboxOpen(false)
          setCoachPanelOpen(false)
          setAiOpen(false)
          setCommandPaletteOpen(false)
          e.stopPropagation()
          e.preventDefault()
          return
        }

        e.stopPropagation()
        e.preventDefault()
      }

      if (e.key === 'Enter') {
        const modalEl = typeof document !== 'undefined' ? document.querySelector(
          '.fixed.inset-0.backdrop-blur-md, .fixed.inset-0.backdrop-blur-sm, .fixed.inset-0.bg-black\\/80, .fixed.inset-0.bg-white\\/90, .fixed.inset-0.bg-white\\/60'
        ) : null

        if (modalEl) {
          const buttons = Array.from(modalEl.querySelectorAll('button, [role="button"], input[type="submit"]')) as HTMLElement[]
          const activeButtons = buttons.filter(btn => {
            if ((btn as any).disabled) return false
            if (btn.offsetParent === null) return false
            return true
          })

          const positiveKeywords = [
            'create', 'deploy', 'add', 'submit', 'confirm', 'save', 'scan', 'find', 'enter', 'yes', 'ok', 
            'تأكيد', 'إنشاء', 'حفظ', 'نعم', 'موافق', 'دخول', 'تفعيل', 'استخراج', 'إضافة'
          ]
          
          let targetButton = activeButtons.find(btn => {
            const text = btn.innerText?.toLowerCase() || ''
            return positiveKeywords.some(keyword => text.includes(keyword))
          })

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
        // Also check if the click is inside the mobile bottom sheet (which is portaled to fixed position)
        const clickedInsideBottomSheet = (target as Element)?.closest?.('[data-inbox-sheet]')
        if (!clickedInsideDesktop && !clickedInsideMobile && !clickedInsideBottomSheet) {
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

  const personality = useMemo(() => {
    const rank = profile?.rank || 'SILVER'
    if (rank === 'CONQUEROR') return 'SAVAGE'
    if (rank === 'ACE' || rank === 'CROWN') return 'DIRECT'
    return 'SUPPORTIVE'
  }, [profile?.rank])

  if (isLoading || !mounted) {
    return <WorkspaceLoader isRTL={shellIsRTL} rank={profile?.rank} />
  }

  return (
    <>
    <div
      ref={mainWrapperRef}
      className={cn(
        'min-h-[100dvh] bg-zinc-50 dark:bg-transparent text-foreground flex relative',
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
        'flex-1 min-h-[100dvh] relative z-10 w-full max-w-full overflow-x-hidden',
        'pb-24 lg:pb-8',
        'lg:ps-72 lg:max-w-none'
      )}>
        {/* ── DESKTOP TOP BAR ── */}
        <header className="hidden lg:flex w-full px-8 h-16 justify-end items-center bg-transparent dark:bg-gradient-to-b dark:from-black/10 dark:to-transparent backdrop-blur-[40px] border-b border-black/5 dark:border-white/[0.03] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] z-[150] sticky top-0 transition-colors duration-500 relative header-target">
          <div className="absolute -bottom-[1px] inset-inline-start-12 w-48 h-[1px] shadow-[0_0_15px_currentcolor]" style={{ backgroundColor: currentTheme.color, color: currentTheme.color }} />

          {/* CENTER: Core Brand Text */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center" dir="ltr">
            <AnimatedLogo className="text-xl md:text-2xl tracking-[0.25em]" />
          </div>

          <div className="flex items-center gap-6">
            {/* Real-time Network Radar */}
            {renderNetworkPill(false)}

            {/* ⚡ XP */}
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

            {/* 🔥 Streak */}
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
                <motion.div animate={bellShaking ? "shake" : ""} variants={bellVariants}>
                  <Bell className="w-5 h-5" />
                </motion.div>
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
          <div className="flex items-center order-first rtl:order-last">
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

          {/* RIGHT: exactly 🔔 (Notifications) */}
          <div className="flex items-center gap-3 order-last rtl:order-first">
            {renderNetworkPill(true)}

            {/* 🔔 Notifications */}
            <div className="relative" ref={mobileInboxRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
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
                <motion.div animate={bellShaking ? "shake" : ""} variants={bellVariants}>
                  <Bell className="w-[18px] h-[18px]" />
                </motion.div>
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

        <div className="relative pb-0">
          {children}
        </div>
      </main>

      {/* ── MOBILE SIDEBAR DRAWER ── */}
      {/*
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] lg:hidden"
        style={{ opacity: computedBackdropOpacity, pointerEvents: isDrawerVisible ? 'auto' : 'none' }}
        onClick={() => setIsMobileNavOpen(false)}
      />
      */}
      {/* Backdrop - click or swipe to close */}
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] lg:hidden"
        style={{ opacity: computedBackdropOpacity, pointerEvents: isDrawerVisible ? 'auto' : 'none' }}
        onClick={() => setIsMobileNavOpen(false)}
        drag="x"
        dragConstraints={isRTL ? { left: 0, right: 0 } : { left: 0, right: 0 }}
        dragElastic={0}
        onDrag={(_e, info) => {
          const closedPos = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH
          const currentX = sidebarX.get()
          const delta = info.delta.x
          const newX = Math.max(
            isRTL ? 0 : -SIDEBAR_WIDTH,
            Math.min(isRTL ? SIDEBAR_WIDTH : 0, currentX + delta)
          )
          sidebarX.set(newX)
        }}
        onDragEnd={handleSidebarDragEnd}
      />

      {/*
      {/* Edge swipe zone - 20px from left/right edge to open sidebar *\/
      {!isMobileNavOpen && (
        <motion.div
          // className="fixed top-0 bottom-0 w-5 z-[199] lg:hidden"
          // className="fixed top-0 bottom-0 w-16 z-[199] lg:hidden"
          className="fixed top-0 bottom-0 w-10 z-[199] lg:hidden"
          style={{ [isRTL ? 'right' : 'left']: 0 }}
          drag="x"
          dragConstraints={isRTL 
            ? { left: 0, right: SIDEBAR_WIDTH }
            : { left: -SIDEBAR_WIDTH, right: 0 }
          }
          dragElastic={0.05}
          dragMomentum={false}
          onDrag={(_e, info) => {
            const currentX = sidebarX.get()
            const delta = info.delta.x
            const newX = Math.max(
              isRTL ? 0 : -SIDEBAR_WIDTH,
              Math.min(isRTL ? SIDEBAR_WIDTH : 0, currentX + delta)
            )
            sidebarX.set(newX)
          }}
          onDragEnd={handleSidebarDragEnd}
        />
      )}
      */}

      <motion.div
        drag="x"
        dragConstraints={isRTL
          ? { left: 0, right: SIDEBAR_WIDTH }
          : { left: -SIDEBAR_WIDTH, right: 0 }
        }
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleSidebarDragEnd}
        onDrag={(_e, info) => {
          const currentX = sidebarX.get()
          const delta = info.delta.x
          const newX = Math.max(
            isRTL ? 0 : -SIDEBAR_WIDTH,
            Math.min(isRTL ? SIDEBAR_WIDTH : 0, currentX + delta)
          )
          sidebarX.set(newX)
        }}
        style={{ 
          x: sidebarX
        }}
        className={cn(
          "fixed top-0 bottom-0 w-[280px] z-[201] lg:hidden flex flex-col !bg-black/50 !backdrop-blur-xl p-6 transform-gpu will-change-transform touch-pan-y",
          isRTL ? "right-0 border-s border-white/10" : "left-0 border-e border-white/10"
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
        <div className="flex flex-col items-center text-center pb-6 border-b border-white/10 mb-6">
          <div 
            onClick={() => { router.push('/settings'); setIsMobileNavOpen(false); }}
            className="relative p-1 rounded-full bg-gradient-to-tr shadow-lg cursor-pointer"
            style={{ backgroundImage: `linear-gradient(to top right, ${currentTheme.color}, ${currentTheme.color}88, transparent, ${currentTheme.color})`, boxShadow: `0 0 20px ${currentTheme.color}33` }}
          >
            <div className="w-16 h-16 rounded-full bg-[#050505] p-0.5 overflow-hidden flex items-center justify-center">
              {mounted && profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="User" className="w-[90%] h-[90%] mx-auto object-contain rounded-full" />
              ) : (
                <User className="w-6 h-6 text-[var(--text-secondary)]" />
              )}
            </div>
          </div>
          <span className="text-sm font-heading font-medium mt-3 text-zinc-100 truncate max-w-[200px]">
            {profile?.full_name || 'User'}
          </span>
          <span className="text-xs font-body font-medium mt-1" style={{ color: currentTheme.color }}>
            XP: {profile?.xp || 0}
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {[
            { label: isRTL ? 'الرئيسية' : 'Home', icon: Home, href: '/' },
            { label: isRTL ? 'الأهداف' : 'Goals', icon: Target, href: '/goals' },
            { label: isRTL ? 'أهدافي' : 'Solo Goals', icon: User, href: '/goals/solo', indent: true },
            { label: isRTL ? 'الفريق' : 'Squad Goals', icon: Users, href: '/goals/squad', indent: true },
            { label: isRTL ? 'ملاحظاتي' : 'Notes', icon: FileText, href: '/notes' },
            { label: isRTL ? 'إنجازاتي' : 'Wins', icon: Trophy, href: '/achievements' },
            { label: isRTL ? 'الإعدادات' : 'Settings', icon: Settings, href: '/settings' },
          ].map(item => {
            const isActive = pathname === item.href
            const IconComponent = item.icon
            return (
              <button
                key={item.href}
                onClick={() => { playBlip(); router.push(item.href); setIsMobileNavOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 py-2.5 px-4 rounded-lg font-body text-sm font-medium transition-all duration-150 active:scale-[0.97] hover:brightness-105 relative cursor-pointer",
                  item.indent 
                    ? "ms-6 ps-4 border-s border-white/10 text-xs py-2" 
                    : "",
                  isActive 
                    ? "text-[var(--text-primary)]" 
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                )}
                style={isActive ? { 
                  color: currentTheme.color, 
                  backgroundColor: `${currentTheme.color}15`,
                } : {}}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Footer Settings Toggle commented out to merge directly under Wins
        <div className="pt-4 border-t border-white/5 mt-auto">
          <button
            onClick={() => { router.push('/settings'); setIsMobileNavOpen(false); playBlip(); }}
            className={cn(
              "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg font-space text-sm font-medium transition-all relative cursor-pointer",
              pathname === '/settings'
                ? "text-[var(--text-primary)]" 
                : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            )}
            style={pathname === '/settings' ? { 
              color: currentTheme.color, 
              backgroundColor: `${currentTheme.color}15`,
            } : {}}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span>{isRTL ? 'الإعدادات' : 'Settings'}</span>
          </button>
        </div>
        */}
      </motion.div>

      {/* ORIGINAL_MOBILE_DRAWER_CODE_FOR_REFERENCE:
      <motion.div
        drag="x"
        dragConstraints={isRTL
          ? { left: 0, right: SIDEBAR_WIDTH }
          : { left: -SIDEBAR_WIDTH, right: 0 }
        }
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleSidebarDragEnd}
        onDrag={(_e, info) => {
          const currentX = sidebarX.get()
          const delta = info.delta.x
          const newX = Math.max(
            isRTL ? 0 : -SIDEBAR_WIDTH,
            Math.min(isRTL ? SIDEBAR_WIDTH : 0, currentX + delta)
          )
          sidebarX.set(newX)
        }}
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
        <div className="flex justify-between items-center mb-8">
          <AnimatedLogo className="text-lg tracking-[0.2em]" />
          <button 
            onClick={() => { setIsMobileNavOpen(false); playBlip(); }}
            className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white/50 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
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
        <div className="flex-1 space-y-2 overflow-y-auto">
          {[
            { label: isRTL ? 'الرئيسية' : 'Home', icon: Home, href: '/' },
            { label: isRTL ? 'الأهداف' : 'Goals', icon: Target, href: '/goals' },
            { label: isRTL ? 'أهدافي' : 'Solo Goals', icon: User, href: '/goals/solo', indent: true },
            { label: isRTL ? 'الفريق' : 'Squad Goals', icon: Users, href: '/goals/squad', indent: true },
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
      */}

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

      <LevelUpModal />
      <GlitchOverlay active={isRankUpModalOpen} />

      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
        onOpenCoach={() => { setCoachPanelOpen(true); window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'ai-coach' })); }}
        missions={syncedMissions}
      />
      <Tutorial />
      <GlobalCreateGoalModal />

      {/* Mobile fullscreen overlay for notification list */}
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

    {/* ── MOBILE FLOATING ACTION BUTTON (FAB) SPEED DIAL ── */}
    {/* ORIGINAL FAB SPEED DIAL COMMENTED OUT
    {!isTaskDrawerOpen && (
      <div 
        className={cn(
          "lg:hidden fixed bottom-6 z-[100] flex flex-col items-end gap-3",
          shellIsRTL ? "left-6" : "right-6"
        )}
        dir={shellIsRTL ? 'rtl' : 'ltr'}
      >
        <AnimatePresence>
          {isFabMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex flex-col gap-2 mb-1"
            >
              {[
                { 
                  label: isRTL ? 'ملاحظة جديدة' : 'Add Note', 
                  icon: StickyNote, 
                  delay: 0.1,
                  action: () => { router.push('/notes?create=true'); setIsFabMenuOpen(false); playBlip(); }
                },
                { 
                  label: isRTL ? 'مهمة جديدة' : 'Add Task', 
                  icon: CheckCircle, 
                  delay: 0.05,
                  action: () => { showToast(isRTL ? 'ميزة إنشاء المهام العامة قريباً.' : 'Global Task Creation coming soon.', 'info'); setIsFabMenuOpen(false); playBlip(); }
                },
                { 
                  label: isRTL ? 'هدف شخصي' : 'Solo Goal', 
                  icon: User, 
                  delay: 0,
                  action: () => { openCreateGoalModal({ goalType: 'solo' }); setIsFabMenuOpen(false); playNeuralLink(); }
                },
                { 
                  label: isRTL ? 'هدف فريق' : 'Squad Goal', 
                  icon: Users, 
                  delay: 0,
                  action: () => { openCreateGoalModal({ goalType: 'squad' }); setIsFabMenuOpen(false); playNeuralLink(); }
                },
              ].map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: shellIsRTL ? -20 : 20, scale: 0.6 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: shellIsRTL ? -20 : 20, scale: 0.6 }}
                  transition={{ delay: item.delay, type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={item.action}
                  className={cn(
                    "flex items-center gap-3 h-11 rounded-full bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 shadow-lg cursor-pointer transition-colors hover:bg-zinc-800/90 active:scale-95",
                    shellIsRTL ? "flex-row-reverse ps-3 pe-5" : "ps-3 pe-5"
                  )}
                  style={{ boxShadow: `0 4px 20px rgba(0,0,0,0.4)` }}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${currentTheme.color}20` }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: currentTheme.color }} />
                  </div>
                  <span className="text-sm font-space font-bold text-zinc-200 whitespace-nowrap">
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn("flex items-center gap-3", shellIsRTL ? "flex-row-reverse" : "")}>
          <motion.button
            onClick={() => {
              playBlip()
              setIsFabMenuOpen(false)
              setIsMobileSearchOpen(true)
            }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800 shadow-lg cursor-pointer text-zinc-400 hover:text-white transition-colors"
          >
            <Search className="w-5 h-5" />
          </motion.button>

          <motion.button
            onClick={() => {
              playBlip()
              setIsFabMenuOpen(!isFabMenuOpen)
            }}
            whileTap={{ scale: 0.92 }}
            animate={{ rotate: isFabMenuOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-14 h-14 rounded-full flex items-center justify-center text-black shadow-lg cursor-pointer"
            style={{ 
              backgroundColor: currentTheme.color,
              boxShadow: `0 0 20px ${currentTheme.color}50`
            }}
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    )}

    <AnimatePresence>
      {isFabMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[99]"
          onClick={() => setIsFabMenuOpen(false)}
        />
      )}
    </AnimatePresence>
    */}
    {(() => {
      const FAB_PAGES = [
        '/',           // Home/Dashboard
        '/goals',      // Goals hub
        '/goals/solo', // Solo goals
        '/goals/squad',// Squad goals
        '/notes',      // Notes
      ]

      const showFAB = FAB_PAGES.some(page => 
        pathname === page || 
        (page === '/' && pathname === '/')
      )

      if (isTaskDrawerOpen || !showFAB) return null

      return (
        <div 
          className={cn(
            "lg:hidden fixed bottom-6 z-[100] flex items-center gap-3",
            shellIsRTL ? "left-6 flex-row-reverse" : "right-6"
          )}
        >
          {/* Search Icon Button */}
          <motion.button
            onClick={() => {
              playBlip()
              setIsMobileSearchOpen(true)
            }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800 shadow-lg cursor-pointer text-zinc-400 hover:text-white transition-colors"
          >
            <Search className="w-5 h-5" />
          </motion.button>

          {/* Primary FAB */}
          <motion.button
            onClick={() => {
              playBlip()
              if (pathname === '/notes') {
                router.push('/notes?create=true')
              } else {
                openCreateGoalModal({ goalType: 'solo' })
              }
            }}
            whileTap={{ scale: 0.92 }}
            className="w-14 h-14 rounded-full flex items-center justify-center text-black shadow-lg cursor-pointer"
            style={{ 
              backgroundColor: currentTheme.color,
              boxShadow: `0 0 20px ${currentTheme.color}50`
            }}
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </motion.button>
        </div>
      )
    })()}

    {/* ── FULL-SCREEN MOBILE SMART SEARCH OVERLAY ── */}
    <AnimatePresence>
      {isMobileSearchOpen && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="lg:hidden fixed inset-0 z-[300] bg-zinc-950/98 backdrop-blur-3xl flex flex-col font-space"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/5">
            <div 
              className="flex-1 flex items-center gap-3 h-12 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4"
              style={{ borderColor: `${currentTheme.color}30` }}
            >
              <Search className="w-5 h-5 text-zinc-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'ابحث في الأهداف، المهام، الملاحظات...' : 'Search goals, tasks, notes...'}
                className="flex-1 bg-transparent border-none text-white outline-none text-base font-bold placeholder:text-zinc-600"
              />
            </div>
            <button
              onClick={() => { setIsMobileSearchOpen(false); setSearchQuery(''); playBlip(); }}
              className="h-12 px-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white font-bold text-sm transition-colors cursor-pointer"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>

          {/* Search Results Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: currentTheme.color }} />
                <p className="text-zinc-500 text-sm font-semibold">{isRTL ? 'جاري استدعاء البيانات...' : 'Searching archives...'}</p>
              </div>
            ) : searchQuery.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60dvh] gap-4 text-center">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${currentTheme.color}15` }}
                >
                  <Search className="w-8 h-8" style={{ color: currentTheme.color, opacity: 0.6 }} />
                </div>
                <div>
                  <p className="text-zinc-400 font-bold text-base">
                    {isRTL ? 'البحث المباشر النشط' : 'Live smart search'}
                  </p>
                  <p className="text-zinc-600 text-sm mt-1">
                    {isRTL ? 'اكتب للبحث في الأهداف والمهام والملاحظات فوراً' : 'Type to search goals, tasks, and notes instantly'}
                  </p>
                </div>
              </div>
            ) : (searchResults.goals.length === 0 && searchResults.tasks.length === 0 && searchResults.notes.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-[60dvh] text-center space-y-4">
                <div className="text-red-500/20 text-7xl font-black select-none tracking-widest font-mono">
                  000
                </div>
                <div>
                  <p className="text-zinc-300 font-black tracking-widest text-sm uppercase">
                    {isRTL ? '0 تطابات وجدت' : '0 MATCHES FOUND'}
                  </p>
                  <p className="text-zinc-600 text-xs mt-1 font-bold">
                    {isRTL ? 'لم نجد أي سجلات تطابق استعلامك.' : 'No records match your neural query.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Category: Goals */}
                {searchResults.goals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Target className="w-4 h-4" style={{ color: currentTheme.color }} />
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: currentTheme.color }}>
                        {isRTL ? ' الأهداف' : ' Goals'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {searchResults.goals.map((goal) => {
                        const isPublic = goal.metadata?.type === 'public'
                        const isSquad = goal.metadata?.type === 'squad'
                        const goalTypeLabel = isPublic ? (isRTL ? 'عام' : 'Public') : isSquad ? (isRTL ? 'فريق' : 'Squad') : (isRTL ? 'شخصي' : 'Solo')
                        
                        return (
                          <button
                            key={goal.id}
                            onClick={() => {
                              if (isPublic) {
                                router.push(`/goals/public/${goal.id}`)
                              } else {
                                router.push(`/goals/squad/${goal.id}`)
                              }
                              setIsMobileSearchOpen(false)
                              setSearchQuery('')
                            }}
                            className="w-full text-start p-3 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700/80 rounded-xl transition-all flex items-center justify-between gap-3"
                          >
                            <span className="text-sm font-bold text-zinc-200 truncate">{goal.title}</span>
                            <span 
                              className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-750 flex items-center gap-1.5 shrink-0"
                              style={{ borderColor: `${currentTheme.color}30` }}
                            >
                              {isSquad ? (
                                <Users className="w-3 h-3 text-[var(--text-secondary)]" style={{ color: currentTheme.color }} />
                              ) : (
                                <Target className="w-3 h-3 text-[var(--text-secondary)]" style={{ color: currentTheme.color }} />
                              )}
                              <span>{goalTypeLabel}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Category: Tasks */}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <CheckCircle className="w-4 h-4" style={{ color: currentTheme.color }} />
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: currentTheme.color }}>
                        {isRTL ? ' المهام' : ' Tasks'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {searchResults.tasks.map((task) => {
                        const parentGoal = task.goals ? (Array.isArray(task.goals) ? task.goals[0] : task.goals) : null
                        const goalTitle = parentGoal?.title
                        const isPublic = parentGoal?.metadata?.type === 'public'
                        
                        return (
                          <button
                            key={task.id}
                            onClick={() => {
                              if (parentGoal) {
                                if (isPublic) {
                                  router.push(`/goals/public/${parentGoal.id}?taskId=${task.id}`)
                                } else {
                                  router.push(`/goals/squad/${parentGoal.id}?taskId=${task.id}`)
                                }
                              } else {
                                router.push('/goals/solo')
                              }
                              setIsMobileSearchOpen(false)
                              setSearchQuery('')
                            }}
                            className="w-full text-start p-3 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700/80 rounded-xl transition-all flex flex-col gap-1.5"
                          >
                            <span className="text-sm font-bold text-zinc-200 truncate">{task.title}</span>
                            {goalTitle && (
                              <span className="text-xs text-zinc-500 font-bold flex items-center gap-1">
                                <span>🔗</span>
                                <span>{isRTL ? 'الهدف:' : 'Goal:'}</span>
                                <span className="text-zinc-400 truncate max-w-[200px]">{goalTitle}</span>
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Category: Notes */}
                {searchResults.notes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <StickyNote className="w-4 h-4" style={{ color: currentTheme.color }} />
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: currentTheme.color }}>
                        {isRTL ? ' الملاحظات' : ' Notes'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {searchResults.notes.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => {
                            router.push(`/notes?id=${note.id}`);
                            setIsMobileSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-start p-3 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700/80 rounded-xl transition-all flex flex-col gap-1.5"
                        >
                          <span className="text-sm font-bold text-zinc-200 truncate">{note.title || (isRTL ? 'ملاحظة غير معنونة' : 'Untitled Note')}</span>
                          {note.content && (
                            <span className="text-xs text-zinc-500 line-clamp-1 font-semibold">{note.content}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Smart Bell Notification Toast & Arrow */}
    <AnimatePresence>
      {arrowVisible && (
        <motion.svg
          className="fixed top-16 right-8 w-8 h-12 z-[250] pointer-events-none"
          viewBox="0 0 32 48"
          fill="none"
          stroke={currentTheme.color}
          strokeWidth="2"
          strokeLinecap="round"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.path
            d="M 16 40 L 16 12 M 16 12 L 8 20 M 16 12 L 24 20"
            variants={arrowVariants}
          />
        </motion.svg>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showNotificationPopup && activeToast && (((activeToast.type as string) === 'join_request') || activeToast.type === 'squad_join_request') && (
        <motion.div
          variants={popupVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed top-16 right-4 z-[200]"
        >
          <div className="flex items-start gap-3 p-4 bg-[var(--card)] dark:bg-[#121214]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-xl w-[260px]">
            <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
              <UserPlus size={16} className="text-orange-500"/>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white mb-0.5">
                {isRTL ? "طلب انضمام جديد" : "New join request"}
              </p>
              <p className="text-[11px] text-white/60 mb-3 leading-relaxed">
                {activeToast.requesterName} {isRTL ? 
                  `يريد الانضمام لـ ${activeToast.goalName}` : 
                  `wants to join ${activeToast.goalName}`}
              </p>
              <div className="flex gap-2">
                <button onClick={handleAcceptNotification}
                  className="flex-1 h-7 rounded-lg bg-teal-500 hover:bg-teal-400 text-white text-[11px] font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer">
                  {isRTL ? "قبول" : "Accept"}
                </button>
                <button onClick={handleRejectNotification}
                  className="flex-1 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[11px] font-semibold transition-all duration-150 active:scale-[0.97] cursor-pointer">
                  {isRTL ? "رفض" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
