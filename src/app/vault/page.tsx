'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { useGrowth, THEME_PACKAGES } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

export default function VaultPage() {
  const { isRTL, profile, currentTheme, changeTheme } = useGrowth()
  const xp = profile?.xp || 0

  // Helper to determine rank status
  const getRankStatus = (threshold: number, themeId: string) => {
    if (profile?.active_theme === themeId) return 'EQUIPPED'
    if (xp >= threshold) return 'AVAILABLE'
    return 'LOCKED'
  }

  const RANKS_DATA = [
    {
      id: 'SILVER',
      name: 'SILVER',
      threshold: 0,
      themeId: 'SILVER',
      color: '#B0C4DE',
      neonClass: 'neon-silver',
      perk: 'Standard Operator Kit',
      vessel: 'Cylinder'
    },
    {
      id: 'PLATINUM',
      name: 'PLATINUM',
      threshold: 500,
      themeId: 'PLATINUM',
      color: '#00CED1',
      neonClass: 'neon-platinum',
      perk: 'Advanced HUD Uplink',
      vessel: 'Hex'
    },
    {
      id: 'CROWN',
      name: 'CROWN',
      threshold: 1500,
      themeId: 'CROWN',
      color: '#9370DB',
      neonClass: 'neon-crown',
      perk: 'Savage Mode AI Coach',
      vessel: 'Shard'
    },
    {
      id: 'ACE',
      name: 'ACE',
      threshold: 4000,
      themeId: 'ACE',
      color: '#DC143C',
      neonClass: 'neon-ace',
      perk: 'Tactical HUD Analytics',
      vessel: 'Shard'
    },
    {
      id: 'CONQUEROR',
      name: 'CONQUEROR',
      threshold: 10000,
      themeId: 'CONQUEROR',
      color: '#FFD700',
      neonClass: 'neon-conqueror',
      perk: 'Glitch Completion FX',
      vessel: 'Sphere'
    }
  ]

  return (
    <Shell>
      <main className="p-6 md:p-12 min-h-screen">
        <div className="max-w-[1600px] mx-auto space-y-16">
          
          {/* Header */}
          <header className="border-b border-black/10 dark:border-white/10 pb-6">
            <h1 className="text-4xl md:text-6xl font-black font-space tracking-tight text-black dark:text-white uppercase italic">
              GLOBAL<span className="text-neon-green">_RANKING_LADDER</span>
            </h1>
            <p className="text-[10px] md:text-xs font-space text-black/40 dark:text-white/30 tracking-[0.6em] uppercase font-black mt-2">
              {isRTL ? 'نظام تصنيف العمليات العالمي' : 'ELITE OPERATOR PROGRESSION & TACTICAL ARTIFACTS'}
            </p>
          </header>

          {/* Ranking Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
            {RANKS_DATA.map((rank) => {
              const status = getRankStatus(rank.threshold, rank.themeId)
              const isLocked = status === 'LOCKED'
              const theme = THEME_PACKAGES[rank.themeId]

              return (
                <motion.div
                  key={rank.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={cn(
                    "glass-card rounded-lg p-8 relative flex flex-col items-center transition-all duration-500 h-full min-h-[600px]",
                    rank.neonClass,
                    status === 'EQUIPPED' ? "scale-105 z-10" : "hover:scale-[1.02]"
                  )}
                >
                  <h2 className="text-4xl md:text-5xl font-black font-space mb-2 uppercase italic tracking-tighter">
                    {rank.name}
                  </h2>
                  
                  {/* Status Badge */}
                  <div className={cn(
                    "px-6 py-1.5 rounded-sm font-space text-xs font-black tracking-widest mb-10 border",
                    status === 'EQUIPPED' ? "bg-white text-black border-white" : "border-current opacity-60"
                  )}>
                    {status}
                  </div>

                  {/* EnergyCell Visualization */}
                  <div className="w-56 h-56 mb-10 relative flex items-center justify-center">
                    <EnergyCell 
                      percentage={75}
                      color={rank.color}
                      size="lg"
                      cupStyle={theme?.cupStyle as any}
                    />
                  </div>

                  {/* XP & Perks */}
                  <div className="w-full space-y-6 text-center border-t border-current/10 pt-8 mt-auto">
                    <div className="space-y-1">
                      <p className="text-xs font-space opacity-50 uppercase tracking-[0.3em] font-black">XP REQUIRED</p>
                      <p className="text-3xl font-black font-space tracking-tight">
                        {rank.threshold.toLocaleString()} <span className="text-lg opacity-50">XP</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-space opacity-50 uppercase tracking-[0.3em] font-black text-neon-green">ACTIVE PERK</p>
                      <p className="text-base font-bold font-space uppercase tracking-widest">{rank.perk}</p>
                    </div>

                    {status === 'AVAILABLE' && (
                      <button 
                        onClick={() => changeTheme(rank.themeId)}
                        className="w-full bg-white text-black py-4 font-space font-black text-sm uppercase tracking-widest hover:bg-neon-green transition-colors rounded-sm mt-4"
                      >
                        EQUIP PROTOCOL
                      </button>
                    )}
                  </div>

                  {/* Locked Overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md rounded-lg flex flex-col items-center justify-center p-8 text-center border border-white/5">
                       <span className="material-symbols-outlined text-white text-7xl mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">lock</span>
                       <p className="text-white font-black font-space text-4xl tracking-tighter uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">LOCKED</p>
                       <p className="text-neon-green font-space text-sm tracking-[0.2em] font-black mt-4 uppercase drop-shadow-[0_0_10px_var(--color-neon-green)]">
                         {rank.threshold - xp} XP REQUIRED
                       </p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

        </div>
      </main>
    </Shell>
  )
}
