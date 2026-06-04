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
  drive_connected?: boolean
  drive_refresh_token?: string | null
}

export const THEME_PACKAGES = {
  SILVER: {
    id: 'SILVER',
    // name: 'Silver // Slate',
    name: 'Silver - Slate',
    color: '#94a3b8',
    cupStyle: 'cylinder',
    glow: 'rgba(148, 163, 184, 0.4)',
    accent: 'text-[#94a3b8]',
    accentColor: '#475569',
    border: 'border-[#94a3b8]/30'
  },
  GOLD: {
    id: 'GOLD',
    // name: 'Gold // Gold Burst',
    name: 'Gold - Gold Burst',
    color: '#ffcc00',
    cupStyle: 'cylinder',
    glow: 'rgba(255, 204, 0, 0.4)',
    accent: 'text-[#ffcc00]',
    accentColor: '#553b00',
    border: 'border-[#ffcc00]/30'
  },
  PLATINUM: {
    id: 'PLATINUM',
    // name: 'Platinum // Pulse',
    name: 'Platinum - Pulse',
    color: '#38bdf8',
    cupStyle: 'hex',
    glow: 'rgba(56, 189, 248, 0.4)',
    accent: 'text-[#38bdf8]',
    accentColor: '#0369a1',
    border: 'border-[#38bdf8]/30'
  },
  DIAMOND: {
    id: 'DIAMOND',
    // name: 'Diamond // Glow',
    name: 'Diamond - Glow',
    color: '#d500f9',
    cupStyle: 'crystal',
    glow: 'rgba(213, 0, 249, 0.4)',
    accent: 'text-[#d500f9]',
    accentColor: '#4a0055',
    border: 'border-[#d500f9]/30'
  },
  CROWN: {
    id: 'CROWN',
    // name: 'Crown // Gold',
    name: 'Crown - Gold',
    color: '#FACC15',
    cupStyle: 'crystal',
    glow: 'rgba(250, 204, 21, 0.4)',
    accent: 'text-[#FACC15]',
    accentColor: '#713f12',
    border: 'border-[#FACC15]/30'
  },
  ACE: {
    id: 'ACE',
    // name: 'Ace // Orange',
    name: 'Ace - Orange',
    color: '#F97316',
    cupStyle: 'shard',
    glow: 'rgba(249, 115, 22, 0.4)',
    accent: 'text-[#F97316]',
    accentColor: '#7c2d12',
    border: 'border-[#F97316]/30'
  },
  CONQUEROR: {
    id: 'CONQUEROR',
    // name: 'Conqueror // Red',
    name: 'Conqueror - Red',
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
    // name: 'Silver // Slate',
    name: 'Silver - Slate',
    color: '#94a3b8',
    cupStyle: 'cylinder',
    glow: 'rgba(148, 163, 184, 0.4)',
    accent: 'text-[#94a3b8]',
    accentColor: '#475569',
    border: 'border-[#94a3b8]/30'
  },
  GOLD_BURST: {
    id: 'GOLD',
    // name: 'Gold // Gold Burst',
    name: 'Gold - Gold Burst',
    color: '#ffcc00',
    cupStyle: 'cylinder',
    glow: 'rgba(255, 204, 0, 0.4)',
    accent: 'text-[#ffcc00]',
    accentColor: '#553b00',
    border: 'border-[#ffcc00]/30'
  },
  PLATINUM_PULSE: {
    id: 'PLATINUM',
    // name: 'Platinum // Pulse',
    name: 'Platinum - Pulse',
    color: '#38bdf8',
    cupStyle: 'hex',
    glow: 'rgba(56, 189, 248, 0.4)',
    accent: 'text-[#38bdf8]',
    accentColor: '#0369a1',
    border: 'border-[#38bdf8]/30'
  },
  DIAMOND_GLOW: {
    id: 'DIAMOND',
    // name: 'Diamond // Glow',
    name: 'Diamond - Glow',
    color: '#d500f9',
    cupStyle: 'crystal',
    glow: 'rgba(213, 0, 249, 0.4)',
    accent: 'text-[#d500f9]',
    accentColor: '#4a0055',
    border: 'border-[#d500f9]/30'
  },
  CROWN_SHADOW: {
    id: 'CROWN',
    // name: 'Crown // Gold',
    name: 'Crown - Gold',
    color: '#FACC15',
    cupStyle: 'crystal',
    glow: 'rgba(250, 204, 21, 0.4)',
    accent: 'text-[#FACC15]',
    accentColor: '#713f12',
    border: 'border-[#FACC15]/30'
  },
  ACE_STRIKE: {
    id: 'ACE',
    // name: 'Ace // Orange',
    name: 'Ace - Orange',
    color: '#F97316',
    cupStyle: 'shard',
    glow: 'rgba(249, 115, 22, 0.4)',
    accent: 'text-[#F97316]',
    accentColor: '#7c2d12',
    border: 'border-[#F97316]/30'
  },
  CONQUEROR_SUPREME: {
    id: 'CONQUEROR',
    // name: 'Conqueror // Red',
    name: 'Conqueror - Red',
    color: '#EF4444',
    cupStyle: 'sphere',
    glow: 'rgba(239, 68, 68, 0.5)',
    accent: 'text-[#EF4444]',
    accentColor: '#7f1d1d',
    border: 'border-[#EF4444]/30'
  }
}

export const RANK_THRESHOLDS = [
  { rank: 'SILVER', xp: 0, theme: 'SILVER', perk: 'Standard Features' },
  { rank: 'GOLD', xp: 400, theme: 'GOLD', perk: 'Title Badge' },
  { rank: 'PLATINUM', xp: 1000, theme: 'PLATINUM', perk: 'Avatar Border' },
  { rank: 'DIAMOND', xp: 2000, theme: 'DIAMOND', perk: 'Exclusive Emojis' },
  { rank: 'CROWN', xp: 4000, theme: 'CROWN', perk: 'Glowing Name' },
  { rank: 'ACE', xp: 7000, theme: 'ACE', perk: 'Calling Card' },
  { rank: 'CONQUEROR', xp: 12000, theme: 'CONQUEROR', perk: 'Top #1 Lead Title' }
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
  isPinned?: boolean
}

export const TRANSLATIONS = {
  en: {
    dashboard: 'DASHBOARD',
    mission: 'GOALS',
    brain: 'NOTES',
    achievements: 'ACHIEVEMENTS',
    vault: 'VAULT',
    streak: 'STREAK',
    exit: 'Logout',
    sync: 'SYNCING',
    operator: 'MEMBER',
    status: 'ONLINE',
    createMission: 'CREATE GOAL',
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
    tapToEnter: 'TAP TO ENTER GOAL',
    purge: 'PURGE',
    deploy: 'CREATE',
    missionColor: 'GOAL COLOR',
    missionScale: 'GOAL SCALE',
    details: 'DETAILS',
    time: 'TIME',
    notes: 'NOTES',
    attachments: 'ATTACHMENTS',
    noDescription: 'NO DESCRIPTION AVAILABLE',
    writeNotePlaceholder: '[ WRITE A NEW NOTE FOR THE TASK... ]',
    googleDriveLinkBtn: 'LINK GOOGLE DRIVE FILE',
    googleDriveDesc: 'With one click, link your files directly from your personal account. No server space is consumed.',
    taskDetail: 'TASK DETAIL',
    savedProgress: 'SAVED PROGRESS',
    coreTaskStatement: 'CORE TASK STATEMENT',
    writeDescriptionPlaceholder: 'Write a description for this task...',
    completed: 'COMPLETED',
    inProgress: 'IN PROGRESS',
    priority: 'PRIORITY: ',
    high: 'HIGH',
    regular: 'REGULAR',
    statusComplexity: 'STATUS & COMPLEXITY',
    currentStatus: 'CURRENT STATUS',
    taskWeight: 'TASK WEIGHT',
    timeTrackingTitle: 'Time Tracking Coming Soon',
    timeTrackingDesc: 'Phase 2 integration will support detailed pomodoro counts, custom stopwatch, and session logs mapped explicitly to this subtask.',
    addNote: 'ADD NOTE',
    deleteAttachment: 'DELETE ATTACHMENT',
    markIncomplete: 'MARK INCOMPLETE',
    markCompleted: 'MARK COMPLETED',
    googleApiNotConfigured: 'Google API keys are not configured.',
  },
  /*
  ar: {
    dashboard: 'الرئيسية',
    mission: 'الأهداف',
    brain: 'الأفكار والملاحظات',
    achievements: 'الإنجازات',
    vault: 'الخزنة',
    streak: 'سجل الأيام',
    exit: 'خروج',
    sync: 'جاري المزامنة',
    operator: 'العضو',
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
    deploy: 'إنشاء',
    missionColor: 'لون الهدف',
    missionScale: 'حجم الهدف',
    details: 'تفاصيل',
    time: 'الوقت',
    notes: 'ملاحظات',
    attachments: 'المرفقات',
    noDescription: 'لا يوجد وصف متاح',
    writeNotePlaceholder: '[ اكتب ملحوظة جديدة للتاسك... ]',
    googleDriveLinkBtn: 'ربط ملف من Google Drive',
    googleDriveDesc: 'بضغطة واحدة، اربط ملفاتك مباشرة من حسابك الشخصي. لا يتم استهلاك أي مساحة من السيرفر.',
    taskDetail: 'تفاصيل المهمة',
    savedProgress: 'التقدم المحفوظ',
    coreTaskStatement: 'بيان المهمة الأساسية',
    writeDescriptionPlaceholder: 'اكتب وصفاً أو بياناً لهذه المهمة...',
    completed: 'مكتملة',
    inProgress: 'جاري العمل',
    priority: 'أولوية: ',
    high: 'عالية 🔥',
    regular: 'عادية',
    statusComplexity: 'الحالة والتقدير',
    currentStatus: 'الحالة الحالية',
    taskWeight: 'الوزن / الأهمية',
    timeTrackingTitle: 'تتبع الوقت وقريبًا',
    timeTrackingDesc: 'في التحديث القادم (Phase 2)، ستتمكن من بدء مؤقت بومودورو مخصص لكل مهمة وربطها بالكامل مع سجل التتبع الإجمالي.',
    addNote: 'إضافة ملحوظة',
    deleteAttachment: 'حذف المرفق',
    markIncomplete: 'إلغاء الإكمال',
    markCompleted: 'اعتماد كمكتملة',
    googleApiNotConfigured: 'مفاتيح Google API غير مهيأة بعد.',
  }
  */
  ar: {
    dashboard: 'الرئيسية',
    mission: 'الأهداف',
    brain: 'الأفكار والملاحظات',
    achievements: 'الإنجازات',
    vault: 'الخزنة',
    streak: 'الاستمرارية',
    exit: 'خروج',
    sync: 'المزامنة شغالة',
    operator: 'العضو',
    status: 'متصل',
    createMission: 'إنشاء هدف جديد',
    task: 'مهمة فرعية',
    showOnDashboard: 'عرض في الرئيسية',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'مسح',
    edit: 'تعديل',
    deadline: 'آخر ميعاد',
    start_date: 'تاريخ البداية',
    end_date: 'تاريخ النهاية',
    title: 'العنوان',
    progress: 'التقدم',
    on_track: 'على المسار',
    late: 'متأخر',
    ahead: 'سابق وقته',
    addTask: 'إضافة مهمة فرعية',
    settings: 'الإعدادات',
    gender: 'النوع',
    male: 'ذكر',
    female: 'أنثى',
    age: 'السن',
    fullName: 'اسمك بالكامل',
    aiName: 'اسم المساعد',
    aiPersonality: 'شخصية المساعد',
    gentle: 'هادي',
    savage: 'حازم',
    logout: 'خروج',
    noTasks: 'مفيش مهام فرعية مضافة دلوقتي. من فضلك ضيف مهمة فرعية تحت.',
    tapToEnter: 'دوس عشان تدخل',
    purge: 'مسح',
    deploy: 'عمل',
    missionColor: 'لون الهدف',
    missionScale: 'حجم الهدف',
    details: 'التفاصيل',
    time: 'الوقت',
    notes: 'الملاحظات',
    attachments: 'المرفقات',
    noDescription: 'مفيش وصف موجود',
    writeNotePlaceholder: '[ اكتب ملحوظة جديدة للمهمة... ]',
    googleDriveLinkBtn: 'اربط ملف من Google Drive',
    googleDriveDesc: 'بضغطة واحدة، اربط ملفاتك مباشرة من حسابك. مش هنستهلك أي مساحة من السيرفر.',
    taskDetail: 'تفاصيل المهمة',
    savedProgress: 'التقدم اللي اتحفظ',
    coreTaskStatement: 'بيان المهمة الأساسي',
    writeDescriptionPlaceholder: 'اكتب وصف أو بيان للمهمة دي...',
    completed: 'خلصت',
    inProgress: 'بيتعمل',
    priority: 'الأهمية: ',
    high: 'عالية 🔥',
    regular: 'عادية',
    statusComplexity: 'الحالة والتقدير',
    currentStatus: 'الحالة دلوقتي',
    taskWeight: 'وزن المهمة / أهميتها',
    timeTrackingTitle: 'تتبع الوقت جاي قريب',
    timeTrackingDesc: 'في التحديث الجاي، هتقدر تشغل مؤقت بومودورو مخصوص لكل مهمة وتربطه بالكامل مع سجل التتبع كله.',
    addNote: 'ضيف ملحوظة',
    deleteAttachment: 'مسح المرفق',
    markIncomplete: 'شيل علامة خلصت',
    markCompleted: 'خلصتها!',
    googleApiNotConfigured: 'مفاتيح Google API مش جاهزة لسه.',
  }
}

interface GrowthContextType {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  isLoading: boolean
  isRTL: boolean
  tutorialActive: boolean
  setTutorialActive: (active: boolean) => void
  isTourActive: boolean
  setIsTourActive: (active: boolean) => void
  restartTour: () => void
  fetchGoals: () => Promise<void>
  refreshProfile: () => Promise<void>
  t: (key: keyof typeof TRANSLATIONS['en']) => string
  mounted: boolean
  currentTheme: typeof THEME_PACKAGES['SILVER']
  addXp: (amount: number, taskTitle?: string) => Promise<void>
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
  perks: {
    hasTitle: boolean
    hasAvatarBorder: boolean
    hasExclusiveEmojis: boolean
    hasNameGlow: boolean
    hasCallingCard: boolean
  }
  getRankNeonClass: (rank: string) => string
  tasksCompletedToday: number
  isCreateGoalModalOpen: boolean
  openCreateGoalModal: (opts?: { prefillTitle?: string; goalType?: 'solo' | 'squad' }) => void
  closeCreateGoalModal: () => void
  createGoalModalOpts: { prefillTitle?: string; goalType?: 'solo' | 'squad' }
  isTaskDrawerOpen: boolean
  setIsTaskDrawerOpen: (open: boolean) => void
}

const GrowthContext = createContext<GrowthContextType | undefined>(undefined)

export function getRankNeonClass(rank: string): string {
  switch (rank?.toUpperCase()) {
    case 'SILVER':
      return 'text-slate-200'
    case 'GOLD':
      return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] font-bold'
    case 'PLATINUM':
      return 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] font-bold'
    case 'DIAMOND':
      return 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] font-bold'
    case 'CROWN':
      return 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] font-bold'
    case 'ACE':
      return 'text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] font-bold'
    case 'CONQUEROR':
      return 'bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 text-transparent bg-clip-text animate-pulse font-black'
    default:
      return 'text-slate-200'
  }
}

export function GrowthProvider({ children }: { children: React.ReactNode }) {
  // Language detection (Point 1)
  const getSystemLanguage = (): Language => {
    if (typeof window === 'undefined') return 'en'
    const cached = localStorage.getItem('language')
    if (cached === 'ar' || cached === 'en') return cached
    const browserLang = navigator.language || (navigator as any).userLanguage || ''
    const resolved = browserLang.toLowerCase().startsWith('ar') ? 'ar' : 'en'
    localStorage.setItem('language', resolved)
    return resolved
  }

  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cached_profile')
      if (cached) {
        try {
          return JSON.parse(cached) as Profile
        } catch (e) {}
      }
      // Set default language state based on detection
      const initialLang = getSystemLanguage()
      return { language: initialLang } as Profile
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
  const [isTourActive, setIsTourActive] = useState(false)
  const [mounted, setMounted] = useState(false)

  const generateHelpGoal = async (userId: string) => {
    const isAr = (profile?.language || 'en') === 'ar'
    const seedGoalTitle = isAr ? "مرحباً بك في Growth Hub 🚀" : "Welcome to Growth Hub 🚀"

    if (userId === 'guest') {
      const fakeId = 'local_' + Math.random().toString(36).substring(2, 9)
      const arSteps = [
        "أنشئ مهمتك الأولى لتنظيم يومك.",
        "حدد موعداً نهائياً للمهمة لمتابعة وقتك."
      ]
      const enSteps = [
        "Create your first task",
        "Set a deadline"
      ]
      const steps = isAr ? arSteps : enSteps
      const newLocalGoal = {
        id: fakeId,
        user_id: 'guest',
        title: seedGoalTitle,
        status: 'active',
        size: 'md',
        is_archived: false,
        sync_to_dashboard: true,
        isPinned: true,
        is_pinned: true,
        created_at: new Date().toISOString(),
        metadata: { defaultView: 'list', is_tutorial: true },
        tasks: steps.map((step) => ({
          id: 'local_task_' + Math.random().toString(36).substring(2, 9),
          goal_id: fakeId,
          title: step,
          weight: 3,
          is_completed: false
        }))
      }
      localStorage.setItem('guest_goals', JSON.stringify([newLocalGoal]))
      return
    }

    const { data: newGoal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: seedGoalTitle,
        status: 'active',
        size: 'md',
        is_archived: false,
        sync_to_dashboard: true,
        is_pinned: true,
        isPinned: true,
        metadata: { defaultView: 'list', is_tutorial: true }
      })
      .select()
      .single()

    if (goalError) {
      console.error('generateHelpGoal // GOAL_CREATION_FAILED:', goalError)
      return
    }

    if (newGoal) {
      const arSteps = [
        "أنشئ مهمتك الأولى لتنظيم يومك.",
        "حدد موعداً نهائياً للمهمة لمتابعة وقتك."
      ]
      const enSteps = [
        "Create your first task",
        "Set a deadline"
      ]
      const steps = isAr ? arSteps : enSteps
      const taskPayloads = steps.map((step) => ({
        goal_id: newGoal.id,
        title: step,
        weight: 3,
        is_completed: false
      }))
      const { error: tasksError } = await supabase.from('tasks').insert(taskPayloads)
      if (tasksError) {
        console.error('generateHelpGoal // TASKS_CREATION_FAILED:', tasksError)
      }
    }
  }

  const restartTour = () => {
    localStorage.removeItem('tour_completed')
    localStorage.removeItem('onboarding_completed')
    localStorage.removeItem('onboarding_complete')
    if (profile && profile.id) {
      localStorage.removeItem(`tutorial_done_${profile.id}`)
    }
    setIsTourActive(true)
    setTutorialActive(true)
    router.push('/goals')
  }

  const fetchGoals = async () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-goals'))
    }
  }
  // const [lastAiMessage, setLastAiMessage] = useState('SYSTEM_ONLINE // STANDING_BY')
  const [lastAiMessage, setLastAiMessage] = useState('System Online — Standing By')
  const [isRankUpModalOpen, setIsRankUpModalOpen] = useState(false)
  const [oldRank, setOldRank] = useState('SILVER')
  const [newRank, setNewRank] = useState('SILVER')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [topXpUserId, setTopXpUserId] = useState<string | null>(null)
  const [isCreateGoalModalOpen, setIsCreateGoalModalOpen] = useState(false)
  const [createGoalModalOpts, setCreateGoalModalOpts] = useState<{ prefillTitle?: string; goalType?: 'solo' | 'squad' }>({})
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false)

  const openCreateGoalModal = (opts?: { prefillTitle?: string; goalType?: 'solo' | 'squad' }) => {
    setCreateGoalModalOpts(opts || {})
    setIsCreateGoalModalOpen(true)
  }

  const closeCreateGoalModal = () => {
    setIsCreateGoalModalOpen(false)
    setCreateGoalModalOpts({})
  }
  
  // Anti-cheat state variables
  const [cooldownEnd, setCooldownEnd] = useState<string | null>(null)
  const [completionTimestamps, setCompletionTimestamps] = useState<number[]>([])
  const [tasksCompletedToday, setTasksCompletedTodayState] = useState<number>(0)

  const getTasksCompletedToday = () => {
    if (typeof window === 'undefined') return 0
    const todayStr = new Date().toISOString().split('T')[0]
    const cachedDate = localStorage.getItem('tasks_completed_date')
    if (cachedDate !== todayStr) {
      localStorage.setItem('tasks_completed_date', todayStr)
      localStorage.setItem('tasks_completed_today_count', '0')
      return 0
    }
    const count = localStorage.getItem('tasks_completed_today_count')
    return count ? parseInt(count, 10) : 0
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTasksCompletedTodayState(getTasksCompletedToday())
      
      const end = localStorage.getItem('xp_cooldown_end')
      if (end && new Date(end).getTime() > Date.now()) {
        setCooldownEnd(end)
      }
      const cachedTimestamps = localStorage.getItem('completion_timestamps')
      if (cachedTimestamps) {
        try {
          setCompletionTimestamps(JSON.parse(cachedTimestamps))
        } catch {}
      }
    }
  }, [])

  const incrementTasksCompletedToday = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    const currentCount = getTasksCompletedToday()
    const nextCount = currentCount + 1
    localStorage.setItem('tasks_completed_date', todayStr)
    localStorage.setItem('tasks_completed_today_count', String(nextCount))
    setTasksCompletedTodayState(nextCount)
    return nextCount
  }
  
  const supabase = createClient()
  const router = useRouter()
  const { playRankUpChime } = useSound()

  const isRTL = useMemo(() => profile?.language?.startsWith('ar') || false, [profile?.language])

  // Poll for top XP user to dynamically award CONQUEROR
  const fetchTopXpUser = async () => {
    try {
      const res = await fetch('/api/top-xp')
      const data = await res.json()
      if (data && data.success && data.topUser) {
        setTopXpUserId(data.topUser.id)
      }
    } catch (e) {
      console.error('Failed to fetch top XP user:', e)
    }
  }

  useEffect(() => {
    fetchTopXpUser()
    const interval = setInterval(fetchTopXpUser, 30000)
    return () => clearInterval(interval)
  }, [])

  const calculatedRank = useMemo(() => {
    if (profile?.id && topXpUserId && profile.id === topXpUserId) {
      return 'CONQUEROR'
    }
    const xp = profile?.xp || 0
    if (xp >= 7000) return 'ACE'
    if (xp >= 4000) return 'CROWN'
    if (xp >= 2000) return 'DIAMOND'
    if (xp >= 1000) return 'PLATINUM'
    if (xp >= 400) return 'GOLD'
    return 'SILVER'
  }, [profile?.xp, profile?.id, topXpUserId])

  const profileWithCalculatedRank = useMemo(() => {
    if (!profile) return null
    return {
      ...profile,
      rank: calculatedRank
    }
  }, [profile, calculatedRank])

  // Rank-based capabilities (Perks) logic
  const perks = useMemo(() => {
    const r = calculatedRank
    const rankOrder = ['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CROWN', 'ACE', 'CONQUEROR']
    const hasRankOrHigher = (target: string) => {
      const currentIdx = rankOrder.indexOf(r)
      const targetIdx = rankOrder.indexOf(target)
      return currentIdx >= targetIdx && currentIdx !== -1
    }

    return {
      hasTitle: hasRankOrHigher('GOLD'),
      hasAvatarBorder: hasRankOrHigher('PLATINUM'),
      hasExclusiveEmojis: hasRankOrHigher('DIAMOND'),
      hasNameGlow: hasRankOrHigher('CROWN'),
      hasCallingCard: hasRankOrHigher('ACE')
    }
  }, [calculatedRank])

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
      // metaThemeColor.setAttribute('content', currentTheme.color)
      metaThemeColor.setAttribute('content', '#0a0a0f')
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
        (payload: any) => {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
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
        // Restore the page the user was trying to visit before login
        if (typeof window !== 'undefined') {
          const pendingUrl = sessionStorage.getItem('auth_redirect_url')
          if (pendingUrl) {
            sessionStorage.removeItem('auth_redirect_url')
            // Use replace so the user can't "back" to the login page
            router.replace(pendingUrl)
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const checkXpAward = (amount: number, taskTitle?: string): { xpToAward: number, reason?: string, silent?: boolean } => {
    // If it's a negative amount (XP deduction on un-completing), we don't apply filters
    if (amount <= 0) return { xpToAward: amount }

    // Layer 3: Focus Capacity (Max 9 XP-earning tasks daily)
    const completedToday = getTasksCompletedToday()
    if (completedToday >= 9) {
      return { xpToAward: 0, silent: true }
    }

    // Layer 2: Velocity Trap (Cooldown)
    const now = Date.now()
    if (cooldownEnd && new Date(cooldownEnd).getTime() > now) {
      return { xpToAward: 0, reason: 'velocity' }
    }

    // Layer 1: Regex Bouncer (Quality Filter)
    if (taskTitle) {
      const trimmed = taskTitle.trim()
      const isTooShort = trimmed.length < 5
      const isOnlyNumbers = /^\d+$/.test(trimmed)
      const hasRepeatingChars = /([a-zA-Z\u0600-\u06FF])\1{3,}/.test(trimmed)
      
      const spamWords = ['test', 'asdf', 'asd', 'testing', 'تجر', 'تجربة', 'المه', 'المهمة']
      const isSpamWord = spamWords.some(word => trimmed.toLowerCase() === word)

      if (isTooShort || isOnlyNumbers || hasRepeatingChars || isSpamWord) {
        return { xpToAward: 0, reason: 'quality' }
      }
    }

    return { xpToAward: amount }
  }

  const triggerToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('growth-toast', { detail: { message, type } }))
    }
  }

  const addXp = async (amount: number, taskTitle?: string) => {
    if (!profile) return
    
    const { xpToAward, reason, silent } = checkXpAward(amount, taskTitle)
    
    // Update daily tasks count only on positive XP award attempts (which represent a task completion)
    if (amount > 0) {
      incrementTasksCompletedToday()
      
      // Handle velocity stamps if not already on cooldown
      const now = Date.now()
      const isOnCooldown = cooldownEnd && new Date(cooldownEnd).getTime() > now
      if (!isOnCooldown) {
        const nextTimestamps = [...completionTimestamps, now].filter(t => now - t < 60000)
        setCompletionTimestamps(nextTimestamps)
        localStorage.setItem('completion_timestamps', JSON.stringify(nextTimestamps))
        if (nextTimestamps.length >= 3) {
          const end = new Date(now + 15 * 60 * 1000).toISOString()
          setCooldownEnd(end)
          localStorage.setItem('xp_cooldown_end', end)
        }
      }
    }

    // Trigger toasts
    if (reason === 'quality') {
      triggerToast(
        // isRTL ? "اسم المهمة غير واضح. تم تشغيل فلتر الجودة. تم منح 0 XP." : "Task name too vague. Quality filter triggered. 0 XP awarded.",
        isRTL ? "اسم الـ Task مش واضح. فلتر الجودة اشتغل. اتمنح 0 XP." : "Task name too vague. Quality filter triggered. 0 XP awarded.",
        'warning'
      )
    } else if (reason === 'velocity' || (amount > 0 && completionTimestamps.filter(t => Date.now() - t < 60000).length >= 2)) {
      triggerToast(
        // isRTL ? "تم اكتشاف سبام. تم إيقاف كسب نقاط الـ XP مؤقتاً لمدة 15 دقيقة." : "Spam detected. XP gain is on cooldown for 15 minutes.",
        isRTL ? "شكلها سبام. كسب الـ XP وقف مؤقتاً لمدة 15 دقيقة." : "Spam detected. XP gain is on cooldown for 15 minutes.",
        'warning'
      )
    }

    const newXp = Math.max(0, (profile.xp || 0) + Math.round(xpToAward))

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

        const isRTL = profile.language === 'ar'
        const notifTitle = isRTL ? '🎉 ترقية الرتبة!' : '🎉 Rank Up!'
        const notifContent = isRTL 
          ? `لقد وصلت إلى رتبة ${nextRank}! استمر في التقدم.` 
          : `You reached ${nextRank}! Keep going.`

        await supabase.from('inbox_reports').insert({
          user_id: profile.id,
          type: 'rank_up',
          title: notifTitle,
          content: {
            text: notifContent,
            rank: nextRank
          }
        })
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
                    .from('goals')
                    .insert({ ...rest, user_id: user.id })
                    .select()
                    .single()

                  if (newCup && tasks && tasks.length > 0) {
                    const taskPayloads = tasks.map((t: any) => ({
                      // cup_id: newCup.id,
                      goal_id: newCup.id,
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
        let profileData: Profile | null = null
        let isNewUser = false

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

          profileData = {
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
        } else {
          console.log('PROFILE_MISSING: Auto-creating profile for', user.id)
          isNewUser = true
          const gender = user.user_metadata?.gender || null;
          const age = user.user_metadata?.age || user.user_metadata?.age_range?.min || null;
          const full_name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

          const customAvatar = user.user_metadata?.custom_avatar || null;
          const googleAvatar = user.user_metadata?.avatar_url || null;
          const defaultAvatar = (gender === 'female' || gender === 'أنثى' || gender === 'Female') ? '/avatars/menna.svg' : '/avatars/omar.svg';
          const resolvedAvatarUrl = customAvatar || googleAvatar || defaultAvatar;

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              full_name,
              avatar_url: resolvedAvatarUrl,
              gender,
              age,
              onboarded: true,
              xp: 0,
              rank: 'RECRUIT',
              active_theme: 'INIT_GREEN',
              language: storedLang || 'en'
            }, { onConflict: 'id' })
            .select()
            .single()

          if (!createError && newProfile) {
            profileData = {
              ...newProfile,
              avatar_url: resolvedAvatarUrl,
              custom_avatar: customAvatar,
              google_avatar_url: googleAvatar,
              email: user.email || null
            } as Profile
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.error('PROFILE_CREATION_FAILED:', createError)
            } else {
              console.warn('PROFILE_CREATION_SILENCED: metadata fallback active.')
            }
            
            profileData = {
              id: user.id,
              full_name,
              avatar_url: resolvedAvatarUrl,
              gender,
              age,
              onboarded: true,
              xp: 0,
              rank: 'RECRUIT',
              active_theme: 'INIT_GREEN',
              language: storedLang || 'en',
              custom_avatar: customAvatar,
              google_avatar_url: googleAvatar,
              email: user.email || null
            } as Profile
          }
        }

        if (profileData) {
          setProfile(profileData)

          if (typeof window !== 'undefined') {
            localStorage.setItem('cached_profile', JSON.stringify(profileData))
            if (profileData.language) {
               localStorage.setItem('language', profileData.language)
            }
          }

          // Seeding and Tutorial Logic
          try {
            const hasCompletedTour = typeof window !== 'undefined' && localStorage.getItem('tour_completed') === 'true'

            if (!hasCompletedTour) {
              const { count, error: countError } = await supabase
                .from('goals')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_archived', false)

              if (isNewUser || (!countError && count === 0)) {
                await generateHelpGoal(user.id)
                await fetchGoals()
                setTutorialActive(true)
                setIsTourActive(true)
                if (typeof window !== 'undefined') {
                  localStorage.setItem('tour_completed', 'true')
                  localStorage.setItem('onboarding_completed', 'true')
                }
              }
            }
          } catch (seedErr) {
            console.error('Seeding tutorial failed:', seedErr)
          }

          // Blocked Check
          if (profileData.blocked) {
            router.push('/blocked')
            return
          }
        }
      } else {
        const hasLocalAuth = typeof window !== 'undefined' && !!localStorage.getItem('growth-hub-auth-token')
        const hasCachedProfile = typeof window !== 'undefined' && !!localStorage.getItem('cached_profile')
        /*
        if (hasLocalAuth && hasCachedProfile) {
          console.log('HYDRATION_INTEGRATION: Active cached session and local tokens present. Bypassing redirect.')
        } else {
        */
        let isCachedGuest = false
        if (hasCachedProfile && typeof window !== 'undefined') {
          try {
            const cachedP = JSON.parse(localStorage.getItem('cached_profile') || '{}')
            if (cachedP?.id === 'guest') {
              isCachedGuest = true
            }
          } catch (e) {}
        }

        if (hasLocalAuth && hasCachedProfile && !isCachedGuest) {
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
            
            // Seed tutorial goals for guests if empty (Point 2)
            const hasCompletedTour = typeof window !== 'undefined' && localStorage.getItem('tour_completed') === 'true'
            if (!hasCompletedTour) {
              const guestGoalsStr = localStorage.getItem('guest_goals')
              const guestGoals = guestGoalsStr ? JSON.parse(guestGoalsStr) : []
              if (guestGoals.length === 0) {
                await generateHelpGoal('guest')
                await fetchGoals()
                setTutorialActive(true)
                setIsTourActive(true)
                if (typeof window !== 'undefined') {
                  localStorage.setItem('tour_completed', 'true')
                  localStorage.setItem('onboarding_completed', 'true')
                }
              }
            }
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
      profile: profileWithCalculatedRank, setProfile, 
      isLoading,
      isRTL,
      tutorialActive, setTutorialActive,
      isTourActive, setIsTourActive,
      restartTour,
      fetchGoals,
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
      setShowAuthModal,
      perks,
      getRankNeonClass,
      tasksCompletedToday,
      isCreateGoalModalOpen,
      openCreateGoalModal,
      closeCreateGoalModal,
      createGoalModalOpts,
      isTaskDrawerOpen,
      setIsTaskDrawerOpen
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
