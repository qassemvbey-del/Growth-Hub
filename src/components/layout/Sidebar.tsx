'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGrowth, RANK_THRESHOLDS } from '@/context/GrowthContext'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useSound } from '@/context/SoundContext'

export default function Sidebar({ isRTL = false }: { isRTL?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, t, currentTheme } = useGrowth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cachedName, setCachedName] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const { playBlip } = useSound()

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isSettingsHovered, setIsSettingsHovered] = useState(false)

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const MENU_ITEMS = [
    { icon: 'dashboard', label: mounted ? (isRTL ? 'الرئيسية' : "Home") : "Home", href: '/', shortcut: '01', exact: true },
    { icon: 'target', label: mounted ? (isRTL ? 'أهدافي' : 'Goals') : 'Goals', href: '/missions', shortcut: '02', exact: false },
    { icon: 'edit_document', label: mounted ? (isRTL ? 'ملاحظاتي' : 'Notes') : 'Notes', href: '/notes', shortcut: '03', exact: false },
    { icon: 'inventory_2', label: mounted ? (isRTL ? 'إنجازاتي' : 'Wins') : 'Wins', href: '/achievements', shortcut: '04', exact: false },
  ]

  return (
    <>
      {/* Mobile Tactical Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--sidebar-bg)] border-t border-[var(--card-border)] z-[200] flex justify-around items-center px-2">
        {MENU_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={playBlip}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors min-h-[44px] min-w-[44px]",
                isActive ? "" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              style={{ color: isActive ? currentTheme.color : undefined }}
            >
              <span className="material-symbols-outlined text-2xl">
                {item.icon}
              </span>
              <span className="text-[8px] font-space tracking-widest font-black uppercase">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
      
      <aside className={cn(
        "hidden lg:flex w-72 bg-[var(--sidebar-bg)] h-screen fixed top-0 flex-col z-[110] border-y-0 shadow-[20px_0_50px_rgba(0,0,0,0.05)] dark:shadow-[20px_0_50px_rgba(0,0,0,0.5)] sidebar-target transition-all duration-300",
        "inset-inline-start-0",
        isRTL ? "border-l border-[var(--card-border)]" : "border-r border-[var(--card-border)]"
      )}>
      {/* Sidebar Header - Profile Sync */}
      <div className="pt-16 px-10 flex flex-col items-start gap-6 relative overflow-hidden group text-start">
        <Link href="/settings" className="flex items-center gap-4 group/avatar">
            {profile?.avatar_url ? (
             <img 
               src={profile.avatar_url} 
               alt="User" 
               className="w-12 h-12 rounded-full border transition-all" 
               style={{ 
                 borderColor: `${currentTheme.color}4d`, 
                 boxShadow: `0 0 10px ${currentTheme.color}33` 
               }}
             />
           ) : (
               <div className="w-12 h-12 rounded-full bg-[var(--input-bg)] border border-[var(--card-border)] flex items-center justify-center group-hover/avatar:border-white/20 transition-all">
                 <span className="material-symbols-outlined text-[var(--text-secondary)]">person</span>
               </div>
             )}
           <div className="flex flex-col">
              <span className="text-[9px] font-space tracking-widest uppercase font-black opacity-40" style={{ color: currentTheme.color }}>
                {mounted ? (isRTL ? 'حالة المستخدم' : 'USER_STATUS') : 'USER_STATUS'}
              </span>
              <span className="text-sm font-space font-black text-[var(--text-primary)] truncate max-w-[120px] transition-colors" style={{ color: currentTheme.color }}>
                {profile?.full_name?.toUpperCase() || cachedName?.toUpperCase() || (t ? t('operator') : 'USER')}
              </span>
              <div className="mt-1 flex items-center gap-2">
                 <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--input-bg)] border border-[var(--card-border)] text-[7px] font-space font-black text-[var(--text-secondary)] tracking-widest uppercase">
                   {profile?.rank || 'RECRUIT'}
                 </span>
               </div>
           </div>
        </Link>

        {/* XP Progress Bar */}
        <div id="hud-xp-bar" className="w-full space-y-1.5">
          <div className="flex justify-between items-end text-sm font-space text-[var(--text-secondary)] tracking-widest uppercase font-black">
            <span>{mounted ? (isRTL ? 'نقاط الخبرة' : 'SYSTEM_XP') : 'SYSTEM_XP'}</span>
            <span className="text-3xl" style={{ color: currentTheme.color }}>{profile?.xp || 0}</span>
          </div>
          <div className="w-full h-[6px] bg-[var(--input-bg)] rounded-full overflow-hidden mt-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(() => {
                const currentXp = profile?.xp || 0
                const currentRankIdx = Math.max(0, RANK_THRESHOLDS.findIndex(r => r.rank === profile?.rank))
                const nextRank = RANK_THRESHOLDS[currentRankIdx + 1]
                if (!nextRank) return 100
                const prevXp = RANK_THRESHOLDS[currentRankIdx].xp
                const range = nextRank.xp - prevXp
                const relativeXp = currentXp - prevXp
                return Math.min(100, Math.max(0, (relativeXp / range) * 100))
              })()}%` }}
              className="h-full"
              style={{ 
                backgroundColor: currentTheme.color,
                boxShadow: `0 0 10px ${currentTheme.color}88`
              }}
            />
          </div>
        </div>
        
        <h1 className="font-space font-black text-2xl tracking-tighter uppercase italic relative z-10 text-[var(--text-primary)]">
          GROWTH<span style={{ color: currentTheme.color }}>_HUB</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-grow px-4 py-16 space-y-2">
        <h3 className="px-10 text-[9px] font-space tracking-[0.8em] text-[var(--text-secondary)]/50 uppercase mb-10 font-black">
          {mounted ? (isRTL ? 'القائمة' : 'MENU') : 'MENU'}
        </h3>
        {MENU_ITEMS.map((item, idx) => {
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
                "flex items-center p-3 px-8 rounded-sm transition-all duration-300 relative group overflow-hidden min-h-[44px]",
                 isActive 
                   ? "bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--card-border)]" 
                   : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--card-border)] hover:bg-[var(--input-bg)]"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav"
                  className={cn(
                    "absolute w-1 h-6 shadow-[0_0_20px_currentcolor]",
                    "inset-inline-start-0 rounded-full"
                  )}
                  style={{ backgroundColor: currentTheme.color, color: currentTheme.color }}
                />
              )}
              
              <motion.span 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
                className={cn(
                  "material-symbols-outlined transition-all duration-300 text-lg",
                  isRTL ? "ml-4" : "mr-4"
                )}
                style={{ 
                  color: isActive 
                    ? currentTheme.color 
                    : (isHovered ? `${currentTheme.color}cc` : undefined)
                }}
              >
                {item.icon}
              </motion.span>
              
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
      </nav>

      {/* Sidebar Footer */}
      <div className="p-10 mt-auto space-y-4">
        <Link 
          href="/settings" 
          onClick={playBlip}
          onMouseEnter={() => setIsSettingsHovered(true)}
          onMouseLeave={() => setIsSettingsHovered(false)}
          className="w-full flex items-center justify-start gap-4 p-4 glass-panel border rounded-sm transition-all font-space text-[11px] tracking-[0.4em] font-black min-h-[44px]"
          style={{
            color: isSettingsHovered ? currentTheme.color : 'var(--text-secondary)',
            borderColor: isSettingsHovered ? `${currentTheme.color}33` : 'var(--card-border)',
            backgroundColor: isSettingsHovered ? `${currentTheme.color}0d` : 'transparent',
            boxShadow: isSettingsHovered ? `0 0 15px ${currentTheme.color}1a` : 'none'
          }}
        >
          <span 
            className="material-symbols-outlined text-xl transition-colors duration-300"
            style={{ color: isSettingsHovered ? currentTheme.color : undefined }}
          >
            settings
          </span>
          <span className="transition-colors duration-300">
            {mounted ? (isRTL ? 'الإعدادات' : 'Settings') : 'Settings'}
          </span>
        </Link>
      </div>
    </aside>
    </>
  )
}
