'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGrowth, RANK_THRESHOLDS } from '@/context/GrowthContext'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useSound } from '@/context/SoundContext'
import { 
  LayoutGrid, Target, FileText, Trophy, UserCircle2, Sliders, Bot,
  Laptop, GraduationCap, Briefcase, Rocket, Video, TrendingUp, CloudLightning,
  Shield, Home, User, Users
} from 'lucide-react'
import { NeonIcon } from '../ui/NeonIcon'

export default function Sidebar({ isRTL = false, onOpenCoach }: { isRTL?: boolean, onOpenCoach?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, t, currentTheme, perks, getRankNeonClass } = useGrowth()
  const [cachedName, setCachedName] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const { playBlip } = useSound()

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isSettingsHovered, setIsSettingsHovered] = useState(false)
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(false)

  useEffect(() => {
    if (pathname.startsWith('/goals')) {
      setIsGoalsExpanded(true)
    }
  }, [pathname])

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      if (profile?.full_name) {
        localStorage.setItem('cached_name', profile.full_name)
        setCachedName(profile.full_name)
      } else {
        setCachedName(localStorage.getItem('cached_name'))
      }
    }
  }, [profile?.full_name])

  const { currentXp, nextRankName, xpNeeded, progressPct } = useMemo(() => {
    if (!profile) return { currentXp: 0, nextRankName: 'PLATINUM', xpNeeded: 800, progressPct: 0 }
    const xp = profile.xp || 0
    const currentRankIdx = Math.max(0, RANK_THRESHOLDS.findIndex(r => r.rank === profile.rank))
    const nextRank = RANK_THRESHOLDS[currentRankIdx + 1]
    if (!nextRank) {
      return { currentXp: xp, nextRankName: 'MAX RANK', xpNeeded: 0, progressPct: 100 }
    }
    const prevXp = RANK_THRESHOLDS[currentRankIdx].xp
    const targetXp = nextRank.xp
    const needed = targetXp - xp
    const range = targetXp - prevXp
    const earned = xp - prevXp
    const pct = Math.min(100, Math.max(0, (earned / range) * 100))
    return { currentXp: xp, nextRankName: nextRank.rank, xpNeeded: needed > 0 ? needed : 0, progressPct: pct }
  }, [profile])

  const getRoleIconComponent = (url?: string | null) => {
    if (!url) return UserCircle2
    if (url.includes('omar')) return Laptop
    if (url.includes('maya')) return GraduationCap
    if (url.includes('ismail')) return Briefcase
    if (url.includes('zain')) return Rocket
    if (url.includes('menna')) return Video
    if (url.includes('nour')) return TrendingUp
    return CloudLightning
  }

  const MENU_ITEMS = [
    { icon: Home, label: mounted ? (isRTL ? 'الرئيسية' : "Home") : "Home", href: '/', shortcut: '01', exact: true },
    /*
    { icon: Target, label: mounted ? (isRTL ? 'أهدافي' : 'Goals') : 'Goals', href: '/missions', shortcut: '02', exact: false },
    { icon: FileText, label: mounted ? (isRTL ? 'ملاحظاتي' : 'Notes') : 'Notes', href: '/notes', shortcut: '03', exact: false },
    { icon: Trophy, label: mounted ? (isRTL ? 'إنجازاتي' : 'Wins') : 'Wins', href: '/achievements', shortcut: '04', exact: false },
    */
    { icon: Target, label: mounted ? (isRTL ? 'الـ Goals' : 'Goals') : 'Goals', href: '/missions', shortcut: '02', exact: false },
    { icon: FileText, label: mounted ? (isRTL ? 'ملاحظاتي' : 'Notes') : 'Notes', href: '/notes', shortcut: '03', exact: false },
    { icon: Trophy, label: mounted ? (isRTL ? 'إنجازاتي' : 'Wins') : 'Wins', href: '/achievements', shortcut: '04', exact: false },
  ]

  /*
  Legacy Aside with border-none:
  <aside className={cn(
    "hidden lg:flex w-72 bg-transparent dark:bg-black/10 backdrop-blur-[40px] border-none h-screen fixed top-0 flex-col z-[110] shadow-none sidebar-target transition-all duration-300",
    "inset-inline-start-0"
  )}>
  */
  return (
    /* bg-[var(--sidebar-bg)] border-[var(--card-border)] */
    /* bg-white/60 dark:bg-black/40 backdrop-blur-3xl border-x-0 shadow-[20px_0_50px...] */
    <aside className={cn(
      "hidden lg:flex w-72 bg-transparent dark:bg-gradient-to-r dark:from-black/10 dark:to-transparent backdrop-blur-[40px] border-r border-black/5 dark:border-white/[0.03] shadow-[10px_0_30px_-10px_rgba(0,0,0,0.3)] h-screen fixed top-0 flex-col z-[110] sidebar-target transition-all duration-300",
      "inset-inline-start-0"
    )}>
      {/* ── ULTRA-PREMIUM IDENTITY LAYER ── */}
      {/* bg-[var(--sidebar-bg)]/50 border-[var(--card-border)] */}
      {/* border-b border-black/5 dark:border-white/5 */}
      <div className="pt-12 px-8 flex flex-col items-center text-center relative overflow-hidden group border-b-0 pb-8 bg-transparent">
        {/* Avatar Component with Instagram-style neon ring */}
        <div className={cn(
          "relative p-1.5 rounded-full bg-gradient-to-tr shadow-2xl group-hover:scale-105 transition-transform duration-500 cursor-pointer",
          mounted && perks.hasAvatarBorder ? "ring-4 ring-offset-2 ring-[var(--theme-color)] ring-offset-[var(--sidebar-bg)] animate-pulse" : ""
        )} onClick={() => router.push('/settings')} style={{ backgroundImage: `linear-gradient(to top right, ${currentTheme.color}, ${currentTheme.color}88, transparent, ${currentTheme.color})`, boxShadow: `0 0 30px ${currentTheme.color}50` }}>
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-zinc-100/80 dark:bg-white/10 backdrop-blur-md p-1 overflow-hidden flex items-center justify-center border border-black/20 dark:border-white/10 shadow-inner">
            {mounted && profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="User" className="w-[90%] h-[90%] mx-auto object-contain p-1 rounded-full shadow-md" />
            ) : (
              <NeonIcon icon={UserCircle2} size={48} className="text-[var(--text-secondary)]" />
            )}
          </div>
          {/* Visual Role Icon Overlay Badge at bottom-right */}
          {mounted && profile?.avatar_url && (
            <div 
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-[var(--sidebar-bg)] shadow-lg z-20 backdrop-blur-md"
              style={{ 
                backgroundColor: currentTheme.color, 
                color: '#000000',
                boxShadow: `0 0 15px ${currentTheme.color}` 
              }}
              title="Active Persona Role"
            >
              {(() => {
                const IconComponent = getRoleIconComponent(profile.avatar_url)
                return <NeonIcon icon={IconComponent} size={16} className="text-black" />
              })()}
            </div>
          )}
        </div>

        {/* User Full Name */}
        <span className={cn(
          "text-base font-space font-black truncate max-w-[220px] transition-all tracking-wide mt-4 text-center",
          mounted && perks.hasNameGlow ? getRankNeonClass(profile?.rank || '') : "text-zinc-900 dark:text-zinc-100"
        )}>
          {mounted ? (profile?.full_name || cachedName || (t ? t('operator') : 'USER')) : 'USER'}
        </span>

        {/* Dynamic Title (hasTitle Perk) */}
        {mounted && perks.hasTitle && (
          <span className="text-[10px] font-space font-black uppercase tracking-[0.2em] opacity-80 mt-1" style={{ color: currentTheme.color }}>
            [ {isRTL ? (
              /*
              profile?.rank === 'GOLD' ? 'المشغل الذهبي' :
              profile?.rank === 'PLATINUM' ? 'النخبة البلاتينية' :
              profile?.rank === 'DIAMOND' ? 'الماستر الماسي' :
              profile?.rank === 'CROWN' ? 'الملك المتوج' :
              profile?.rank === 'ACE' ? 'البطل القرمزي' : 'الفاتح الأعظم'
              */
              profile?.rank === 'GOLD' ? 'الأوبريتور الذهبي' :
              profile?.rank === 'PLATINUM' ? 'النخبة البلاتينية' :
              profile?.rank === 'DIAMOND' ? 'الماستر الماسي' :
              profile?.rank === 'CROWN' ? 'الملك المتوج' :
              profile?.rank === 'ACE' ? 'البطل القرمزي' : 'الفاتح الأعظم'
            ) : (
              profile?.rank === 'GOLD' ? 'Gold Operator' :
              profile?.rank === 'PLATINUM' ? 'Platinum Elite' :
              profile?.rank === 'DIAMOND' ? 'Diamond Master' :
              profile?.rank === 'CROWN' ? 'Crown Monarch' :
              profile?.rank === 'ACE' ? 'Ace Champion' : 'Conqueror Supreme'
            )} ]
          </span>
        )}

        {/* Current Rank Text */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className={cn("text-xs font-space font-black tracking-widest uppercase text-center", mounted ? getRankNeonClass(profile?.rank || '') : '')}>
            ◆ {mounted ? (profile?.rank || 'SILVER') : 'SILVER'}
          </span>
        </div>

        {/* XP Progress Bar */}
        <div className="w-full space-y-1.5 mt-5 px-2">
          <div className="flex justify-between items-center w-full text-[11px] font-space tracking-wider font-black">
            <span className="text-zinc-500 dark:text-zinc-400 uppercase text-left leading-tight">
              {mounted
                ? (isRTL
                    /* ? `${xpNeeded} نقطة إلى ${nextRankName === 'MAX RANK' ? 'أعلى رتبة' : nextRankName}` */
                    ? `${xpNeeded} XP لحد ${nextRankName === 'MAX RANK' ? 'أعلى Rank' : nextRankName}`
                    : `${xpNeeded}xp to ${nextRankName}`)
                : `800xp to PLATINUM`}
            </span>
            <span className="text-xs font-bold shrink-0 pl-2" style={{ color: currentTheme.color }}>
              {progressPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION MATRIX ── */}
      <nav className="flex-grow px-4 py-8 space-y-2 overflow-y-auto font-space">
        <h3 className="px-6 text-[9px] font-space tracking-[0.8em] text-[var(--text-secondary)]/50 uppercase mb-6 font-black font-space">
          {mounted ? (isRTL ? 'القائمة' : 'MENU') : 'MENU'}
        </h3>
        {MENU_ITEMS.map((item, idx) => {
          if (item.shortcut === '02') {
            const isGoalsActive = pathname.startsWith('/goals') || pathname.startsWith('/missions')
            const isHovered = hoveredIndex === idx
            return (
              <div key={item.href} className="flex flex-col w-full">
                <button
                  type="button"
                  onClick={() => {
                    playBlip()
                    setIsGoalsExpanded(!isGoalsExpanded)
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    "flex items-center p-3 px-6 rounded-md transition-all duration-300 relative group overflow-hidden min-h-[44px] w-full text-left cursor-pointer",
                     isGoalsActive && !pathname.startsWith('/goals/')
                       ? "bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-sm" 
                       : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--card-border)] hover:bg-[var(--input-bg)]"
                  )}
                >
                  {/* Active Nav Strip Removed */}
                  
                  <NeonIcon
                    icon={item.icon}
                    interactive
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      isRTL ? "ml-4" : "mr-4"
                    )}
                    style={{ 
                      color: (isGoalsActive && !pathname.startsWith('/goals/'))
                        ? currentTheme.color 
                        : (isHovered ? `${currentTheme.color}cc` : undefined)
                    }}
                  />
                  
                  <span className={cn(
                    "font-space tracking-[0.2em] font-black flex-grow transition-colors duration-300 text-[14px]"
                  )}
                  style={{ 
                    color: (isGoalsActive && !pathname.startsWith('/goals/'))
                      ? currentTheme.color 
                      : (isHovered ? currentTheme.color : undefined)
                  }}
                  >
                    {item.label}
                  </span>

                  <div className="flex items-center gap-2 shrink-0 select-none">
                    <span 
                      className="text-[9px] font-space text-[var(--text-secondary)]/30 font-black transition-colors duration-300"
                      style={{ 
                        color: isHovered ? `${currentTheme.color}66` : undefined 
                      }}
                    >
                      {item.shortcut}
                    </span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isGoalsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden flex flex-col gap-1.5 mt-1.5 pl-4"
                    >
                      {[
                        { label: mounted ? (isRTL ? 'شخصي' : 'Personal Goals') : 'Personal Goals', icon: User, href: '/goals/solo' },
                        /* { label: mounted ? (isRTL ? 'فريق' : 'Team Goals') : 'Team Goals', icon: Users, href: '/goals/squad' } */
                        { label: mounted ? (isRTL ? 'Squad' : 'Team Goals') : 'Team Goals', icon: Users, href: '/goals/squad' }
                      ].map((subItem, subIdx) => {
                        const isSubActive = pathname === subItem.href
                        const isSubHovered = hoveredIndex === (100 + subIdx)
                        const IconComponent = subItem.icon
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={playBlip}
                            onMouseEnter={() => setHoveredIndex(100 + subIdx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className={cn(
                              "flex items-center p-2.5 px-4 rounded-md transition-all duration-300 relative group overflow-hidden min-h-[38px] border border-transparent",
                              isSubActive 
                                ? "bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--card-border)] shadow-sm" 
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)]"
                            )}
                          >



                            <NeonIcon 
                              icon={subItem.icon}
                              interactive
                              className={cn(
                                "w-4 h-4 transition-all duration-300",
                                isRTL ? "ml-4" : "mr-4"
                              )}
                              style={{ 
                                color: isSubActive 
                                  ? currentTheme.color 
                                  : (isSubHovered ? `${currentTheme.color}cc` : undefined)
                              }}
                            />

                            <span className={cn(
                              "font-space tracking-[0.2em] font-black flex-grow transition-colors duration-300 text-[12px]"
                            )}
                            style={{ 
                              color: isSubActive 
                                ? currentTheme.color 
                                : (isSubHovered ? currentTheme.color : undefined)
                            }}
                            >
                              {subItem.label}
                            </span>
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const isHovered = hoveredIndex === idx
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={playBlip}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={cn(
                "flex items-center p-3 px-6 rounded-md transition-all duration-300 relative group overflow-hidden min-h-[44px]",
                 isActive 
                   ? "bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-sm" 
                   : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--card-border)] hover:bg-[var(--input-bg)]"
              )}
            >
              {/* Active Nav Strip Removed */}
              
              <NeonIcon
                icon={item.icon}
                interactive
                className={cn(
                  "w-5 h-5 transition-all duration-300",
                  isRTL ? "ml-4" : "mr-4"
                )}
                style={{ 
                  color: isActive 
                    ? currentTheme.color 
                    : (isHovered ? `${currentTheme.color}cc` : undefined)
                }}
              />
              
              <span className={cn(
                "font-space tracking-[0.2em] font-black flex-grow transition-colors duration-300",
                isRTL ? "text-[15px]" : "text-[11px]"
              )}
              style={{ 
                color: isActive 
                  ? currentTheme.color 
                  : (isHovered ? currentTheme.color : undefined)
              }}
              >
                {item.label}
              </span>

              <span 
                className="text-[9px] font-space text-[var(--text-secondary)]/30 font-black transition-colors duration-300"
                style={{ 
                  color: isHovered ? `${currentTheme.color}66` : undefined 
                }}
              >
                {item.shortcut}
              </span>
            </Link>
          )
        })}

        {/* ── PROMINENT GLOWING AI COACH BLOCK ── */}
        <div className="pt-6 px-2">
          <button
            type="button"
            onClick={() => onOpenCoach?.()}
            className="w-full group relative flex items-center justify-between p-4 rounded-md border transition-all duration-300 overflow-hidden cursor-pointer shadow-lg active:scale-98"
            style={{
              backgroundColor: `${currentTheme.color}15`,
              borderColor: `${currentTheme.color}50`,
              boxShadow: `0 0 25px ${currentTheme.color}26, inset 0 0 15px ${currentTheme.color}15`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <motion.span 
                animate={{ opacity: [1, 0.4, 1], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <NeonIcon icon={Bot} className="w-5 h-5" style={{ color: currentTheme.color, filter: `drop-shadow(0 0 8px ${currentTheme.color})` }} />
              </motion.span>
              <span className="font-space font-black text-xs tracking-[0.3em] uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-white transition-colors font-space">
                {/* {mounted ? (isRTL ? 'المدرب الذكي' : 'COACH') : 'COACH'} */}
                {mounted ? (isRTL ? 'الـ Coach' : 'COACH') : 'COACH'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded border text-[9px] font-space font-black tracking-widest uppercase relative z-10" style={{ color: currentTheme.color, borderColor: `${currentTheme.color}40`, backgroundColor: `${currentTheme.color}20` }}>
              AI // 05
            </span>
          </button>
        </div>
      </nav>

      {/* ── DOCKED SETTINGS & THEME TOGGLE ── */}
      {/* border-[var(--card-border)] bg-[var(--sidebar-bg)]/50 */}
      {/* border-t border-black/5 dark:border-white/5 */}
      <div className="p-4 mt-auto border-t-0 flex items-center gap-2 bg-transparent shrink-0">
        <Link 
          href="/settings" 
          onClick={playBlip}
          onMouseEnter={() => setIsSettingsHovered(true)}
          onMouseLeave={() => setIsSettingsHovered(false)}
          className="w-full flex items-center justify-start gap-3 p-3.5 glass-panel border rounded-md transition-all font-space text-xs tracking-[0.2em] font-black min-h-[44px]"
          style={{
            color: isSettingsHovered ? currentTheme.color : 'var(--text-secondary)',
            borderColor: isSettingsHovered ? `${currentTheme.color}40` : 'var(--card-border)',
            backgroundColor: isSettingsHovered ? `${currentTheme.color}10` : 'transparent',
            boxShadow: isSettingsHovered ? `0 0 20px ${currentTheme.color}20` : 'none'
          }}
        >
          <NeonIcon icon={Sliders} interactive className="w-4.5 h-4.5 transition-colors duration-300" style={{ color: isSettingsHovered ? currentTheme.color : undefined }} />
          <span className="transition-colors duration-300 text-zinc-900 dark:text-zinc-100 font-space font-black tracking-widest">
            {mounted ? (isRTL ? 'الإعدادات' : 'Settings') : 'Settings'}
          </span>
        </Link>
      </div>
    </aside>
  )
}

