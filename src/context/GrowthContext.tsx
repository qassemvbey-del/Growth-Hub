'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useSound } from '@/context/SoundContext'

export type Language = 'en' | 'ar'
export type Theme = 'Neon Cyberpunk' | 'Clean Stealth'
export type AiPersonality = 'SAVAGE' | 'GENTLE'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  custom_avatar?: string | null
  google_avatar_url?: string | null
  age: number | null
  mission_goal: string | null
  weekly_project: string | null
  daily_focus: string | null
  language: Language
  onboarded: boolean
  ai_name: string | null
  ai_personality: AiPersonality
  gender: string | null
  xp: number
  rank: string
  active_theme: string
  blocked: boolean
  last_seen: string | null
  email: string | null
}

export const THEME_PACKAGES = {
  SILVER: {
    id: 'SILVER',
    name: 'Silver // Slate',
    color: '#94a3b8',
    cupStyle: 'cylinder',
    glow: 'rgba(148, 163, 184, 0.4)',
    accent: 'text-[#94a3b8]',
    accentColor: '#475569',
    border: 'border-[#94a3b8]/30'
  },
  GOLD: {
    id: 'GOLD',
    name: 'Gold // Gold Burst',
    color: '#ffcc00',
    cupStyle: 'cylinder',
    glow: 'rgba(255, 204, 0, 0.4)',
    accent: 'text-[#ffcc00]',
    accentColor: '#553b00',
    border: 'border-[#ffcc00]/30'
  },
  PLATINUM: {
    id: 'PLATINUM',
    name: 'Platinum // Pulse',
    color: '#38bdf8',
    cupStyle: 'hex',
    glow: 'rgba(56, 189, 248, 0.4)',
    accent: 'text-[#38bdf8]',
    accentColor: '#0369a1',
    border: 'border-[#38bdf8]/30'
  },
  DIAMOND: {
    id: 'DIAMOND',
    name: 'Diamond // Glow',
    color: '#d500f9',
    cupStyle: 'crystal',
    glow: 'rgba(213, 0, 249, 0.4)',
    accent: 'text-[#d500f9]',
    accentColor: '#4a0055',
    border: 'border-[#d500f9]/30'
  },
  CROWN: {
    id: 'CROWN',
    name: 'Crown // Gold',
    color: '#FACC15',
    cupStyle: 'crystal',
    glow: 'rgba(250, 204, 21, 0.4)',
    accent: 'text-[#FACC15]',
    accentColor: '#713f12',
    border: 'border-[#FACC15]/30'
  },
  ACE: {
    id: 'ACE',
    name: 'Ace // Orange',
    color: '#F97316',
    cupStyle: 'shard',
    glow: 'rgba(249, 115, 22, 0.4)',
    accent: 'text-[#F97316]',
    accentColor: '#7c2d12',
    border: 'border-[#F97316]/30'
  },
  CONQUEROR: {
    id: 'CONQUEROR',
    name: 'Conqueror // Red',
    color: '#EF4444',
    cupStyle: 'sphere',
    glow: 'rgba(239, 68, 68, 0.5)',
    accent: 'text-[#EF4444]',
    accentColor: '#7f1d1d',
    border: 'border-[#EF4444]/30'
  },
  // Theme aliases
  INIT_GREEN: {
    id: 'SILVER',
    name: 'Silver // Slate',
    color: '#94a3b8',
    cupStyle: 'cylinder',
    glow: 'rgba(148, 163, 184, 0.4)',
    accent: 'text-[#94a3b8]',
    accentColor: '#475569',
    border: 'border-[#94a3b8]/30'
  },
  GOLD_BURST: {
    id: 'GOLD',
    name: 'Gold // Gold Burst',
    color: '#ffcc00',
    cupStyle: 'cylinder',
    glow: 'rgba(255, 204, 0, 0.4)',
    accent: 'text-[#ffcc00]',
    accentColor: '#553b00',
    border: 'border-[#ffcc00]/30'
  },
  PLATINUM_PULSE: {
    id: 'PLATINUM',
    name: 'Platinum // Pulse',
    color: '#38bdf8',
    cupStyle: 'hex',
    glow: 'rgba(56, 189, 248, 0.4)',
    accent: 'text-[#38bdf8]',
    accentColor: '#0369a1',
    border: 'border-[#38bdf8]/30'
  },
  DIAMOND_GLOW: {
    id: 'DIAMOND',
    name: 'Diamond // Glow',
    color: '#d500f9',
    cupStyle: 'crystal',
    glow: 'rgba(213, 0, 249, 0.4)',
    accent: 'text-[#d500f9]',
    accentColor: '#4a0055',
    border: 'border-[#d500f9]/30'
  },
  CROWN_SHADOW: {
    id: 'CROWN',
    name: 'Crown // Gold',
    color: '#FACC15',
    cupStyle: 'crystal',
    glow: 'rgba(250, 204, 21, 0.4)',
    accent: 'text-[#FACC15]',
    accentColor: '#713f12',
    border: 'border-[#FACC15]/30'
  },
  ACE_STRIKE: {
    id: 'ACE',
    name: 'Ace // Orange',
    color: '#F97316',
    cupStyle: 'shard',
    glow: 'rgba(249, 115, 22, 0.4)',
    accent: 'text-[#F97316]',
    accentColor: '#7c2d12',
    border: 'border-[#F97316]/30'
  },
  CONQUEROR_SUPREME: {
    id: 'CONQUEROR',
    name: 'Conqueror // Red',
    color: '#EF4444',
    cupStyle: 'sphere',
    glow: 'rgba(239, 68, 68, 0.5)',
    accent: 'text-[#EF4444]',
    accentColor: '#7f1d1d',
    border: 'border-[#EF4444]/30'
  }
}

export const RANK_THRESHOLDS = [
  { rank: 'SILVER', xp: 0, theme: 'SILVER', perk: 'Basic Protocol' },
  { rank: 'GOLD', xp: 300, theme: 'GOLD', perk: 'Focus Expansion' },
  { rank: 'PLATINUM', xp: 800, theme: 'PLATINUM', perk: 'Energy Streams' },
  { rank: 'DIAMOND', xp: 1800, theme: 'DIAMOND', perk: 'Quantum Sync' },
  { rank: 'CROWN', xp: 3500, theme: 'CROWN', perk: 'Savage AI Coach' },
  { rank: 'ACE', xp: 6000, theme: 'ACE', perk: 'Tactical HUD' },
  { rank: 'CONQUEROR', xp: 10000, theme: 'CONQUEROR', perk: 'Glitch FX' }
]

export interface MissionTask {
  id: string
  is_completed: boolean
  weight: number
  title: string
}

export interface Mission {
  id: string
  title: string
  start_date: string
  end_date: string
  sync_to_dashboard: boolean
  is_archived: boolean
  size: string
  tasks?: MissionTask[]
}

export const TRANSLATIONS = {
  en: {
    dashboard: 'DASHBOARD',
    mission: 'MISSIONS',
    brain: 'NOTES',
    achievements: 'ACHIEVEMENTS',
    vault: 'VAULT',
    streak: 'STREAK',
    exit: 'Logout',
    sync: 'SYNCING',
    operator: 'USER',
    status: 'ONLINE',
    createMission: 'CREATE MISSION',
    task: 'TASK',
    showOnDashboard: 'SHOW ON DASHBOARD',
    save: 'SAVE',
    cancel: 'CANCEL',
    delete: 'DELETE',
    edit: 'EDIT',
    deadline: 'DEADLINE',
    start_date: 'START DATE',
    end_date: 'END DATE',
    title: 'TITLE',
    progress: 'PROGRESS',
    on_track: 'ON TRACK',
    late: 'LATE',
    ahead: 'AHEAD',
    addTask: 'ADD TASK',
    settings: 'SETTINGS',
    gender: 'GENDER',
    male: 'MALE',
    female: 'FEMALE',
    age: 'AGE',
    fullName: 'FULL NAME',
    aiName: 'COACH NAME',
    aiPersonality: 'AI PERSONALITY',
    gentle: 'GENTLE',
    savage: 'SAVAGE',
    logout: 'LOGOUT',
    noTasks: 'NO TASKS DETECTED. ADD A TASK BELOW.',
    tapToEnter: 'TAP TO ENTER MISSION',
    purge: 'PURGE',
    deploy: 'DEPLOY',
    missionColor: 'MISSION COLOR',
    missionScale: 'MISSION SCALE',
  },
  ar: {
    dashboard: 'الرئيسية',
    mission: 'الأهداف النشطة',
    brain: 'الأفكار والملاحظات',
    achievements: 'الإنجازات',
    vault: 'الخزنة',
    streak: 'سجل الأيام',
    exit: 'خروج',
    sync: 'جاري المزامنة',
    operator: 'المستخدم',
    status: 'متصل',
    createMission: 'إنشاء هدف جديد',
    task: 'مهمة فرعية',
    showOnDashboard: 'عرض في الرئيسية',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    deadline: 'الموعد النهائي',
    start_date: 'تاريخ البدء',
    end_date: 'تاريخ الانتهاء',
    title: 'العنوان',
    progress: 'التقدم',
    on_track: 'على المسار',
    late: 'متأخر',
    ahead: 'متقدم',
    addTask: 'إضافة مهمة فرعية',
    settings: 'الإعدادات',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    age: 'السن',
    fullName: 'الاسم بالكامل',
    aiName: 'اسم المساعد الذكي',
    aiPersonality: 'شخصية المساعد الذكي',
    gentle: 'هادئ',
    savage: 'حازم',
    logout: 'خروج',
    noTasks: 'لا توجد مهام فرعية مضافة حالياً. يرجى إضافة مهمة فرعية أدناه.',
    tapToEnter: 'انقر للدخول',
    purge: 'مسح',
    deploy: 'بدء الهدف',
    missionColor: 'لون المهمة',
    missionScale: 'حجم المهمة',
  }
}

interface GrowthContextType {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  isLoading: boolean
  isRTL: boolean
  tutorialActive: boolean
  setTutorialActive: (active: boolean) => void
  refreshProfile: () => Promise<void>
  t: (key: keyof typeof TRANSLATIONS['en']) => string
  mounted: boolean
  currentTheme: typeof THEME_PACKAGES['SILVER']
  addXp: (amount: number) => Promise<void>
  lastAiMessage: string
  setLastAiMessage: (msg: string) => void
  changeTheme: (themeId: string) => Promise<void>
  isRankUpModalOpen: boolean
  setIsRankUpModalOpen: (open: boolean) => void
  oldRank: string
  newRank: string
  triggerRankUp: (oldVal: string, newVal: string) => void
  calculateAccountability: (mission: Mission) => {
    progress: number
    isInRedZone: boolean
    isAheadOfSchedule: boolean
    status: 'LATE' | 'ON_TRACK'
  }
  showAuthModal: boolean
  setShowAuthModal: (open: boolean) => void
}

const GrowthContext = createContext<GrowthContextType | undefined>(undefined)

export function GrowthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cached_profile')
      if (cached) {
        try {
          return JSON.parse(cached) as Profile
        } catch (e) {}
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cached_profile')
      const hasAuthToken = localStorage.getItem('growth-hub-auth-token')
      if (cached && hasAuthToken) {
        try {
          JSON.parse(cached)
          return false
        } catch (e) {}
      }
    }
    return true
  })
  const [tutorialActive, setTutorialActive] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [lastAiMessage, setLastAiMessage] = useState('SYSTEM_ONLINE // STANDING_BY')
  const [isRankUpModalOpen, setIsRankUpModalOpen] = useState(false)
  const [oldRank, setOldRank] = useState('SILVER')
  const [newRank, setNewRank] = useState('SILVER')
  const [showAuthModal, setShowAuthModal] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()
  const { playRankUpChime } = useSound()

  const isRTL = useMemo(() => profile?.language?.startsWith('ar') || false, [profile?.language])

  const calculatedRank = useMemo(() => {
    const xp = profile?.xp || 0
    if (xp >= 10000) return 'CONQUEROR'
    if (xp >= 6000) return 'ACE'
    if (xp >= 3500) return 'CROWN'
    if (xp >= 1800) return 'DIAMOND'
    if (xp >= 800) return 'PLATINUM'
    if (xp >= 300) return 'GOLD'
    return 'SILVER'
  }, [profile?.xp])

  const currentTheme = useMemo(() => {
    const activeThemeKey = profile?.active_theme || calculatedRank
    const themeKey = (THEME_PACKAGES[activeThemeKey as keyof typeof THEME_PACKAGES] ? activeThemeKey : calculatedRank) as keyof typeof THEME_PACKAGES
    return THEME_PACKAGES[themeKey] || THEME_PACKAGES.SILVER
  }, [profile?.active_theme, calculatedRank])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-neon-green', currentTheme.color)
      document.documentElement.style.setProperty('--color-primary', currentTheme.color)
      document.documentElement.style.setProperty('--theme-color', currentTheme.color)

      localStorage.setItem('cached_theme_color', currentTheme.color)

      // Dynamic PWA Window Frame/Chrome Theme Color Sync
      let metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta')
        metaThemeColor.setAttribute('name', 'theme-color')
        document.head.appendChild(metaThemeColor)
      }
      metaThemeColor.setAttribute('content', currentTheme.color)
    }
  }, [currentTheme])

  const triggerRankUp = (oldVal: string, newVal: string) => {
    setOldRank(oldVal)
    setNewRank(newVal)
    // Rank-up modal disabled — play chime only (no full-screen takeover)
    // setIsRankUpModalOpen(true)
    playRankUpChime()
  }

  // Realtime subscription for automatic profile/rank changes
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel(`profile-rank-lock:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        },
        (payload) => {
          const nextData = payload.new as Profile
          const prevData = payload.old as Profile

          if (nextData && prevData && nextData.rank !== prevData.rank) {
            triggerRankUp(prevData.rank || 'SILVER', nextData.rank || 'SILVER')
          }
          setProfile(prev => prev ? { ...prev, ...nextData } : nextData)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  // Handle Authentication Changes (Logout / Ghost State Fix)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cached_profile')
          localStorage.removeItem('cached_name')
        }
        router.push('/auth/login')
      } else if (event === 'SIGNED_IN') {
        const hasCachedProfile = typeof window !== 'undefined' && !!localStorage.getItem('cached_profile')
        if (!hasCachedProfile) {
          setIsLoading(true)
        }
        refreshProfile()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const addXp = async (amount: number) => {
    if (!profile) return
    const newXp = (profile.xp || 0) + Math.round(amount)

    const { data, error } = await supabase
      .from('profiles')
      .update({ xp: newXp })
      .eq('id', profile.id)
      .select()
      .single()

    if (!error && data) {
      const prevRank = profile.rank || 'SILVER'
      const nextRank = data.rank || 'SILVER'
      if (prevRank !== nextRank) {
        triggerRankUp(prevRank, nextRank)
      }
      setProfile({ ...profile, ...data } as Profile)
    }
  }

  const changeTheme = async (themeId: string) => {
    if (!profile) return
    const { error } = await supabase
      .from('profiles')
      .update({ active_theme: themeId })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, active_theme: themeId })
    }
  }

  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    const lang = profile?.language || 'en'
    return TRANSLATIONS[lang as keyof typeof TRANSLATIONS]?.[key] || TRANSLATIONS['en'][key]
  }

  const refreshProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // --- POST-AUTH GUEST GOAL MERGE ---
        if (typeof window !== 'undefined') {
          const guestGoalsStr = localStorage.getItem('guest_goals')
          if (guestGoalsStr) {
            try {
              const guestGoals = JSON.parse(guestGoalsStr)
              if (Array.isArray(guestGoals) && guestGoals.length > 0) {
                console.log('POST_AUTH_MERGE: Migrating guest goals to user DB...', guestGoals)
                // Filter out the local IDs and set the correct user_id
                for (const g of guestGoals) {
                  const { id: oldCupId, tasks, ...rest } = g
                  const { data: newCup, error: mergeError } = await supabase
                    .from('cups')
                    .insert({ ...rest, user_id: user.id })
                    .select()
                    .single()

                  if (newCup && tasks && tasks.length > 0) {
                    const taskPayloads = tasks.map((t: any) => ({
                      cup_id: newCup.id,
                      title: t.title,
                      original_title: t.original_title,
                      weight: t.weight,
                      is_completed: t.is_completed,
                      type: t.type,
                      video_id: t.video_id,
                      video_progress: t.video_progress || 0
                    }))
                    await supabase.from('tasks').insert(taskPayloads)
                  }
                }
                localStorage.removeItem('guest_goals')
                console.log('POST_AUTH_MERGE: Success.')
              }
            } catch (e) {}
          }
        }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        
        const storedLang = typeof window !== 'undefined' ? localStorage.getItem('language') as Language : null
        
        if (data) {
          const gender = data.gender || user.user_metadata?.gender || null;
          const age = data.age || user.user_metadata?.age || user.user_metadata?.age_range?.min || null;
          const full_name = data.full_name || user.user_metadata?.full_name || null;

          if ((!data.gender && gender) || (!data.age && age) || (!data.full_name && full_name)) {
            supabase.from('profiles').update({ gender, age, full_name }).eq('id', user.id).then(() => {})
          }

          // 1. Custom avatar from user_metadata or data.custom_avatar or data.avatar_url if it's an SVG
          const customAvatar = user.user_metadata?.custom_avatar || data.custom_avatar || (data.avatar_url?.startsWith('/avatars/') ? data.avatar_url : null);
          // 2. Google Auth Profile Picture
          const googleAvatar = user.user_metadata?.avatar_url || (data.avatar_url?.startsWith('http') ? data.avatar_url : null);
          // 3. Fallback based on gender
          const defaultAvatar = (gender === 'female' || gender === 'أنثى' || gender === 'Female') ? '/avatars/menna.svg' : '/avatars/omar.svg';
          const resolvedAvatarUrl = customAvatar || googleAvatar || defaultAvatar;

          const profileData = {
            ...data,
            language: data.language || storedLang || 'en',
            full_name,
            gender,
            age,
            avatar_url: resolvedAvatarUrl,
            custom_avatar: customAvatar,
            google_avatar_url: googleAvatar,
            ai_name: data.ai_name,
            ai_personality: data.ai_personality || 'GENTLE',
            xp: data.xp || 0,
            rank: data.rank || 'RECRUIT',
            active_theme: data.active_theme || 'SILVER',
            blocked: data.blocked || false,
            last_seen: data.last_seen,
            email: user.email || null
          } as Profile
          setProfile(profileData)

          if (typeof window !== 'undefined') {
            localStorage.setItem('cached_profile', JSON.stringify(profileData))
            if (profileData.language) {
               localStorage.setItem('language', profileData.language)
            }
          }

          // Blocked Check
          if (data.blocked) {
            router.push('/blocked')
            return
          }


        } else {
          console.log('PROFILE_MISSING: Auto-creating profile for', user.id)
          const gender = user.user_metadata?.gender || null;
          const age = user.user_metadata?.age || user.user_metadata?.age_range?.min || null;
          const full_name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

          const customAvatar = user.user_metadata?.custom_avatar || null;
          const googleAvatar = user.user_metadata?.avatar_url || null;
          const defaultAvatar = (gender === 'female' || gender === 'أنثى' || gender === 'Female') ? '/avatars/menna.svg' : '/avatars/omar.svg';
          const resolvedAvatarUrl = customAvatar || googleAvatar || defaultAvatar;

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name,
              avatar_url: resolvedAvatarUrl,
              gender,
              age,
              onboarded: false,
              xp: 0,
              rank: 'RECRUIT',
              active_theme: 'INIT_GREEN',
              language: storedLang || 'en'
            })
            .select()
            .single()

          if (!createError && newProfile) {
            const newProfileData = {
              ...newProfile,
              avatar_url: resolvedAvatarUrl,
              custom_avatar: customAvatar,
              google_avatar_url: googleAvatar,
              email: user.email || null
            } as Profile
            setProfile(newProfileData)
            if (typeof window !== 'undefined') {
              localStorage.setItem('cached_profile', JSON.stringify(newProfileData))
            }
          } else {
            console.error('PROFILE_CREATION_FAILED:', createError)
            if (!window.location.pathname.startsWith('/auth') && window.location.pathname !== '/onboarding') {
              router.push('/onboarding')
            }
          }
        }
      } else {
        const hasLocalAuth = typeof window !== 'undefined' && !!localStorage.getItem('growth-hub-auth-token')
        const hasCachedProfile = typeof window !== 'undefined' && !!localStorage.getItem('cached_profile')
        if (hasLocalAuth && hasCachedProfile) {
          console.log('HYDRATION_INTEGRATION: Active cached session and local tokens present. Bypassing redirect.')
        } else {
          // --- GUEST MODE IMPLEMENTATION ---
          console.log('GUEST_MODE: No active session found. Mounting Guest profile.');
          const storedLang = typeof window !== 'undefined' ? localStorage.getItem('language') as Language : 'en';
          const guestProfile: Profile = {
            id: 'guest',
            full_name: 'Guest',
            avatar_url: '/avatars/omar.svg',
            age: null,
            mission_goal: null,
            weekly_project: null,
            daily_focus: null,
            language: storedLang,
            onboarded: false,
            ai_name: null,
            ai_personality: 'GENTLE',
            gender: null,
            xp: 0,
            rank: 'SILVER',
            active_theme: 'SILVER',
            blocked: false,
            last_seen: new Date().toISOString(),
            email: null
          };
          setProfile(guestProfile);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cached_profile', JSON.stringify(guestProfile));
          }
        }
      }
    } catch (err) {
      console.error('REFRESH_PROFILE_ERROR:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('CONTEXT_MOUNTED:', true)
    setMounted(true)
    
    const cachedLang = localStorage.getItem('language')
    const cachedName = localStorage.getItem('cached_name')
    if (cachedLang || cachedName) {
      setProfile(prev => prev || { language: cachedLang || 'en', full_name: cachedName } as Profile)
    }

    refreshProfile().then(() => {
      console.log('PROFILE_DATA_LOADED')
    }).catch((err) => {
      console.error('PROFILE_ERROR:', err)
    })
  }, [])

  // Periodically update last_seen every 5 minutes
  useEffect(() => {
    if (!profile?.id) return

    const updateLastSeen = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', profile.id)
    }

    // Initial update
    updateLastSeen()

    const interval = setInterval(updateLastSeen, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [profile?.id])
  // ── ROUTE GUARD PROTECTION ──────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || !profile || profile.id === 'guest') return
    
    // SAFE PROPERTY CHECK: Safely resolve onboarding status from profile
    // Defaults to false without throwing uncaught exceptions.
    const isComplete = profile?.onboarded ?? (profile as any)?.onboarding_complete ?? false;
    
    const isAtOnboarding = window.location.pathname === '/onboarding'
    const isAtAuth = window.location.pathname.startsWith('/auth')
    const isLocalComplete = localStorage.getItem('onboarding_complete') === 'true'

    if (!isAtAuth) {
      if (!isComplete && !isLocalComplete && !isAtOnboarding) {
        router.push('/onboarding')
      } else if ((isComplete || isLocalComplete) && isAtOnboarding) {
        router.push('/')
      }
    }
  }, [profile, mounted, router])


  useEffect(() => {
    if (!mounted || !profile) return
    
    // Break Infinite Loop: Only apply if values changed
    const dir = isRTL ? 'rtl' : 'ltr'
    const lang = profile.language?.startsWith('ar') ? 'ar' : 'en'
    
    if (document.documentElement.dir !== dir) document.documentElement.dir = dir
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang
    
    const targetSize = lang === 'ar' ? '140%' : '100%'
    const targetLH = lang === 'ar' ? '1.8' : 'normal'
    
    if (document.documentElement.style.fontSize !== targetSize) {
      document.documentElement.style.fontSize = targetSize
    }
    if (document.documentElement.style.lineHeight !== targetLH) {
      document.documentElement.style.lineHeight = targetLH
    }
  }, [profile?.language, isRTL, mounted])

  return (
    <GrowthContext.Provider value={{ 
      profile, setProfile, 
      isLoading,
      isRTL,
      tutorialActive, setTutorialActive,
      refreshProfile,
      t,
      mounted,
      currentTheme,
      addXp,
      changeTheme,
      lastAiMessage,
      setLastAiMessage,
      isRankUpModalOpen,
      setIsRankUpModalOpen,
      oldRank,
      newRank,
      triggerRankUp,
      calculateAccountability: (mission: Mission) => {
        const tasks = mission.tasks || []
        const totalWeight = tasks.reduce((acc, t) => acc + (Number(t.weight) || 1), 0)
        const completedWeight = tasks.reduce((acc, t) => acc + (t.is_completed ? (Number(t.weight) || 1) : 0), 0)
        const progress = totalWeight === 0 ? 0 : completedWeight / totalWeight

        if (!mission.start_date || !mission.end_date) {
          return { progress: progress * 100, isInRedZone: false, isAheadOfSchedule: false, status: 'ON_TRACK' }
        }

        const start = new Date(mission.start_date).getTime()
        const end = new Date(mission.end_date).getTime()
        const now = new Date().getTime()

        const totalDuration = end - start
        const timeElapsed = now - start

        if (totalDuration <= 0) return { progress: progress * 100, isInRedZone: false, isAheadOfSchedule: false, status: 'ON_TRACK' }

        const timeRatio = Math.max(0, Math.min(1, timeElapsed / totalDuration))
        
        const status = timeRatio > (progress + 0.1) ? 'LATE' : 'ON_TRACK'
        const isInRedZone = status === 'LATE'
        const isAheadOfSchedule = progress > (timeRatio + 0.2)

        return {
          progress: Math.round(progress * 100),
          isInRedZone,
          isAheadOfSchedule,
          status
        }
      },
      showAuthModal,
      setShowAuthModal
    }}>
      {children}
    </GrowthContext.Provider>
  )
}

export function useGrowth() {
  const context = useContext(GrowthContext)
  if (context === undefined) {
    throw new Error('useGrowth must be used within a GrowthProvider')
  }
  return context
}
