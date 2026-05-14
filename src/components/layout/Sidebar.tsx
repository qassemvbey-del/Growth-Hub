'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGrowth, RANK_THRESHOLDS } from '@/context/GrowthContext'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Sidebar({ isRTL = false }: { isRTL?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, t, currentTheme } = useGrowth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const MENU_ITEMS = [
    { icon: 'dashboard', label: isRTL ? 'الرئيسية' : "Dashboard", href: '/', shortcut: '01', exact: true },
    { icon: 'deployed_code', label: isRTL ? 'التاسكات' : 'Missions', href: '/missions', shortcut: '02', exact: false },
    { icon: 'psychology', label: isRTL ? 'الذاكرة' : 'Notes', href: '/notes', shortcut: '03', exact: false },
    { icon: 'inventory_2', label: isRTL ? 'الإنجازات' : 'Achievements', href: '/achievements', shortcut: '04', exact: false },
    { icon: 'military_tech', label: isRTL ? 'الخزنة' : 'Vault', href: '/vault', shortcut: '05', exact: false },
  ]

  return (
    <>
      {/* Mobile Tactical Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#050505] border-t border-black/10 dark:border-white/10 z-[200] flex justify-around items-center px-2">
        {MENU_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors min-h-[44px] min-w-[44px]",
                isActive ? "" : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white/80"
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
        "hidden lg:flex w-72 bg-white dark:bg-[#0D0D0D] h-screen fixed top-0 flex-col z-[110] border-y-0 shadow-[20px_0_50px_rgba(0,0,0,0.05)] dark:shadow-[20px_0_50px_rgba(0,0,0,0.5)] sidebar-target transition-all duration-300",
        "inset-inline-start-0",
        isRTL ? "border-l border-black/5 dark:border-white/5" : "border-r border-black/5 dark:border-white/5"
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
             <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center group-hover/avatar:border-white/20 transition-all">
               <span className="material-symbols-outlined text-black/20 dark:text-white/20">person</span>
             </div>
           )}
           <div className="flex flex-col">
              <span className="text-[9px] font-space tracking-widest uppercase font-black opacity-40" style={{ color: currentTheme.color }}>
                {isRTL ? 'حالة المستخدم' : 'USER_STATUS'}
              </span>
              <span className="text-sm font-space font-black text-black dark:text-white truncate max-w-[120px] transition-colors" style={{ color: currentTheme.color }}>
                {profile?.full_name ? profile.full_name.toUpperCase() : (t ? t('operator') : 'USER')}
              </span>
              <div className="mt-1 flex items-center gap-2">
                 <span className="px-1.5 py-0.5 rounded-[2px] bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[7px] font-space font-black text-black/60 dark:text-white/40 tracking-widest uppercase">
                   {profile?.rank || 'RECRUIT'}
                 </span>
               </div>
           </div>
        </Link>

        {/* XP Progress Bar */}
        <div id="hud-xp-bar" className="w-full space-y-1.5">
          <div className="flex justify-between items-end text-sm font-space text-black/40 dark:text-white/40 tracking-widest uppercase font-black">
            <span>{isRTL ? 'نقاط الخبرة' : 'SYSTEM_XP'}</span>
            <span className="text-3xl" style={{ color: currentTheme.color }}>{profile?.xp || 0}</span>
          </div>
          <div className="w-full h-[6px] bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mt-2">
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
        
        <h1 className="font-space font-black text-2xl tracking-tighter uppercase italic relative z-10 text-black dark:text-white">
          MISSION<span style={{ color: currentTheme.color }}>_HUB</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-grow px-4 py-16 space-y-2">
        <h3 className="px-10 text-[9px] font-space tracking-[0.8em] text-black/20 dark:text-white/20 uppercase mb-10 font-black">
          {isRTL ? 'القائمة' : 'MENU'}
        </h3>
        {MENU_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-5 p-4 px-10 rounded-sm transition-all duration-300 relative group overflow-hidden min-h-[44px]",
                isActive 
                  ? "bg-black/5 dark:bg-white/5 text-black dark:text-white border border-black/10 dark:border-white/10" 
                  : "text-black/40 hover:text-black dark:text-white/30 dark:hover:text-white/80 border border-transparent hover:border-black/5 dark:hover:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav"
                  className={cn(
                    "absolute w-1.5 h-1/2 shadow-[0_0_20px_currentcolor]",
                    "inset-inline-start-0 rounded-full"
                  )}
                  style={{ backgroundColor: currentTheme.color, color: currentTheme.color }}
                />
              )}
              
              <span className={cn(
                "material-symbols-outlined transition-all duration-300 text-xl",
                isActive ? "" : "group-hover:text-neon-green/60"
              )}
              style={{ color: isActive ? currentTheme.color : undefined }}
              >
                {item.icon}
              </span>
              
              <span className={cn(
                "font-space text-sm tracking-[0.2em] font-black flex-grow",
                isActive ? "" : ""
              )}
              style={{ color: isActive ? currentTheme.color : undefined }}
              >
                {item.label}
              </span>

              <span className="text-[10px] font-space text-black/10 dark:text-white/10 group-hover:text-neon-green/40 font-black">
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
          className="w-full flex items-center justify-start gap-4 p-4 glass-panel border-black/5 dark:border-white/5 text-black/30 dark:text-white/30 hover:text-neon-green hover:border-neon-green/20 hover:bg-neon-green/5 rounded-sm transition-all font-space text-[11px] tracking-[0.4em] font-black min-h-[44px]"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
          {isRTL ? 'الإعدادات' : 'Settings'}
        </Link>
        <button 
          onClick={() => { handleLogout() }}
          className="w-full flex items-center justify-start gap-4 p-4 border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/20 hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/5 rounded-sm transition-all font-space text-[11px] tracking-[0.4em] font-black min-h-[44px]"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          {t ? t('exit') : (isRTL ? 'تسجيل الخروج' : 'Logout')}
        </button>
      </div>
    </aside>
    </>
  )
}
